import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (anon key — public by design; all access is governed
 * by Postgres Row Level Security).
 *
 * - Session persistence stays enabled because the storefront OTP flow and the
 *   admin dashboard's RLS-scoped queries both need a session across reloads.
 * - The admin *authorisation* decision is NOT made with this client. It is made
 *   server-side from httpOnly cookies (`middleware.ts` + `/api/admin/*`).
 */

let supabaseClient: SupabaseClient | undefined;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
      );
    }

    // Hard guard: never let a service-role key reach the bundle.
    if (key.includes("service_role")) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY contains a service-role key. Rotate it immediately and use the anon key here."
      );
    }

    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }

  return supabaseClient;
}

/**
 * Lazily-created Supabase client. Accessing any property (e.g. `supabase.auth`)
 * initializes the client on first use, so build/prerender never requires the
 * Supabase env vars to be present.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseClient(), prop, receiver);
  },
});
