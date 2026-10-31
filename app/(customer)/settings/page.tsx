'use client';

import { useState } from 'react';

const INITIAL_TOGGLES = [
  { id: 'push', name: 'Push Notifications', desc: 'Order updates & promo alerts', on: true },
  { id: 'email', name: 'Email Updates', desc: 'Weekly menu & exclusive deals', on: true },
  { id: 'sound', name: 'Sound Effects', desc: 'Tap & order alert sounds', on: false },
  { id: 'location', name: 'Auto-Locate', desc: 'Faster checkout with saved address', on: true },
];

const FAQ = [
  { q: 'How do I pay?', a: 'Cash on delivery or card via our rider.' },
  { q: 'How long does delivery take?', a: '30–45 minutes within Kandy.' },
  { q: 'Can I schedule an order?', a: 'Yes — use the Food Schedule option in the menu.' },
];

export default function SettingsPage() {
  const [toggles, setToggles] = useState(INITIAL_TOGGLES);

  const flip = (id: string) =>
    setToggles((prev) => prev.map((t) => (t.id === id ? { ...t, on: !t.on } : t)));

  return (
    <div className="flex flex-col gap-8 pt-4 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white mb-1 tracking-wide">⚙️ Settings &amp; Help Center</h1>
        <p className="text-sm text-gray-400 font-bold">Manage your app preferences and get support</p>
      </div>

      {/* Settings */}
      <div>
        <h2 className="text-lg font-black text-white mb-4 tracking-wide">Settings</h2>
        <div className="flex flex-col gap-4">
          {toggles.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-5 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a]"
            >
              <div>
                <p className="text-sm font-black text-gray-200">{t.name}</p>
                <p className="text-[10px] text-gray-500 font-bold mt-1">{t.desc}</p>
              </div>
              <button
                type="button"
                aria-label={t.name}
                aria-pressed={t.on}
                onClick={() => flip(t.id)}
                className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                  t.on
                    ? 'bg-[#8FBC8F] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d,0_0_10px_rgba(143,188,143,0.4)]'
                    : 'bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d]'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-[#121212] shadow-[2px_2px_4px_#070707] transition-all duration-300 ${
                    t.on ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Help Center — FAQ */}
      <div>
        <h2 className="text-lg font-black text-white mb-4 tracking-wide">Help Center</h2>
        <div className="flex flex-col gap-4">
          {FAQ.map((f) => (
            <div
              key={f.q}
              className="p-5 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a]"
            >
              <p className="text-sm font-black text-[#D4AF37] flex items-center gap-2">
                <span>❓</span> {f.q}
              </p>
              <p className="text-xs text-gray-400 mt-2 pl-6 font-bold">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Help Center — Contact */}
      <div>
        <h2 className="text-lg font-black text-white mb-4 tracking-wide">Contact Support</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="https://wa.me/94770701682"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:text-[#D4AF37] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all text-sm font-black text-gray-300"
          >
            <span>💬</span> WhatsApp
          </a>
          <a
            href="tel:+94770701682"
            className="flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:text-[#D4AF37] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all text-sm font-black text-gray-300"
          >
            <span>📞</span> Call Us
          </a>
          <a
            href="mailto:Sadunchamila405@gmail.com"
            className="flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a] hover:text-[#D4AF37] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all text-sm font-black text-gray-300"
          >
            <span>✉️</span> Email
          </a>
        </div>
      </div>
    </div>
  );
}
