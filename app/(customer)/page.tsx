'use client';

import { useState } from 'react';

const MENU_ITEMS = [
  { id: '1', name: 'Chicken Fried Rice', category: 'FRIED RICE', normalPrice: 700, fullPrice: 1000, desc: 'Delicious chicken fried rice mixed with fresh veggies.' },
  { id: '2', name: 'Seafood Kottu', category: 'KOTTU', normalPrice: 1000, fullPrice: 1300, desc: 'Authentic Sri Lankan kottu with fresh seafood.' },
  { id: '3', name: 'Mixed Fried Rice', category: 'FRIED RICE', normalPrice: 1200, fullPrice: 1400, desc: 'A mix of chicken, seafood, and egg with basmati rice.' },
  { id: '4', name: 'Cheese Kottu', category: 'KOTTU', normalPrice: 1100, fullPrice: 1500, desc: 'Creamy cheese kottu packed with flavor and spices.' },
  { id: '5', name: 'Baduma Special Pasta', category: 'PASTA', normalPrice: 1000, desc: 'Special Baduma style pasta tossed in rich sauce.' },
  { id: '6', name: 'Beef Kottu', category: 'KOTTU', normalPrice: 1000, fullPrice: 1250, desc: 'Spicy and tender beef kottu made fresh to order.' },
];

export default function CustomerHomePage() {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const categories = ['ALL', 'FRIED RICE', 'KOTTU', 'PASTA'];

  const filteredItems = activeCategory === 'ALL' ? MENU_ITEMS : MENU_ITEMS.filter(item => item.category === activeCategory);

  return (
    <div className="flex flex-col gap-10 pt-4">

      {/* 3D Category Filter */}
      <div className="flex flex-wrap gap-4 justify-center">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
              activeCategory === cat
                ? 'bg-[#121212] text-[#FFD700] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]'
                : 'bg-[#121212] text-gray-400 shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] hover:text-[#FFD700]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 3D Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.map((item) => (
          <div key={item.id} className="p-6 rounded-[2rem] bg-[#121212] shadow-[10px_10px_20px_#070707,-10px_-10px_20px_#1d1d1d] border border-[#1d1d1d] flex flex-col justify-between group">

            <div>
              <span className="inline-block px-3 py-1 mb-4 text-[10px] font-bold tracking-widest text-[#8FBC8F] bg-[#121212] rounded-lg shadow-[inset_2px_2px_4px_#070707,inset_-2px_-2px_4px_#1d1d1d]">
                {item.category}
              </span>
              <h3 className="text-xl font-black text-gray-100 mb-2 uppercase tracking-wide">{item.name}</h3>
              <p className="text-xs text-gray-500 mb-6">{item.desc}</p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                {item.normalPrice && (
                  <div className="flex-1 flex flex-col items-center justify-center py-2 bg-[#121212] rounded-xl shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
                    <span className="text-[10px] text-gray-400 font-bold">NORMAL</span>
                    <span className="text-sm font-black text-[#8FBC8F]">Rs. {item.normalPrice}</span>
                  </div>
                )}
                {item.fullPrice && (
                  <div className="flex-1 flex flex-col items-center justify-center py-2 bg-[#121212] rounded-xl shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
                    <span className="text-[10px] text-gray-400 font-bold">FULL</span>
                    <span className="text-sm font-black text-[#8FBC8F]">Rs. {item.fullPrice}</span>
                  </div>
                )}
              </div>

              <button className="w-full py-4 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_4px_4px_8px_#ccac00,inset_-4px_-4px_8px_#ffea4d] transition-all tracking-wider flex items-center justify-center gap-2">
                <span>🛒</span> ADD TO CART
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
