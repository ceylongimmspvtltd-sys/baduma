// app/(employee)/employee/login/page.tsx — internal staff sign-in (Manager / Kitchen / Driver).
"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const m = window.location.search.match(/[?&]emp=([^&]+)/);
    if (m) {
      try {
        setUsername(decodeURIComponent(m[1]));
      } catch {
        /* keep empty */
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/employee/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Sign in failed.');
      }
      router.push(json.redirect || '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md p-8 rounded-[2.5rem] bg-[#121212] shadow-[10px_10px_24px_#070707,-10px_-10px_24px_#1d1d1d] border border-[#1d1d1d]">
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-16 w-40 mb-4">
            <Image src="/images/logo-nav.png" alt="බැදුම" fill sizes="160px" className="object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mt-1">Employee Sign In</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] border border-red-500/40 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. mgr1a2b3c"
              className="w-full px-4 py-3 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-6 py-3.5 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-600">
          Internal staff only. Questions? Contact the
          <span className="text-gray-500"> Manager.</span>{" "}
          <Link href="/" className="text-gray-500 hover:text-[#FFD700] underline">
            Storefront
          </Link>
        </p>
      </div>
    </div>
  );
}
