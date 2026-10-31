// app/(admin)/(dashboard)/admin/layout.tsx — 3D Neumorphic Master Admin shell.
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdminClient";

const NAV = [
  { href: "/admin", label: "Dashboard (Analytics)", icon: "📊" },
  { href: "/admin/employees", label: "Manage Staff", icon: "👥" },
  { href: "/admin/products", label: "Menu & Inventory", icon: "🍔" },
  { href: "/admin/promotions", label: "Promotions & Combos", icon: "🎉" },
  { href: "/admin/orders", label: "Live Orders", icon: "🧾" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  /**
   * Keep the httpOnly session cookie in sync with the browser Supabase session.
   *
   * Supabase rotates the access token every ~1h (and the refresh token with it),
   * so the server cookie must be refreshed from the checked client session.
   * `POST /api/admin/session` re-verifies the token with the Auth server and the
   * admin role before storing it, so this cannot be used to plant a session.
   */
  useEffect(() => {
    let cancelled = false;

    async function syncCookie(accessToken: string) {
      try {
        await fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ access_token: accessToken }),
        });
      } catch {
        /* middleware will redirect to the login page if the cookie is stale */
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session?.access_token) void syncCookie(data.session.access_token);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session?.access_token) void syncCookie(session.access_token);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      // Revokes the refresh token and clears the httpOnly admin cookies.
      await fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" });
    } catch {
      /* fall through: still drop the local browser session */
    }
    try {
      // Clears the client-side session used by the dashboard's RLS queries.
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    window.location.replace("/admin/login");
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* 3D Neumorphic Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col gap-2 p-5 bg-[#121212] border-r border-[#1d1d1d] shadow-[6px_0px_12px_#070707]">
        <div className="flex items-center gap-3 px-2 pb-6 mb-2 border-b border-[#1d1d1d]">
          <div className="relative h-12 w-12 shrink-0 rounded-2xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] flex items-center justify-center">
            <Image src="/images/chef-icon.png" alt="බැදුම" fill sizes="48px" className="object-contain" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Master Admin</div>
            <div className="text-[10px] text-gray-600">Secure Panel</div>
          </div>
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
            <p className="text-xs text-gray-500 mt-0.5">Secure panel — restricted to role: admin</p>
          </div>
          <span className="px-4 py-2 rounded-lg text-xs font-black text-[#121212] bg-[#FFD700] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#332b00]">Admin</span>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
