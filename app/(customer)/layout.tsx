import '../globals.css';
import Link from 'next/link';
import Image from 'next/image';
import MobileSidebarDrawer from '@/components/MobileSidebarDrawer';
import { getLogoForSlot } from '@/lib/logos';

export const metadata = {
  title: 'බැදුම | Digital Menu',
  description: 'Premium 3D digital menu — freshly cooked fried rice, kottu & pasta in Kandy.',
};

// Automatically select the best-fit transparent logo for each UI slot
const navLogo = getLogoForSlot('nav');
const footerLogo = getLogoForSlot('footer');

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#121212] text-gray-200 font-sans min-h-screen flex flex-col selection:bg-[#D4AF37] selection:text-[#121212]">

        {/* Secure Public Navigation (Strictly Isolated - No Admin Links) */}
        <nav className="sticky top-0 z-50 bg-[#121212] px-6 py-4 shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d,0_1px_0_#2a2a2a] rounded-b-3xl mb-6 mx-3 mt-3 border border-[#1d1d1d] border-t-[#D4AF37]/25">
          <div className="max-w-7xl mx-auto flex justify-between items-center">

            {/* Primary Logo (Transparent Image Asset — auto-sized) */}
            <Link href="/" className="flex items-center p-1 rounded-2xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d,0_0_0_1px_#2a2a2a]">
              <Image src={navLogo.src} alt="Baduma" width={49} height={40} className="h-10 w-auto" priority />
            </Link>

            {/* Allowed Customer Links Only (desktop) */}
            <div className="hidden md:flex items-center gap-4 sm:gap-6">
              {[
                { name: 'Menu', href: '/' },
                { name: 'Cart', href: '/cart' },
                { name: 'Track Orders', href: '/track-orders' },
                { name: 'Profile', href: '/profile' },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-4 py-2 text-sm font-bold rounded-xl bg-[#121212] text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:text-[#D4AF37] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all duration-300"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Mobile Hamburger + Sidebar Drawer */}
            <MobileSidebarDrawer />
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-2">
          {children}
        </main>

        {/* 3D Neumorphic Permanent Footer */}
        <footer className="mt-16 bg-[#121212] p-8 md:p-12 shadow-[inset_12px_12px_24px_#070707,inset_-12px_-12px_24px_#1d1d1d,0_-1px_0_#2a2a2a] rounded-t-[2.5rem] mx-3 border-t border-[#1d1d1d]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Brand Info */}
            <div className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a]">
              <Image src={footerLogo.src} alt="Baduma" width={79} height={64} className="h-16 w-auto mb-4" />
              <p className="text-sm text-gray-400">Owner: <span className="text-gray-200 font-bold">Sadun Chamila</span></p>
              <p className="text-sm text-gray-400 mt-2">Baduma.malgammana,<br/>Pilimatalawa, Kandy</p>
            </div>

            {/* Contact Details */}
            <div className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a]">
              <h3 className="text-[#D4AF37] text-xl font-bold mb-4 tracking-wide">Contact Us</h3>
              <p className="text-sm text-gray-300 mb-3 flex items-center gap-2"><span>📞</span> +94 77 070 1682</p>
              <p className="text-sm text-gray-300 mb-3 flex items-center gap-2"><span>💬</span> +94 77 948 1682 (WhatsApp)</p>
              <p className="text-sm text-gray-300 mt-4 flex items-center gap-2"><span>✉️</span> Sadunchamila405@gmail.com</p>
            </div>

            {/* Social & Maps Links */}
            <div className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a] flex flex-col justify-between">
              <div>
                <h3 className="text-[#D4AF37] text-xl font-bold mb-4 tracking-wide">Connect Online</h3>
                <div className="flex flex-col gap-4">
                  <a href="https://maps.app.goo.gl/8c6MEqyV3ReS7Z5r6?g_st=ic" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] text-sm font-bold text-gray-300 hover:text-[#D4AF37] transition-all">
                    <span>📍</span> Google Maps
                  </a>
                  <a href="https://www.instagram.com/badum.sl?obrf=ZTdnZHQzZ3BzbTZ0&utm_source=qr" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] text-sm font-bold text-gray-300 hover:text-[#D4AF37] transition-all">
                    <span>📸</span> Instagram
                  </a>
                  <a href="https://www.facebook.com/share/1FPwigZWbq/?mibextid=wwXIfr" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] text-sm font-bold text-gray-300 hover:text-[#D4AF37] transition-all">
                    <span>📘</span> Facebook
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
