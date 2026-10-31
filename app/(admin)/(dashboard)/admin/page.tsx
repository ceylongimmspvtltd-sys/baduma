// app/(admin)/(dashboard)/admin/page.tsx — Dashboard (Analytics).
"use client";

import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdminClient';

const STAT_DEFS = [
  { key: 'products', label: 'Active Products', icon: '🍔', table: 'products', activeOnly: true },
  { key: 'combos', label: 'Active Combos', icon: '🎉', table: 'combos', activeOnly: true },
  { key: 'addons', label: 'Cross-selling Add-ons', icon: '🥤', table: 'addons', activeOnly: false },
  { key: 'offers', label: 'Active Daily Offers', icon: '🏷️', table: 'daily_offers', activeOnly: true },
  { key: 'employees', label: 'Active Staff', icon: '👥', table: 'employees', activeOnly: true },
];

type Stats = Record<string, number | null>;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    (async () => {
      const result: Stats = {};
      await Promise.all(
        STAT_DEFS.map(async (s) => {
          try {
            let query = supabase.from(s.table).select('id', { count: 'exact', head: true });
            if (s.activeOnly) query = query.eq('is_active', true);
            const { count, error } = await query;
            result[s.key] = error || count === null ? null : count;
          } catch {
            result[s.key] = null;
          }
        })
      );
      setStats(result);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Welcome banner */}
      <div className="p-8 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]">
        <h2 className="text-3xl font-black text-[#FFD700]">Dashboard (Analytics)</h2>
        <p className="text-gray-400 mt-1">Menu, combos, daily offers and staff at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {STAT_DEFS.map((s) => (
          <div
            key={s.key}
            className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]"
          >
            <div className="text-3xl mb-4">{s.icon}</div>
            <div className="text-4xl font-black text-[#FFD700]">{stats[s.key] ?? '—'}</div>
            <div className="text-sm text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick guide */}
      <div className="p-8 rounded-3xl bg-[#121212] shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d] text-sm text-gray-500">
        Quick start: manage the menu under <span className="text-[#FFD700] font-bold">Menu &amp; Inventory</span>, manage staff under
        <span className="text-[#FFD700] font-bold"> Manage Staff</span>, and build combo deals under
        <span className="text-[#FFD700] font-bold"> Promotions &amp; Combos</span>. All changes persist to Supabase with strict
        admin-only Row Level Security.
      </div>
    </div>
  );
}
