'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/products';

const ADDONS = [
  { id: 'egg', name: 'Extra Egg', price: 100 },
  { id: 'cheese', name: 'Extra Cheese', price: 150 },
  { id: 'meat', name: 'Extra Meat', price: 200 },
];

const BEVERAGES = [
  { id: 'coke', name: 'Coke', price: 80, volume: 330 },
  { id: 'sprite', name: 'Sprite', price: 80, volume: 330 },
  { id: 'juice', name: 'Fresh Fruit Juice', price: 120, volume: 400 },
];

const COMBOS = [
  {
    id: 'combo-full-coke',
    name: 'Full Portion + Coke Combo',
    price: 1050,
    save: 130,
    includes: ['coke'],
    note: 'FULL portion rice + 330ml Coke — bundled deal',
  },
  {
    id: 'combo-full-juice',
    name: 'Full Portion + Juice Combo',
    price: 1150,
    save: 170,
    includes: ['juice'],
    note: 'FULL portion rice + 400ml Fresh Fruit Juice',
  },
  {
    id: 'combo-family',
    name: 'Family Feast Combo',
    price: 2000,
    save: 400,
    includes: ['coke', 'juice'],
    note: 'FULL portion + Coke + Juice + Extra Egg — best value',
  },
];

export default function ProductDetailClient({ product }: { product: Product }) {
  const hasNormal = !!product.priceNormal;
  const hasFull = !!product.priceFull;

  const [portion, setPortion] = useState<'normal' | 'full'>(hasNormal ? 'normal' : 'full');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedBeverages, setSelectedBeverages] = useState<string[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);
  const [promoActive] = useState(true);

  // Selecting a combo locks the order to FULL and includes its beverages for free
  useEffect(() => {
    if (selectedCombos.length === 0) return;
    setPortion('full');
    const covered = new Set<string>();
    selectedCombos.forEach((id) => {
      COMBOS.find((c) => c.id === id)?.includes.forEach((b) => covered.add(b));
    });
    setSelectedBeverages((prev) => Array.from(new Set([...prev, ...covered])));
  }, [selectedCombos]);

  const activeCombos = selectedCombos.flatMap((id) => COMBOS.filter((c) => c.id === id));
  const comboActive = activeCombos.length > 0;

  const coveredBeverages = new Set(activeCombos.flatMap((c) => c.includes));
  const standaloneBeverages = selectedBeverages.filter((b) => !coveredBeverages.has(b));

  // A combo covers the FULL base — base is only charged on regular orders
  const basePrice = comboActive
    ? 0
    : portion === 'normal'
      ? product.priceNormal ?? product.priceFull ?? 0
      : product.priceFull ?? product.priceNormal ?? 0;

  const addonTotal = selectedAddons.reduce(
    (sum, id) => sum + (ADDONS.find((a) => a.id === id)?.price ?? 0),
    0
  );

  const beverageTotal = standaloneBeverages.reduce(
    (sum, id) => sum + (BEVERAGES.find((b) => b.id === id)?.price ?? 0),
    0
  );

  const comboTotal = activeCombos.reduce((sum, c) => sum + c.price, 0);
  const comboSavings = activeCombos.reduce((sum, c) => sum + c.save, 0);

  // Combos are already discounted deals — the 10% promo stacks only on regular orders
  const promoDiscount = promoActive && !comboActive ? Math.floor(basePrice * 0.1) : 0;

  const totalPrice = Math.max(
    0,
    basePrice + addonTotal + beverageTotal + comboTotal - promoDiscount
  );

  const baseWeight = portion === 'normal' ? 450 : 700;
  const totalWeight = baseWeight + selectedAddons.length * 50;
  const beverageVolume = selectedBeverages.reduce(
    (sum, id) => sum + (BEVERAGES.find((b) => b.id === id)?.volume ?? 0),
    0
  );

  const toggleAddon = (id: string) =>
    setSelectedAddons((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const toggleBeverage = (id: string) =>
    setSelectedBeverages((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));

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
              className="object-cover opacity-90 hover:scale-105 transition-transform duration-500"
            />
            <span className="absolute top-4 left-4 text-xs font-bold px-4 py-2 rounded-full bg-[#8FBC8F] text-[#121212] shadow-[2px_2px_4px_#070707]">
              {product.category}
            </span>
            {promoActive && !comboActive && (
              <span className="absolute top-4 right-4 text-[10px] font-black px-3 py-1.5 rounded-full bg-[#D4AF37] text-[#121212] shadow-[0_0_12px_rgba(212,175,55,0.5)] animate-pulse">
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

            {/* Ingredients */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-400 mb-4 border-b border-[#1d1d1d] pb-2">Key Ingredients</h3>
              <div className="flex flex-wrap gap-3">
                {product.ingredients.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d,0_0_0_1px_#2a2a2a]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Promotions Highlight ── */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Promotions Highlight</h3>
            <div className="flex flex-col gap-3">
              {promoActive && !comboActive && (
                <div className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-[#1a1a0e] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d,0_0_14px_rgba(212,175,55,0.35)] animate-pulse">
                  <span className="text-sm font-black text-[#D4AF37]">
                    🔥 10% OFF — sitewide promo applied to your order!
                  </span>
                </div>
              )}
              {comboActive && (
                <div className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-[#1a1a0e] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d,0_0_18px_rgba(212,175,55,0.55)] animate-pulse">
                  <span className="text-sm font-black text-[#D4AF37]">
                    🏆 COMBO ACTIVE — YOU SAVE Rs. {comboSavings}!
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
                  disabled={comboActive}
                  onClick={() => setPortion('normal')}
                  className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 ${
                    comboActive
                      ? 'opacity-40 cursor-not-allowed'
                      : portion === 'normal'
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
                  disabled={comboActive}
                  onClick={() => setPortion('full')}
                  className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 ${
                    comboActive
                      ? 'opacity-40 cursor-not-allowed'
                      : portion === 'full'
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
            {comboActive && (
              <p className="text-[10px] text-[#D4AF37]/80 font-bold mt-2 text-center">
                🔒 FULL portion locked by combo — remove the combo to change
              </p>
            )}
          </div>

          {/* ── Custom Add-ons ── */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Custom Add-ons</h3>
            <div className="flex flex-col gap-3">
              {ADDONS.map((addon) => {
                const checked = selectedAddons.includes(addon.id);
                return (
                  <button
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`flex items-center justify-between px-5 py-4 rounded-xl font-bold transition-all duration-300 ${
                      checked
                        ? 'bg-[#1a2410] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d,0_0_0_1px_#8FBC8F,0_0_12px_rgba(143,188,143,0.2)]'
                        : 'bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d,0_0_0_1px_#2a2a2a]'
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm text-gray-300">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                        checked ? 'bg-[#8FBC8F] text-[#121212]' : 'bg-[#1d1d1d] text-gray-500'
                      }`}>
                        {checked ? '✓' : ''}
                      </span>
                      {addon.name}
                    </span>
                    <span className="text-sm font-black text-gray-300">+Rs. {addon.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Add Extras & Beverages (Cross-sell / Combos) ── */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">Add Extras &amp; Beverages</h3>
            <p className="text-[10px] text-gray-500 mb-4 font-bold">Tick to add — total updates instantly</p>

            {/* Beverages */}
            <div className="flex flex-col gap-3 mb-5">
              {BEVERAGES.map((bev) => {
                const checked = selectedBeverages.includes(bev.id);
                const covered = coveredBeverages.has(bev.id);
                return (
                  <button
                    key={bev.id}
                    onClick={() => toggleBeverage(bev.id)}
                    className={`flex items-center justify-between px-5 py-4 rounded-xl font-bold transition-all duration-300 ${
                      checked
                        ? 'bg-[#1a2410] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d,0_0_0_1px_#8FBC8F,0_0_12px_rgba(143,188,143,0.2)]'
                        : 'bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d,0_0_0_1px_#2a2a2a]'
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm text-gray-300">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                        checked ? 'bg-[#8FBC8F] text-[#121212]' : 'bg-[#1d1d1d] text-gray-500'
                      }`}>
                        {checked ? '✓' : ''}
                      </span>
                      {bev.name}
                      {covered && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37]">
                          Included in combo
                        </span>
                      )}
                      <span className="text-[10px] text-gray-600">({bev.volume}ml)</span>
                    </span>
                    <span className="text-sm font-black text-gray-300">+Rs. {bev.price}</span>
                  </button>
                );
              })}
            </div>

            {/* Combo Packages */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
                ⭐ Combo Packages
              </h4>
              {COMBOS.map((combo) => {
                const checked = selectedCombos.includes(combo.id);
                return (
                  <button
                    key={combo.id}
                    onClick={() => toggleCombo(combo.id)}
                    className={`px-5 py-4 rounded-xl font-bold transition-all duration-300 text-left ${
                      checked
                        ? 'bg-[#1a1a0e] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d,0_0_0_1px_#D4AF37,0_0_16px_rgba(212,175,55,0.35)]'
                        : 'bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3 min-w-0">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                          checked ? 'bg-[#D4AF37] text-[#121212]' : 'bg-[#1d1d1d] text-gray-500'
                        }`}>
                          {checked ? '✓' : ''}
                        </span>
                        <span className="text-sm text-gray-200">{combo.name}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-black text-[#D4AF37]">Rs. {combo.price}</span>
                        <span className="text-[10px] font-black px-2 py-1 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                          SAVE Rs. {combo.save}
                        </span>
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 pl-8">{combo.note}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Weight + Promo + Total ── */}
          <div className="flex flex-col gap-3 pt-5 border-t border-[#1d1d1d]">

            {/* Weight Display */}
            <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d]">
              <span className="text-sm text-gray-400 font-bold">Portion Weight</span>
              <span className="text-sm font-black text-gray-200">
                {totalWeight}g
                {beverageVolume > 0 && (
                  <span className="text-[10px] text-gray-500 ml-2 font-bold">+ {beverageVolume}ml beverages</span>
                )}
              </span>
            </div>

            {/* Promo / Combo Badge */}
            {promoActive && !comboActive && (
              <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1a1a0e] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d,0_0_12px_rgba(212,175,55,0.2)]">
                <span className="text-sm font-black text-[#D4AF37] animate-pulse">
                  🔥 PROMO ACTIVE — 10% OFF applied!
                </span>
              </div>
            )}
            {comboActive && (
              <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1a1a0e] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d,0_0_18px_rgba(212,175,55,0.5)] animate-pulse">
                <span className="text-sm font-black text-[#D4AF37]">
                  🏆 COMBO ACTIVE — SAVINGS Rs. {comboSavings}
                </span>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="space-y-2 px-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Base ({portion.toUpperCase()})</span>
                <span>{comboActive ? 'Included in combo' : `Rs. ${basePrice}`}</span>
              </div>
              {addonTotal > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Add-ons ({selectedAddons.length})</span>
                  <span>+Rs. {addonTotal}</span>
                </div>
              )}
              {beverageTotal > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Beverages ({standaloneBeverages.length})</span>
                  <span>+Rs. {beverageTotal}</span>
                </div>
              )}
              {comboTotal > 0 && (
                <div className="flex justify-between text-xs text-[#D4AF37]">
                  <span>Combo packages ({activeCombos.length})</span>
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
    </div>
  );
}
