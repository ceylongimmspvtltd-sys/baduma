'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/products';
import { COMBOS, SUGGESTED_ADDONS, CUSTOM_ADDONS } from '@/lib/products';

export default function ProductDetailClient({ product }: { product: Product }) {
  const hasNormal = !!product.priceNormal;
  const hasFull = !!product.priceFull;

  const [portion, setPortion] = useState<'normal' | 'full'>(hasNormal ? 'normal' : 'full');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);
  const [comboOpen, setComboOpen] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [promoActive] = useState(true);

  // Lock body scroll while any modal is open + Esc closes them
  useEffect(() => {
    const anyOpen = comboOpen || recipeOpen;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setComboOpen(false);
        setRecipeOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [comboOpen, recipeOpen]);

  // ── Pricing ──────────────────────────────────────────────
  const basePrice =
    portion === 'normal'
      ? product.priceNormal ?? product.priceFull ?? 0
      : product.priceFull ?? product.priceNormal ?? 0;

  const addonTotal = selectedAddons.reduce(
    (sum, id) => sum + (CUSTOM_ADDONS.find((a) => a.id === id)?.price ?? 0),
    0
  );

  const suggestionTotal = selectedSuggestions.reduce(
    (sum, id) => sum + (SUGGESTED_ADDONS.find((a) => a.id === id)?.price ?? 0),
    0
  );

  const selectedComboObjs = selectedCombos.flatMap((id) => COMBOS.filter((c) => c.id === id));
  const comboTotal = selectedComboObjs.reduce((sum, c) => sum + c.price, 0);
  const comboSavings = selectedComboObjs.reduce((sum, c) => sum + c.save, 0);

  const promoDiscount = promoActive ? Math.floor(basePrice * 0.1) : 0;
  const totalPrice = Math.max(
    0,
    basePrice + addonTotal + suggestionTotal + comboTotal - promoDiscount
  );

  // ── Weight / Volume ─────────────────────────────────────
  const baseWeight = portion === 'normal' ? 450 : 700;
  const foodGrams =
    baseWeight +
    selectedAddons.reduce((sum, id) => sum + (CUSTOM_ADDONS.find((a) => a.id === id)?.grams ?? 0), 0) +
    selectedSuggestions.reduce(
      (sum, id) => sum + (SUGGESTED_ADDONS.find((a) => a.id === id)?.grams ?? 0),
      0
    );
  const beverageVolume =
    selectedAddons.reduce((sum, id) => sum + (CUSTOM_ADDONS.find((a) => a.id === id)?.volume ?? 0), 0) +
    selectedSuggestions.reduce(
      (sum, id) => sum + (SUGGESTED_ADDONS.find((a) => a.id === id)?.volume ?? 0),
      0
    );

  // ── Toggles ─────────────────────────────────────────────
  const toggleAddon = (id: string) =>
    setSelectedAddons((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const toggleSuggestion = (id: string) =>
    setSelectedSuggestions((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );

  const toggleCombo = (id: string) =>
    setSelectedCombos((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 py-10">

      {/* Back Button */}
      <div className="w-full max-w-4xl mb-6">
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d,0_0_0_1px_#2a2a2a] text-gray-400 hover:text-[#D4AF37] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] transition-all text-sm font-bold"
        >
          ← Back to Menu
        </Link>
      </div>

      {/* Main 3D Card */}
      <div className="w-full max-w-4xl bg-[#121212] rounded-[2.5rem] shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d,0_0_0_1px_#2a2a2a] border border-[#1d1d1d] overflow-hidden flex flex-col md:flex-row">

        {/* ── Image Section ── */}
        <div className="w-full md:w-1/2 p-6 md:p-10 flex items-center justify-center">
          <div className="relative w-full aspect-square rounded-[2rem] bg-[#121212] shadow-[inset_8px_8px_16px_#070707,inset_-8px_-8px_16px_#1d1d1d] overflow-hidden">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover opacity-90 hover:scale-105 transition-transform duration-500"
            />

            {/* Dynamic Veg / Non-Veg Badge */}
            <span
              className={`absolute top-4 left-4 text-xs font-black px-3 py-1.5 rounded-full shadow-[2px_2px_4px_#070707] ${
                product.veg ? 'bg-[#8FBC8F] text-[#121212]' : 'bg-[#C0392B] text-white'
              }`}
            >
              {product.veg ? '🟢 VEG' : '🔴 NON-VEG'}
            </span>

            {/* Category Chip */}
            <span className="absolute top-4 right-4 text-xs font-bold px-4 py-2 rounded-full bg-[#8FBC8F] text-[#121212] shadow-[2px_2px_4px_#070707]">
              {product.category}
            </span>

            {/* Promo Badge */}
            {promoActive && (
              <span className="absolute bottom-4 left-4 text-[10px] font-black px-3 py-1.5 rounded-full bg-[#D4AF37] text-[#121212] shadow-[0_0_12px_rgba(212,175,55,0.5)] animate-pulse">
                🔥 10% OFF
              </span>
            )}
          </div>
        </div>

        {/* ── Details Section ── */}
        <div className="w-full md:w-1/2 p-6 md:p-10 md:pl-0 flex flex-col">

          {/* Title + Description */}
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-wide">
              {product.name}
            </h1>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              {product.description}
            </p>

            {/* Prep Time */}
            <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-[#121212] shadow-[inset_5px_5px_10px_#070707,inset_-5px_-5px_10px_#1d1d1d,0_0_0_1px_#2a2a2a]">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Estimated Prep Time</p>
                <p className="text-[#D4AF37] font-black">{product.prepTime} Mins</p>
              </div>
            </div>

            {/* Recipe Modal Trigger (replaces long ingredients text) */}
            <button
              type="button"
              onClick={() => setRecipeOpen(true)}
              className="w-full py-4 rounded-2xl font-black text-[#121212] bg-[#D4AF37] shadow-[5px_5px_12px_#070707,-5px_-5px_12px_#8a6d1a] active:shadow-[inset_5px_5px_10px_#8a6d1a,inset_-5px_-5px_10px_#ffea4d] transition-all hover:brightness-110 flex items-center justify-center gap-3 tracking-wider"
            >
              <span className="text-xl">📖</span>
              View Recipe &amp; Ingredients
            </button>
          </div>

          {/* ── Promotions Highlight ── */}
          <div className="mt-6 mb-6">
            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Promotions Highlight</h3>
            <div className="flex flex-col gap-3">
              {promoActive && (
                <div className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-[#1a1a0e] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d,0_0_14px_rgba(212,175,55,0.35)] animate-pulse">
                  <span className="text-sm font-black text-[#D4AF37]">
                    🔥 10% OFF — sitewide promo applied to your order!
                  </span>
                </div>
              )}
              {comboSavings > 0 && (
                <div className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-[#1a1a0e] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d,0_0_18px_rgba(212,175,55,0.55)] animate-pulse">
                  <span className="text-sm font-black text-[#D4AF37]">
                    🏆 COMBO DEALS ACTIVE — YOU SAVE Rs. {comboSavings}!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Portion Selection ── */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Select Portion</h3>
            <div className="flex gap-3">
              {hasNormal && (
                <button
                  onClick={() => setPortion('normal')}
                  className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 ${
                    portion === 'normal'
                      ? 'bg-[#8FBC8F] text-[#121212] shadow-[inset_4px_4px_8px_#3f6b3f,inset_-4px_-4px_8px_#c8e6c8]'
                      : 'bg-[#121212] text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:text-[#8FBC8F]'
                  }`}
                >
                  NORMAL
                  <span className="block text-xs mt-1 font-black">Rs. {product.priceNormal}</span>
                  <span className="block text-[10px] mt-0.5">450g</span>
                </button>
              )}
              {hasFull && (
                <button
                  onClick={() => setPortion('full')}
                  className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 ${
                    portion === 'full'
                      ? 'bg-[#8FBC8F] text-[#121212] shadow-[inset_4px_4px_8px_#3f6b3f,inset_-4px_-4px_8px_#c8e6c8]'
                      : 'bg-[#121212] text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:text-[#8FBC8F]'
                  }`}
                >
                  FULL
                  <span className="block text-xs mt-1 font-black">Rs. {product.priceFull}</span>
                  <span className="block text-[10px] mt-0.5">700g</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Add-ons & Beverages (horizontal swipeable row) ── */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">Add-ons &amp; Beverages</h3>
            <p className="text-[10px] text-gray-500 mb-4 font-bold">Swipe → tap to add — total updates instantly</p>
            <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
              {CUSTOM_ADDONS.map((item) => {
                const added = selectedAddons.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleAddon(item.id)}
                    className={`snap-start shrink-0 w-28 rounded-xl px-3 py-4 flex flex-col items-center gap-2 transition-all duration-300 ${
                      added
                        ? 'bg-[#1a2410] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d,0_0_0_1px_#8FBC8F,0_0_12px_rgba(143,188,143,0.2)]'
                        : 'bg-[#121212] shadow-[5px_5px_10px_#070707,-5px_-5px_10px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:-translate-y-0.5'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                        added ? 'bg-[#8FBC8F] text-[#121212]' : 'bg-[#1d1d1d] text-gray-500'
                      }`}
                    >
                      {added ? '✓' : '+'}
                    </span>
                    <span className="text-xs font-black text-gray-200 leading-tight text-center">{item.name}</span>
                    <span className="text-[10px] font-black text-[#D4AF37]">+Rs. {item.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Suggested Add-ons (Image-based Cross-selling) ── */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">Suggested Add-ons</h3>
            <p className="text-[10px] text-gray-500 mb-4 font-bold">Tap an item to add — total updates instantly</p>
            <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
              {SUGGESTED_ADDONS.map((item) => {
                const added = selectedSuggestions.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleSuggestion(item.id)}
                    className={`snap-start shrink-0 w-36 sm:w-40 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${
                      added
                        ? 'bg-[#1a2410] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d,0_0_0_1px_#8FBC8F,0_0_16px_rgba(143,188,143,0.25)]'
                        : 'bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:-translate-y-1'
                    }`}
                  >
                    <div className="relative w-full aspect-square bg-[#121212]">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 32vw, 20vw"
                        className="object-cover"
                      />
                      {added && (
                        <span className="absolute top-2 right-2 text-[9px] font-black px-2 py-1 rounded-full bg-[#8FBC8F] text-[#121212] shadow-[0_0_8px_rgba(143,188,143,0.6)]">
                          ✓ Added
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-gray-200 leading-tight">{item.name}</span>
                      <span className="text-xs font-black text-[#D4AF37] whitespace-nowrap">+Rs. {item.price}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Combo Offers Button (Dedicated Flow) ── */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setComboOpen(true)}
              className="w-full py-5 rounded-2xl font-black text-[#121212] bg-[#D4AF37] shadow-[6px_6px_14px_#070707,-6px_-6px_14px_#8a6d1a] active:shadow-[inset_5px_5px_10px_#8a6d1a,inset_-5px_-5px_10px_#ffea4d] transition-all hover:brightness-110 flex items-center justify-center gap-3 tracking-wider text-lg"
            >
              <span className="text-2xl">🎁</span>
              View Combo Packages &amp; Offers
            </button>
            <p className="text-[10px] text-gray-500 font-bold mt-2 text-center">
              Bundled deals — save up to Rs. 800 vs buying separately
            </p>
          </div>

          {/* ── Weight + Total ── */}
          <div className="flex flex-col gap-3 pt-5 border-t border-[#1d1d1d]">

            {/* Weight Display */}
            <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d]">
              <span className="text-sm text-gray-400 font-bold">Portion Weight</span>
              <span className="text-sm font-black text-gray-200">
                {foodGrams}g
                {beverageVolume > 0 && (
                  <span className="text-[10px] text-gray-500 ml-2 font-bold">+ {beverageVolume}ml beverages</span>
                )}
              </span>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 px-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Base ({portion.toUpperCase()})</span>
                <span>Rs. {basePrice}</span>
              </div>
              {addonTotal > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Add-ons &amp; beverages ({selectedAddons.length})</span>
                  <span>+Rs. {addonTotal}</span>
                </div>
              )}
              {suggestionTotal > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Suggested add-ons ({selectedSuggestions.length})</span>
                  <span>+Rs. {suggestionTotal}</span>
                </div>
              )}
              {comboTotal > 0 && (
                <div className="flex justify-between text-xs text-[#D4AF37]">
                  <span>Combo packages ({selectedComboObjs.length})</span>
                  <span>+Rs. {comboTotal}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className="flex justify-between text-xs text-[#D4AF37]">
                  <span>Promo Discount</span>
                  <span>-Rs. {promoDiscount}</span>
                </div>
              )}
            </div>

            {/* Total Price */}
            <div className="flex items-center justify-between px-5 py-4 rounded-xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d,0_0_0_1px_#2a2a2a]">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total</span>
              <span className="text-2xl font-black text-[#D4AF37]">Rs. {totalPrice}</span>
            </div>

            {/* Order Now */}
            <Link
              href="/cart"
              className="w-full py-5 rounded-2xl font-black text-[#121212] bg-[#D4AF37] shadow-[6px_6px_14px_#070707,-6px_-6px_14px_#8a6d1a] active:shadow-[inset_5px_5px_10px_#8a6d1a,inset_-5px_-5px_10px_#ffea4d] transition-all tracking-wider text-lg hover:brightness-110 text-center block"
            >
              Order Now — Rs. {totalPrice}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Recipe Modal ───────────────────────────────────────────── */}
      {recipeOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Recipe & Ingredients"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRecipeOpen(false)} />

          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 rounded-[2rem] bg-[#121212] shadow-[24px_24px_48px_#070707,-24px_-24px_48px_#1d1d1d,0_0_0_1px_#2a2a2a] border border-[#1d1d1d]">

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-[#D4AF37] tracking-wide">📖 Recipe &amp; Ingredients</h2>
              <button
                type="button"
                aria-label="Close recipe"
                onClick={() => setRecipeOpen(false)}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#121212] text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:text-[#D4AF37] transition-all shrink-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Recipe Body */}
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-sm font-black text-gray-200 mb-2">Description</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{product.description}</p>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d,0_0_0_1px_#2a2a2a]">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Estimated Prep Time</p>
                  <p className="text-[#D4AF37] font-black">{product.prepTime} Mins</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-gray-200 mb-3">Ingredients</h3>
                <div className="grid grid-cols-2 gap-3">
                  {product.ingredients.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-3 rounded-xl bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d,0_0_0_1px_#2a2a2a]"
                    >
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs bg-[#8FBC8F] text-[#121212] font-black shrink-0">
                        ✓
                      </span>
                      <span className="text-xs font-bold text-gray-300 leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRecipeOpen(false)}
                className="w-full py-4 rounded-xl font-black text-[#121212] bg-[#D4AF37] shadow-[4px_4px_10px_#070707,-4px_-4px_10px_#8a6d1a] transition-all hover:brightness-110 tracking-wider"
              >
                Back to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Combo Modal ───────────────────────────────────────────── */}
      {comboOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Combo Packages & Offers"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setComboOpen(false)} />

          {/* Modal Panel */}
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-[2rem] bg-[#121212] shadow-[24px_24px_48px_#070707,-24px_-24px_48px_#1d1d1d,0_0_0_1px_#2a2a2a] border border-[#1d1d1d]">

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-[#D4AF37] tracking-wide">🎁 Combo Packages &amp; Offers</h2>
                <p className="text-xs text-gray-500 font-bold mt-1">Bundled deals — save big vs buying separately</p>
              </div>
              <button
                type="button"
                aria-label="Close combo offers"
                onClick={() => setComboOpen(false)}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#121212] text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:text-[#D4AF37] transition-all shrink-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Combo Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {COMBOS.map((combo) => {
                const added = selectedCombos.includes(combo.id);
                return (
                  <div
                    key={combo.id}
                    className={`rounded-2xl overflow-hidden bg-[#121212] transition-all duration-300 ${
                      added
                        ? 'shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d,0_0_0_1px_#D4AF37,0_0_18px_rgba(212,175,55,0.3)]'
                        : 'shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a]'
                    }`}
                  >
                    <div className="relative w-full aspect-[4/3] bg-[#121212]">
                      <Image
                        src={combo.image}
                        alt={combo.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover"
                      />
                      <span className="absolute top-3 left-3 text-[10px] font-black px-3 py-1.5 rounded-full bg-[#D4AF37] text-[#121212] shadow-[0_0_10px_rgba(212,175,55,0.6)]">
                        SAVE Rs. {combo.save}
                      </span>
                      {added && (
                        <span className="absolute top-3 right-3 text-[10px] font-black px-3 py-1.5 rounded-full bg-[#8FBC8F] text-[#121212] shadow-[2px_2px_4px_#070707]">
                          ✓ Added to order
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="text-sm font-black text-white leading-tight">{combo.name}</h3>
                      <ul className="flex flex-col gap-1.5 mt-3 mb-4">
                        {combo.includes.map((inc) => (
                          <li key={inc} className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
                            <span className="text-[#8FBC8F]">✓</span>
                            {inc}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-lg font-black text-[#D4AF37] whitespace-nowrap">Rs. {combo.price}</span>
                        <button
                          type="button"
                          onClick={() => toggleCombo(combo.id)}
                          className={`flex-1 py-3 rounded-xl font-black text-sm tracking-wider transition-all ${
                            added
                              ? 'bg-[#121212] text-[#D4AF37] shadow-[inset_3px_3px_6px_#070707]'
                              : 'bg-[#D4AF37] text-[#121212] shadow-[4px_4px_10px_#070707,-4px_-4px_10px_#8a6d1a] hover:brightness-110'
                          }`}
                        >
                          {added ? 'Remove' : 'Add Combo'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-gray-600 font-bold text-center mt-6">
              Combo prices already include the bundle discount — no coupon needed
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
