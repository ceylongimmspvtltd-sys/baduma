'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getLogoForSlot } from '@/lib/logos';

const NAV_LINKS = [
  { name: 'Account / Profile', href: '/profile', icon: '👤' },
  { name: 'Loyalty', href: '/loyalty', icon: '🏆' },
  { name: 'Food Schedule', href: '/schedule-order', icon: '📅' },
  { name: 'Settings & Help Center', href: '/settings', icon: '⚙️' },
];

// Automatically selected transparent logo for the drawer header/footer
const navLogo = getLogoForSlot('nav');

export default function MobileSidebarDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Lock body scroll while the drawer is open + Esc closes it
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatar(URL.createObjectURL(file));
  };

  const handleSave = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <>
      {/* Hamburger Trigger */}
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#121212] text-gray-300 shadow-[5px_5px_10px_#070707,-5px_-5px_10px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:text-[#D4AF37] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all duration-300"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in Drawer */}
      <aside
        inert={!open}
        aria-hidden={!open}
        className={`fixed top-0 left-0 h-full w-72 max-w-[85vw] z-[100] bg-[#121212] flex flex-col shadow-[24px_0_48px_#070707,-2px_0_10px_#1d1d1d,0_0_0_1px_#2a2a2a] transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-[#1d1d1d] shadow-[0_8px_16px_#070707,inset_0_-1px_0_#2a2a2a]">
          <Image src={navLogo.src} alt="Baduma" width={49} height={40} className="h-10 w-auto" />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#121212] text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:text-[#D4AF37] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* Primary Navigation */}
          {NAV_LINKS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 ${
                  active
                    ? 'bg-[#1a1a0e] text-[#D4AF37] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d,0_0_0_1px_#D4AF37,0_0_14px_rgba(212,175,55,0.25)]'
                    : 'bg-[#121212] text-gray-400 shadow-[5px_5px_10px_#070707,-5px_-5px_10px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:text-[#D4AF37] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm">{item.name}</span>
                <span className="ml-auto text-xs text-gray-600">→</span>
              </Link>
            );
          })}

          {/* Edit Profile (inline options) */}
          <div>
            <button
              type="button"
              onClick={() => setEditOpen((v) => !v)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 ${
                editOpen
                  ? 'bg-[#1a1a0e] text-[#D4AF37] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d,0_0_0_1px_#D4AF37,0_0_14px_rgba(212,175,55,0.25)]'
                  : 'bg-[#121212] text-gray-400 shadow-[5px_5px_10px_#070707,-5px_-5px_10px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:text-[#D4AF37] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]'
              }`}
            >
              <span className="text-xl">✏️</span>
              <span className="text-sm">Edit Profile</span>
              <span className="ml-auto text-xs text-gray-600">{editOpen ? '−' : '+'}</span>
            </button>

            {editOpen && (
              <div className="mt-2 p-5 rounded-2xl bg-[#121212] shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a] flex flex-col gap-4">

                {/* Profile Picture */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="relative w-16 h-16 rounded-full bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d,0_0_0_1px_#2a2a2a] overflow-hidden hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] transition-all"
                  >
                    {avatar ? (
                      <img src={avatar} alt="Profile picture" className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-2xl">👤</span>
                    )}
                  </button>
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
                    <p className="text-xs font-bold text-[#D4AF37]">Change Profile Picture</p>
                    <p className="text-[10px] text-gray-500 mt-1">JPG or PNG</p>
                  </div>
                </div>

                {/* Phone Number */}
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Phone Number</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+94 77 000 0000"
                    className="w-full px-4 py-3 rounded-xl bg-[#121212] text-sm text-gray-200 font-bold outline-none shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] focus:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d,0_0_0_1px_#D4AF37] transition-all"
                  />
                </label>

                {/* Email Address */}
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Email Address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-[#121212] text-sm text-gray-200 font-bold outline-none shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] focus:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d,0_0_0_1px_#D4AF37] transition-all"
                  />
                </label>

                {/* Save */}
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-4 rounded-xl font-black text-[#121212] bg-[#D4AF37] shadow-[5px_5px_12px_#070707,-5px_-5px_12px_#8a6d1a] active:shadow-[inset_5px_5px_10px_#8a6d1a,inset_-5px_-5px_10px_#ffea4d] transition-all tracking-wider text-sm hover:brightness-110"
                >
                  {saved ? '✓ Profile Updated' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="mt-auto pt-4 px-2">
            <Image src={navLogo.src} alt="Baduma" width={43} height={35} className="h-9 w-auto mx-auto opacity-80" />
          </div>
        </div>
      </aside>
    </>
  );
}
