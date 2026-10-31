#!/usr/bin/env node
/**
 * scripts/e2e-orders.mjs — end-to-end ordering pipeline check.
 *
 *   customer OTP session → POST /api/orders (server re-prices)
 *     → staff board → accept → prepare → dispatch
 *     → driver marks delivered → admin overview
 *   and the negative cases: anonymous, fake product, illegal transition.
 *
 * Usage (against the local mock, see docs/backend-auth-setup.md §5.1):
 *   BASE_URL=http://localhost:3112 \
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   CUSTOMER_EMAIL=customer@example.com CUSTOMER_PASSWORD='CustomerDemo#2026' \
 *   STAFF_USERNAME=mgr-demo STAFF_PASSWORD='StaffDemo#2026' \
 *   DRIVER_USERNAME=drv-demo DRIVER_PASSWORD='DriverDemo#2026' \
 *   ADMIN_IDENTIFIER=baduma-admin ADMIN_PASSWORD='AdminDemo#2026' \
 *   node scripts/e2e-orders.mjs
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL ?? "";
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD ?? "";
const STAFF_USERNAME = process.env.STAFF_USERNAME ?? "";
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? "";
const DRIVER_USERNAME = process.env.DRIVER_USERNAME ?? "";
const DRIVER_PASSWORD = process.env.DRIVER_PASSWORD ?? "";
const ADMIN_IDENTIFIER = process.env.ADMIN_IDENTIFIER ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

// Seeded product ids in scripts/dev-supabase-mock.mjs
const KOTTU = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const RICE = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function cookiesFrom(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function call(path, { cookie, token, method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect: "manual",
    cache: "no-store",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.clone().json();
  } catch {
    /* non-JSON */
  }
  return { res, json, cookie: cookiesFrom(res) };
}

/** Customer token: real GoTrue password grant against the project (or mock). */
async function customerToken() {
  if (!SUPABASE_URL || !CUSTOMER_EMAIL) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: process.env.SUPABASE_ANON_KEY ?? "" },
    body: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
  });
  const json = await res.json().catch(() => ({}));
  return json.access_token ?? null;
}

async function main() {
  console.log(`\n🍚 Baduma ordering pipeline check → ${BASE}\n`);

  const token = await customerToken();
  record("customer session obtained", Boolean(token), token ? "JWT present" : "no token (set SUPABASE_URL + CUSTOMER_*)");
  if (!token) return finish();

  /* ---------------- guards ---------------- */
  const anon = await call("/api/orders", { method: "POST", body: { items: [], customer: {} } });
  record("anonymous checkout is rejected", anon.res.status === 401, `HTTP ${anon.res.status}`);

  const empty = await call("/api/orders", { token, method: "POST", body: { items: [], customer: {} } });
  record("empty cart is rejected", empty.res.status === 400, `HTTP ${empty.res.status}`);

  const fake = await call("/api/orders", {
    token,
    method: "POST",
    body: {
      items: [{ productId: "00000000-0000-0000-0000-000000000000", size: "normal", quantity: 1 }],
      customer: { name: "Test User", phone: "0771234567", address: "No 1, Test Road, Kandy" },
    },
  });
  record("unknown product is rejected", fake.res.status === 409, `HTTP ${fake.res.status}`);

  /* ---------------- happy path ---------------- */
  const placed = await call("/api/orders", {
    token,
    method: "POST",
    body: {
      items: [
        { productId: KOTTU, size: "normal", quantity: 2 },
        { productId: RICE, size: "full", quantity: 1 },
      ],
      customer: {
        name: "Nimal Perera",
        phone: "077 123 4567",
        address: "No 45, Temple Road, Pilimatalawa",
        notes: "No chilli please",
        paymentMethod: "cash",
      },
    },
  });
  const order = placed.json?.order;
  record("customer places an order", placed.res.status === 201, `HTTP ${placed.res.status} ${order?.code ?? ""}`);
  record(
    "order is priced server-side (2×700 + 1×750 + 200 delivery = 2350)",
    order?.subtotal === 2150 && order?.delivery_fee === 200 && order?.total === 2350,
    `subtotal=${order?.subtotal} delivery=${order?.delivery_fee} total=${order?.total}`
  );

  const mine = await call("/api/orders", { token });
  record(
    "customer sees their own order",
    mine.res.status === 200 && (mine.json?.orders ?? []).some((o) => o.code === order?.code),
    `HTTP ${mine.res.status}`
  );

  /* ---------------- staff board ---------------- */
  const staffLogin = await call("/api/employee/login", {
    method: "POST",
    body: { username: STAFF_USERNAME, password: STAFF_PASSWORD },
  });
  record("staff signs in", staffLogin.res.status === 200, `HTTP ${staffLogin.res.status}`);
  const staffCookie = staffLogin.cookie;

  const board = await call("/api/staff/orders", { cookie: staffCookie });
  record(
    "staff board shows the new order",
    board.res.status === 200 && (board.json?.orders ?? []).some((o) => o.id === order?.id),
    `HTTP ${board.res.status}`
  );

  const anonBoard = await call("/api/staff/orders");
  record("anonymous staff board is rejected", anonBoard.res.status === 401, `HTTP ${anonBoard.res.status}`);

  for (const status of ["accepted", "preparing", "out_for_delivery"]) {
    const res = await call("/api/staff/orders", {
      cookie: staffCookie,
      method: "PATCH",
      body: { id: order.id, status },
    });
    record(`staff moves order → ${status}`, res.res.status === 200, `HTTP ${res.res.status}`);
  }

  /* ---------------- driver ---------------- */
  const driverLogin = await call("/api/employee/login", {
    method: "POST",
    body: { username: DRIVER_USERNAME, password: DRIVER_PASSWORD },
  });
  record("driver signs in", driverLogin.res.status === 200, `HTTP ${driverLogin.res.status}`);

  const driverBoard = await call("/api/staff/orders", { cookie: driverLogin.cookie });
  record(
    "driver sees the dispatched run",
    driverBoard.res.status === 200 && (driverBoard.json?.orders ?? []).some((o) => o.id === order?.id),
    `HTTP ${driverBoard.res.status}`
  );

  const posAsDriver = await call("/api/staff/orders", {
    cookie: driverLogin.cookie,
    method: "PATCH",
    body: { id: order.id, status: "accepted" },
  });
  record("driver cannot rewind the order", posAsDriver.res.status === 403, `HTTP ${posAsDriver.res.status}`);

  const delivered = await call("/api/staff/orders", {
    cookie: driverLogin.cookie,
    method: "PATCH",
    body: { id: order.id, status: "delivered" },
  });
  record("driver marks the order delivered", delivered.res.status === 200, `HTTP ${delivered.res.status}`);

  const rewind = await call("/api/staff/orders", {
    cookie: staffCookie,
    method: "PATCH",
    body: { id: order.id, status: "preparing" },
  });
  record("delivered order cannot be reopened", rewind.res.status === 403, `HTTP ${rewind.res.status}`);

  /* ---------------- cancellation window ---------------- */
  const second = await call("/api/orders", {
    token,
    method: "POST",
    body: {
      items: [{ productId: KOTTU, size: "full", quantity: 1 }],
      customer: { name: "Nimal Perera", phone: "0771234567", address: "No 45, Temple Road, Pilimatalawa" },
    },
  });
  const secondId = second.json?.order?.id;
  const cancelled = await call(`/api/orders/${secondId}`, {
    token,
    method: "PATCH",
    body: { status: "cancelled" },
  });
  record("customer cancels a pending order", cancelled.res.status === 200, `HTTP ${cancelled.res.status}`);

  const lateCancel = await call(`/api/orders/${order.id}`, {
    token,
    method: "PATCH",
    body: { status: "cancelled" },
  });
  record("a delivered order cannot be cancelled", lateCancel.res.status === 409, `HTTP ${lateCancel.res.status}`);

  /* ---------------- admin overview ---------------- */
  if (ADMIN_IDENTIFIER && ADMIN_PASSWORD) {
    const adminLogin = await call("/api/admin/login", {
      method: "POST",
      body: { identifier: ADMIN_IDENTIFIER, password: ADMIN_PASSWORD },
    });
    record("admin signs in", adminLogin.res.status === 200, `HTTP ${adminLogin.res.status}`);

    const adminOrders = await call("/api/admin/orders", { cookie: adminLogin.cookie });
    record(
      "admin sees all orders",
      adminOrders.res.status === 200 && (adminOrders.json?.orders ?? []).length >= 2,
      `HTTP ${adminOrders.res.status} (${adminOrders.json?.orders?.length ?? 0} orders)`
    );

    const anonAdminOrders = await call("/api/admin/orders");
    record("anonymous admin overview is rejected", anonAdminOrders.res.status === 401, `HTTP ${anonAdminOrders.res.status}`);
  }

  return finish();
}

function finish() {
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${failed.length === 0 ? "🎉 ordering pipeline works end to end" : `⚠️  ${failed.length} check(s) FAILED`} — ${results.length - failed.length}/${results.length}\n`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n❌ ordering check crashed:", err);
  process.exit(1);
});
