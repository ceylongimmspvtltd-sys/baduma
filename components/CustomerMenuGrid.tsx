"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { menuCategories, type MenuItem } from "@/lib/menu";
import { useCart } from "@/lib/cart";
import { formatLKR } from "@/lib/orders";

/**
 * Storefront menu grid (client) — category filter + product cards.
 *
 * Items come from the server (`getMenuItems()` in app/(customer)/page.tsx):
 * active products edited by the admin, or the curated static menu.
 */
export default function CustomerMenuGrid({ items }: { items: MenuItem[] }) {
  const categories = menuCategories(items);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const cart = useCart();

  function addToCart(item: MenuItem) {
    // Cheapest available portion is a sensible default; the cart lets you switch.
    const size = item.normalPrice ? "normal" : "full";
    const unitPrice = item.normalPrice ?? item.fullPrice ?? 0;
    if (!unitPrice) return;
    cart.add({
      productId: item.id,
      name: item.name,
      image: item.image,
      size,
      unitPrice,
      quantity: 1,
    });
    setJustAdded(item.id);
    setTimeout(() => setJustAdded((current) => (current === item.id ? null : current)), 1500);
  }

  const filteredItems =
    activeCategory === "ALL" ? items : items.filter((item) => item.category === activeCategory);

  return (
    <div className="flex flex-col gap-10 pt-4">
      {/* 3D Category Filter Pills */}
      <div className="flex flex-wrap gap-4 justify-center">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
              activeCategory === cat
                ? "bg-[#121212] text-[#D4AF37] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]"
                : "bg-[#121212] text-gray-400 shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] hover:text-[#D4AF37]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <p className="text-center text-gray-500 py-16">No items in this category right now.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item, index) => (
            <Link
              key={item.id}
              href={`/product/${item.id}`}
              className="p-5 rounded-[2rem] bg-[#121212] shadow-[10px_10px_20px_#070707,-10px_-10px_20px_#1d1d1d,0_0_0_1px_#2a2a2a] border border-[#1d1d1d] flex flex-col group transition-all duration-300 hover:shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d]"
            >
              {/* Product Image — deep inset frame */}
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-[inset_8px_8px_16px_#070707,inset_-8px_-8px_16px_#1d1d1d] mb-5">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  priority={index < 3}
                />
                <span className="absolute top-3 left-3 px-3 py-1 text-[10px] font-bold tracking-widest text-[#121212] bg-[#8FBC8F] rounded-lg shadow-[2px_2px_4px_#070707]">
                  {item.category}
                </span>
              </div>

              {/* Product Name */}
              <div className="flex-grow">
                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">{item.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>

              {/* Price toggles */}
              <div className="flex gap-3 mt-5">
                {item.normalPrice ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-3 rounded-xl bg-[#8FBC8F] shadow-[inset_4px_4px_8px_#5A7A5A,inset_-4px_-4px_8px_#B8D8B8]">
                    <span className="text-[10px] font-bold tracking-widest text-[#121212]">NORMAL</span>
                    <span className="text-sm font-black text-[#121212]">Rs. {item.normalPrice}</span>
                  </div>
                ) : null}
                {item.fullPrice ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-3 rounded-xl bg-[#8FBC8F] shadow-[inset_4px_4px_8px_#5A7A5A,inset_-4px_-4px_8px_#B8D8B8]">
                    <span className="text-[10px] font-bold tracking-widest text-[#121212]">FULL</span>
                    <span className="text-sm font-black text-[#121212]">Rs. {item.fullPrice}</span>
                  </div>
                ) : null}
              </div>

              {/* CTA — real add-to-cart (the card itself links to the detail page) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addToCart(item);
                }}
                className="w-full mt-4 py-4 rounded-xl font-black text-[#121212] bg-[#D4AF37] shadow-[5px_5px_10px_#070707,-5px_-5px_10px_#8a6d1a] flex items-center justify-center gap-2 active:shadow-[inset_4px_4px_8px_#8a6d1a] transition-all"
              >
                <span>🛒</span> {justAdded === item.id ? "ADDED ✓" : "ADD TO CART"}
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
