import { NextRequest, NextResponse } from "next/server";
import {
  DUMMY_PASSWORD_HASH,
  EMPLOYEE_COOKIE,
  EMPLOYEE_TOKEN_TTL_SECONDS,
  ROLE_HOME,
  signEmployeeToken,
  verifyPassword,
} from "@/lib/employeeAuth";
import { createServiceClient, getServiceRoleKey } from "@/lib/supabaseServer";
import { clientIp, pruneRateLimitStore, rateLimit } from "@/lib/rateLimit";

/**
 * Employee sign-in (mapped username + password).
 *
 * Staff are NOT Supabase Auth users: they are rows in `public.employees` with a
 * scrypt password hash, addressed by a generated username. Customers keep the
 * password-less OTP flow; this endpoint only exists for the backend portal.
 *
 * Hardening vs. the previous version:
 *   - `get_employee_by_username` was SECURITY DEFINER and executable by `anon`,
 *     so anyone with the public anon key could dump every password hash via
 *     `POST /rest/v1/rpc/get_employee_by_username`. The function is now locked
 *     to `service_role` (see supabase/migrations) and only called server-side.
 *   - rate limiting + a dummy scrypt verification prevent brute force and
 *     username enumeration.
 *   - tokens are HMAC-signed with a mandatory 32+ char secret (no insecure
 *     fallback) and live 12h instead of 7 days.
 */

const IP_LIMIT = 20;
const USER_LIMIT = 6;
const WINDOW_MS = 10 * 60 * 1000;

type LoginBody = { username?: unknown; password?: unknown };

function noStore(json: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(json, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

type EmployeeRow = {
  id: string;
  username: string;
  password_hash: string;
  position: string;
  permission_level: string;
  is_active: boolean;
};

export async function POST(req: NextRequest) {
  pruneRateLimitStore();

  const ip = clientIp(req);
  const ipLimit = rateLimit(`employee-login:ip:${ip}`, IP_LIMIT, WINDOW_MS);
  if (!ipLimit.ok) {
    return noStore({ error: "Too many sign-in attempts. Please try again later." }, 429, {
      "Retry-After": String(ipLimit.retryAfterSeconds),
    });
  }

  const body = (await req.json().catch(() => ({}))) as LoginBody;
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return noStore({ error: "Username and password required." }, 400);
  }
  if (username.length > 64 || password.length > 256) {
    return noStore({ error: "Invalid username or password." }, 401);
  }

  const userLimit = rateLimit(`employee-login:user:${username}`, USER_LIMIT, WINDOW_MS);
  if (!userLimit.ok) {
    return noStore({ error: "Too many sign-in attempts for this account. Try again later." }, 429, {
      "Retry-After": String(userLimit.retryAfterSeconds),
    });
  }

  if (!getServiceRoleKey()) {
    // Fail closed: without the service role key we cannot read credentials.
    return noStore({ error: "Sign-in is temporarily unavailable. Please try again." }, 503);
  }

  let employee: EmployeeRow | null = null;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("get_employee_by_username", { p_username: username });
    if (error) {
      return noStore({ error: "Sign-in is temporarily unavailable. Please try again." }, 503);
    }
    const rows = data as EmployeeRow[] | null;
    employee = rows && rows.length > 0 ? rows[0] : null;
  } catch {
    return noStore({ error: "Sign-in is temporarily unavailable. Please try again." }, 503);
  }

  // Always run a scrypt verification so response timing does not reveal whether
  // the username exists.
  const passwordOk = verifyPassword(password, employee?.password_hash ?? DUMMY_PASSWORD_HASH);

  if (!employee || !employee.is_active || !passwordOk) {
    return noStore({ error: "Invalid username or password." }, 401);
  }

  let token: string;
  try {
    token = await signEmployeeToken({
      sub: employee.id,
      username: employee.username,
      position: employee.position,
      permission_level: employee.permission_level,
    });
  } catch {
    return noStore({ error: "Sign-in is temporarily unavailable. Please try again." }, 503);
  }

  const res = noStore({
    success: true,
    redirect: ROLE_HOME[employee.position] ?? "/",
  });

  res.cookies.set(EMPLOYEE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: EMPLOYEE_TOKEN_TTL_SECONDS,
  });

  return res;
}
