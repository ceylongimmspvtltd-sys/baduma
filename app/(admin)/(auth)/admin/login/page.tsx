// app/(admin)/(auth)/admin/login/page.tsx — isolated Master Admin login.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
      <div className="w-full max-w-md p-8 rounded-[2.5rem] bg-[#121212] shadow-[10px_10px_24px_#070707,-10px_-10px_24px_#1d1d1d] border border-[#1d1d1d]">
        <div className="flex flex-col items-center mb-8">
          <img src="/images/logo-nav.png" alt="Baduma.sl" className="h-16 w-auto mb-4 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
          <h1 className="text-3xl font-black text-[#FFD700] tracking-wide">බැදුම</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mt-1">Master Admin · Secure Sign In</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] border border-red-500/40 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Admin Email</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@baduma.sl"
              className="w-full px-4 py-3 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all"
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
              placeholder="••••••••••"
              className="w-full px-4 py-3 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-6 py-3.5 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Secure Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-600">
          Only accounts with the <span className="text-[#FFD700] font-bold">admin</span> role can sign in.{" "}
          <Link href="/" className="text-gray-500 hover:text-[#FFD700] underline">
            Back to storefront
          </Link>
        </p>
      </div>
    </div>
  );
}
