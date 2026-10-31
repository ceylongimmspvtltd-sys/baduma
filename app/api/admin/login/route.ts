import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_ACCESS_MAX_AGE,
  ADMIN_COOKIE,
  accessTokenMaxAge,
  adminCookieOptions,
  isAdminUser,
  normalizeIdentifier,
  type SupabaseUser,
} from "@/lib/adminAuth";
import { createAnonServerClient, createServiceClient, getServiceRoleKey } from "@/lib/supabaseServer";
import { clientIp, pruneRateLimitStore, rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/admin/login — Backend / Master-Admin sign-in.
 *
 * This is the ONLY way into the admin portal, and it is deliberately different
 * from the customer flow:
 *
 *   customer : phone/email OTP, no password, never gets staff routes
 *   admin    : email (or mapped username) + password, verified server-side,
 *              role checked in `app_metadata`, httpOnly cookies issued
 *
 * Why the previous login failed:
 *   The form called `supabase.auth.signInWithPassword()` in the browser and
 *   then POSTed the resulting token to `/api/admin/session`, which accepted ANY
 *   valid Supabase user (no role check) and stored it in a cookie that the
 *   middleware validated with a *decoded, unverified* JWT. Meanwhile staff
 *   accounts created by `/api/admin/employees` live only in `public.employees`
 *   (username + scrypt hash) — they have no `auth.users` row and no email, so
 *   Supabase Auth can never authenticate them. Typing the generated username
 *   therefore failed with "invalid email"/"missing username" style errors.
 *
 * Now: username → email mapping happens server-side against `admin_users`,
 * credentials are verified by GoTrue, the admin role is read from
 * `app_metadata` (never `user_metadata`), and the tokens stay in httpOnly
 * cookies (never in JS-accessible storage).
 */

const IP_LIMIT = 10; // attempts per IP per window
const IDENTIFIER_LIMIT = 5; // attempts per identifier per window
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const GENERIC_CREDENTIALS_ERROR = "Invalid email/username or password.";

type LoginBody = { identifier?: unknown; email?: unknown; username?: unknown; password?: unknown };

type VerifiedSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SupabaseUser;
};

function jsonError(message: string, status: number, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store", ...extraHeaders } }
  );
}

/** Resolve `username` → email using the service-role-only `admin_users` table. */
async function resolveUsername(username: string): Promise<string | null> {
  if (!getServiceRoleKey()) return null;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("email, is_active")
      .eq("username", username)
      .maybeSingle();
    if (error || !data || data.is_active === false) return null;
    return typeof data.email === "string" ? data.email.toLowerCase() : null;
  } catch {
    return null;
  }
}

async function verifyCredentials(email: string, password: string): Promise<VerifiedSession | null> {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) return null;
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in > 0 ? data.session.expires_in : ADMIN_ACCESS_MAX_AGE,
    user: data.user as SupabaseUser,
  };
}

/** Revoke a session that authenticated but is not allowed into the backend. */
async function revokeSession(accessToken: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return;
  try {
    await fetch(`${url.replace(/\/+$/, "")}/auth/v1/logout?scope=global`, {
      method: "POST",
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    /* best effort */
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  pruneRateLimitStore();

  const ip = clientIp(req);
  const ipLimit = rateLimit(`admin-login:ip:${ip}`, IP_LIMIT, WINDOW_MS);
  if (!ipLimit.ok) {
    return jsonError("Too many sign-in attempts. Try again in a few minutes.", 429, {
      "Retry-After": String(ipLimit.retryAfterSeconds),
    });
  }

  const body = (await req.json().catch(() => null)) as LoginBody | null;
  const identifier = normalizeIdentifier(body?.identifier ?? body?.email ?? body?.username);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!identifier || !password) {
    return jsonError("Email (or username) and password are required.", 400);
  }
  if (password.length > 1024) {
    return jsonError(GENERIC_CREDENTIALS_ERROR, 401);
  }

  const identifierLimit = rateLimit(`admin-login:id:${identifier}`, IDENTIFIER_LIMIT, WINDOW_MS);
  if (!identifierLimit.ok) {
    return jsonError("Too many sign-in attempts for this account. Try again later.", 429, {
      "Retry-After": String(identifierLimit.retryAfterSeconds),
    });
  }

  // 1 — Map a username to its admin email (optional feature, admin_users table).
  let email = identifier;
  if (!identifier.includes("@")) {
    const mapped = await resolveUsername(identifier);
    if (!mapped) return jsonError(GENERIC_CREDENTIALS_ERROR, 401);
    email = mapped;
  }

  // 2 — Verify the password with Supabase Auth (server-side, anon key).
  let session: VerifiedSession | null = null;
  try {
    session = await verifyCredentials(email, password);
  } catch {
    return jsonError("Sign-in is temporarily unavailable. Please try again.", 503);
  }
  if (!session) return jsonError(GENERIC_CREDENTIALS_ERROR, 401);

  // 3 — Authorisation: backend access requires the admin role in app_metadata.
  if (!isAdminUser(session.user)) {
    await revokeSession(session.accessToken);
    return jsonError("This account does not have backend admin access.", 403);
  }

  // 4 — Issue httpOnly cookies.
  //
  // The admin dashboard still reads/writes Postgres directly under RLS, so the
  // same session is also returned once (no-store) for `supabase.auth.setSession`
  // in the browser. Middleware and every /api/admin/* route trust ONLY the
  // httpOnly cookie, never the value stored client-side.
  // See docs/security-audit.md → "Roadmap" for moving CRUD behind API proxies.
  const res = NextResponse.json(
    {
      success: true,
      user: { id: session.user.id, email: session.user.email ?? email },
      session: {
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
        expires_in: session.expiresIn,
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );

  res.cookies.set(
    ADMIN_COOKIE,
    session.accessToken,
    adminCookieOptions(accessTokenMaxAge(session.accessToken) || ADMIN_ACCESS_MAX_AGE)
  );

  // 5 — Best-effort audit trail (does not block sign-in).
  if (getServiceRoleKey()) {
    try {
      const admin = createServiceClient();
      await admin
        .from("admin_users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("user_id", session.user.id);
    } catch {
      /* non-critical */
    }
  }

  return res;
}

/** No GET: tokens must never be created from a query string. */
export function GET(): NextResponse {
  return jsonError("Method not allowed", 405);
}
