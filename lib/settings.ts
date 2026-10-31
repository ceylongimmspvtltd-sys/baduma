/**
 * lib/settings.ts — restaurant profile (single source of truth).
 *
 * Stored as key/value rows in `public.settings` so the Master Admin can edit the
 * contact details shown on the storefront and the receipts. Previously the
 * Settings page kept its values in React state only — pressing "Save" persisted
 * nothing, and the storefront/footer kept hard-coded values.
 */

import { createClient } from "@supabase/supabase-js";

export const SETTING_KEYS = [
  "restaurant_name",
  "phone",
  "whatsapp",
  "email",
  "address",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];
export type Settings = Record<SettingKey, string>;

export const DEFAULT_SETTINGS: Settings = {
  restaurant_name: "බැදුම",
  phone: "+94 77 070 1682",
  whatsapp: "+94 77 948 1682",
  email: "Sadunchamila405@gmail.com",
  address: "Baduma.malgammana, Pilimatalawa, Kandy",
};

export function isSettingKey(value: unknown): value is SettingKey {
  return typeof value === "string" && (SETTING_KEYS as readonly string[]).includes(value);
}

/** Coerce an arbitrary row set into a complete Settings object. */
export function mergeSettings(rows: { key: string; value: string }[] | null | undefined): Settings {
  const settings: Settings = { ...DEFAULT_SETTINGS };
  for (const row of rows ?? []) {
    if (isSettingKey(row.key) && typeof row.value === "string" && row.value.length > 0) {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

/**
 * Server-side read for pages/layouts. Falls back to the defaults when Supabase
 * is not configured, the table is missing, or the read fails — the storefront
 * must never break because of settings.
 */
export async function getSettings(): Promise<Settings> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_SETTINGS;

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error || !data) return DEFAULT_SETTINGS;
    return mergeSettings(data as { key: string; value: string }[]);
  } catch {
    return DEFAULT_SETTINGS;
  }
}
