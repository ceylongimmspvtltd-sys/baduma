// app/(customer)/page.tsx
import Image from 'next/image';
import ProductMenu from '@/components/ProductMenu'; // කලින් සෑදූ Menu Component එක
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function CustomerHomePage() {
  // සත්‍ය දත්ත ලබා ගැනීමට Supabase සම්බන්ධ කිරීම (උදාහරණයක්)
  // const supabase = createServerClient({ cookies });
  // const { data: products } = await supabase.from('products').select('*');

  return (
    <div className="flex flex-col items-center w-full mt-4">
      {/* 3D Neumorphic Logo Section */}
      <div className="w-full max-w-4xl p-8 mb-12 rounded-[2.5rem] bg-[#121212] shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d] flex flex-col items-center justify-center border border-[#1d1d1d]/50 text-center">
        <h1 className="text-6xl md:text-8xl font-black text-[#FFD700] tracking-tighter drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] mb-4">
          බැදුම
        </h1>
        <div className="px-6 py-2 rounded-full bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
          <p className="text-[#FFD700] text-sm md:text-lg font-bold tracking-[0.2em]">
            නගරේ රහට <span className="text-gray-400 mx-2">*</span> ගානට
          </p>
        </div>
      </div>

      {/* නිෂ්පාදන මෙනුව (Product Menu) */}
      <div className="w-full">
        {/* මෙහි backend එකෙන් එන products pass කළ හැක. දැනට අපි කලින් හැදූ component එක පෙන්වමු */}
        <ProductMenu /> 
      </div>
    </div>
  );
}
