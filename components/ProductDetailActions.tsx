'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/products';

export default function ProductDetailActions({ product }: { product: Product }) {
  const [size, setSize] = useState<'Normal' | 'Full'>(product.priceNormal ? 'Normal' : 'Full');
  const [qty, setQty] = useState(1);
  const router = useRouter();

  const handleAddToCart = () => {
    alert(`Added ${qty}x ${product.name} (${size}) to cart!`);
  };

  const handleViewCart = () => {
    router.push('/cart');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Size Selection */}
      {product.priceNormal && product.priceFull && (
        <div className="grid grid-cols-2 gap-3">
          {product.priceNormal && (
            <button
              onClick={() => setSize('Normal')}
              className={`py-3 rounded-xl text-sm font-bold transition-all ${
                size === 'Normal'
                  ? 'bg-[#121212] text-[#8FBC8F] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#8FBC8F]/40'
                  : 'bg-[#121212] text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d]'
              }`}
            >
              Normal: Rs. {product.priceNormal}/=
            </button>
          )}
          {product.priceFull && (
            <button
              onClick={() => setSize('Full')}
              className={`py-3 rounded-xl text-sm font-bold transition-all ${
                size === 'Full'
                  ? 'bg-[#121212] text-[#8FBC8F] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#8FBC8F]/40'
                  : 'bg-[#121212] text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d]'
              }`}
            >
              Full: Rs. {product.priceFull}/=
            </button>
          )}
        </div>
      )}

      {/* Quantity Stepper */}
      <div className="flex items-center rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] px-2 py-1 w-fit">
        <button
          onClick={() => setQty(Math.max(1, qty - 1))}
          className="w-10 h-10 rounded-lg text-gray-400 hover:text-white font-bold flex items-center justify-center"
        >
          −
        </button>
        <span className="w-10 text-center text-sm font-bold text-gray-200">{qty}</span>
        <button
          onClick={() => setQty(qty + 1)}
          className="w-10 h-10 rounded-lg text-gray-400 hover:text-white font-bold flex items-center justify-center"
        >
          +
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAddToCart}
          className="flex-1 py-4 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#332b00] active:shadow-[inset_4px_4px_8px_#ccac00,inset_-4px_-4px_8px_#ffea4d] transition-all tracking-wider"
        >
          Add to Cart
        </button>
        <button
          onClick={handleViewCart}
          className="px-6 py-4 rounded-xl font-bold text-gray-300 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:text-[#FFD700] transition-all"
        >
          View Cart
        </button>
      </div>
    </div>
  );
}
