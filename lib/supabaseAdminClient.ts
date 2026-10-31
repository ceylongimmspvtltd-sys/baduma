import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin-scoped BROWSER Supabase client.
 *
 * Why a second client instead of the shared `lib/supabaseClient`:
 *
 * The storefront and the backend share one Supabase project, and both used the
 * same browser client — therefore the same localStorage session slot. Two
 * consequences:
 *   - an admin who signed in on a device that also uses the storefront lost the
 *     stored session when a customer OTP login ran in the same browser;
 *   - worse, after an OTP login the dashboard's RLS-scoped queries executed as
 *     that *customer*, so the dashboard silently showed nothing (or the
 *     customer's data) while the httpOnly admin cookie was still valid.
 *
 * A distinct `storageKey` gives the admin session its own slot, so the two
 * identities coexist safely in one browser. Authorisation is still decided
 * server-side (middleware + /api/admin/*); this client only carries the JWT
 * that RLS evaluates for the dashboard's queries.
 */

const ADMIN_STORAGE_KEY = "baduma.admin.auth";

let adminClient: SupabaseClient | undefined;

function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
      );
    }
    if (key.includes("service_role")) {
      throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY must not contain a service-role key.");
    }

    adminClient = createClient(url, key, {
      auth: {
        storageKey: ADMIN_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
  }
  return adminClient;
}

/** Lazily-created admin client (safe during prerender — no env needed until used). */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getAdminClient(), prop, receiver);
  },
});
