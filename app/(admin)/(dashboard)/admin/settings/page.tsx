// app/(admin)/(dashboard)/admin/settings/page.tsx — Restaurant Settings.
"use client";

import { useState } from "react";

export default function AdminSettingsPage() {
  const [form, setForm] = useState({
    restaurant_name: "බැදුම",
    phone: "+94 77 070 1682",
    whatsapp: "+94 77 948 1682",
    email: "Sadunchamila405@gmail.com",
    address: "Baduma.malgammana, Pilimatalawa, Kandy",
  });
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const inputBase =
    "w-full px-4 py-3 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all";

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]">
        <h2 className="text-2xl font-black text-[#FFD700]">Settings</h2>
        <p className="text-sm text-gray-400 mt-1">Restaurant profile details shown on the storefront and receipts.</p>
      </div>

      <form onSubmit={handleSave} className="p-8 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d] flex flex-col gap-5">
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Restaurant Name</label>
          <input type="text" value={form.restaurant_name} onChange={(e) => setForm((f) => ({ ...f, restaurant_name: e.target.value }))} className={inputBase} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputBase} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">WhatsApp</label>
            <input type="tel" value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} className={inputBase} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputBase} />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Address</label>
          <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputBase} />
        </div>

        <div className="flex items-center gap-4 mt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all"
          >
            Save Changes
          </button>
          {saved && <span className="text-sm font-bold text-green-400">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
