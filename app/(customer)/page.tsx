import Image from 'next/image';

export default function CustomerHomePage() {
  return (
    <div className="flex flex-col gap-12 pt-4">
      {/* Hero Banner Section using PR #10 asset */}
      <div className="relative w-full h-[400px] rounded-[2.5rem] bg-[#121212] shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d] border border-[#1d1d1d] overflow-hidden group">
        <Image
          src="/images/hero-banner-mockup.jpg"
          alt="Baduma.sl Hero Banner"
          fill
          className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent flex flex-col justify-end p-10">
          <h1 className="text-5xl font-black text-[#FFD700] drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] mb-2">බැදුම[cite: 4]</h1>
          <p className="text-lg text-white font-bold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">නගරේ රහට * ගානට[cite: 4]</p>
        </div>
      </div>

      {/* PR #10 Secondary Pattern: Menu Card Mockups Implementation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 rounded-[2.5rem] bg-[#121212] shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d] border border-[#1d1d1d] flex flex-col items-center justify-center">
          <div className="w-full relative aspect-video rounded-2xl overflow-hidden shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] mb-6">
            <Image src="/images/menu-card-mockup.jpg" alt="Menu Patterns" fill className="object-cover opacity-90" />
          </div>
          <h3 className="text-xl font-bold text-[#FFD700] w-full text-left mb-2">Explore the Menu</h3>
          <p className="text-sm text-gray-400 w-full text-left mb-6">Experience our signature Fried Rice, Kottu, and Pasta selections.</p>
          <button className="w-full py-4 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#332b00] active:shadow-[inset_4px_4px_8px_#ccac00,inset_-4px_-4px_8px_#ffea4d] transition-all tracking-wider">
            View Full Menu
          </button>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-[#121212] shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d] border border-[#1d1d1d] flex flex-col items-center justify-center">
           <div className="w-full relative aspect-video rounded-2xl overflow-hidden shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] mb-6">
            <Image src="/images/social-post-mockup.jpg" alt="Social Post Integration" fill className="object-cover opacity-90" />
          </div>
          <h3 className="text-xl font-bold text-[#FFD700] w-full text-left mb-2">Join Our Community</h3>
          <p className="text-sm text-gray-400 w-full text-left mb-6">Follow us on Instagram and Facebook for the latest offers.</p>
           <button className="w-full py-4 rounded-xl font-black text-gray-300 bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] active:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all tracking-wider hover:text-[#FFD700]">
            Follow Baduma.sl
          </button>
        </div>
      </div>
    </div>
  );
}
