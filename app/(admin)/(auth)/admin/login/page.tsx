// app/(admin)/(auth)/admin/login/page.tsx — Staff & Admin Portal (Email + Password).
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState("/admin");

  useEffect(() => {
    const m = window.location.search.match(/[?&]next=([^&]+)/);
    if (m) {
      try {
        setNextUrl(decodeURIComponent(m[1]));
      } catch {
        /* keep default */
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;

      const user = data.user;
      const role = user?.user_metadata?.role ?? user?.app_metadata?.role;
      if (role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("This account does not have Master Admin access.");
      }

      // Store the access token in an httpOnly cookie for middleware checks.
      await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: data.session?.access_token,
          maxAge: data.session?.expires_in,
        }),
      });

      router.push(nextUrl);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed. Please try again.";
      setError(message);
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
            (Please enter your staff Email and Password)
          </p>
          <div className="mt-4 px-4 py-2 rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] border border-[#FFD700]/20">
            <p className="text-[11px] font-bold text-gray-400 text-center">
              🔒 Email + Password sign-in — separate from the customer OTP flow
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] border border-red-500/40 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@baduma.com"
              className="w-full px-4 py-3.5 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_5px_5px_10px_#070707,inset_-5px_-5px_10px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:shadow-[inset_7px_7px_14px_#070707,inset_-7px_-7px_14px_#1d1d1d] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3.5 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_5px_5px_10px_#070707,inset_-5px_-5px_10px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:shadow-[inset_7px_7px_14px_#070707,inset_-7px_-7px_14px_#1d1d1d] transition-all"
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
          Only accounts with the <span className="text-[#FFD700] font-bold">admin</span> role can sign in.
        </p>
      </div>
    </div>
  );
}
