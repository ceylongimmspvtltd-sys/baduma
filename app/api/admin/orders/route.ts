import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminIdentity } from "@/lib/adminAuth";
import { createServiceClient, getServiceRoleKey } from "@/lib/supabaseServer";
import { isOrderStatus, type OrderRow } from "@/lib/orders";

/**
 * Admin order management (Master Admin only).
 * GET   → every order with its items, newest first (+ driver roster).
 * PATCH → force any status and (re)assign a driver.
 *
 * The caller's cookie is verified with Supabase Auth; writes use the service
 * role, so the browser never needs an INSERT/UPDATE policy on `orders`.
 */

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, { status, headers: { "Cache-Control": "no-store" } });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin(req: NextRequest) {
  const identity = await getAdminIdentity(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!identity) return { error: noStore({ error: "Unauthorized" }, 401) } as const;
  if (!getServiceRoleKey()) {
    return { error: noStore({ error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." }, 500) } as const;
  }
  return { identity } as const;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    // A missing table is reported plainly instead of a blank dashboard.
    return noStore({ error: error.message }, 500);
  }

  const rows = (orders ?? []) as OrderRow[];
  const items = rows.length
    ? (await supabase.from("order_items").select("*").in("order_id", rows.map((o) => o.id))).data ?? []
    : [];

  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const key = (item as { order_id: string }).order_id;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  const { data: drivers } = await supabase
    .from("employees")
    .select("id, full_name, username")
    .eq("position", "Driver")
    .eq("is_active", true);

  return noStore({
    drivers: drivers ?? [],
    orders: rows.map((order) => ({ ...order, order_items: grouped.get(order.id) ?? [] })),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as { id?: unknown; status?: unknown; driverId?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  if (!UUID_RE.test(id)) return noStore({ error: "Order id required." }, 400);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!isOrderStatus(body.status)) return noStore({ error: "Invalid status." }, 400);
    patch.status = body.status;
  }
  if (body.driverId !== undefined) {
    if (body.driverId === null) {
      patch.driver_id = null;
    } else if (typeof body.driverId === "string" && UUID_RE.test(body.driverId)) {
      patch.driver_id = body.driverId;
    } else {
      return noStore({ error: "Invalid driver id." }, 400);
    }
  }
  if (Object.keys(patch).length === 1) return noStore({ error: "Nothing to update." }, 400);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("id, code, status, driver_id")
    .single();

  if (error) return noStore({ error: error.message }, 500);
  return noStore({ success: true, order: data });
}
