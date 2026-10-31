import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_LOGIN_PATH, isAdminToken } from "./lib/adminAuth";

/**
 * Protects every /admin/* route. Only Supabase users whose JWT role claim is
 * `admin` may pass. Unauthenticated visitors are redirected to /admin/login;
 * authenticated admins visiting the login page are bounced to /admin.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === ADMIN_LOGIN_PATH;
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const isAdmin = isAdminToken(token);

  if (isLoginPage) {
    if (isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = ADMIN_LOGIN_PATH;
    url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    const res = NextResponse.redirect(url);
    res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
