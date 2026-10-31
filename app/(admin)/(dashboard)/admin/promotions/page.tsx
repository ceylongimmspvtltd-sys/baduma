// app/(admin)/(dashboard)/admin/promotions/page.tsx — Combos, add-ons & daily offers.
"use client";

import { useEffect, useState } from "react";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdminClient";

type Combo = {
  id: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
};

type Addon = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
};

type Offer = {
  id: string;
  title: string;
  description: string;
  discount_percent: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

const inputBase =
  "w-full px-4 py-3 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all";

export default function AdminPromotionsPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modals
  const [offerForm, setOfferForm] = useState<{ id: string | null; title: string; description: string; discount_percent: string; is_active: boolean } | null>(null);
  const [comboForm, setComboForm] = useState<{ id: string | null; name: string; description: string; price: string; is_active: boolean; addonIds: string[] } | null>(null);
  const [addonForm, setAddonForm] = useState<{ id: string | null; name: string; price: string; image_url: string | null; image_path: string | null; is_active: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadAll() {
    try {
      const [c, a, o] = await Promise.all([
        supabase.from("combos").select("*").order("created_at", { ascending: false }),
        supabase.from("addons").select("*").order("created_at", { ascending: false }),
        supabase.from("daily_offers").select("*").order("created_at", { ascending: false }),
      ]);
      if (c.error) throw c.error;
      if (a.error) throw a.error;
      if (o.error) throw o.error;
      setCombos((c.data ?? []) as Combo[]);
      setAddons((a.data ?? []) as Addon[]);
      setOffers((o.data ?? []) as Offer[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load promotions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  /* ---------- Daily Offers ---------- */

  async function toggleOffer(o: Offer) {
    const { error: err } = await supabase.from("daily_offers").update({ is_active: !o.is_active }).eq("id", o.id);
    if (err) setError(err.message);
    await loadAll();
  }

  async function saveOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!offerForm) return;
    setSaving(true);
    const row = {
      title: offerForm.title.trim(),
      description: offerForm.description.trim(),
      discount_percent: Number(offerForm.discount_percent) || 0,
      is_active: offerForm.is_active,
    };
    try {
      if (offerForm.id) {
        const { error: err } = await supabase.from("daily_offers").update({ ...row, updated_at: new Date() }).eq("id", offerForm.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("daily_offers").insert([row]);
        if (err) throw err;
      }
      setOfferForm(null);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save offer.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOffer(o: Offer) {
    if (!confirm(`Delete offer "${o.title}"?`)) return;
    const { error: err } = await supabase.from("daily_offers").delete().eq("id", o.id);
    if (err) setError(err.message);
    await loadAll();
  }

  /* ---------- Combos ---------- */

  async function toggleCombo(c: Combo) {
    const { error: err } = await supabase.from("combos").update({ is_active: !c.is_active }).eq("id", c.id);
    if (err) setError(err.message);
    await loadAll();
  }

  async function saveCombo(e: React.FormEvent) {
    e.preventDefault();
    if (!comboForm) return;
    setSaving(true);
    const row = {
      name: comboForm.name.trim(),
      description: comboForm.description.trim(),
      price: Number(comboForm.price) || 0,
      is_active: comboForm.is_active,
    };
    // Capture the id locally — never mutate the state object while saving.
    let comboId = comboForm.id;
    try {
      if (comboId) {
        const { error: err } = await supabase.from("combos").update({ ...row, updated_at: new Date() }).eq("id", comboId);
        if (err) throw err;
        const { error: unlinkErr } = await supabase.from("combo_addons").delete().eq("combo_id", comboId);
        if (unlinkErr) throw unlinkErr;
      } else {
        const { data, error: err } = await supabase.from("combos").insert([row]).select("id").single();
        if (err) throw err;
        comboId = data.id;
      }
      if (comboForm.addonIds.length > 0) {
        const { error: linkErr } = await supabase.from("combo_addons").insert(
          comboForm.addonIds.map((addon_id) => ({ combo_id: comboId, addon_id }))
        );
        if (linkErr) throw linkErr;
      }
      setComboForm(null);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save combo.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCombo(c: Combo) {
    if (!confirm(`Delete combo "${c.name}"?`)) return;
    const { error: err } = await supabase.from("combos").delete().eq("id", c.id);
    if (err) setError(err.message);
    await loadAll();
  }

  /* ---------- Add-ons ---------- */

  async function handleAddonImage(file: File | undefined) {
    if (!file || !addonForm) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Please choose an image file.");
      return;
    }
    setFormError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/storage", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed.");
      setAddonForm((f) => ({ ...f!, image_url: json.url, image_path: json.path }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  async function saveAddon(e: React.FormEvent) {
    e.preventDefault();
    if (!addonForm) return;
    setSaving(true);
    const row = {
      name: addonForm.name.trim(),
      price: Number(addonForm.price) || 0,
      image_url: addonForm.image_url,
      is_active: addonForm.is_active,
    };
    try {
      if (addonForm.id) {
        const { error: err } = await supabase.from("addons").update({ ...row, updated_at: new Date() }).eq("id", addonForm.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("addons").insert([row]);
        if (err) throw err;
      }
      setAddonForm(null);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save add-on.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAddon(a: Addon) {
    if (!confirm(`Delete add-on "${a.name}"?`)) return;
    const { error: err } = await supabase.from("addons").delete().eq("id", a.id);
    if (err) setError(err.message);
    await loadAll();
  }

  const panel = "p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]";

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      <div className={`${panel} flex flex-wrap justify-between items-center gap-4`}>
        <div>
          <h2 className="text-2xl font-black text-[#FFD700]">Combos &amp; Promotions</h2>
          <p className="text-sm text-gray-400 mt-1">Build combo deals, cross-selling add-ons and toggle daily offers — reflected on the storefront.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-red-500/40 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Daily Offers */}
      <section className={panel}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-black text-[#FFD700]">🏷️ Daily Offers</h3>
          <button
            onClick={() => { setOfferForm({ id: null, title: "", description: "", discount_percent: "10", is_active: true }); setFormError(null); }}
            className="px-5 py-2.5 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#332b00]"
          >
            + New Offer
          </button>
        </div>
        {loading ? (
          <p className="text-gray-500 py-8 text-center">Loading…</p>
        ) : offers.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No daily offers yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((o) => (
              <div key={o.id} className="p-5 rounded-2xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-200">{o.title}</div>
                    <div className="text-[#FFD700] font-black text-lg">-{o.discount_percent}%</div>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${o.is_active ? "text-green-400" : "text-gray-600"}`}>
                    {o.is_active ? "ACTIVE" : "PAUSED"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 min-h-[2rem]">{o.description}</p>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => toggleOffer(o)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-[#121212] bg-[#FFD700]"
                  >
                    {o.is_active ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => { setOfferForm({ id: o.id, title: o.title, description: o.description, discount_percent: String(o.discount_percent), is_active: o.is_active }); setFormError(null); }}
                    className="px-3 py-2 rounded-lg text-xs font-bold text-gray-300 bg-[#121212] shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteOffer(o)}
                    className="px-3 py-2 rounded-lg text-xs font-bold text-red-400 bg-[#121212] shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Combo Deals */}
      <section className={panel}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-black text-[#FFD700]">🎉 Combo Deals</h3>
          <button
            onClick={() => { setComboForm({ id: null, name: "", description: "", price: "", is_active: true, addonIds: [] }); setFormError(null); }}
            className="px-5 py-2.5 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#332b00]"
          >
            + New Combo
          </button>
        </div>
        {loading ? (
          <p className="text-gray-500 py-8 text-center">Loading…</p>
        ) : combos.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No combos yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {combos.map((c) => {
              const linked = addons.filter((a) => a.is_active).length;
              return (
                <div key={c.id} className="p-5 rounded-2xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-gray-200">{c.name}</div>
                      <div className="text-[#FFD700] font-black text-lg">Rs. {c.price}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${c.is_active ? "text-green-400" : "text-gray-600"}`}>
                      {c.is_active ? "ACTIVE" : "PAUSED"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 min-h-[2rem]">{c.description}</p>
                  <p className="text-[11px] text-gray-600">{linked} cross-selling add-on(s) available</p>
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => toggleCombo(c)} className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-[#121212] bg-[#FFD700]">
                      {c.is_active ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => setComboForm({ id: c.id, name: c.name, description: c.description, price: String(c.price), is_active: c.is_active, addonIds: [] })}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-gray-300 bg-[#121212] shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d]"
                    >
                      Edit
                    </button>
                    <button onClick={() => deleteCombo(c)} className="px-3 py-2 rounded-lg text-xs font-bold text-red-400 bg-[#121212] shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d]">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Cross-selling Add-ons */}
      <section className={panel}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-black text-[#FFD700]">🥤 Cross-selling Add-ons</h3>
          <button
            onClick={() => { setAddonForm({ id: null, name: "", price: "", image_url: null, image_path: null, is_active: true }); setFormError(null); }}
            className="px-5 py-2.5 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#332b00]"
          >
            + New Add-on
          </button>
        </div>
        {loading ? (
          <p className="text-gray-500 py-8 text-center">Loading…</p>
        ) : addons.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No add-ons yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {addons.map((a) => (
              <div key={a.id} className="p-4 rounded-2xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] flex flex-col items-center gap-3">
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-[#0c0c0c] shadow-[inset_2px_2px_4px_#070707,inset_-2px_-2px_4px_#1d1d1d] flex items-center justify-center">
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-600 text-2xl">🥤</span>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-200">{a.name}</div>
                  <div className="text-xs text-[#FFD700] font-black">Rs. {a.price}</div>
                  <div className={`text-[10px] font-bold mt-1 ${a.is_active ? "text-green-400" : "text-gray-600"}`}>
                    {a.is_active ? "ACTIVE" : "PAUSED"}
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => supabase.from("addons").update({ is_active: !a.is_active }).eq("id", a.id).then(() => loadAll())}
                    className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-[#121212] bg-[#FFD700]"
                  >
                    {a.is_active ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => { setAddonForm({ id: a.id, name: a.name, price: String(a.price), image_url: a.image_url, image_path: null, is_active: a.is_active }); setFormError(null); }}
                    className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-gray-300 bg-[#121212] shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d]"
                  >
                    Edit
                  </button>
                  <button onClick={() => deleteAddon(a)} className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-red-400 bg-[#121212] shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d]">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Offer modal */}
      {offerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !saving && setOfferForm(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveOffer} className="w-full max-w-lg p-8 rounded-3xl bg-[#121212] shadow-[8px_8px_24px_#070707,-8px_-8px_24px_#1d1d1d] border border-[#1d1d1d] flex flex-col gap-5">
            <h3 className="text-xl font-black text-[#FFD700]">{offerForm.id ? "Edit Daily Offer" : "New Daily Offer"}</h3>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <label className="text-sm font-bold text-gray-300">Title</label>
            <input type="text" value={offerForm.title} onChange={(e) => setOfferForm((f) => ({ ...f!, title: e.target.value }))} placeholder="e.g. Monday Discount" className={inputBase} />
            <label className="text-sm font-bold text-gray-300">Description</label>
            <textarea rows={2} value={offerForm.description} onChange={(e) => setOfferForm((f) => ({ ...f!, description: e.target.value }))} className={`${inputBase} resize-none`} />
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Discount %</label>
                <input type="number" min="0" max="100" step="5" value={offerForm.discount_percent} onChange={(e) => setOfferForm((f) => ({ ...f!, discount_percent: e.target.value }))} className={inputBase} />
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-300 mt-6">
                <input type="checkbox" checked={offerForm.is_active} onChange={(e) => setOfferForm((f) => ({ ...f!, is_active: e.target.checked }))} className="accent-[#FFD700] w-4 h-4" />
                Active now
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setOfferForm(null)} className="px-5 py-2.5 rounded-xl font-bold text-gray-400 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d]">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl font-black text-[#121212] bg-[#FFD700]">{saving ? "Saving…" : "Save Offer"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Combo modal */}
      {comboForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !saving && setComboForm(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveCombo} className="w-full max-w-lg p-8 rounded-3xl bg-[#121212] shadow-[8px_8px_24px_#070707,-8px_-8px_24px_#1d1d1d] border border-[#1d1d1d] flex flex-col gap-5">
            <h3 className="text-xl font-black text-[#FFD700]">{comboForm.id ? "Edit Combo Deal" : "New Combo Deal"}</h3>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <label className="text-sm font-bold text-gray-300">Combo Name</label>
            <input type="text" value={comboForm.name} onChange={(e) => setComboForm((f) => ({ ...f!, name: e.target.value }))} placeholder="e.g. Kottu Party Combo" className={inputBase} />
            <label className="text-sm font-bold text-gray-300">Description</label>
            <textarea rows={2} value={comboForm.description} onChange={(e) => setComboForm((f) => ({ ...f!, description: e.target.value }))} className={`${inputBase} resize-none`} />
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Combo Price (Rs.)</label>
              <input type="number" min="0" step="50" value={comboForm.price} onChange={(e) => setComboForm((f) => ({ ...f!, price: e.target.value }))} className={inputBase} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Include Add-ons (cross-sell)</label>
              <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
                {addons.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      setComboForm((f) => ({
                        ...f!,
                        addonIds: f!.addonIds.includes(a.id) ? f!.addonIds.filter((x) => x !== a.id) : [...f!.addonIds, a.id],
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      comboForm.addonIds.includes(a.id)
                        ? "text-[#121212] bg-[#FFD700]"
                        : "text-gray-400 bg-[#121212] shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d]"
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
                {addons.length === 0 && <span className="text-xs text-gray-600">Create add-ons first.</span>}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-300">
              <input type="checkbox" checked={comboForm.is_active} onChange={(e) => setComboForm((f) => ({ ...f!, is_active: e.target.checked }))} className="accent-[#FFD700] w-4 h-4" />
              Active now
            </label>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setComboForm(null)} className="px-5 py-2.5 rounded-xl font-bold text-gray-400 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d]">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl font-black text-[#121212] bg-[#FFD700]">{saving ? "Saving…" : "Save Combo"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Add-on modal */}
      {addonForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !saving && setAddonForm(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveAddon} className="w-full max-w-md p-8 rounded-3xl bg-[#121212] shadow-[8px_8px_24px_#070707,-8px_-8px_24px_#1d1d1d] border border-[#1d1d1d] flex flex-col gap-5">
            <h3 className="text-xl font-black text-[#FFD700]">{addonForm.id ? "Edit Add-on" : "New Add-on"}</h3>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            <label className="text-sm font-bold text-gray-300">Image</label>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#0c0c0c] shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d] flex items-center justify-center shrink-0">
                {addonForm.image_url ? (
                  <img src={addonForm.image_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-600 text-xl">📷</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs text-gray-400"
                  onChange={(e) => handleAddonImage(e.target.files?.[0])}
                />
                {addonForm.image_url && (
                  <button
                    type="button"
                    onClick={() => setAddonForm((f) => ({ ...f!, image_url: null, image_path: null }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-[#121212] shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d] self-start"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <label className="text-sm font-bold text-gray-300">Add-on Name</label>
            <input type="text" value={addonForm.name} onChange={(e) => setAddonForm((f) => ({ ...f!, name: e.target.value }))} placeholder="e.g. Coke 330ml" className={inputBase} />
            <label className="text-sm font-bold text-gray-300">Price (Rs.)</label>
            <input type="number" min="0" step="0.50" value={addonForm.price} onChange={(e) => setAddonForm((f) => ({ ...f!, price: e.target.value }))} className={inputBase} />
            <label className="flex items-center gap-2 text-sm font-bold text-gray-300">
              <input type="checkbox" checked={addonForm.is_active} onChange={(e) => setAddonForm((f) => ({ ...f!, is_active: e.target.checked }))} className="accent-[#FFD700] w-4 h-4" />
              Active now
            </label>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setAddonForm(null)} className="px-5 py-2.5 rounded-xl font-bold text-gray-400 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d]">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl font-black text-[#121212] bg-[#FFD700]">{saving ? "Saving…" : "Save Add-on"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
