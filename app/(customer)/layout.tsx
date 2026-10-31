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
const heroLogo = getLogoForSlot('hero');
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

        {/* ── Hero Banner (4:3 landscape cover) ────────────────────────────── */}
        <section className="relative w-full aspect-[4/3] mx-3 mb-6 rounded-[2rem] overflow-hidden shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d,0_0_0_1px_#2a2a2a] border border-[#1d1d1d]">
          <Image
            src="/images/hero-restaurant.jpg"
            alt="Baduma food cart at Pilimatalawa, Kandy"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 100vw"
            className="object-cover"
          />
          {/* Legibility gradients (left-to-right + bottom fade) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-[#121212]/40" />

          <div className="relative z-10 h-full p-6 md:p-10 flex flex-col justify-between">
            {/* Official Logo + Tagline — left side */}
            <div className="inline-flex items-center gap-4 p-3 pr-5 rounded-2xl bg-[#121212]/80 backdrop-blur-md shadow-[4px_4px_10px_#070707,inset_0_0_0_1px_rgba(212,175,55,0.25)] self-start">
              <Image src={heroLogo.src} alt="Baduma" width={59} height={48} className="h-12 w-auto" />
              <span className="text-[11px] font-bold tracking-widest text-[#D4AF37]/90 whitespace-nowrap">නගරේ රහට * ගානට</span>
            </div>

            {/* Bottom row — tagline + promotional badge + minimal brand icons */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-5">
              <div className="max-w-xs">
                <p className="text-lg md:text-xl font-black text-white leading-snug">
                  <span className="text-red-500">Hot</span>{' '}
                  <span className="text-[#FFD700]">Taste the Flavors</span>{' '}
                  and Delivered <span className="text-green-500">Fast</span> to Your{' '}
                  <span className="text-blue-400">Doorstep</span>
                </p>
                <span className="inline-block mt-3 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full bg-[#D4AF37] text-[#121212] shadow-[0_0_14px_rgba(212,175,55,0.5)]">
                  We deliver right to your doorstep.
                </span>
              </div>

              {/* Minimal floating brand icons — raw icons only, no labels/backgrounds */}
              <div className="flex items-center gap-3">
                {[
                  {
                    label: 'Facebook',
                    href: 'https://www.facebook.com/share/1FPwigZWbq/?mibextid=wwXIfr',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17" aria-hidden="true">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Instagram',
                    href: 'https://www.instagram.com/badum.sl?obrf=ZTdnZHQzZ3BzbTZ0&utm_source=qr',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
                        <rect x="2" y="2" width="20" height="20" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
                      </svg>
                    ),
                  },
                  {
                    label: 'WhatsApp',
                    href: 'https://wa.me/94779481682',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.26-.473-2.406-1.475-.803-.589-1.488-.932-2.184-1.138-.676-.2-1.349-.197-1.923.1-.575.297-1.107.869-1.437 1.275-.331.399-.63 1.022-.686 1.202-.061.184-.237.291-.438.15-.199-.148-.82-.635-1.122-.898-.301-.262-.5-.301-.702.075-.201.375-.807.937-1.232.294-.665.571-.833.71-.948.139-.115.218-.187.312-.301.079-.089.139-.173.139-.291 0-.118-.04-.173-.119-.291-.079-.118-1.13-2.703-1.54-3.697-.401-.967-.793-.553-1.074-.401-.575.294-.775.598-.936.901-.162.301-.291.645-.217.758.073.115.218.372.702 1.229.393.675.799 1.44 1.055 2.12.237.624.395 1.14.524 1.675.128.535.128 1.074.099 1.202-.031.13-.159.303-.159.462 0 .16.061.297.237.438.176.142.393.331 1.164.876.741.527 1.375 1.015 1.717 1.466.394.433.71.82.845.993.294.331.175.654-.023 1.036-.199.376-.414.698-.888 1.128-.528.495-1.055.876-1.578 1.229-.598.331-.461.5-.659.658-.199.159-.414.237-.702.16-.294-.079-1.015-.376-1.512-.635-.528-.257-1.055-.395-1.54-.563z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Google Maps',
                    href: 'https://maps.app.goo.gl/8c6MEqyV3ReS7Z5r6?g_st=ic',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17" aria-hidden="true">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Call',
                    href: 'tel:+94770701682',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17" aria-hidden="true">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                      </svg>
                    ),
                  },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith('tel:') ? undefined : '_blank'}
                    rel="noreferrer"
                    aria-label={item.label}
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-[#121212]/70 backdrop-blur-md shadow-[3px_3px_8px_#070707,inset_0_0_0_1px_rgba(255,255,255,0.08)] text-white hover:text-[#D4AF37] hover:shadow-[0_0_14px_rgba(212,175,55,0.5),inset_0_0_0_1px_rgba(212,175,55,0.4)] transition-all duration-300"
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

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
