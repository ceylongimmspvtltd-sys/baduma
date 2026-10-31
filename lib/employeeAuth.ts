/**
 * Employee session helpers: HMAC-signed token + scrypt password hashing.
 * Used by app/api/admin/employees and app/api/employee/login (Node runtime).
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export const EMPLOYEE_COOKIE = 'employee_session';

const SECRET = process.env.EMPLOYEE_SESSION_SECRET || 'dev-only-insecure-secret-change-me';

export type EmployeeToken = {
  sub: string; // employee id
  username: string;
  position: string;
  permission_level: string;
  exp: number;
};

export function signEmployeeToken(
  payload: Omit<EmployeeToken, 'exp'>,
  ttlSeconds = 60 * 60 * 24 * 7
): string {
  const full: EmployeeToken = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyEmployeeToken(token: string | undefined | null): EmployeeToken | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = createHmac('sha256', SECRET).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as EmployeeToken;
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}
