import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, getServiceRoleKey } from "@/lib/supabaseServer";
import { EMPLOYEE_COOKIE, verifyEmployeeToken, type EmployeeToken } from "@/lib/employeeSession";
import { canTransition, isOrderStatus, type OrderRow, type OrderStatus } from "@/lib/orders";

/**
 * Staff order board (POS / kitchen / driver).
 *
 * GET   → the orders this staff role is allowed to see, plus the driver list
 *         for managers.
 * PATCH → move an order through its lifecycle.
 *
 * Authorisation is the HMAC-verified `employee_session` cookie (no Supabase
 * session), and every write goes through the service-role client after the
 * role *and* the transition have been validated server-side.
 */

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, { status, headers: { "Cache-Control": "no-store" } });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Orders each role is allowed to see. */
const VISIBLE_STATUSES: Record<string, OrderStatus[]> = {
  Manager: ["pending", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"],
  Kitchen: ["pending", "accepted", "preparing"],
  Driver: ["out_for_delivery", "accepted", "delivered"],
};

async function requireStaff(req: NextRequest): Promise<EmployeeToken | null> {
  return verifyEmployeeToken(req.cookies.get(EMPLOYEE_COOKIE)?.value);
}

export async function GET(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return noStore({ error: "Unauthorized" }, 401);
  if (!getServiceRoleKey()) return noStore({ error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." }, 500);

  const statuses = VISIBLE_STATUSES[staff.position] ?? ["pending"];
  const supabase = createServiceClient();

  let query = supabase
    .from("orders")
    .select("*")
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(60);

  // Drivers only see their own runs, or unassigned ones waiting for a driver.
  if (staff.position === "Driver") {
    query = query.or(`driver_id.eq.${staff.sub},driver_id.is.null`);
  }

  const { data: orders, error } = await query;
  if (error) return noStore({ error: "Could not load orders." }, 500);

  const rows = (orders ?? []) as OrderRow[];
  const items = rows.length
    ? (await supabase.from("order_items").select("*").in("order_id", rows.map((o) => o.id))).data ?? []
    : [];

  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const key = (item as { order_id: string }).order_id;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  // Managers need the driver roster to assign deliveries.
  let drivers: { id: string; full_name: string | null; username: string }[] = [];
  if (staff.position === "Manager" && staff.permission_level === "full") {
    const { data } = await supabase
      .from("employees")
      .select("id, full_name, username")
      .eq("position", "Driver")
      .eq("is_active", true);
    drivers = (data ?? []) as typeof drivers;
  }

  return noStore({
    staff: { username: staff.username, position: staff.position, permission_level: staff.permission_level },
    drivers,
    orders: rows.map((order) => ({ ...order, order_items: grouped.get(order.id) ?? [] })),
  });
}

/** Which statuses this staff member may set on this order. */
function allowedFor(staff: EmployeeToken, order: OrderRow): OrderStatus[] {
  if (order.status === "delivered" || order.status === "cancelled") return [];

  if (staff.position === "Manager") {
    if (staff.permission_level === "viewer") return [];
    return ["accepted", "preparing", "out_for_delivery", "delivered", "cancelled"].filter((s) =>
      canTransition(order.status, s as OrderStatus)
    ) as OrderStatus[];
  }
  if (staff.position === "Kitchen") {
    if (staff.permission_level !== "orders" && staff.permission_level !== "full") return [];
    return ["accepted", "preparing"].filter((s) => canTransition(order.status, s as OrderStatus)) as OrderStatus[];
  }
  if (staff.position === "Driver") {
    // A driver can collect an unassigned run, then complete it.
    if (order.driver_id && order.driver_id !== staff.sub) return [];
    return ["out_for_delivery", "delivered"].filter((s) =>
      canTransition(order.status, s as OrderStatus)
    ) as OrderStatus[];
  }
  return [];
}

export async function PATCH(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return noStore({ error: "Unauthorized" }, 401);
  if (!getServiceRoleKey()) return noStore({ error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." }, 500);

  const body = (await req.json().catch(() => ({}))) as { id?: unknown; status?: unknown; driverId?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  if (!UUID_RE.test(id)) return noStore({ error: "Order id required." }, 400);
  if (!isOrderStatus(body.status)) return noStore({ error: "Invalid status." }, 400);
  const nextStatus = body.status;

  const supabase = createServiceClient();
  const { data: orderRow, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error || !orderRow) return noStore({ error: "Order not found." }, 404);

  const order = orderRow as OrderRow;
  const allowed = allowedFor(staff, order);
  if (!allowed.includes(nextStatus)) {
    return noStore({ error: `You cannot move this order from ${order.status} to ${nextStatus}.` }, 403);
  }

  const patch: Record<string, unknown> = { status: nextStatus, updated_at: new Date().toISOString() };

  // Driver assignment (managers only).
  if (body.driverId !== undefined && staff.position === "Manager" && staff.permission_level === "full") {
    if (body.driverId === null) {
      patch.driver_id = null;
    } else if (typeof body.driverId === "string" && UUID_RE.test(body.driverId)) {
      const { data: driver } = await supabase
        .from("employees")
        .select("id, position, is_active")
        .eq("id", body.driverId)
        .maybeSingle();
      if (!driver || driver.position !== "Driver" || driver.is_active === false) {
        return noStore({ error: "Invalid driver." }, 400);
      }
      patch.driver_id = body.driverId;
    }
  }

  // A driver picking up a run becomes its driver.
  if (staff.position === "Driver" && nextStatus === "out_for_delivery") {
    patch.driver_id = staff.sub;
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("id, code, status, driver_id")
    .single();

  if (updateError) return noStore({ error: "Could not update the order." }, 500);
  return noStore({ success: true, order: updated });
}
