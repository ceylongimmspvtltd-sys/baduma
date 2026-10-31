#!/usr/bin/env node
/**
 * scripts/verify-security.mjs — repeatable security smoke test.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/verify-security.mjs
 *   BASE_URL=https://baduma.vercel.app EMPLOYEE_SESSION_SECRET=... node scripts/verify-security.mjs
 *
 * Checks (no credentials required — everything asserted here must FAIL closed):
 *   1. customer storefront + OTP login are public
 *   2. /admin redirects anonymous visitors to the login page
 *   3. a FORGED admin cookie (valid-looking JWT, no signature) is rejected
 *   4. /api/admin/* returns 401 for anonymous and forged callers
 *   5. /api/admin/session refuses to plant an unverified token
 *   6. /pos, /driver, /employee are staff-only
 *   7. admin login is rate-limited
 *   8. security headers are present
 *
 * With EMPLOYEE_SESSION_SECRET set it also signs real staff tokens and checks
 * the role matrix (Manager → /pos, Kitchen → /pos, Driver → /driver only).
 *
 * Exit code 0 = all checks passed.
 */

import { webcrypto } from "node:crypto";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const SECRET = process.env.EMPLOYEE_SESSION_SECRET ?? "";

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function req(path, { cookie, method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect: "manual",
    cache: "no-store",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, location: res.headers.get("location"), headers: res.headers };
}

/** Forged admin token: headed/payload look perfect, signature is junk. */
const FORGED_ADMIN = (() => {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return [
    b64({ alg: "HS256", typ: "JWT" }),
    b64({ sub: "00000000-0000-0000-0000-000000000000", exp: now + 3600, app_metadata: { role: "admin" } }),
    "not-a-real-signature",
  ].join(".");
})();

async function staffToken(position, permission, ttl = 3600) {
  if (!SECRET) return null;
  const enc = new TextEncoder();
  const payload = {
    sub: "11111111-1111-1111-1111-111111111111",
    username: `${position.toLowerCase()}test`,
    position,
    permission_level: permission,
    exp: Math.floor(Date.now() / 1000) + ttl,
  };
  const bodyPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const key = await webcrypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await webcrypto.subtle.sign("HMAC", key, enc.encode(bodyPart));
  return `${bodyPart}.${Buffer.from(new Uint8Array(sig)).toString("base64url")}`;
}

async function main() {
  console.log(`\n🔎 Baduma security smoke test → ${BASE}\n`);

  // 1 — public surfaces
  const home = await req("/");
  record("customer storefront is public", home.status === 200, `HTTP ${home.status}`);
  const login = await req("/login");
  record("customer OTP login page is public", login.status === 200, `HTTP ${login.status}`);

  // 2 — admin redirect
  const admin = await req("/admin");
  record(
    "anonymous /admin redirects to /admin/login",
    admin.status === 307 && (admin.location ?? "").includes("/admin/login"),
    `HTTP ${admin.status} → ${admin.location ?? "-"}`
  );

  // 3 — forged cookie
  const forged = await req("/admin", { cookie: `baduma_admin_access=${FORGED_ADMIN}` });
  record(
    "forged admin cookie is rejected",
    forged.status === 307 && (forged.location ?? "").includes("/admin/login"),
    `HTTP ${forged.status} → ${forged.location ?? "-"}`
  );

  // 4 — admin APIs
  for (const path of ["/api/admin/employees", "/api/admin/settings", "/api/admin/session"]) {
    const anon = await req(path);
    record(`anonymous ${path} → 401`, anon.status === 401, `HTTP ${anon.status}`);
  }
  const forgedApi = await req("/api/admin/employees", { cookie: `baduma_admin_access=${FORGED_ADMIN}` });
  record("forged cookie on /api/admin/employees → 401", forgedApi.status === 401, `HTTP ${forgedApi.status}`);

  // 5 — session planting
  const plant = await req("/api/admin/session", {
    method: "POST",
    body: { access_token: FORGED_ADMIN },
  });
  record(
    "unverified token cannot be planted via /api/admin/session",
    plant.status === 401 || plant.status === 403,
    `HTTP ${plant.status}`
  );

  // 6 — staff-only routes
  for (const path of ["/pos", "/driver"]) {
    const anon = await req(path);
    record(`anonymous ${path} redirects to staff login`, anon.status === 307, `HTTP ${anon.status} → ${anon.location ?? "-"}`);
  }
  const api = await req("/api/employee/login", { method: "POST", body: {} });
  record("/api/employee/login rejects an empty body", api.status === 400, `HTTP ${api.status}`);

  // 7 — rate limiting (identifier limit is 5 / 10 min)
  const codes = [];
  for (let i = 0; i < 6; i += 1) {
    const r = await req("/api/admin/login", {
      method: "POST",
      body: { identifier: "smoke-test@example.com", password: "wrong-password" },
    });
    codes.push(r.status);
  }
  record(
    "admin login is rate-limited (429 after 5 attempts)",
    codes.includes(429),
    `statuses: ${codes.join(", ")}`
  );

  // 8 — headers
  const headers = home.headers;
  const csp = headers.get("content-security-policy") ?? "";
  record("Content-Security-Policy present", csp.includes("default-src"), csp.slice(0, 60));
  record("X-Frame-Options: DENY", headers.get("x-frame-options") === "DENY");
  record("X-Content-Type-Options: nosniff", headers.get("x-content-type-options") === "nosniff");
  record("X-Powered-By removed", headers.get("x-powered-by") === null);

  // 9 — staff role matrix (needs the signing secret)
  if (!SECRET) {
    console.log("\nℹ️  EMPLOYEE_SESSION_SECRET not set — skipping the staff role matrix.\n");
  } else {
    const manager = await staffToken("Manager", "full");
    const kitchen = await staffToken("Kitchen", "orders");
    const driver = await staffToken("Driver", "delivery");
    const viewer = await staffToken("Manager", "viewer");
    const expired = await staffToken("Manager", "full", -60);
    const cookie = (t) => `baduma_employee_session=${t}`;

    const posMgr = await req("/pos", { cookie: cookie(manager) });
    record("Manager(full) can open /pos", posMgr.status === 200, `HTTP ${posMgr.status}`);

    const posKitchen = await req("/pos", { cookie: cookie(kitchen) });
    record("Kitchen(orders) can open /pos", posKitchen.status === 200, `HTTP ${posKitchen.status}`);

    const posViewer = await req("/pos", { cookie: cookie(viewer) });
    record("Manager(viewer) is denied /pos", posViewer.status === 307, `HTTP ${posViewer.status}`);

    const posDriver = await req("/pos", { cookie: cookie(driver) });
    record("Driver is denied /pos", posDriver.status === 307, `HTTP ${posDriver.status}`);

    const drvDriver = await req("/driver", { cookie: cookie(driver) });
    record("Driver can open /driver", drvDriver.status === 200, `HTTP ${drvDriver.status}`);

    const drvKitchen = await req("/driver", { cookie: cookie(kitchen) });
    record("Kitchen is denied /driver", drvKitchen.status === 307, `HTTP ${drvKitchen.status}`);

    const expiredRes = await req("/pos", { cookie: cookie(expired) });
    record("expired staff token is rejected", expiredRes.status === 307, `HTTP ${expiredRes.status}`);

    const tampered = await req("/pos", { cookie: cookie(`${manager.slice(0, -2)}xx`) });
    record("tampered staff signature is rejected", tampered.status === 307, `HTTP ${tampered.status}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length === 0 ? "🎉 all checks passed" : `⚠️  ${failed.length} check(s) FAILED`} — ${results.length - failed.length}/${results.length}\n`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n❌ smoke test crashed:", err);
  process.exit(1);
});
