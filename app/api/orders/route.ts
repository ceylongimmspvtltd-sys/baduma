import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { fetchSupabaseUser, type SupabaseUser } from "@/lib/adminAuth";
import { createServiceClient, getServiceRoleKey } from "@/lib/supabaseServer";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import {
  deliveryFeeFor,
  generateOrderCode,
  isPlausiblePhone,
  sanitizeText,
  type OrderRow,
  type OrderSize,
} from "@/lib/orders";

/**
 * Customer orders.
 *
 * POST → create an order for the signed-in customer (OTP session).
 * GET  → list the caller's own orders with items.
 *
 * Security model:
 *   - the Supabase access token is verified against GoTrue (never decoded),
 *   - item prices are re-read from `public.products`; the request carries only
 *     product ids / sizes / quantities, so a tampered localStorage cart cannot
 *     change what is charged,
 *   - inserts go through the service-role client (RLS has no client INSERT
 *     policy on `orders`), after the caller has been authenticated,
 *   - inactive products are rejected instead of silently priced at 0.
 */

const MAX_LINES = 30;
const MAX_QTY_PER_LINE = 20;

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, { status, headers: { "Cache-Control": "no-store" } });
}

async function currentUser(req: NextRequest): Promise<SupabaseUser | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  return fetchSupabaseUser(token);
}

type ProductRow = {
  id: string;
  name: string;
  normal_price: number | string | null;
  full_price: number | string | null;
  is_active: boolean;
};

export async function POST(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) return noStore({ error: "Please sign in to place an order." }, 401);

  const limit = rateLimit(`orders:${user.id}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many orders in a short time. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } }
    );
  }
  if (!getServiceRoleKey()) return noStore({ error: "Ordering is temporarily unavailable." }, 503);

  const body = (await req.json().catch(() => null)) as {
    items?: unknown;
    customer?: Record<string, unknown>;
  } | null;

  const rawItems = Array.isArray(body?.items) ? body!.items : [];
  if (rawItems.length === 0) return noStore({ error: "Your cart is empty." }, 400);
  if (rawItems.length > MAX_LINES) return noStore({ error: "Too many different items in one order." }, 400);

  const customer = body?.customer ?? {};
  const name = sanitizeText(customer.name, 80);
  const phone = sanitizeText(customer.phone, 20);
  const address = sanitizeText(customer.address, 240);
  const notes = sanitizeText(customer.notes, 240);
  const paymentMethod = customer.paymentMethod === "card" ? "card" : "cash";

  if (name.length < 2) return noStore({ error: "Please enter your name." }, 400);
  if (!isPlausiblePhone(phone)) return noStore({ error: "Please enter a valid phone number." }, 400);
  if (address.length < 8) return noStore({ error: "Please enter a complete delivery address." }, 400);

  // Normalise requested lines.
  const requested: { productId: string; size: OrderSize; quantity: number }[] = [];
  for (const raw of rawItems) {
    const item = raw as Record<string, unknown>;
    const productId = typeof item.productId === "string" ? item.productId : "";
    const size: OrderSize | null = item.size === "full" ? "full" : item.size === "normal" ? "normal" : null;
    const quantity = Math.round(Number(item.quantity));
    if (!productId || !size) return noStore({ error: "Invalid cart item." }, 400);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      return noStore({ error: `Quantity must be between 1 and ${MAX_QTY_PER_LINE}.` }, 400);
    }
    requested.push({ productId, size, quantity });
  }

  const supabase = createServiceClient();
  const ids = [...new Set(requested.map((r) => r.productId))];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, name, normal_price, full_price, is_active")
    .in("id", ids);

  if (productError) return noStore({ error: "Could not price your order. Please try again." }, 503);

  const byId = new Map<string, ProductRow>((products ?? []).map((p) => [p.id as string, p as ProductRow]));

  const lines: {
    product_id: string;
    name: string;
    size: OrderSize;
    unit_price: number;
    quantity: number;
    line_total: number;
  }[] = [];

  for (const line of requested) {
    const product = byId.get(line.productId);
    if (!product || product.is_active === false) {
      return noStore({ error: "One of the items is no longer available. Please refresh your cart." }, 409);
    }
    const rawPrice = line.size === "full" ? product.full_price : product.normal_price;
    const unitPrice = Number(rawPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return noStore({ error: `"${product.name}" is not available in that portion.` }, 409);
    }
    lines.push({
      product_id: product.id,
      name: product.name,
      size: line.size,
      unit_price: unitPrice,
      quantity: line.quantity,
      line_total: unitPrice * line.quantity,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);
  const deliveryFee = deliveryFeeFor(subtotal);
  const total = subtotal + deliveryFee;

  // Insert with a retry in case the short code collides.
  let order: OrderRow | null = null;
  for (let attempt = 0; attempt < 4 && !order; attempt += 1) {
    const code = generateOrderCode((n) => new Uint8Array(randomBytes(n)));
    const { data, error } = await supabase
      .from("orders")
      .insert({
        code,
        user_id: user.id,
        customer_name: name,
        customer_phone: phone,
        delivery_address: address,
        notes: notes || null,
        payment_method: paymentMethod,
        status: "pending",
        subtotal,
        delivery_fee: deliveryFee,
        total,
      })
      .select("*")
      .single();

    if (!error && data) {
      order = data as OrderRow;
      break;
    }
    if (error && !/duplicate|unique/i.test(error.message)) {
      return noStore({ error: "Could not place your order. Please try again." }, 500);
    }
  }

  if (!order) return noStore({ error: "Could not place your order. Please try again." }, 500);

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(lines.map((line) => ({ ...line, order_id: order!.id })));

  if (itemsError) {
    // Roll back the header so a half-written order never reaches the POS.
    await supabase.from("orders").delete().eq("id", order.id);
    return noStore({ error: "Could not place your order. Please try again." }, 500);
  }

  return noStore(
    {
      success: true,
      order: {
        id: order.id,
        code: order.code,
        status: order.status,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        items: lines,
      },
    },
    201
  );
}

export async function GET(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) return noStore({ error: "Sign in to see your orders." }, 401);
  if (!getServiceRoleKey()) return noStore({ error: "Ordering is temporarily unavailable." }, 503);

  const supabase = createServiceClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return noStore({ error: "Could not load your orders." }, 500);
  const rows = (orders ?? []) as OrderRow[];
  if (rows.length === 0) return noStore({ orders: [] });

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", rows.map((o) => o.id));

  const grouped = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const key = (item as { order_id: string }).order_id;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return noStore({
    orders: rows.map((order) => ({ ...order, order_items: grouped.get(order.id) ?? [] })),
  });
}
