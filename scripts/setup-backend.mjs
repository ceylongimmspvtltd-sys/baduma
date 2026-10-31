#!/usr/bin/env node
/**
 * scripts/setup-backend.mjs — one command to make the Admin/Backend login work.
 *
 * It does, in order:
 *   1. preflight   — checks the env vars and that Supabase answers
 *   2. schema      — verifies the tables the login needs actually exist
 *                    (optionally APPLIES the migrations for you)
 *   3. admin user  — creates or resets the master admin (create-admin.mjs)
 *   4. prove it    — performs a real password grant against GoTrue
 *   5. printout    — the exact login URL, username, email and password
 *
 * Usage (minimum — email + password auto-generated if you omit them):
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *   node scripts/setup-backend.mjs owner@baduma.lk
 *
 * Optional extras:
 *   --username baduma-owner     username that maps to the email
 *   --password '<pw>'           use your own password (else one is generated)
 *   --name "Master Admin"       display name
 *   SUPABASE_ACCESS_TOKEN=...   a Supabase *personal access token*
 *                               (Dashboard → Account → Access Tokens) — lets the
 *                               script run the SQL migrations through the
 *                               Management API instead of you pasting them.
 *   SUPABASE_PROJECT_REF=...    needed with the token if the URL is unusual
 *
 * Safe to run as many times as you like: the migrations are idempotent and an
 * existing admin is updated (password reset) instead of duplicated.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

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
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  ""
).replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ??
  SUPABASE_URL.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ??
  "";

/* ------------------------------------------------------------------ */
/* output helpers                                                      */
/* ------------------------------------------------------------------ */

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

let step = 0;
const stepTitle = (t) => console.log(`\n${C.bold(`[${++step}] ${t}`)}`);
const ok = (t) => console.log(`    ${C.green("✔")} ${t}`);
const warn = (t) => console.log(`    ${C.yellow("!")} ${t}`);

function die(title, detail, fix) {
  console.error(`\n${C.red(`✖ ${title}`)}`);
  if (detail) console.error(`  ${detail}`);
  if (fix) console.error(`\n  ${C.cyan("Fix:")} ${fix}`);
  console.error("");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* args                                                                */
/* ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
function flag(name, fallback = undefined) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
}

const email = (argv.find((a) => a.includes("@") && !a.startsWith("--")) ?? "").trim();
const username = flag("username", email ? email.split("@")[0] : "baduma-admin");
const displayName = flag("name", "Master Admin");
const givenPassword = flag("password", null);

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

async function rest(pathname, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${pathname}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not json */
  }
  return { status: res.status, json, text };
}

function generatePassword() {
  const words = ["Roti", "Kottu", "Lamprais", "Ceylon", "Sambol", "Hopper", "Curry", "Tea"];
  const word = words[crypto.randomInt(words.length)];
  const bytes = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${word}Ceylon@${bytes}`;
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(C.bold("\n🍚 Baduma — backend login setup\n"));
  console.log(C.dim("   This sets up the Admin/Backend portal login. The customer site"));
  console.log(C.dim("   stays password-less (OTP only) — nothing here touches it.\n"));

  /* ---------- 1. preflight ---------- */
  stepTitle("Checking configuration");

  if (!SUPABASE_URL) {
    die(
      "SUPABASE_URL is missing",
      "Point it at your Supabase project, e.g. https://abcdefgh.supabase.co",
      "SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/setup-backend.mjs you@example.com"
    );
  }
  if (!SERVICE_KEY) {
    die(
      "SUPABASE_SERVICE_ROLE_KEY is missing",
      "The anon key cannot create users or write app_metadata — you need the service_role key.",
      "Supabase Dashboard → Project Settings → API → Project API keys → service_role → copy"
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    die(
      "A valid admin email is required",
      `Got: ${email ? JSON.stringify(email) : "nothing"}`,
      `node scripts/setup-backend.mjs owner@baduma.lk --username baduma-owner`
    );
  }
  if (/your-|example|changeme|xxx/i.test(SUPABASE_URL + SERVICE_KEY)) {
    die("Placeholder values detected", "You pasted a template, not real credentials.", "Copy the real values from Project Settings → API.");
  }

  ok(`project   ${SUPABASE_URL}`);
  ok(`admin     ${email}${username ? ` (username: ${username})` : ""}`);

  /* ---------- 2. connectivity ---------- */
  stepTitle("Talking to Supabase");

  let ping;
  try {
    ping = await rest("/rest/v1/", { method: "HEAD" });
  } catch (err) {
    die(
      "Cannot reach that Supabase URL",
      `${err.code ?? ""} ${err.message}`.trim(),
      "Check the URL (no trailing slash needed, https://), and that your network allows it."
    );
  }
  if (ping.status >= 500) die(`Supabase returned HTTP ${ping.status}`, ping.text.slice(0, 200), "Is the project paused? Unpause it in the dashboard.");
  ok("Supabase answers");

  /* ---------- 3. schema ---------- */
  stepTitle("Checking the database schema");

  const REQUIRED = [
    { table: "admin_users", purpose: "username → email mapping for admin login" },
    { table: "employees", purpose: "staff (POS / kitchen / driver) logins" },
    { table: "products", purpose: "server-side order pricing" },
    { table: "orders", purpose: "the ordering pipeline" },
  ];

  const missing = [];
  for (const { table, purpose } of REQUIRED) {
    const res = await rest(`/rest/v1/${table}?select=*&limit=1`);
    if (res.status === 200) {
      ok(`${table.padEnd(12)} ${C.dim(purpose)}`);
    } else if (res.status === 404 || /does not exist|Could not find the table/i.test(res.text)) {
      missing.push({ table, purpose });
      warn(`${table.padEnd(12)} ${C.red("MISSING")} ${C.dim(purpose)}`);
    } else {
      warn(`${table.padEnd(12)} HTTP ${res.status} ${C.dim(res.text.slice(0, 90))}`);
    }
  }

  const sqlDir = path.join(process.cwd(), "supabase", "migrations");
  const sqlFiles = existsSync(sqlDir)
    ? ["otp_codes.sql", "20261031_backend_auth_hardening.sql", "20261101_orders.sql"].filter((f) =>
        existsSync(path.join(sqlDir, f))
      )
    : [];

  if (missing.length > 0) {
    if (ACCESS_TOKEN && PROJECT_REF) {
      console.log(`\n    ${C.cyan("Applying migrations via the Supabase Management API…")}`);
      for (const file of sqlFiles) {
        const sql = readFileSync(path.join(sqlDir, file), "utf8");
        const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
          method: "POST",
          headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: sql }),
        });
        if (res.ok) ok(`applied ${file}`);
        else {
          const body = await res.text();
          die(
            `Failed to apply ${file}`,
            `HTTP ${res.status} ${body.slice(0, 300)}`,
            "Your access token must be a *personal access token* with access to this project."
          );
        }
      }
    } else {
      console.error(`\n    ${C.yellow("The database is not ready yet.")}`);
      console.error(`    Run these in Supabase → SQL Editor (New query → paste → Run):\n`);
      for (const file of sqlFiles) console.error(`      ${C.cyan(`supabase/migrations/${file}`)}`);
      console.error(`\n    ${C.dim("(Or re-run with SUPABASE_ACCESS_TOKEN=... and the script applies them for you.)")}`);
      die("Stopped before creating the login", "The admin user would have nowhere to attach.");
    }
  } else {
    ok("all required tables present");
  }

  /* ---------- 4. create / reset the admin ---------- */
  stepTitle("Creating the master admin");

  const password = typeof givenPassword === "string" && givenPassword.length > 0 ? givenPassword : generatePassword();
  if (password.length < 12) die("Password too short", "Use at least 12 characters.");

  const childArgs = [
    path.join("scripts", "create-admin.mjs"),
    email,
    "--username",
    String(username),
    "--name",
    String(displayName),
    "--password",
    password,
  ];

  let adminJson = null;
  try {
    const out = execFileSync(process.execPath, childArgs, {
      cwd: process.cwd(),
      env: { ...process.env, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    console.log(out.trim().split("\n").map((l) => `    ${C.dim(l)}`).join("\n"));
  } catch (err) {
    die(
      "Could not create the admin user",
      (err.stderr || err.message || "").toString().slice(0, 600),
      "Check that the service_role key belongs to the same project as SUPABASE_URL."
    );
  }

  /* ---------- 5. prove the login works ---------- */
  stepTitle("Proving the login works (real password grant)");

  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? SERVICE_KEY;

  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await login.json().catch(() => ({}));

  if (!login.ok || !session.access_token) {
    die(
      "Login verification failed",
      `${session.error_description ?? session.msg ?? session.error ?? login.status}`,
      "If this says 'Email not confirmed', confirm the user in Dashboard → Authentication → Users, or run create-admin.mjs again (it confirms the address)."
    );
  }
  ok("email + password accepted by GoTrue");

  const role = session.user?.app_metadata?.role ?? "(none)";
  if (role === "admin") ok(`app_metadata.role = ${C.green("admin")}`);
  else warn(`app_metadata.role = ${role} — /admin may refuse this account`);

  const map = await rest(
    `/rest/v1/admin_users?user_id=eq.${encodeURIComponent(session.user.id)}&select=username,email`
  );
  if (map.status === 200 && Array.isArray(map.json) && map.json.length > 0) {
    ok(`username "${map.json[0].username}" maps to this account`);
  } else {
    warn("no admin_users row for this account — username login will not work, email will");
  }

  /* ---------- 6. does the running site accept it? ---------- */
  const appUrl = (process.env.APP_URL ?? flag("verify", "") ?? "").replace(/\/+$/, "");
  if (appUrl) {
    stepTitle(`Signing in through the running app (${appUrl})`);
    try {
      const res = await fetch(`${appUrl}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: String(username), password }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.success) {
        ok("/api/admin/login accepted the credentials — /admin will open");
      } else if (res.status === 503) {
        warn("the app returned 503 — its server env is incomplete (SUPABASE_SERVICE_ROLE_KEY / EMPLOYEE_SESSION_SECRET)");
      } else {
        warn(`the app returned HTTP ${res.status}: ${body?.error ?? body?.message ?? "unknown"}`);
      }
      const page = await fetch(`${appUrl}/admin`, { redirect: "manual" }).catch(() => null);
      if (page) {
        warn(
          `/admin without a cookie → HTTP ${page.status} ${C.dim(page.status === 307 || page.status === 302 ? "(redirect to login — correct)" : "(expected a redirect!)")}`
        );
      }
    } catch (err) {
      warn(`could not reach ${appUrl} — ${err.message}`);
    }
  }

  /* ---------- 7. the handover card ---------- */
  const loginUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  console.log(`\n${"─".repeat(64)}`);
  console.log(C.green(C.bold("  ✅ BACKEND LOGIN IS READY")));
  console.log(`${"─".repeat(64)}`);
  console.log(`  Login page : ${C.cyan(`${loginUrl.replace(/\/+$/, "")}/admin/login`)}`);
  console.log(`  Username   : ${C.bold(String(username))}`);
  console.log(`  Password   : ${C.bold(password)}`);
  console.log(`  Email      : ${email}   ${C.dim("(email login works too)")}`);
  console.log(`${"─".repeat(64)}`);
  console.log(C.dim("  Save that password in your password manager now — it is not stored anywhere."));
  console.log(C.dim("  Customer site stays OTP-only; this account only opens /admin."));
  console.log(C.dim("  Re-run this script any time to reset the password.\n"));
}

main().catch((err) => {
  console.error(`\n${C.red("✖ setup crashed")}`);
  console.error(err?.stack ?? err);
  process.exit(1);
});
