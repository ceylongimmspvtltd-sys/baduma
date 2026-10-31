import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminIdentity } from "@/lib/adminAuth";
import { createServiceClient, getServiceRoleKey } from "@/lib/supabaseServer";
import { SETTING_KEYS, isSettingKey, mergeSettings } from "@/lib/settings";

/**
 * Restaurant settings (Master Admin only).
 * GET   → current settings merged over the defaults.
 * PATCH → upsert the supplied keys (validated against a fixed allowlist).
 *
 * Writes go through the service role after the caller's cookie has been
 * verified with Supabase Auth, so a customer JWT can never change storefront
 * contact details.
 */

const MAX_LENGTH = 200;

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, { status, headers: { "Cache-Control": "no-store" } });
}

async function requireAdmin(req: NextRequest) {
  const identity = await getAdminIdentity(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!identity) return { error: noStore({ error: "Unauthorized" }, 401) } as const;
  if (!getServiceRoleKey()) {
    return { error: noStore({ error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." }, 500) } as const;
  }
  return { identity } as const;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) return noStore({ error: error.message }, 500);
  return noStore({ settings: mergeSettings(data as { key: string; value: string }[]) });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return noStore({ error: "Invalid payload." }, 400);

  const updates: { key: string; value: string; updated_at: string }[] = [];
  for (const [key, rawValue] of Object.entries(body)) {
    if (!isSettingKey(key)) {
      return noStore({ error: `Unknown setting "${key}".` }, 400);
    }
    if (typeof rawValue !== "string") {
      return noStore({ error: `Setting "${key}" must be a string.` }, 400);
    }
    const value = rawValue.trim();
    if (value.length > MAX_LENGTH) {
      return noStore({ error: `Setting "${key}" is too long (max ${MAX_LENGTH}).` }, 400);
    }
    updates.push({ key, value, updated_at: new Date().toISOString() });
  }

  if (updates.length === 0) {
    return noStore({ error: `Provide at least one of: ${SETTING_KEYS.join(", ")}.` }, 400);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("settings").upsert(updates, { onConflict: "key" });
  if (error) return noStore({ error: error.message }, 500);

  const { data } = await supabase.from("settings").select("key, value");
  return noStore({ success: true, settings: mergeSettings(data as { key: string; value: string }[]) });
}
