/**
 * lib/employeeSession.ts — Edge-safe staff session helpers.
 *
 * Split out from `lib/employeeAuth.ts` (which imports Node's `crypto` for
 * scrypt password hashing) so that `middleware.ts` can verify staff sessions
 * in the Edge runtime without pulling in Node built-ins.
 */

import { readSecret, signSessionToken, verifySessionToken } from "./sessionToken";

export const EMPLOYEE_COOKIE = "baduma_employee_session";
export const EMPLOYEE_LOGIN_PATH = "/employee/login";

export const EMPLOYEE_SECRET_ENV = "EMPLOYEE_SESSION_SECRET";

/**
 * Landing page for each staff role. Mirrored by `/api/employee/login`.
 *
 * Kitchen staff land on the POS board, which is where incoming orders appear —
 * they used to be sent to the public storefront (`/`), i.e. straight out of the
 * protected area.
 */
export const ROLE_HOME: Record<string, string> = {
  Manager: "/pos",
  Kitchen: "/pos",
  Driver: "/driver",
};

export type EmployeeToken = {
  sub: string; // employee id
  username: string;
  position: string;
  permission_level: string;
  exp: number;
};

export const EMPLOYEE_TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12h, not 7 days

export function getEmployeeSecret(): string | null {
  return readSecret(EMPLOYEE_SECRET_ENV);
}

export async function signEmployeeToken(
  payload: Omit<EmployeeToken, "exp">,
  ttlSeconds = EMPLOYEE_TOKEN_TTL_SECONDS
): Promise<string> {
  const secret = getEmployeeSecret();
  if (!secret) {
    throw new Error(
      `Missing or too-short ${EMPLOYEE_SECRET_ENV}. Generate one with: openssl rand -base64 48`
    );
  }
  return signSessionToken(payload, secret, ttlSeconds);
}

export async function verifyEmployeeToken(
  token: string | undefined | null
): Promise<EmployeeToken | null> {
  const result = await verifySessionToken<EmployeeToken>(token, getEmployeeSecret());
  if (!result.ok) return null;
  const payload = result.payload;
  if (!payload.sub || !payload.position) return null;
  return payload;
}

/**
 * Which route prefixes may a given staff role open?
 *
 *   /pos      Manager (full/orders) and Kitchen (orders/full) — the order board
 *   /driver   Driver, or Manager (dispatch)
 *   /employee any signed-in staff member
 */
export function canAccessPath(token: EmployeeToken, pathname: string): boolean {
  const position = token.position;
  const permission = token.permission_level;
  const hasOrderRights = permission === "full" || permission === "orders";

  if (pathname.startsWith("/pos")) {
    if (position === "Manager") return hasOrderRights;
    if (position === "Kitchen") return hasOrderRights;
    return false;
  }
  if (pathname.startsWith("/driver")) {
    return position === "Manager" || position === "Driver";
  }
  if (pathname.startsWith("/employee")) {
    return true;
  }
  return false;
}
