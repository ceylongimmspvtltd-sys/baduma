'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BADUMA_MENU, type Product } from '@/lib/products';

export default function ProductMenu() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [quantities, setQuantities] = useState<{ [key: string]: { size: 'Normal' | 'Full'; qty: number } }>({});

  const categories = ['All', 'Fried Rice', 'Kottu', 'Pasta'];

  const filteredProducts = selectedCategory === 'All'
    ? BADUMA_MENU
    : BADUMA_MENU.filter(p => p.category === selectedCategory);

  const handleSizeChange = (id: string, size: 'Normal' | 'Full') => {
    setQuantities(prev => ({
      ...prev,
      [id]: { size, qty: prev[id]?.qty || 1 }
    }));
  };

  const handleAddToCart = (product: Product) => {
    const current = quantities[product.id] || { size: product.priceNormal ? 'Normal' : 'Full', qty: 1 };
    alert(`Added ${current.qty}x ${product.name} (${current.size}) to cart!`);
  };

  return (
    <div className="w-full py-6">
      {/* Brand Header Banner */}
      <div className="mb-10 text-center p-8 rounded-3xl bg-[#121212] shadow-[8px_8px_16px_#070707,-8px_-8px_16px_#1d1d1d] border border-[#1d1d1d]">
        <h1 className="text-4xl font-black text-white mt-4 mb-2 tracking-wide">
          Digital Menu
        </h1>
        <p className="text-sm text-gray-400">
          Freshly cooked from Malgammana, Kandy. Order your favorites instantly.
        </p>
      </div>

      {/* Category Filter Pills (Using Sage/Yellow Neumorphic Accents) */}
      <div className="flex justify-center gap-3 mb-10 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                isActive
                  ? 'bg-[#121212] text-[#8FBC8F] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#8FBC8F]/30'
                  : 'bg-[#121212] text-gray-300 shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] hover:text-[#D4AF37]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProducts.map((product) => {
          const currentSelection = quantities[product.id] || {
            size: product.priceNormal ? 'Normal' : 'Full',
            qty: 1
          };

          return (
            <div
              key={product.id}
              className="p-6 bg-[#121212] rounded-3xl shadow-[8px_8px_16px_#070707,-8px_-8px_16px_#1d1d1d] border border-[#1d1d1d] flex flex-col justify-between group hover:shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d] transition-all duration-300"
            >
              <div>
                {/* Product Image Container with 3D Neumorphic Frame — clickable */}
                <Link
                  href={`/product/${product.id}`}
                  className="block relative w-full h-48 mb-6 rounded-2xl overflow-hidden bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] hover:opacity-80 transition-all"
                >
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-600 font-medium text-sm">
                      Plate Preview
                    </div>
                  )}
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-3 py-1 rounded-full bg-[#121212]/90 text-[#D4AF37] shadow-[2px_2px_4px_#070707]">
                    {product.category}
                  </span>
                </Link>

                {/* Product Name — clickable to detail page */}
                <Link
                  href={`/product/${product.id}`}
                  className="block text-xl font-bold text-gray-100 mb-4 tracking-wide hover:text-[#D4AF37] transition-colors"
                >
                  {product.name}
                </Link>

                {/* Size Selection Toggle */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {product.priceNormal && (
                    <button
                      onClick={() => handleSizeChange(product.id, 'Normal')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        currentSelection.size === 'Normal'
                          ? 'bg-[#121212] text-[#8FBC8F] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] border border-[#8FBC8F]/40'
                          : 'bg-[#121212] text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d]'
                      }`}
                    >
                      Normal: Rs. {product.priceNormal}/=
                    </button>
                  )}
                  {product.priceFull && (
                    <button
                      onClick={() => handleSizeChange(product.id, 'Full')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        currentSelection.size === 'Full'
                          ? 'bg-[#121212] text-[#8FBC8F] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] border border-[#8FBC8F]/40'
                          : 'bg-[#121212] text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d]'
                      }`}
                    >
                      Full: Rs. {product.priceFull}/=
                    </button>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-4 border-t border-[#1d1d1d] flex items-center gap-4">
                <div className="flex items-center rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] px-2 py-1">
                  <button
                    onClick={() => setQuantities(prev => ({
                      ...prev,
                      [product.id]: { ...currentSelection, qty: Math.max(1, currentSelection.qty - 1) }
                    }))}
                    className="w-8 h-8 rounded-lg text-gray-400 hover:text-white font-bold flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-gray-200">
                    {currentSelection.qty}
                  </span>
                  <button
                    onClick={() => setQuantities(prev => ({
                      ...prev,
                      [product.id]: { ...currentSelection, qty: currentSelection.qty + 1 }
                    }))}
                    className="w-8 h-8 rounded-lg text-gray-400 hover:text-white font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => handleAddToCart(product)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-[#121212] bg-[#D4AF37] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all text-sm tracking-wide"
                >
                  Add to Cart
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
