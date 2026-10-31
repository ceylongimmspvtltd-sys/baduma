// app/(admin)/(dashboard)/admin/products/page.tsx — Menu & Inventory CRUD + Combos + Daily Offers.
"use client";

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const CATEGORIES = [
  'Kottu',
  'Fried Rice',
  'Rice & Curry',
  'Burgers',
  'Pizza',
  'Pasta',
  'Hot Dogs',
  'Drinks',
  'Desserts',
  'Snacks',
  'Other',
];

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  veg: boolean;
  image_url: string | null;
  normal_price: number;
  full_price: number;
  is_active: boolean;
};

type FormState = {
  id: string | null;
  name: string;
  description: string;
  category: string;
  veg: boolean;
  image_url: string | null;
  image_path: string | null;
  normal_price: string;
  full_price: string;
};

type Combo = {
  id: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
};

type Offer = {
  id: string;
  title: string;
  description: string;
  discount_percent: number;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  description: '',
  category: CATEGORIES[0],
  veg: true,
  image_url: null,
  image_path: null,
  normal_price: '',
  full_price: '',
};

const inputBase =
  'w-full px-4 py-3 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- Combos & Daily Offers ---------- */
  const [combos, setCombos] = useState<Combo[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [comboName, setComboName] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDiscount, setOfferDiscount] = useState('10');

  async function loadAll() {
    try {
      const [p, c, o] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('combos').select('*').order('created_at', { ascending: false }),
        supabase.from('daily_offers').select('*').order('created_at', { ascending: false }),
      ]);
      if (p.error) throw p.error;
      if (c.error) throw c.error;
      if (o.error) throw o.error;
      setProducts((p.data ?? []) as Product[]);
      setCombos((c.data ?? []) as Combo[]);
      setOffers((o.data ?? []) as Offer[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  /* ---------- Product CRUD ---------- */

  function openAddModal() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      category: p.category ?? CATEGORIES[0],
      veg: !!p.veg,
      image_url: p.image_url ?? null,
      image_path: null,
      normal_price: String(p.normal_price ?? ''),
      full_price: String(p.full_price ?? ''),
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleImageSelect(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please choose an image file.');
      return;
    }
    setFormError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/storage', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Image upload failed.');
      setForm((f) => ({ ...f, image_url: json.url, image_path: json.path }));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage() {
    const path = form.image_path;
    try {
      if (path) {
        await fetch('/api/admin/storage', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
      }
    } finally {
      setForm((f) => ({ ...f, image_url: null, image_path: null }));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    const row = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      veg: form.veg,
      image_url: form.image_url,
      normal_price: Number(form.normal_price) || 0,
      full_price: Number(form.full_price) || 0,
      is_active: true,
    };
    setSaving(true);
    try {
      if (form.id) {
        const { error: err } = await supabase
          .from('products')
          .update({ ...row, updated_at: new Date() })
          .eq('id', form.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('products').insert([row]);
        if (err) throw err;
      }
      setModalOpen(false);
      await loadAll();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      const { error: err } = await supabase.from('products').delete().eq('id', p.id);
      if (err) throw err;
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete product.');
    }
  }

  /* ---------- Combos ---------- */

  async function handleCreateCombo(e: React.FormEvent) {
    e.preventDefault();
    if (!comboName.trim()) return;
    try {
      const { error: err } = await supabase.from('combos').insert({
        name: comboName.trim(),
        description: '',
        price: Number(comboPrice) || 0,
        is_active: true,
      });
      if (err) throw err;
      setComboName('');
      setComboPrice('');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create combo.');
    }
  }

  async function toggleCombo(c: Combo) {
    const { error: err } = await supabase.from('combos').update({ is_active: !c.is_active }).eq('id', c.id);
    if (err) setError(err.message);
    await loadAll();
  }

  async function deleteCombo(c: Combo) {
    if (!confirm(`Delete combo "${c.name}"?`)) return;
    const { error: err } = await supabase.from('combos').delete().eq('id', c.id);
    if (err) setError(err.message);
    await loadAll();
  }

  /* ---------- Daily Offers ---------- */

  async function handleCreateOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!offerTitle.trim()) return;
    try {
      const { error: err } = await supabase.from('daily_offers').insert({
        title: offerTitle.trim(),
        description: '',
        discount_percent: Number(offerDiscount) || 0,
        is_active: true,
      });
      if (err) throw err;
      setOfferTitle('');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create offer.');
    }
  }

  async function toggleOffer(o: Offer) {
    const { error: err } = await supabase.from('daily_offers').update({ is_active: !o.is_active }).eq('id', o.id);
    if (err) setError(err.message);
    await loadAll();
  }

  async function deleteOffer(o: Offer) {
    if (!confirm(`Delete offer "${o.title}"?`)) return;
    const { error: err } = await supabase.from('daily_offers').delete().eq('id', o.id);
    if (err) setError(err.message);
    await loadAll();
  }

  const panel = 'p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]';

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className={`${panel} flex flex-wrap justify-between items-center gap-4`}>
        <div>
          <h2 className="text-2xl font-black text-[#FFD700]">Menu &amp; Inventory</h2>
          <p className="text-sm text-gray-400 mt-1">Manage products, combo packages and daily offers. Images upload to Supabase Storage.</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-6 py-3 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all"
        >
          + Add Product
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-red-500/40 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Products table */}
      <div className={panel}>
        {loading ? (
          <p className="text-gray-500 py-8 text-center">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No products yet. Click “+ Add Product” to create the first menu item.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#1d1d1d]">
                  <th className="py-3 px-2 font-bold">Image</th>
                  <th className="py-3 px-2 font-bold">Product</th>
                  <th className="py-3 px-2 font-bold">Category</th>
                  <th className="py-3 px-2 font-bold">Prices (Normal / Full)</th>
                  <th className="py-3 px-2 font-bold">Type</th>
                  <th className="py-3 px-2 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-[#1d1d1d] last:border-0">
                    <td className="py-3 px-2">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-xl object-cover shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d]" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#121212] shadow-[inset_2px_2px_4px_#070707,inset_-2px_-2px_4px_#1d1d1d] flex items-center justify-center text-gray-600">
                          🍽️
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-gray-200">{p.name}</div>
                      <div className="text-xs text-gray-500 max-w-xs truncate">{p.description}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-400">{p.category}</td>
                    <td className="py-3 px-2 text-gray-300">
                      Rs. {p.normal_price} <span className="text-gray-600">/</span> Rs. {p.full_price}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${p.veg ? 'text-green-400' : 'text-red-400'}`}>
                        {p.veg ? '🌱 Veg' : '🍗 Non-Veg'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(p)}
                        className="px-4 py-2 mr-2 rounded-lg text-xs font-bold text-gray-300 bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d] hover:text-[#FFD700] transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-red-400 bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d] hover:text-red-300 transition-all"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Combo Packages */}
      <section className={panel}>
        <h3 className="text-lg font-black text-[#FFD700] mb-5">🎉 Combo Packages</h3>
        <form onSubmit={handleCreateCombo} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            value={comboName}
            onChange={(e) => setComboName(e.target.value)}
            placeholder="Combo name (e.g. Kottu Party)"
            className={inputBase}
          />
          <input
            type="number"
            min="0"
            step="50"
            value={comboPrice}
            onChange={(e) => setComboPrice(e.target.value)}
            placeholder="Price (Rs.)"
            className={inputBase}
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all"
          >
            Create Combo
          </button>
        </form>
        {combos.length === 0 ? (
          <p className="text-gray-500 py-6 text-center text-sm">No combo packages yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {combos.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-200">{c.name}</div>
                    <div className="text-[#FFD700] font-black">Rs. {c.price}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${c.is_active ? 'text-green-400' : 'text-gray-600'}`}>
                    {c.is_active ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => toggleCombo(c)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-[#121212] bg-[#FFD700]"
                  >
                    {c.is_active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deleteCombo(c)}
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

      {/* Daily Offers */}
      <section className={panel}>
        <h3 className="text-lg font-black text-[#FFD700] mb-5">🏷️ Daily Offers</h3>
        <form onSubmit={handleCreateOffer} className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <input
            type="text"
            value={offerTitle}
            onChange={(e) => setOfferTitle(e.target.value)}
            placeholder="Offer title"
            className={`${inputBase} sm:col-span-2`}
          />
          <input
            type="number"
            min="0"
            max="100"
            step="5"
            value={offerDiscount}
            onChange={(e) => setOfferDiscount(e.target.value)}
            placeholder="Discount %"
            className={inputBase}
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all"
          >
            Create Offer
          </button>
        </form>
        {offers.length === 0 ? (
          <p className="text-gray-500 py-6 text-center text-sm">No daily offers yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((o) => (
              <div key={o.id} className="p-4 rounded-2xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-200">{o.title}</div>
                    <div className="text-[#FFD700] font-black">-{o.discount_percent}%</div>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${o.is_active ? 'text-green-400' : 'text-gray-600'}`}>
                    {o.is_active ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => toggleOffer(o)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-[#121212] bg-[#FFD700]"
                  >
                    {o.is_active ? 'Pause' : 'Activate'}
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

      {/* Add / Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !saving && setModalOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSave}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 rounded-3xl bg-[#121212] shadow-[8px_8px_24px_#070707,-8px_-8px_24px_#1d1d1d] border border-[#1d1d1d]"
          >
            <h3 className="text-xl font-black text-[#FFD700] mb-6">{form.id ? 'Edit Product' : 'Add Product'}</h3>

            {formError && (
              <div className="mb-5 p-3 rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] border border-red-500/40 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-5">
              {/* Image upload */}
              <label className="text-sm font-bold text-gray-300">Product Image</label>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#0c0c0c] shadow-[2px_2px_4px_#070707,-2px_-2px_4px_#1d1d1d] flex items-center justify-center shrink-0">
                  {form.image_url ? (
                    <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-600 text-2xl">📷</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageSelect(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-[#121212] bg-[#FFD700] disabled:opacity-50 shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#332b00]"
                  >
                    {uploading ? 'Uploading…' : 'Upload Image'}
                  </button>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-red-400 bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d]"
                    >
                      Remove
                    </button>
                  )}
                  <p className="text-[11px] text-gray-500">Uploads to Supabase Storage bucket “product-images”.</p>
                </div>
              </div>

              {/* Name */}
              <label className="text-sm font-bold text-gray-300">Product Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Chicken Kottu"
                className={inputBase}
              />

              {/* Description */}
              <label className="text-sm font-bold text-gray-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description shown on the menu"
                rows={3}
                className={`${inputBase} resize-none`}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Category */}
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className={inputBase}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-[#121212]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Normal price */}
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">Normal Price (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={form.normal_price}
                    onChange={(e) => setForm((f) => ({ ...f, normal_price: e.target.value }))}
                    placeholder="450"
                    className={inputBase}
                  />
                </div>

                {/* Full price */}
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">Full Price (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={form.full_price}
                    onChange={(e) => setForm((f) => ({ ...f, full_price: e.target.value }))}
                    placeholder="750"
                    className={inputBase}
                  />
                </div>
              </div>

              {/* Veg / Non-Veg */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Veg / Non-Veg</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, veg: true }))}
                    className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all ${
                      form.veg
                        ? 'text-green-400 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]'
                        : 'text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d]'
                    }`}
                  >
                    🌱 Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, veg: false }))}
                    className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all ${
                      !form.veg
                        ? 'text-red-400 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]'
                        : 'text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d]'
                    }`}
                  >
                    🍗 Non-Veg
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-6 py-3 rounded-xl font-bold text-gray-400 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:text-[#FFD700] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all disabled:opacity-60"
              >
                {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
