import { NextResponse } from "next/server";
import { EMPLOYEE_COOKIE } from "@/lib/employeeSession";

/**
 * POST /api/employee/logout — clears the staff session cookie.
 * Also revoking on the client is harmless (the token is stateless), and the
 * cookie is httpOnly so only the server can clear it properly.
 */
export async function POST() {
  const res = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(EMPLOYEE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
