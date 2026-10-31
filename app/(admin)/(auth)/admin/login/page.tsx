// app/(admin)/(auth)/admin/login/page.tsx — Staff & Admin Portal (Email/Username + Password).
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdminClient";

/**
 * Backend sign-in form.
 *
 * The form no longer authenticates with the browser Supabase client. It POSTs
 * the credentials to `/api/admin/login`, which:
 *   1. maps a username to its admin email (server-side `admin_users` lookup),
 *   2. verifies the password with Supabase Auth,
 *   3. refuses accounts without `app_metadata.role === "admin"`,
 *   4. sets httpOnly cookies that the middleware verifies on every /admin hit.
 *
 * The returned session is used ONLY to hydrate the browser client so the
 * dashboard's RLS-scoped queries work; authorisation is always the cookie.
 */

type LoginResponse = {
  success?: boolean;
  error?: string;
  hint?: string;
  session?: { access_token: string; refresh_token: string; expires_in: number };
};

/** Only local paths are accepted as redirect targets (blocks open redirects). */
function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/admin";
  }
  if (/[\r\n\t]/.test(value)) return "/admin";
  return value;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState("/admin");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = safeNextPath(params.get("next"));
    setNextUrl(next);

    // A valid browser session can outlive the httpOnly cookie (Supabase
    // refreshed the token after the cookie expired). Re-sync it server-side —
    // the API re-verifies the token and the admin role — then continue.
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken || cancelled) return;
        const res = await fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ access_token: accessToken }),
        });
        if (res.ok && !cancelled) {
          router.replace(next);
          router.refresh();
        }
      } catch {
        /* show the form */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const json = (await res.json().catch(() => ({}))) as LoginResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Sign in failed. Please try again.");
      }

      // Hydrate the browser client for the dashboard's RLS-scoped queries.
      // The cookies set by the API are what authorise /admin and /api/admin/*.
      if (json.session?.access_token && json.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: json.session.access_token,
          refresh_token: json.session.refresh_token,
        });
      }

      router.replace(safeNextPath(nextUrl));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md p-8 rounded-[2.5rem] bg-[#121212] shadow-[12px_12px_28px_#070707,-12px_-12px_28px_#1d1d1d,0_0_0_1px_#2a2a2a] border border-[#1d1d1d]">
        {/* Logo + Headings */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-20 w-20 rounded-full bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] flex items-center justify-center mb-5">
            <Image src="/images/chef-icon.png" alt="බැදුම" fill sizes="80px" className="object-contain" />
          </div>
          <h1 className="text-2xl font-black text-[#FFD700] tracking-wide text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Staff &amp; Admin Portal
          </h1>
          <p className="text-sm text-gray-300 mt-3 text-center leading-relaxed">
            කරුණාකර ඔබේ ඊමේල් ලිපිනය සහ මුරපදය ඇතුළත් කරන්න
          </p>
          <p className="text-xs text-gray-500 mt-1 text-center">
            (Please enter your staff Email or Username and Password)
          </p>
          <div className="mt-4 px-4 py-2 rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] border border-[#FFD700]/20">
            <p className="text-[11px] font-bold text-gray-400 text-center">
              🔒 Email / Username + Password — separate from the customer OTP flow
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] border border-red-500/40 text-red-400 text-sm text-center"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="admin-identifier" className="block text-sm font-bold text-gray-300 mb-2">
              Email or Username
            </label>
            <input
              id="admin-identifier"
              type="text"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@baduma.lk or baduma-admin"
              className="w-full px-4 py-3.5 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_5px_5px_10px_#070707,inset_-5px_-5px_10px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-bold text-gray-300 mb-2">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3.5 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_5px_5px_10px_#070707,inset_-5px_-5px_10px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-6 py-4 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[5px_5px_10px_#070707,-5px_-5px_10px_#332b00] active:shadow-[inset_4px_4px_8px_#ccac00,inset_-4px_-4px_8px_#ffea4d] transition-all disabled:opacity-60 tracking-wider"
          >
            {loading ? "Signing in…" : "Secure Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-gray-600">
          Only accounts with the <span className="text-[#FFD700] font-bold">admin</span> role
          (<span className="font-mono">app_metadata.role</span>) can sign in.
        </p>
      </div>
    </div>
  );
}
