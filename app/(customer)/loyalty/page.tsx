'use client';

import { useState } from 'react';

const POINTS = 1250;
const NEXT_THRESHOLD = 2000;

const PROMOS = [
  { icon: '🔥', title: '10% OFF Every Order', desc: 'Auto-applied at checkout' },
  { icon: '🥤', title: 'FREE Coke with FULL Portion', desc: 'No coupon needed' },
  { icon: '🎂', title: 'Birthday Reward', desc: 'FREE dessert in your birthday month' },
];

const REWARDS = [
  { id: 'r1', name: 'Extra Egg — FREE', cost: 300 },
  { id: 'r2', name: 'Rs. 100 OFF — Next Order', cost: 500 },
  { id: 'r3', name: 'Fresh Fruit Juice — FREE', cost: 800 },
  { id: 'r4', name: 'Full Portion + Coke Combo — 50% OFF', cost: 1500 },
];

export default function LoyaltyPage() {
  const [claimed, setClaimed] = useState<string[]>([]);
  const progress = Math.round((POINTS / NEXT_THRESHOLD) * 100);

  const claim = (id: string, cost: number) => {
    if (claimed.includes(id) || POINTS < cost) return;
    setClaimed((prev) => [...prev, id]);
  };

  return (
    <div className="flex flex-col gap-8 pt-4 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white mb-1 tracking-wide">🏆 Loyalty Rewards</h1>
        <p className="text-sm text-gray-400 font-bold">Loyal Customer Promotions — earn points, claim rewards</p>
      </div>

      {/* Membership Card */}
      <div className="p-8 rounded-[2rem] bg-[#121212] shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d,0_0_0_1px_#2a2a2a,0_0_30px_rgba(212,175,55,0.15)] border border-[#1d1d1d]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Loyal Customer</p>
            <p className="text-2xl font-black text-[#D4AF37] mt-1 tracking-wide">GOLD MEMBER</p>
          </div>
          <span className="text-5xl">🏆</span>
        </div>

        <div className="mt-6">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Your Points</p>
          <p className="text-4xl font-black text-white mt-1">
            {POINTS.toLocaleString()} <span className="text-sm text-gray-500 font-bold">pts</span>
          </p>
        </div>

        {/* Progress to next tier */}
        <div className="mt-4">
          <div className="h-3 rounded-full bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 font-bold mt-2">
            {NEXT_THRESHOLD - POINTS} pts to PLATINUM tier
          </p>
        </div>
      </div>

      {/* Promo Highlights */}
      <div>
        <h2 className="text-lg font-black text-white mb-4 tracking-wide">Promo Highlights</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PROMOS.map((p) => (
            <div
              key={p.title}
              className="p-5 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a]"
            >
              <span className="text-3xl">{p.icon}</span>
              <p className="text-sm font-black text-[#D4AF37] mt-3">{p.title}</p>
              <p className="text-[10px] text-gray-500 mt-1 font-bold">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Redeemable Rewards */}
      <div>
        <h2 className="text-lg font-black text-white mb-4 tracking-wide">Redeem Rewards</h2>
        <div className="flex flex-col gap-4">
          {REWARDS.map((r) => {
            const isClaimed = claimed.includes(r.id);
            const canClaim = POINTS >= r.cost;
            return (
              <div
                key={r.id}
                className={`flex items-center justify-between p-5 rounded-2xl transition-all ${
                  isClaimed
                    ? 'bg-[#1a1a0e] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d,0_0_0_1px_#D4AF37]'
                    : 'bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d,0_0_0_1px_#2a2a2a]'
                }`}
              >
                <div>
                  <p className="text-sm font-black text-gray-200">{r.name}</p>
                  <p className="text-[10px] text-gray-500 font-bold mt-1">{r.cost} pts</p>
                </div>
                <button
                  type="button"
                  onClick={() => claim(r.id, r.cost)}
                  disabled={isClaimed || !canClaim}
                  className={`px-5 py-3 rounded-xl font-black text-sm tracking-wider transition-all ${
                    isClaimed
                      ? 'bg-[#121212] text-[#D4AF37] shadow-[inset_3px_3px_6px_#070707]'
                      : 'bg-[#D4AF37] text-[#121212] shadow-[5px_5px_12px_#070707,-5px_-5px_12px_#8a6d1a] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  {isClaimed ? '✓ Claimed' : !canClaim ? 'Not enough' : 'Redeem'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
