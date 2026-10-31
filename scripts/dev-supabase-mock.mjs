#!/usr/bin/env node
/**
 * scripts/dev-supabase-mock.mjs — LOCAL Supabase API emulator (dev/CI only).
 *
 * ⚠️  This is a test double. It is NOT secure and must never be deployed or
 *     exposed to the internet. It exists so the auth/route hardening can be
 *     exercised end-to-end without a Supabase project or a network connection:
 *
 *       node scripts/dev-supabase-mock.mjs          # listens on :54321
 *
 * What it implements (the subset the app actually calls):
 *   POST /auth/v1/token?grant_type=password   GoTrue password grant
 *   GET  /auth/v1/user                        server-side token verification
 *   POST /auth/v1/logout                      session revocation (no-op)
 *   GET  /rest/v1/<table>                     PostgREST select with eq filters
 *   POST /rest/v1/<table>                     insert / upsert
 *   PATCH/DELETE /rest/v1/<table>             update / delete by filter
 *   POST /rest/v1/rpc/<fn>                    get_employee_by_username, …
 *
 * Fixtures come from the environment (defaults are generated and printed):
 *   MOCK_ADMIN_EMAIL      default admin@baduma.lk
 *   MOCK_ADMIN_USERNAME   default baduma-admin
 *   MOCK_ADMIN_PASSWORD   default AdminDemo#2026 (dev only)
 *   MOCK_STAFF_USERNAME   default mgr-demo
 *   MOCK_STAFF_PASSWORD   default StaffDemo#2026
 *   MOCK_PORT             default 54321
 */

import { createHmac, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 54321);
const JWT_SECRET = process.env.MOCK_JWT_SECRET ?? "mock-jwt-secret";
const ANON_KEY = process.env.MOCK_ANON_KEY ?? "mock-anon-key";
const SERVICE_KEY = process.env.MOCK_SERVICE_KEY ?? "mock-service-key";

const ADMIN_EMAIL = (process.env.MOCK_ADMIN_EMAIL ?? "admin@baduma.lk").toLowerCase();
const ADMIN_USERNAME = (process.env.MOCK_ADMIN_USERNAME ?? "baduma-admin").toLowerCase();
const ADMIN_PASSWORD = process.env.MOCK_ADMIN_PASSWORD ?? "AdminDemo#2026";
const STAFF_USERNAME = (process.env.MOCK_STAFF_USERNAME ?? "mgr-demo").toLowerCase();
const STAFF_PASSWORD = process.env.MOCK_STAFF_PASSWORD ?? "StaffDemo#2026";

/* ------------------------------------------------------------------ */
/* JWT (HS256)                                                         */
/* ------------------------------------------------------------------ */

const b64u = (value) => Buffer.from(value).toString("base64url");

function signJwt(payload, ttlSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const part = b64u(JSON.stringify(body));
  const sig = createHmac("sha256", JWT_SECRET).update(`${head}.${part}`).digest("base64url");
  return `${head}.${part}.${sig}`;
}

function verifyJwt(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expected = createHmac("sha256", JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Fixtures / in-memory tables                                         */
/* ------------------------------------------------------------------ */

function hashPassword(password) {
  const salt = Buffer.from("baduma-mock-salt").toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

/** Tokens revoked by /auth/v1/logout — GoTrue invalidates the session server-side. */
const revokedTokens = new Set();

const db = {
  admin_users: [
    {
      user_id: "11111111-1111-1111-1111-111111111111",
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      display_name: "Master Admin",
      is_active: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
    },
  ],
  employees: [
    {
      id: "44444444-4444-4444-4444-444444444444",
      username: "drv-demo",
      password_hash: hashPassword(process.env.MOCK_DRIVER_PASSWORD ?? "DriverDemo#2026"),
      full_name: "Saman Kumara",
      contact: "+94 77 555 0000",
      position: "Driver",
      permission_level: "delivery",
      is_active: true,
      created_by: null,
      created_at: new Date().toISOString(),
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      username: STAFF_USERNAME,
      password_hash: hashPassword(STAFF_PASSWORD),
      full_name: "Demo Manager",
      contact: "+94 77 000 0000",
      position: "Manager",
      permission_level: "full",
      is_active: true,
      created_by: "11111111-1111-1111-1111-111111111111",
      created_at: new Date().toISOString(),
    },
  ],
  products: [
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "Chicken Kottu",
      description: "The iconic kottu rotti shredded and fried with chicken.",
      category: "Kottu",
      veg: false,
      image_url: "/images/kottu-chicken.jpg",
      normal_price: 700,
      full_price: 950,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      name: "Vegetables Fried Rice",
      description: "Wok-tossed fried rice loaded with fresh garden vegetables.",
      category: "Fried Rice",
      veg: true,
      image_url: "/images/fried-rice-veg.jpg",
      normal_price: 500,
      full_price: 750,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ],
  orders: [],
  order_items: [],
  settings: [
    { key: "restaurant_name", value: "බැදුම", updated_at: new Date().toISOString() },
    { key: "phone", value: "+94 77 070 1682", updated_at: new Date().toISOString() },
    { key: "whatsapp", value: "+94 77 948 1682", updated_at: new Date().toISOString() },
    { key: "email", value: "Sadunchamila405@gmail.com", updated_at: new Date().toISOString() },
    { key: "address", value: "Baduma.malgammana, Pilimatalawa, Kandy", updated_at: new Date().toISOString() },
  ],
};

const users = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: "Master Admin" },
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    email: "customer@example.com",
    password: "CustomerDemo#2026",
    app_metadata: {},
    user_metadata: { full_name: "Customer" },
  },
];

function publicUser(user) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
    created_at: new Date("2026-01-01T00:00:00Z").toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* PostgREST-ish layer                                                 */
/* ------------------------------------------------------------------ */

function parseOrFilter(url) {
  const raw = url.searchParams.get("or");
  if (!raw) return null;
  return raw
    .replace(/^\(|\)$/g, "")
    .split(",")
    .map((clause) => {
      const [column, op, ...rest] = clause.split(".");
      return { column, op, value: rest.join(".") };
    });
}

function parseFilters(url) {
  const filters = [];
  const select = url.searchParams.get("select");
  for (const [key, raw] of url.searchParams) {
    if (["select", "order", "limit", "offset", "on_conflict", "apikey"].includes(key)) continue;
    const [op, ...rest] = raw.split(".");
    filters.push({ column: key, op, value: rest.join(".") });
  }
  return { filters, select };
}

function matches(row, filters) {
  return filters.every(({ column, op, value }) => {
    const cell = row[column];
    switch (op) {
      case "eq":
        return String(cell) === value;
      case "neq":
        return String(cell) !== value;
      case "is":
        // Postgres NULL: the row simply has no key in this in-memory store.
        if (value === "null") return cell === null || cell === undefined;
        return String(cell) === value;
      case "gt":
        return cell > value;
      case "in": {
        const list = value.replace(/^\(|\)$/g, "").split(",");
        return list.includes(String(cell));
      }
      default:
        return true;
    }
  });
}

function project(row, select) {
  if (!select || select === "*") return row;
  const cols = select.split(",").map((c) => c.trim()).filter(Boolean);
  const out = {};
  for (const col of cols) out[col] = row[col];
  return out;
}

function wantsSingleObject(req) {
  return (req.headers["accept"] ?? "").includes("vnd.pgrst.object+json");
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

function send(res, status, body, extraHeaders = {}) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    ...extraHeaders,
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const { pathname } = url;

  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" });
    return res.end();
  }

  log(req, pathname);

  /* ---------------- GoTrue ---------------- */

  if (pathname === "/auth/v1/token" && req.method === "POST") {
    const body = await readBody(req);
    const grant = url.searchParams.get("grant_type");
    if (grant !== "password") return send(res, 400, { error: "unsupported_grant_type", msg: "Only password grant is mocked" });

    const email = String(body?.email ?? "").toLowerCase();
    const password = String(body?.password ?? "");
    const user = users.find((u) => u.email === email);
    if (!user || user.password !== password) {
      return send(res, 400, { error: "invalid_grant", error_code: "invalid_credentials", msg: "Invalid login credentials" });
    }
    const accessToken = signJwt({ sub: user.id, email: user.email, role: "authenticated", app_metadata: user.app_metadata });
    return send(res, 200, {
      access_token: accessToken,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: `refresh-${randomUUID()}`,
      user: publicUser(user),
    });
  }

  /* ---------------- GoTrue admin API (used by scripts/create-admin.mjs) ---------------- */

  if (pathname === "/auth/v1/admin/users" && req.method === "POST") {
    const body = await readBody(req);
    const email = String(body?.email ?? "").toLowerCase();
    if (!email || !body?.password) return send(res, 400, { error: "validation_failed", msg: "email and password required" });
    if (users.some((u) => u.email === email)) {
      return send(res, 422, { error: "email_exists", error_code: "email_exists", msg: "A user with this email address has already been registered" });
    }
    const user = {
      id: randomUUID(),
      email,
      password: body.password,
      app_metadata: body.app_metadata ?? {},
      user_metadata: body.user_metadata ?? {},
    };
    users.push(user);
    return send(res, 200, { ...publicUser(user), email_confirmed_at: body.email_confirm ? new Date().toISOString() : null });
  }

  if (pathname === "/auth/v1/admin/users" && req.method === "GET") {
    // GoTrue paginates: { users: [...], aud, next_page, last_page, total }
    const perPage = Number(url.searchParams.get("per_page") ?? 50);
    const page = Number(url.searchParams.get("page") ?? 1);
    const start = (page - 1) * perPage;
    const slice = users.slice(start, start + perPage);
    return send(res, 200, {
      users: slice.map(publicUser),
      aud: "authenticated",
      next_page: start + perPage < users.length ? page + 1 : null,
      last_page: Math.max(1, Math.ceil(users.length / perPage)),
      total: users.length,
    });
  }

  if (pathname.startsWith("/auth/v1/admin/users/") && req.method === "PUT") {
    const id = pathname.slice("/auth/v1/admin/users/".length);
    const body = await readBody(req);
    const user = users.find((u) => u.id === id);
    if (!user) return send(res, 404, { error: "not_found", msg: "User not found" });
    if (body?.password) user.password = body.password;
    if (body?.email) user.email = String(body.email).toLowerCase();
    if (body?.app_metadata) user.app_metadata = { ...user.app_metadata, ...body.app_metadata };
    if (body?.user_metadata) user.user_metadata = { ...user.user_metadata, ...body.user_metadata };
    return send(res, 200, { ...publicUser(user), email_confirmed_at: body?.email_confirm ? new Date().toISOString() : null });
  }

  if (pathname === "/auth/v1/user" && req.method === "GET") {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (revokedTokens.has(token)) {
      return send(res, 401, { error: "invalid_token", error_code: "session_not_found", msg: "Session from session_id claim in JWT does not exist" });
    }
    const claims = verifyJwt(token);
    const user = claims ? users.find((u) => u.id === claims.sub) : null;
    if (!user) return send(res, 401, { error: "invalid_token", msg: "invalid JWT" });
    return send(res, 200, publicUser(user));
  }

  if (pathname === "/auth/v1/logout") {
    // Mirror GoTrue's `scope=global`: the session is revoked immediately, so the
    // access token stops working even though it has not expired yet.
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (token) revokedTokens.add(token);
    return send(res, 204, undefined);
  }

  /* ---------------- RPC ---------------- */

  if (pathname.startsWith("/rest/v1/rpc/") && req.method === "POST") {
    const fn = pathname.slice("/rest/v1/rpc/".length);
    const body = await readBody(req);

    if (fn === "get_employee_by_username") {
      const username = String(body?.p_username ?? "").toLowerCase();
      const row = db.employees.find((e) => e.username === username);
      return send(
        res,
        200,
        row
          ? [
              {
                id: row.id,
                username: row.username,
                password_hash: row.password_hash,
                position: row.position,
                permission_level: row.permission_level,
                is_active: row.is_active,
              },
            ]
          : []
      );
    }
    return send(res, 404, { message: `function ${fn} not mocked` });
  }

  /* ---------------- PostgREST ---------------- */

  if (pathname.startsWith("/rest/v1/")) {
    const table = pathname.slice("/rest/v1/".length);
    const rows = db[table];
    if (!rows) return send(res, 404, { message: `relation "${table}" not mocked` });

    const { filters, select } = parseFilters(url);
    const orFilters = parseOrFilter(url);
    const single = wantsSingleObject(req);

    /** AND of parseFilters, OR of the `or=(...)` list. */
    const rowMatches = (row) =>
      matches(row, filters) && (!orFilters || orFilters.some((filter) => matches(row, [filter])));

    if (req.method === "GET") {
      const matched = rows.filter(rowMatches);
      if (single) {
        if (matched.length !== 1) {
          return send(res, 406, {
            code: "PGRST116",
            details: `Results contain ${matched.length} rows`,
            message: "JSON object requested, multiple (or no) rows returned",
          });
        }
        return send(res, 200, project(matched[0], select));
      }
      return send(res, 200, matched.map((row) => project(row, select)));
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const incoming = Array.isArray(body) ? body : [body];
      const onConflict = url.searchParams.get("on_conflict");
      const prefer = (req.headers.prefer ?? "").toString();
      const mergeDuplicates = prefer.includes("merge-duplicates");

      const saved = incoming.map((item) => {
        const existing =
          onConflict && mergeDuplicates
            ? rows.find((row) => String(row[onConflict]) === String(item[onConflict]))
            : null;
        if (existing) {
          Object.assign(existing, item);
          return existing;
        }
        const row = { id: item.id ?? randomUUID(), created_at: new Date().toISOString(), ...item };
        rows.push(row);
        return row;
      });

      if (prefer.includes("return=representation")) {
        const payload = single && saved.length === 1 ? saved[0] : saved;
        return send(res, 201, payload);
      }
      return send(res, 201, undefined);
    }

    if (req.method === "PATCH") {
      const body = await readBody(req);
      const matched = rows.filter(rowMatches);
      for (const row of matched) Object.assign(row, body ?? {});
      if ((req.headers.prefer ?? "").toString().includes("return=representation")) {
        if (single) {
          return matched.length === 1
            ? send(res, 200, project(matched[0], select))
            : send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" });
        }
        return send(res, 200, matched.map((row) => project(row, select)));
      }
      return send(res, 204, undefined);
    }

    if (req.method === "DELETE") {
      const keep = rows.filter((row) => !rowMatches(row));
      db[table] = keep;
      if ((req.headers.prefer ?? "").toString().includes("return=representation")) {
        return send(res, 200, []);
      }
      return send(res, 204, undefined);
    }

    return send(res, 405, { message: "method not mocked" });
  }

  return send(res, 404, { message: `no route for ${req.method} ${pathname}` });
});

function log(req, pathname) {
  if (process.env.MOCK_QUIET === "1") return;
  console.log(`[mock] ${req.method} ${pathname}`);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log("──────────────────────────────────────────────────────────");
  console.log(" Baduma dev Supabase mock (NOT for production)");
  console.log(`   URL            : http://127.0.0.1:${PORT}`);
  console.log(`   anon key       : ${ANON_KEY}`);
  console.log(`   service key    : ${SERVICE_KEY}`);
  console.log(`   admin email    : ${ADMIN_EMAIL}`);
  console.log(`   admin username : ${ADMIN_USERNAME}`);
  console.log(`   admin password : ${ADMIN_PASSWORD}`);
  console.log(`   staff login    : ${STAFF_USERNAME} / ${STAFF_PASSWORD}`);
  console.log(`   driver login   : drv-demo / ${process.env.MOCK_DRIVER_PASSWORD ?? "DriverDemo#2026"}`);
  console.log("──────────────────────────────────────────────────────────");
});
