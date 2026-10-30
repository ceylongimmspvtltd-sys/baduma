import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Baduma.sl | Digital Menu & Ordering',
  description: 'බැදුම නගරේ රහට * ගානට - Premium food from Malgammana, Kandy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#121212] text-gray-200 font-sans min-h-screen flex flex-col selection:bg-[#FFD700] selection:text-[#121212]">
        
        {/* Secure Public Navigation Bar */}
        <nav className="sticky top-0 z-50 bg-[#121212] px-6 py-4 shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] rounded-b-3xl mb-6 mx-3 mt-3 border border-[#1d1d1d]">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex flex-col">
              <span className="text-[#FFD700] font-black text-2xl tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Baduma.sl
              </span>
              <span className="text-[10px] text-gray-400 tracking-widest font-semibold uppercase">
                නගරේ රහට * ගානට
              </span>
            </Link>

            {/* Allowed Customer Links Only (Strict Isolation: NO admin/staff/pos/driver links) */}
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
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#121212] text-gray-300 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:text-[#FFD700] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] transition-all duration-300"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-2">
          {children}
        </main>

        {/* Permanent 3D Neumorphic Footer */}
        <footer className="mt-16 bg-[#121212] p-8 md:p-12 shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] rounded-t-[2.5rem] mx-3 border-t border-[#1d1d1d]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Brand Info */}
            <div className="p-6 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d]">
              <h3 className="text-[#FFD700] text-xl font-bold mb-3 tracking-wide">Baduma.sl</h3>
              <p className="text-xs text-yellow-500/80 mb-3 font-medium">බැදුම නගරේ රහට * ගානට</p>
              <p className="text-sm text-gray-400">Owner: <span className="text-gray-200 font-semibold">Sadun Chamila</span></p>
              <p className="text-sm text-gray-400 mt-2">Baduma.malgammana,<br/>Pilimatalawa, Kandy</p>
            </div>

            {/* Contact Details */}
            <div className="p-6 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d]">
              <h3 className="text-[#FFD700] text-xl font-bold mb-3 tracking-wide">Contact & Support</h3>
              <p className="text-sm text-gray-300 mb-2">📞 +94 77 070 1682</p>
              <p className="text-sm text-gray-300 mb-2">💬 +94 77 948 1682 (WhatsApp)</p>
              <p className="text-sm text-gray-300 mt-3">✉️ Sadunchamila405@gmail.com</p>
            </div>

            {/* Social & Maps Links */}
            <div className="p-6 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] flex flex-col justify-between">
              <div>
                <h3 className="text-[#FFD700] text-xl font-bold mb-3 tracking-wide">Connect Online</h3>
                <div className="flex flex-col gap-2.5">
                  <a 
                    href="https://maps.app.goo.gl/8c6MEqyV3ReS7Z5r6?g_st=ic" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sm text-gray-300 hover:text-[#FFD700] transition-colors flex items-center gap-2"
                  >
                    <span>📍</span> Google Maps Location
                  </a>
                  <a 
                    href="https://www.instagram.com/badum.sl?obrf=ZTdnZHQzZ3BzbTZ0&utm_source=qr" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sm text-gray-300 hover:text-[#FFD700] transition-colors flex items-center gap-2"
                  >
                    <span>📸</span> Instagram (@badum.sl)
                  </a>
                  <a 
                    href="https://www.facebook.com/share/1FPwigZWbq/?mibextid=wwXIfr" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sm text-gray-300 hover:text-[#FFD700] transition-colors flex items-center gap-2"
                  >
                    <span>📘</span> Facebook Official Page
                  </a>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#1d1d1d] text-[11px] text-gray-500 text-center">
                © {new Date().getFullYear()} Baduma.sl. All rights reserved.
              </div>
            </div>

          </div>
        </footer>

      </body>
    </html>
  );
}
