/**
 * Shared Master Admin auth helpers.
 * Used by middleware.ts (Edge runtime) and app/api/admin/* routes (Node runtime).
 * Edge-safe: atob / TextDecoder instead of Buffer.
 */

export const ADMIN_COOKIE = "admin_session";
export const ADMIN_LOGIN_PATH = "/admin/login";

export type JwtPayload = {
  exp?: number;
  sub?: string;
  email?: string;
  app_metadata?: { role?: string };
  user_metadata?: { role?: string; full_name?: string; email?: string };
};

export function decodeJwtPayload(token: string | undefined | null): JwtPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  try {
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload;
  } catch {
    return null;
  }
}

/** True only for valid, unexpired JWTs whose role claim is `admin`. */
export function isAdminToken(token: string | undefined | null): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) return false;
  const role = payload.user_metadata?.role ?? payload.app_metadata?.role;
  return role === "admin";
}
