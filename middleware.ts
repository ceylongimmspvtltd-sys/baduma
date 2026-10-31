import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_LOGIN_PATH,
  adminCookieOptions,
  fetchSupabaseUser,
  isAdminUser,
  safeNextPath,
} from "./lib/adminAuth";
import {
  EMPLOYEE_COOKIE,
  EMPLOYEE_LOGIN_PATH,
  ROLE_HOME,
  canAccessPath,
  verifyEmployeeToken,
} from "./lib/employeeSession";

/**
 * Route protection for every non-customer surface.
 *
 *  /admin/*          → Supabase-verified admin session (app_metadata.role)
 *  /pos/*            → Manager staff session (full / orders permission)
 *  /driver/*         → Driver staff session (or Manager)
 *  /employee/*       → staff session (login page itself is public)
 *  /api/admin/*      → verified admin session (JSON 401, not a redirect)
 *  /api/employee/*   → public login endpoint, protected routes behind it
 *
 * Customer routes /, /login, /profile, /cart, /loyalty… are intentionally
 * untouched: the storefront stays password-less OTP only.
 *
 * Every decision is made with *server-side verification*:
 *   - admin tokens are checked against Supabase Auth (`/auth/v1/user`), so a
 *     forged or decoded-only JWT can never pass
 *   - staff tokens are HMAC-verified (signature + expiry), not merely decoded
 *
 * Token refresh is handled by the browser Supabase client (which owns the
 * refresh token and rotation), and the resulting access token is synchronised
 * into the httpOnly cookie by `POST /api/admin/session` after the server
 * re-verifies it. That avoids two refreshers fighting over token rotation.
 */

async function handleAdmin(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;
  const isLoginPage = pathname === ADMIN_LOGIN_PATH;
  const isApi = pathname.startsWith("/api/");

  const accessToken = req.cookies.get(ADMIN_COOKIE)?.value;
  const user = accessToken ? await fetchSupabaseUser(accessToken) : null;
  const isAdmin = isAdminUser(user);

  if (isLoginPage) {
    if (isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isAdmin) return NextResponse.next();

  const res = isApi
    ? NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      )
    : (() => {
        const url = req.nextUrl.clone();
        url.pathname = ADMIN_LOGIN_PATH;
        url.search = `?next=${encodeURIComponent(safeNextPath(pathname + search))}`;
        return NextResponse.redirect(url);
      })();

  // Never keep a token we could not verify.
  if (accessToken) res.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(0), maxAge: 0 });
  return res;
}

async function handleStaff(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isLoginPage = pathname === EMPLOYEE_LOGIN_PATH;

  // Legacy driver OTP page: the page itself redirects to the staff sign-in
  // (drivers are staff, not customers). Keep it reachable so it can redirect.
  if (pathname === "/driver/login") return NextResponse.next();

  const token = req.cookies.get(EMPLOYEE_COOKIE)?.value;
  const session = await verifyEmployeeToken(token);

  if (isLoginPage) {
    if (session) {
      const url = req.nextUrl.clone();
      url.pathname = ROLE_HOME[session.position] ?? "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isApi) {
    // /api/employee/login is public; everything else needs a staff session.
    if (pathname === "/api/employee/login") return NextResponse.next();
    return session
      ? NextResponse.next()
      : NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  if (session && canAccessPath(session, pathname)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = EMPLOYEE_LOGIN_PATH;
  url.search = session
    ? "?error=forbidden"
    : `?next=${encodeURIComponent(safeNextPath(pathname + search, "/employee/login"))}`;
  const res = NextResponse.redirect(url);
  if (token && !session) {
    res.cookies.set(EMPLOYEE_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // The login + session endpoints manage their own cookies and must stay
    // reachable (they verify credentials / tokens themselves).
    if (pathname === "/api/admin/login" || pathname === "/api/admin/session") {
      return NextResponse.next();
    }
    return handleAdmin(req);
  }

  return handleStaff(req);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/pos/:path*",
    "/driver/:path*",
    "/employee/:path*",
    "/api/admin/:path*",
    "/api/employee/:path*",
  ],
};
