'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const MENU_ITEMS = [
  // ───────────────────────── Fried Rice (9) ─────────────────────────
  { id: 'fr-1', name: 'Vegetables Fried Rice', category: 'FRIED RICE', normalPrice: 500, fullPrice: 750, image: '/images/fried-rice-veg.jpg', desc: 'A colorful wok-tossed fried rice loaded with fresh garden vegetables.' },
  { id: 'fr-2', name: 'Egg Fried Rice', category: 'FRIED RICE', normalPrice: 600, fullPrice: 850, image: '/images/fried-rice-egg.jpg', desc: 'Classic egg fried rice with scrambled eggs and aromatic garlic.' },
  { id: 'fr-3', name: 'Fish Fried Rice', category: 'FRIED RICE', normalPrice: 700, fullPrice: 1000, image: '/images/fried-rice-fish.jpg', desc: 'Flaked fish fried rice with a light garlicky aroma.' },
  { id: 'fr-4', name: 'Chicken Fried Rice', category: 'FRIED RICE', normalPrice: 700, fullPrice: 1000, image: '/images/fried-rice-chicken.jpg', desc: 'Tender chicken pieces tossed into fragrant fried rice.' },
  { id: 'fr-5', name: 'Seafood Fried Rice', category: 'FRIED RICE', normalPrice: 1200, fullPrice: 1400, image: '/images/fried-rice-seafood.jpg', desc: 'A decadent seafood fried rice with prawns and fish.' },
  { id: 'fr-6', name: 'Mixed Fried Rice', category: 'FRIED RICE', normalPrice: 1200, fullPrice: 1400, image: '/images/monday-bowl.jpg', desc: 'Everything-in-the-wok fried rice with chicken, fish, and vegetables.' },
  { id: 'fr-7', name: 'Set Menu', category: 'FRIED RICE', normalPrice: 1000, fullPrice: 1300, image: '/images/set-menu.jpg', desc: 'A complete set meal with fried rice and curd sambal.' },
  { id: 'fr-8', name: 'Nasigurang', category: 'FRIED RICE', normalPrice: 1100, fullPrice: 1400, image: '/images/nasigurang.jpg', desc: 'Sri Lankan nasi gureng with rich rempah and coconut milk.' },
  { id: 'fr-9', name: 'Biriyani', category: 'FRIED RICE', normalPrice: 1200, fullPrice: 1500, image: '/images/biriyani.jpg', desc: 'Aromatic biriyani layered with chicken, spices, and saffron rice.' },

  // ───────────────────────── Kottu (7) ─────────────────────────
  { id: 'kt-1', name: 'Chicken Kottu', category: 'KOTTU', normalPrice: 700, fullPrice: 950, image: '/images/kottu-chicken.jpg', desc: 'The iconic kottu rotti shredded and fried with chicken.' },
  { id: 'kt-2', name: 'Chicken Kottu Special', category: 'KOTTU', normalPrice: 700, fullPrice: 950, image: '/images/tuesday-bowl.jpg', desc: 'Special chicken kottu with an extra egg and richer gravy.' },
  { id: 'kt-3', name: 'Seafood Kottu', category: 'KOTTU', normalPrice: 1000, fullPrice: 1300, image: '/images/kottu-seafood.jpg', desc: 'Kottu with prawns and fish in a spicy gravy.' },
  { id: 'kt-4', name: 'Mixed Kottu', category: 'KOTTU', normalPrice: 1300, fullPrice: 1700, image: '/images/wednesday-bowl.jpg', desc: 'A hearty mixed kottu with chicken, beef, and vegetables.' },
  { id: 'kt-5', name: 'Beef Kottu', category: 'KOTTU', normalPrice: 1000, fullPrice: 1250, image: '/images/thursday-bowl.jpg', desc: 'Succulent beef kottu with a deeply savoury gravy.' },
  { id: 'kt-6', name: 'Cheese Kottu', category: 'KOTTU', normalPrice: 1100, fullPrice: 1500, image: '/images/friday-bowl.jpg', desc: 'Kottu rotti tossed in melted cheese and vegetables.' },
  { id: 'kt-7', name: 'Lava Kottu', category: 'KOTTU', fullPrice: 2000, image: '/images/kottu-lava.jpg', desc: 'The ultimate lava kottu — molten cheese with chicken and veg.' },

  // ───────────────────────── Pasta (2) ─────────────────────────
  { id: 'ps-1', name: 'Baduma Special Pasta', category: 'PASTA', normalPrice: 1000, image: '/images/pasta-special.jpg', desc: 'Our signature pasta with chicken in a creamy garlic parmesan sauce.' },
  { id: 'ps-2', name: 'Chilly Pasta', category: 'PASTA', normalPrice: 1000, image: '/images/pasta-chilly.jpg', desc: 'A spicy chilli pasta with crisp green peppers and garlic.' },
];

export default function CustomerHomePage() {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const categories = ['ALL', 'FRIED RICE', 'KOTTU', 'PASTA'];

  const filteredItems = activeCategory === 'ALL' ? MENU_ITEMS : MENU_ITEMS.filter(item => item.category === activeCategory);

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
                ? 'bg-[#121212] text-[#D4AF37] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]'
                : 'bg-[#121212] text-gray-400 shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] hover:text-[#D4AF37]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 3D Neumorphic Product Grid — cards wrapped in Link */}
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
              {/* Category Tag — green bg, black text */}
              <span className="absolute top-3 left-3 px-3 py-1 text-[10px] font-bold tracking-widest text-[#121212] bg-[#8FBC8F] rounded-lg shadow-[2px_2px_4px_#070707]">
                {item.category}
              </span>
            </div>

            {/* Product Name — clean white */}
            <div className="flex-grow">
              <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">{item.name}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>

            {/* Price Toggles — Green background, Black text, 3D pressed */}
            <div className="flex gap-3 mt-5">
              {item.normalPrice && (
                <div className="flex-1 flex flex-col items-center justify-center py-3 rounded-xl bg-[#8FBC8F] shadow-[inset_4px_4px_8px_#5A7A5A,inset_-4px_-4px_8px_#B8D8B8]">
                  <span className="text-[10px] font-bold tracking-widest text-[#121212]">NORMAL</span>
                  <span className="text-sm font-black text-[#121212]">Rs. {item.normalPrice}</span>
                </div>
              )}
              {item.fullPrice && (
                <div className="flex-1 flex flex-col items-center justify-center py-3 rounded-xl bg-[#8FBC8F] shadow-[inset_4px_4px_8px_#5A7A5A,inset_-4px_-4px_8px_#B8D8B8]">
                  <span className="text-[10px] font-bold tracking-widest text-[#121212]">FULL</span>
                  <span className="text-sm font-black text-[#121212]">Rs. {item.fullPrice}</span>
                </div>
              )}
            </div>

            {/* ADD TO CART — Premium Gold 3D extruded */}
            <div className="w-full mt-4 py-4 rounded-xl font-black text-[#121212] bg-[#D4AF37] shadow-[5px_5px_10px_#070707,-5px_-5px_10px_#8a6d1a] flex items-center justify-center gap-2">
              <span>🛒</span> ADD TO CART
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
