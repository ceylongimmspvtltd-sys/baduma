/**
 * lib/rateLimit.ts — minimal fixed-window rate limiter for auth endpoints.
 *
 * Scope: one process. Vercel/Next run several instances, so this is a
 * best-effort brake, not a distributed guarantee. For production-grade
 * protection use Upstash Redis / Vercel KV and keep the same call signature.
 *
 * It exists to stop the trivial attacks: password spraying, OTP bombing and
 * leaking whether a username exists by hammering the endpoint.
 */

type Bucket = { count: number; resetAt: number };

const store: Map<string, Bucket> =
  (globalThis as unknown as { __badumaRateLimit?: Map<string, Bucket> }).__badumaRateLimit ??
  new Map<string, Bucket>();
(globalThis as unknown as { __badumaRateLimit?: Map<string, Bucket> }).__badumaRateLimit = store;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Best-effort client IP for rate-limit keys (behind Vercel/Cloudflare proxies). */
export function clientIp(req: Request): string {
  const headers = req.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** Housekeeping: drop expired buckets so the map cannot grow unbounded. */
export function pruneRateLimitStore(): void {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export function rateLimitResponse(retryAfterSeconds: number, message = "Too many attempts. Please try again later.") {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSeconds),
      "Cache-Control": "no-store",
    },
  });
}
