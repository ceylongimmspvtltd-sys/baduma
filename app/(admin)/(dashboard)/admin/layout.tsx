// app/(admin)/(dashboard)/admin/layout.tsx — 3D Neumorphic Master Admin shell.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const NAV = [
  { href: "/admin", label: "Dashboard (Overview)", icon: "📊" },
  { href: "/admin/products", label: "Manage Products", icon: "🍔" },
  { href: "/admin/promotions", label: "Combos & Promotions", icon: "🎉" },
  { href: "/admin/orders", label: "Order Management", icon: "🧾" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } catch {
      /* cookie cleared client-side below */
    }
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    window.location.href = "/admin/login";
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* 3D Neumorphic Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col gap-2 p-5 bg-[#121212] border-r border-[#1d1d1d] shadow-[6px_0px_12px_#070707]">
        <div className="px-2 pb-6 mb-2 border-b border-[#1d1d1d] text-center">
          <div className="text-3xl font-black text-[#FFD700] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">බැදුම</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">Master Admin</div>
        </div>

        <nav className="flex flex-col gap-3 flex-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  active
                    ? "text-[#FFD700] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]"
                    : "text-gray-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:text-[#FFD700]"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3 mt-4">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] hover:text-[#FFD700] transition-all"
          >
            🛒 View Storefront
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] hover:text-red-400 transition-all disabled:opacity-50"
          >
            {loggingOut ? "Signing out…" : "⏏️ Sign Out"}
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between px-8 py-5 bg-[#121212] border-b border-[#1d1d1d] shadow-[0_8px_16px_#070707]">
          <div>
            <h1 className="text-lg font-black text-[#FFD700]">Master Admin Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">බැදුම · Secure panel — restricted to role: admin</p>
          </div>
          <span className="px-4 py-2 rounded-lg text-xs font-black text-[#121212] bg-[#FFD700] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#332b00]">Admin</span>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
