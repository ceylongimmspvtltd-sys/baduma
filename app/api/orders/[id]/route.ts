import { NextRequest, NextResponse } from "next/server";
import { fetchSupabaseUser } from "@/lib/adminAuth";
import { createServiceClient, getServiceRoleKey } from "@/lib/supabaseServer";
import { ORDER_STATUS_LABEL, type OrderRow } from "@/lib/orders";

/**
 * PATCH /api/orders/:id — the customer may cancel their own order while it is
 * still `pending` or `accepted`. Everything else is staff territory.
 */

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, { status, headers: { "Cache-Control": "no-store" } });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return noStore({ error: "Order not found." }, 404);

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const user = token ? await fetchSupabaseUser(token) : null;
  if (!user) return noStore({ error: "Please sign in." }, 401);
  if (!getServiceRoleKey()) return noStore({ error: "Ordering is temporarily unavailable." }, 503);

  const body = (await req.json().catch(() => ({}))) as { status?: unknown };
  if (body.status !== "cancelled") return noStore({ error: "Unsupported change." }, 400);

  const supabase = createServiceClient();
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error || !order) return noStore({ error: "Order not found." }, 404);

  const row = order as OrderRow;
  if (row.user_id !== user.id) return noStore({ error: "Order not found." }, 404);
  if (row.status !== "pending" && row.status !== "accepted") {
    return noStore(
      { error: `This order is already ${ORDER_STATUS_LABEL[row.status]} and can no longer be cancelled online.` },
      409
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, code, status")
    .single();

  if (updateError) return noStore({ error: "Could not cancel the order." }, 500);
  return noStore({ success: true, order: updated });
}
