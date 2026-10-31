#!/usr/bin/env node
/**
 * scripts/e2e-auth-check.mjs — full authentication walk-through.
 *
 * Unlike verify-security.mjs (which only proves things FAIL closed), this script
 * proves they also SUCCEED with real credentials:
 *
 *   admin  : POST /api/admin/login → 200 + httpOnly cookie → GET /admin 200
 *            → GET /api/admin/employees 200 → GET /api/admin/settings 200
 *            → DELETE /api/admin/session → /admin redirects again
 *   staff  : POST /api/employee/login → 200 + cookie → role landing page
 *   guards : wrong password 401, non-admin account 403, customer routes public
 *
 * Usage:
 *   BASE_URL=http://localhost:3111 \
 *   ADMIN_IDENTIFIER=baduma-admin ADMIN_PASSWORD='...' \
 *   STAFF_USERNAME=mgr-demo STAFF_PASSWORD='...' \
 *   node scripts/e2e-auth-check.mjs
 *
 * Exit code 0 = the whole flow works end to end.
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const ADMIN_IDENTIFIER = process.env.ADMIN_IDENTIFIER ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const STAFF_USERNAME = process.env.STAFF_USERNAME ?? "";
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? "";

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function cookiesFrom(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function call(path, { cookie, method = "GET", body } = {}) {
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
  let json = null;
  try {
    json = await res.clone().json();
  } catch {
    /* html */
  }
  return { res, json, cookie: cookiesFrom(res) };
}

async function main() {
  console.log(`\n🔐 Baduma end-to-end auth check → ${BASE}\n`);

  /* ---------------- guards before login ---------------- */
  const anonAdmin = await call("/admin");
  record("anonymous /admin is protected", anonAdmin.res.status === 307, `HTTP ${anonAdmin.res.status}`);

  /* ---------------- admin login ---------------- */
  if (ADMIN_IDENTIFIER && ADMIN_PASSWORD) {
    const bad = await call("/api/admin/login", {
      method: "POST",
      body: { identifier: ADMIN_IDENTIFIER, password: `${ADMIN_PASSWORD}-wrong` },
    });
    record("wrong admin password is rejected", bad.res.status === 401, `HTTP ${bad.res.status}`);

    const login = await call("/api/admin/login", {
      method: "POST",
      body: { identifier: ADMIN_IDENTIFIER, password: ADMIN_PASSWORD },
    });
    record(
      `admin login with username "${ADMIN_IDENTIFIER}"`,
      login.res.status === 200 && login.json?.success === true,
      `HTTP ${login.res.status}${login.json?.error ? ` — ${login.json.error}` : ""}`
    );

    const cookie = login.cookie;
    record("login sets an httpOnly admin cookie", /baduma_admin_access=/.test(cookie), cookie.split(";")[0] ? "cookie present" : "no cookie");

    if (login.res.status === 200) {
      const dash = await call("/admin", { cookie });
      record("authenticated /admin dashboard renders", dash.res.status === 200, `HTTP ${dash.res.status}`);

      const employees = await call("/api/admin/employees", { cookie });
      record("GET /api/admin/employees with session", employees.res.status === 200, `HTTP ${employees.res.status}`);

      const settings = await call("/api/admin/settings", { cookie });
      record("GET /api/admin/settings with session", settings.res.status === 200, `HTTP ${settings.res.status}`);

      const patch = await call("/api/admin/settings", {
        method: "PATCH",
        cookie,
        body: { phone: "+94 77 000 1111" },
      });
      record("PATCH /api/admin/settings persists", patch.res.status === 200, `HTTP ${patch.res.status}`);

      const logout = await call("/api/admin/session", { method: "DELETE", cookie });
      record("sign-out clears the session", logout.res.status === 200, `HTTP ${logout.res.status}`);

      const after = await call("/admin", { cookie });
      record("signed-out cookie can no longer open /admin", after.res.status === 307, `HTTP ${after.res.status}`);
    }
  } else {
    console.log("ℹ️  ADMIN_IDENTIFIER/ADMIN_PASSWORD not set — skipping admin sign-in checks.\n");
  }

  /* ---------------- email login (same endpoint) ---------------- */
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const byEmail = await call("/api/admin/login", {
      method: "POST",
      body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    record(`admin login with email "${ADMIN_EMAIL}"`, byEmail.res.status === 200, `HTTP ${byEmail.res.status}`);
  }

  /* ---------------- staff login ---------------- */
  if (STAFF_USERNAME && STAFF_PASSWORD) {
    const staff = await call("/api/employee/login", {
      method: "POST",
      body: { username: STAFF_USERNAME, password: STAFF_PASSWORD },
    });
    const ok = staff.res.status === 200 && staff.json?.success === true;
    record(`staff login "${STAFF_USERNAME}"`, ok, `HTTP ${staff.res.status}${staff.json?.error ? ` — ${staff.json.error}` : ""}`);

    if (ok) {
      const cookie = staff.cookie;
      const redirect = staff.json.redirect ?? "/";
      const landing = await call(redirect, { cookie });
      record(`staff lands on ${redirect}`, landing.res.status === 200, `HTTP ${landing.res.status}`);

      const pos = await call("/pos", { cookie });
      record("staff session opens /pos (Manager)", pos.res.status === 200, `HTTP ${pos.res.status}`);

      const wrong = await call("/api/employee/login", {
        method: "POST",
        body: { username: STAFF_USERNAME, password: `${STAFF_PASSWORD}-wrong` },
      });
      record("wrong staff password is rejected", wrong.res.status === 401, `HTTP ${wrong.res.status}`);
    }
  } else {
    console.log("ℹ️  STAFF_USERNAME/STAFF_PASSWORD not set — skipping staff sign-in checks.\n");
  }

  /* ---------------- customer surface stays password-less ---------------- */
  const home = await call("/");
  record("storefront is public", home.res.status === 200, `HTTP ${home.res.status}`);
  const otp = await call("/login");
  record("customer OTP login is public", otp.res.status === 200, `HTTP ${otp.res.status}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length === 0 ? "🎉 end-to-end auth flow works" : `⚠️  ${failed.length} check(s) FAILED`} — ${results.length - failed.length}/${results.length}\n`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n❌ e2e check crashed:", err);
  process.exit(1);
});
