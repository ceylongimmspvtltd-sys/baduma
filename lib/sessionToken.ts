/**
 * lib/sessionToken.ts — Edge-safe signed session tokens (HMAC-SHA256).
 *
 * Used for internal staff sessions (`employee_session` cookie). Implemented
 * with Web Crypto only, so the exact same code runs in:
 *   - `middleware.ts`            (Edge runtime)
 *   - `app/api/**\/route.ts`      (Node runtime)
 *   - Supabase Edge Functions    (Deno)
 *
 * Security properties:
 *   - signature verified with `crypto.subtle.verify` (constant-time in practice)
 *   - payload JSON is authenticated — no unsigned claims are ever trusted
 *   - `exp` is required and enforced on every verification
 *   - secrets must be >= 32 chars; there is NO insecure fallback in production
 */

const encoder = new TextEncoder();

export type SessionTokenPayload = { exp: number } & Record<string, unknown>;

export type VerifyResult<T> =
  | { ok: true; payload: T }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "no_secret" };

/* ------------------------------------------------------------------ */
/* base64url helpers (no Buffer / Node APIs — Edge + browser safe)     */
/* ------------------------------------------------------------------ */

function bytesToBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> | null {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* HMAC                                                                */
/* ------------------------------------------------------------------ */

const keyCache = new Map<string, Promise<CryptoKey>>();

function getKey(secret: string): Promise<CryptoKey> {
  const cached = keyCache.get(secret);
  if (cached) return cached;
  const key = crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  keyCache.set(secret, key);
  return key;
}

/** Read a signing secret from the environment, rejecting weak/missing values. */
export function readSecret(envName: string): string | null {
  const value = process.env[envName];
  if (value && value.length >= 32) return value;
  return null;
}

export async function signSessionToken(
  payload: Omit<SessionTokenPayload, "exp"> & Record<string, unknown>,
  secret: string,
  ttlSeconds: number
): Promise<string> {
  const body: SessionTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = bytesToBase64Url(encoder.encode(JSON.stringify(body)));
  const signature = await crypto.subtle.sign("HMAC", await getKey(secret), encoder.encode(encoded));
  return `${encoded}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken<T extends { exp: number }>(
  token: string | undefined | null,
  secret: string | null
): Promise<VerifyResult<T>> {
  if (!token) return { ok: false, reason: "malformed" };
  if (!secret) return { ok: false, reason: "no_secret" };

  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [encoded, signature] = parts;
  const sigBytes = base64UrlToBytes(signature);
  if (!sigBytes) return { ok: false, reason: "malformed" };

  let validSignature = false;
  try {
    validSignature = await crypto.subtle.verify(
      "HMAC",
      await getKey(secret),
      sigBytes,
      encoder.encode(encoded)
    );
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
  if (!validSignature) return { ok: false, reason: "bad_signature" };

  const bodyBytes = base64UrlToBytes(encoded);
  if (!bodyBytes) return { ok: false, reason: "malformed" };

  let payload: T;
  try {
    payload = JSON.parse(new TextDecoder().decode(bodyBytes)) as T;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, payload };
}
