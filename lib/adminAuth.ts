/**
 * lib/adminAuth.ts — Backend / Master-Admin session helpers.
 *
 * RUNS IN BOTH RUNTIMES (Edge middleware + Node route handlers): no Node
 * built-ins are imported here.
 *
 * ── Why this file was rewritten ─────────────────────────────────────────────
 * The previous version authorised requests by *decoding* the JWT payload and
 * reading `user_metadata.role === "admin"`. That is broken twice over:
 *
 *   1. `decodeJwtPayload()` never verifies the signature, so anybody could set
 *      `admin_session=<header>.<forged payload>.x` and be treated as admin.
 *   2. `user_metadata` is user-writable: any signed-in customer could call
 *      `supabase.auth.updateUser({ data: { role: "admin" } })` and become an
 *      admin — in the middleware *and* in every RLS policy that checked it.
 *
 * This version treats the Supabase access token as an opaque bearer token and
 * lets the Auth server verify it (`GET /auth/v1/user`). The admin role is read
 * ONLY from `app_metadata`, which can be written exclusively with the service
 * role key (or by the `public.admin_users` allowlist).
 */

export const ADMIN_COOKIE = "baduma_admin_access";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME = "/admin";

/**
 * Fallback access-token cookie lifetime when Supabase does not return
 * `expires_in`. The real value comes from the token itself.
 */
export const ADMIN_ACCESS_MAX_AGE = 60 * 60; // 1h

/**
 * Remaining lifetime (seconds) of a Supabase access token, read from its `exp`.
 * Used so the httpOnly cookie expires exactly when the token does — an expired
 * cookie is a cleaner signal than a stale-but-present one.
 */
export function accessTokenMaxAge(accessToken: string | undefined | null): number {
  if (!accessToken) return ADMIN_ACCESS_MAX_AGE;
  try {
    // Edge-safe base64url decode (no Buffer in the Edge runtime).
    const segment = accessToken.split(".")[1] ?? "";
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(
      atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4))
    ) as { exp?: number };
    if (typeof payload.exp !== "number") return ADMIN_ACCESS_MAX_AGE;
    const remaining = payload.exp - Math.floor(Date.now() / 1000);
    return remaining > 0 ? remaining : 0;
  } catch {
    return ADMIN_ACCESS_MAX_AGE;
  }
}

export type SupabaseUser = {
  id: string;
  email?: string;
  phone?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  identities?: unknown[];
};

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ""), anonKey };
}

/**
 * Verify a Supabase access token against the Auth server.
 * Returns the canonical user record, or `null` when the token is missing,
 * expired, revoked or forged.
 */
export async function fetchSupabaseUser(accessToken: string | undefined | null): Promise<SupabaseUser | null> {
  const config = getSupabaseConfig();
  if (!config || !accessToken) return null;

  try {
    const res = await fetch(`${config.url}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      // Never cache an auth decision.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const user = (await res.json()) as SupabaseUser;
    if (!user?.id) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Admin authorisation predicate.
 *
 * ONLY `app_metadata` is trusted — never `user_metadata`, which the account
 * owner can rewrite at any time.
 *
 * Accepted shapes (set with the service-role key only):
 *   app_metadata.role     = "admin"
 *   app_metadata.roles    = ["admin", ...]
 *   app_metadata.is_admin = true
 */
export function isAdminUser(user: SupabaseUser | null | undefined): boolean {
  if (!user?.app_metadata) return false;
  const meta = user.app_metadata;
  if (meta.role === "admin") return true;
  if (meta.is_admin === true) return true;
  if (Array.isArray(meta.roles) && meta.roles.includes("admin")) return true;
  return false;
}

export type AdminIdentity = {
  user: SupabaseUser;
  accessToken: string;
};

/**
 * Resolve and verify the admin identity from the request cookies.
 * Returns `null` for anonymous, expired, forged or non-admin sessions.
 */
export async function getAdminIdentity(
  cookieValue: string | undefined | null
): Promise<AdminIdentity | null> {
  if (!cookieValue) return null;
  const user = await fetchSupabaseUser(cookieValue);
  if (!user || !isAdminUser(user)) return null;
  return { user, accessToken: cookieValue };
}

/* ------------------------------------------------------------------ */
/* Cookie helpers                                                      */
/* ------------------------------------------------------------------ */

export type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "strict";
  path: string;
  maxAge: number;
};

export function adminCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // lax = top-level navigations still send the cookie; CSRF-safe for POSTs via SameSite
    path: "/",
    maxAge,
  };
}

/**
 * `next` redirect targets must be local paths. Blocks open-redirect payloads
 * such as `//evil.com`, `https://evil.com` and `/\evil.com`.
 */
export function safeNextPath(value: unknown, fallback = ADMIN_HOME): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n\t]/.test(value)) return fallback;
  return value;
}

/** Normalise a login identifier (email or username). */
export function normalizeIdentifier(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}
