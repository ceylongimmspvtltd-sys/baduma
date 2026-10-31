import '../globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Baduma.sl | Digital Menu',
  description: 'බැදුම - නගරේ රහට * ගානට',
};

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="si">
      <body className="bg-[#121212] text-gray-200 font-sans min-h-screen flex flex-col selection:bg-[#FFD700] selection:text-[#121212]">
        
        {/* Secure Public Navigation (Strictly Isolated) */}
        <nav className="sticky top-0 z-50 bg-[#121212] px-6 py-4 shadow-[8px_8px_16px_#070707,-8px_-8px_16px_#1d1d1d] rounded-b-3xl mb-6 mx-3 mt-3 border border-[#1d1d1d]">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            
            {/* Primary Logo */}
            <Link href="/" className="flex flex-col">
              <span className="text-[#FFD700] font-black text-3xl tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                බැදුම[cite: 4]
              </span>
              <span className="text-[10px] text-gray-400 tracking-widest font-semibold uppercase mt-1">
                නගරේ රහට * ගානට[cite: 4]
              </span>
            </Link>

            {/* Allowed Customer Links Only */}
            <div className="flex items-center gap-4 sm:gap-6">
              {[
                { name: 'Menu', href: '/' },
                { name: 'Cart', href: '/cart' },
                { name: 'Track Orders', href: '/track-orders' },
                { name: 'Profile', href: '/profile' },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-4 py-2 text-sm font-bold rounded-xl bg-[#121212] text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:text-[#FFD700] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all duration-300"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-2">
          {children}
        </main>

        {/* 3D Neumorphic Permanent Footer with Embedded Client Details */}
        <footer className="mt-16 bg-[#121212] p-8 md:p-12 shadow-[inset_8px_8px_16px_#070707,inset_-8px_-8px_16px_#1d1d1d] rounded-t-[2.5rem] mx-3 border-t border-[#1d1d1d]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Brand Info */}
            <div className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d]">
              <h3 className="text-[#FFD700] text-xl font-black mb-2 tracking-wide">Baduma.sl</h3>
              <p className="text-xs text-[#FFD700]/80 mb-4 font-bold">බැදුම නගරේ රහට * ගානට[cite: 4]</p>
              <p className="text-sm text-gray-400">Owner: <span className="text-gray-200 font-bold">Sadun Chamila</span></p>
              <p className="text-sm text-gray-400 mt-2">Baduma.malgammana,<br/>Pilimatalawa, Kandy</p>
            </div>

            {/* Contact Details */}
            <div className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d]">
              <h3 className="text-[#FFD700] text-xl font-bold mb-4 tracking-wide">Contact Us</h3>
              <p className="text-sm text-gray-300 mb-3 flex items-center gap-2"><span>📞</span> +94 77 070 1682</p>
              <p className="text-sm text-gray-300 mb-3 flex items-center gap-2"><span>💬</span> +94 77 948 1682 (WhatsApp)</p>
              <p className="text-sm text-gray-300 mt-4 flex items-center gap-2"><span>✉️</span> Sadunchamila405@gmail.com</p>
            </div>

            {/* Social & Maps Links */}
            <div className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] flex flex-col justify-between">
              <div>
                <h3 className="text-[#FFD700] text-xl font-bold mb-4 tracking-wide">Connect Online</h3>
                <div className="flex flex-col gap-4">
                  <a href="https://maps.app.goo.gl/8c6MEqyV3ReS7Z5r6?g_st=ic" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] text-sm font-bold text-gray-300 hover:text-[#FFD700] transition-all">
                    <span>📍</span> Google Maps Location
                  </a>
                  <a href="https://www.instagram.com/badum.sl?obrf=ZTdnZHQzZ3BzbTZ0&utm_source=qr" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] text-sm font-bold text-gray-300 hover:text-[#FFD700] transition-all">
                    <span>📸</span> Instagram (@badum.sl)
                  </a>
                  <a href="https://www.facebook.com/share/1FPwigZWbq/?mibextid=wwXIfr" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] text-sm font-bold text-gray-300 hover:text-[#FFD700] transition-all">
                    <span>📘</span> Facebook Page
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
