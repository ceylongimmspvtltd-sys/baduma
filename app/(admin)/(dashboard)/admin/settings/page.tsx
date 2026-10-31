// app/(admin)/(dashboard)/admin/settings/page.tsx — Restaurant Settings.
"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";

/**
 * Settings now persist to `public.settings` through `/api/admin/settings`
 * (service-role write after the admin cookie is verified). Previously "Save
 * Changes" only flipped a local flag — nothing was stored, so the storefront and
 * receipts kept their hard-coded values.
 */

const FIELDS: { key: keyof Settings; label: string; type: string; placeholder?: string }[] = [
  { key: "restaurant_name", label: "Restaurant Name", type: "text" },
  { key: "phone", label: "Phone", type: "tel", placeholder: "+94 77 000 0000" },
  { key: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "+94 77 000 0000" },
  { key: "email", label: "Email", type: "email", placeholder: "owner@baduma.lk" },
  { key: "address", label: "Address", type: "text" },
];

export default function AdminSettingsPage() {
  const [form, setForm] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store", credentials: "same-origin" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load settings.");
        if (!cancelled) setForm(json.settings as Settings);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save settings.");
      setForm(json.settings as Settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  const inputBase =
    "w-full px-4 py-3 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all";

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]">
        <h2 className="text-2xl font-black text-[#FFD700]">Settings</h2>
        <p className="text-sm text-gray-400 mt-1">
          Restaurant profile details shown on the storefront and receipts. Saved to Supabase.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-red-500/40 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="p-8 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d] flex flex-col gap-5"
      >
        {loading ? (
          <p className="text-gray-500 py-8 text-center">Loading settings…</p>
        ) : (
          <>
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label htmlFor={`setting-${field.key}`} className="block text-sm font-bold text-gray-300 mb-2">
                  {field.label}
                </label>
                <input
                  id={`setting-${field.key}`}
                  type={field.type}
                  value={form[field.key]}
                  placeholder={field.placeholder}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  className={inputBase}
                />
              </div>
            ))}

            <div className="flex items-center gap-4 mt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saved && <span className="text-sm font-bold text-green-400">✓ Saved</span>}
            </div>
          </>
        )}
      </form>
    </div>
  );
}
