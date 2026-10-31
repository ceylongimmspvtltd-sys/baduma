import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  accessTokenMaxAge,
  adminCookieOptions,
  fetchSupabaseUser,
  isAdminUser,
} from "@/lib/adminAuth";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * Admin session endpoint.
 *
 * GET    → { authenticated, user } — verified against Supabase Auth.
 * POST   → synchronises the httpOnly cookie with an access token the browser
 *          client already holds (e.g. after Supabase refreshed it).
 * DELETE → revokes the session at GoTrue and clears the cookie.
 *
 * Why POST is safe now: the token is **verified with the Auth server and the
 * admin role is checked** before it is stored. The old implementation stored
 * any token that decoded to a valid user — no signature check, no role check —
 * which allowed session fixation and forged-cookie escalation.
 */

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const accessToken = req.cookies.get(ADMIN_COOKIE)?.value;
  const user = await fetchSupabaseUser(accessToken);
  if (!user || !isAdminUser(user)) {
    return noStore({ authenticated: false }, 401);
  }
  return noStore({ authenticated: true, user: { id: user.id, email: user.email ?? null } });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limit = rateLimit(`admin-session-sync:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many session refreshes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { access_token?: unknown; token?: unknown };
  const accessToken =
    typeof body.access_token === "string"
      ? body.access_token
      : typeof body.token === "string"
        ? body.token
        : "";

  if (!accessToken) return noStore({ error: "Access token required." }, 400);

  const user = await fetchSupabaseUser(accessToken);
  if (!user) return noStore({ error: "Invalid session." }, 401);
  if (!isAdminUser(user)) return noStore({ error: "Not an admin session." }, 403);

  const maxAge = accessTokenMaxAge(accessToken);
  if (maxAge <= 0) return noStore({ error: "Session expired." }, 401);

  const res = noStore({ success: true });
  res.cookies.set(ADMIN_COOKIE, accessToken, adminCookieOptions(maxAge));
  return res;
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const accessToken = req.cookies.get(ADMIN_COOKIE)?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Revoke server-side so a stolen cookie cannot be replayed.
  if (url && anonKey && accessToken) {
    try {
      await fetch(`${url.replace(/\/+$/, "")}/auth/v1/logout?scope=global`, {
        method: "POST",
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
    } catch {
      /* cookie clearing still proceeds */
    }
  }

  const res = noStore({ success: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(0), maxAge: 0 });
  return res;
}
