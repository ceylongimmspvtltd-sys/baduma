/**
 * lib/supabaseServer.ts — server-only Supabase clients.
 *
 * NEVER import this module from a Client Component or from `lib/supabaseClient.ts`:
 * `createServiceClient()` holds the service-role key, which bypasses RLS.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SERVICE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";

function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error("lib/supabaseServer.ts must never be imported in the browser.");
  }
}

export function getSupabaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? url.replace(/\/+$/, "") : null;
}

export function getServiceRoleKey(): string | null {
  const key = process.env[SERVICE_KEY_ENV];
  if (!key) return null;
  // Guard against somebody pasting the anon key here (a classic misconfig).
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8"));
    if (payload?.role && payload.role !== "service_role") return null;
  } catch {
    // New-format `sb_secret_...` keys are not JWTs — accept them as-is.
  }
  return key;
}

export class ServiceRoleNotConfiguredError extends Error {
  constructor() {
    super(
      `Missing ${SERVICE_KEY_ENV}. Server-side admin operations require the service role key ` +
        `(Supabase Dashboard → Project Settings → API). Never expose it to the browser.`
    );
    this.name = "ServiceRoleNotConfiguredError";
  }
}

/** Service-role client: bypasses RLS. Use only after verifying the caller. */
export function createServiceClient(): SupabaseClient {
  assertServer();
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) throw new ServiceRoleNotConfiguredError();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Anonymous server client: used for `signInWithPassword` / token refresh. */
export function createAnonServerClient(): SupabaseClient {
  assertServer();
  const url = getSupabaseUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
