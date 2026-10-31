/**
 * scripts/create-admin.mjs — Create (or reset) the Baduma Master Admin account.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   node scripts/create-admin.mjs admin@baduma.lk \
 *     --username baduma-admin \
 *     --name "Master Admin"
 *
 * Options:
 *   --username <u>   also allow signing in with this username (mapped to the
 *                    email through public.admin_users)
 *   --name <n>       display name (default: "Master Admin")
 *   --password <p>   password (>= 12 chars). Omit to auto-generate a 24-char one.
 *   --json           machine-readable output (never logs the password to CI logs
 *                    unless you ask for it — use --json for automation)
 *
 * Requires the SERVICE ROLE key (Project Settings → API). The anon key cannot
 * create users or write app_metadata — that is exactly why the admin role lives
 * in `app_metadata` and not in `user_metadata`.
 *
 * After running this, sign in at /admin/login with the email/username +
 * password. Nothing else needs to be pasted into the browser.
 */

import crypto from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

/* ------------------------------------------------------------------ */
/* env                                                                 */
/* ------------------------------------------------------------------ */

function loadDotEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith("#") && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadDotEnv();

const SUPABASE_URL = (
  process.env.SUPABASE_URL ??
  process.env.SUP_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  ""
).replace(/\/+$/, "");

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUP_ADMIN_KEY ?? "";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!SUPABASE_URL) fail("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).");
if (!SERVICE_KEY) {
  fail(
    "Missing SUPABASE_SERVICE_ROLE_KEY. The anon key cannot create admin users.\n" +
      "   Find it at: Supabase Dashboard → Project Settings → API → service_role."
  );
}
if (/your-|example|changeme/i.test(SUPABASE_URL) || /your-|example|changeme/i.test(SERVICE_KEY)) {
  fail("Placeholder credentials detected. Put real values in .env.local or the environment.");
}

/* ------------------------------------------------------------------ */
/* args                                                                */
/* ------------------------------------------------------------------ */

const args = process.argv.slice(2);
const flags = new Map();
const positional = [];

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg.startsWith("--")) {
    const [key, inlineValue] = arg.slice(2).split("=");
    if (inlineValue !== undefined) {
      flags.set(key, inlineValue);
    } else if (["json"].includes(key)) {
      flags.set(key, true);
    } else {
      flags.set(key, args[i + 1]);
      i += 1;
    }
  } else {
    positional.push(arg);
  }
}

const email = (positional[0] ?? "").trim().toLowerCase();
const cliPassword = flags.get("password") ?? (positional[1] && !positional[1].startsWith("-") ? positional[1] : undefined);
const username = (flags.get("username") ?? "").trim().toLowerCase() || null;
const displayName = (flags.get("name") ?? "Master Admin").trim();
const jsonOut = flags.get("json") === true;

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail("Usage: node scripts/create-admin.mjs <admin-email> --username <username> [--password <password>]");
}
if (username && !/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
  fail("--username must be 3–40 chars: lowercase letters, digits, dot, dash or underscore.");
}
if (cliPassword !== undefined && cliPassword.length < 12) {
  fail("Password must be at least 12 characters.");
}

const password =
  cliPassword ??
  crypto.randomBytes(18).toString("base64url").slice(0, 24) + "Aa1!";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

async function authApi(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error body */
  }
  return { status: res.status, json, text };
}

async function restApi(method, path, body, prefer) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

async function findUserByEmail(target) {
  const res = await authApi("GET", `/admin/users?email=${encodeURIComponent(target)}`);
  if (res.status !== 200 || !Array.isArray(res.json)) return null;
  return res.json.find((u) => u.email?.toLowerCase() === target) ?? null;
}

/* ------------------------------------------------------------------ */
/* create or update                                                    */
/* ------------------------------------------------------------------ */

let user = null;
let action = "";

const createRes = await authApi("POST", "/admin/users", {
  email,
  password,
  email_confirm: true, // no confirmation mail needed for a backend account
  app_metadata: { role: "admin" }, // server-only claim → what RLS/middleware read
  user_metadata: { full_name: displayName },
});

if (createRes.status === 200 || createRes.status === 201) {
  user = createRes.json;
  action = "created";
} else {
  const existing = await findUserByEmail(email);
  if (!existing) {
    fail(`Could not create "${email}": ${createRes.text || createRes.status}`);
  }

  // Strip any legacy `user_metadata.role` — that claim is user-writable and
  // must never be trusted for authorisation.
  const metadata = { ...(existing.user_metadata ?? {}), full_name: displayName };
  delete metadata.role;

  const updateRes = await authApi("PUT", `/admin/users/${existing.id}`, {
    email,
    password,
    email_confirm: true,
    app_metadata: { ...(existing.app_metadata ?? {}), role: "admin" },
    user_metadata: metadata,
  });
  if (updateRes.status !== 200) {
    fail(`Update failed: ${updateRes.text || updateRes.status}`);
  }
  user = updateRes.json;
  action = "updated";
}

if (!user?.id) fail("Supabase did not return the admin user id.");

/* ------------------------------------------------------------------ */
/* username mapping (public.admin_users)                               */
/* ------------------------------------------------------------------ */

let usernameStatus = "not requested";
if (username) {
  const row = {
    user_id: user.id,
    username,
    email,
    display_name: displayName,
    is_active: true,
  };
  const upsert = await restApi(
    "POST",
    "/admin_users?on_conflict=user_id",
    row,
    "resolution=merge-duplicates,return=representation"
  );

  if (upsert.status === 200 || upsert.status === 201) {
    usernameStatus = `mapped (@${username})`;
  } else if (upsert.status === 409) {
    usernameStatus = "conflict: username already in use";
  } else {
    // Table missing is the most common cause: tell the operator what to run.
    usernameStatus = `failed (${upsert.status}): ${upsert.text.slice(0, 200)}`;
    if (/admin_users/.test(upsert.text)) {
      usernameStatus += "\n   → Run supabase/migrations/20261031_backend_auth_hardening.sql first.";
    }
  }
}

/* ------------------------------------------------------------------ */
/* output                                                              */
/* ------------------------------------------------------------------ */

if (jsonOut) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        action,
        user_id: user.id,
        email,
        username,
        username_status: usernameStatus,
        password, // needed once to hand the credential to the owner
        login_path: "/admin/login",
      },
      null,
      2
    )
  );
  process.exit(0);
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  ✅ Master Admin ${action.toUpperCase()}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  LOGIN PATH : /admin/login`);
console.log(`  EMAIL      : ${email}`);
console.log(`  USERNAME   : ${username ? `${username}  (${usernameStatus})` : "(email only)"}`);
console.log(`  PASSWORD   : ${password}`);
console.log(`  ROLE       : app_metadata.role = "admin"  (server-only claim)`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  ⚠️  Treat this output as a secret: it is shown once.");
console.log("  ⚠️  Delete it from shell history / CI logs after you store it.");
console.log("  ℹ️  Sign in from the deployed site or http://localhost:3000/admin/login");
