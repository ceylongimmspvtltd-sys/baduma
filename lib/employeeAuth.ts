/**
 * lib/employeeAuth.ts — Node-only staff credential helpers.
 *
 * Password hashing (scrypt) lives here because it needs Node's `crypto`.
 * Session signing/verification is delegated to the Edge-safe
 * `lib/employeeSession.ts` so middleware can use the exact same logic.
 *
 * ⚠️ Do not import this file from `middleware.ts` (Edge) or from a Client
 * Component: it pulls in `node:crypto`.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export {
  EMPLOYEE_COOKIE,
  EMPLOYEE_LOGIN_PATH,
  EMPLOYEE_SECRET_ENV,
  EMPLOYEE_TOKEN_TTL_SECONDS,
  ROLE_HOME,
  getEmployeeSecret,
  signEmployeeToken,
  verifyEmployeeToken,
  canAccessPath,
  type EmployeeToken,
} from "./employeeSession";

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

/** Hash a password as `scrypt$<salt>$<hash>`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

/** Constant-time password verification against a stored `scrypt$...` value. */
export function verifyPassword(password: string, stored: string): boolean {
  if (typeof stored !== "string") return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  try {
    const computed = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
    const expected = Buffer.from(hash, "hex");
    if (expected.length !== computed.length) return false;
    return timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

/**
 * Dummy hash used to equalise response time when a username does not exist,
 * so the login endpoint cannot be used for username enumeration.
 * The plaintext is random and discarded: no password can ever match it.
 */
export const DUMMY_PASSWORD_HASH = `scrypt$${randomBytes(16).toString("hex")}$${randomBytes(SCRYPT_KEYLEN).toString("hex")}`;

/** Strong, human-shareable temporary staff password (96 bits of entropy). */
export function generateStaffPassword(): string {
  return randomBytes(12).toString("base64url");
}

/** Staff usernames: `<role-prefix><6 hex>` e.g. `mgr1a2b3c`. */
export function generateStaffUsername(position: string): string {
  const prefix = position.toLowerCase().slice(0, 3).replace(/[^a-z]/g, "") || "stf";
  return `${prefix}${randomBytes(3).toString("hex")}`;
}
