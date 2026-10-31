import '../globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Baduma.sl | Digital Menu',
  description: 'Hot, Taste the Flavors, and Delivered Fast to Your Doorstep',
};

/* ---------- Minimal Real Brand Icons (inline SVG, no chunky buttons) ---------- */
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" aria-hidden="true">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.563V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const NeumorphicLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link
    href={href}
    className="px-5 py-2.5 text-sm font-bold rounded-xl bg-[#121212] text-gray-400 shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] hover:text-[#FFD700] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all duration-300"
  >
    {children}
  </Link>
);

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#121212] text-gray-200 font-sans min-h-screen flex flex-col selection:bg-[#FFD700] selection:text-[#121212]">

        {/* Secure Public Navigation (Strictly Isolated - No Admin/Staff/POS/Driver Links) */}
        <nav className="sticky top-0 z-50 bg-[#121212] px-6 py-4 shadow-[8px_8px_16px_#070707,-8px_-8px_16px_#1d1d1d] rounded-b-3xl mb-6 mx-3 mt-3 border border-[#1d1d1d]">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex flex-col" aria-label="Baduma.sl home">
              <img src="/images/logo-nav.png" alt="Baduma.sl" className="h-9 w-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
            </Link>
            <div className="flex items-center gap-4">
              <NeumorphicLink href="/">Menu</NeumorphicLink>
              <NeumorphicLink href="/cart">Cart</NeumorphicLink>
              <NeumorphicLink href="/track-orders">Track Orders</NeumorphicLink>
              <NeumorphicLink href="/profile">Profile</NeumorphicLink>
            </div>
          </div>
        </nav>

        {/* Hero Banner - 4:3 Street View Cover */}
        <header className="relative mx-3 mb-6 max-w-7xl w-auto aspect-[4/3] rounded-3xl overflow-hidden border border-[#1d1d1d] shadow-[8px_8px_16px_#070707,-8px_-8px_16px_#1d1d1d]">
          <img src="/images/hero-restaurant.jpg" alt="Baduma.sl restaurant street view" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/80" />

          {/* Logo + Exact Promotional Tagline */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
            <img src="/images/logo-large.png" alt="Baduma.sl" className="h-28 sm:h-32 md:h-36 w-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]" />
            <h1 className="mt-5 text-xl sm:text-3xl md:text-4xl font-black tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              <span className="text-red-500">Hot</span> <span className="text-[#FFD700]">Taste the Flavors</span> and Delivered <span className="text-green-500">Fast</span> <span className="text-blue-400">to Your Doorstep</span>
            </h1>
          </div>

          {/* Minimal Social & Contact Icons Along the Banner Bottom Edge */}
          <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-4 sm:gap-6 px-6">
            <a href="https://www.facebook.com/share/1FPwigZWbq/?mibextid=wwXIfr" target="_blank" rel="noreferrer" aria-label="Facebook" className="p-1.5 text-gray-300 hover:text-[#FFD700] hover:scale-110 transition-all duration-300">
              <FacebookIcon />
            </a>
            <a href="https://www.instagram.com/badum.sl?obrf=ZTdnZHQzZ3BzbTZ0&utm_source=qr" target="_blank" rel="noreferrer" aria-label="Instagram" className="p-1.5 text-gray-300 hover:text-[#FFD700] hover:scale-110 transition-all duration-300">
              <InstagramIcon />
            </a>
            <a href="https://wa.me/94770701682" target="_blank" rel="noreferrer" aria-label="WhatsApp" className="p-1.5 text-gray-300 hover:text-[#FFD700] hover:scale-110 transition-all duration-300">
              <WhatsAppIcon />
            </a>
            <a href="https://maps.app.goo.gl/8c6MEqyV3ReS7Z5r6?g_st=ic" target="_blank" rel="noreferrer" aria-label="Google Maps location" className="p-1.5 text-gray-300 hover:text-[#FFD700] hover:scale-110 transition-all duration-300">
              <MapPinIcon />
            </a>
            <a href="tel:+94770701682" aria-label="Call +94 77 070 1682" className="p-1.5 text-gray-300 hover:text-[#FFD700] hover:scale-110 transition-all duration-300">
              <PhoneIcon />
            </a>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-6">
          {children}
        </main>

        {/* 3D Neumorphic Permanent Footer */}
        <footer className="mt-16 bg-[#121212] p-8 md:p-12 shadow-[inset_8px_8px_16px_#070707,inset_-8px_-8px_16px_#1d1d1d] rounded-t-[2.5rem] mx-3 border-t border-[#1d1d1d]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Brand Info */}
            <div className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d]">
              <img src="/images/logo-nav.png" alt="Baduma.sl" className="h-8 w-auto mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
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
                    <span>📍</span> Google Maps
                  </a>
                  <a href="https://www.instagram.com/badum.sl?obrf=ZTdnZHQzZ3BzbTZ0&utm_source=qr" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] text-sm font-bold text-gray-300 hover:text-[#FFD700] transition-all">
                    <span>📸</span> Instagram
                  </a>
                  <a href="https://www.facebook.com/share/1FPwigZWbq/?mibextid=wwXIfr" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] text-sm font-bold text-gray-300 hover:text-[#FFD700] transition-all">
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
