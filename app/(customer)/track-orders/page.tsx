// app/(customer)/track-orders/page.tsx — the customer's own order history + live status.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ORDER_PROGRESS,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  formatLKR,
  type OrderRow,
  type OrderStatus,
} from "@/lib/orders";

function StatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return <p className="text-xs font-bold text-red-400 mt-2">Order cancelled</p>;
  }
  const currentIndex = ORDER_PROGRESS.indexOf(status);
  return (
    <div className="flex items-center gap-1 mt-3">
      {ORDER_PROGRESS.map((step, index) => {
        const done = index <= currentIndex;
        return (
          <div key={step} className="flex items-center gap-1 flex-grow last:flex-grow-0">
            <div
              title={ORDER_STATUS_LABEL[step]}
              className={`w-2.5 h-2.5 rounded-full ${done ? "bg-[#FFD700]" : "bg-gray-700"}`}
            />
            {index < ORDER_PROGRESS.length - 1 && (
              <div className={`h-0.5 flex-grow ${index < currentIndex ? "bg-[#FFD700]" : "bg-gray-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TrackOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setSignedIn(false);
      setOrders([]);
      return;
    }
    setSignedIn(true);
    try {
      const res = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load your orders.");
      setOrders(json.orders as OrderRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your orders.");
    }
  }, []);

  useEffect(() => {
    load();
    // Light polling keeps the status fresh without websockets.
    const timer = setInterval(load, 20_000);
    return () => clearInterval(timer);
  }, [load]);

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this order?")) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Could not cancel the order.");
      return;
    }
    load();
  }

  if (signedIn === false) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center flex flex-col gap-5">
        <div className="text-5xl">🧾</div>
        <h1 className="text-2xl font-black text-white">Sign in to track orders</h1>
        <p className="text-gray-400 text-sm">We&apos;ll send a one-time code — no password needed.</p>
        <button
          onClick={() => router.push("/login?next=/track-orders")}
          className="mx-auto px-6 py-3 rounded-xl font-black text-[#121212] bg-[#FFD700]"
        >
          Continue with OTP
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white tracking-wide">Track Orders</h1>
        <button onClick={load} className="text-xs font-bold text-gray-400 hover:text-[#FFD700]">
          ↻ Refresh
        </button>
      </div>

      {error && <p className="p-3 rounded-xl border border-red-500/40 text-red-400 text-sm">{error}</p>}

      {orders === null ? (
        <p className="text-gray-500 py-16 text-center">Loading your orders…</p>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center flex flex-col gap-4">
          <p className="text-gray-400">No orders yet.</p>
          <Link href="/" className="mx-auto px-6 py-3 rounded-xl font-black text-[#121212] bg-[#FFD700]">
            Browse the menu
          </Link>
        </div>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono font-black text-[#FFD700]">{order.code}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(order.created_at).toLocaleString("en-LK")}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${ORDER_STATUS_STYLE[order.status]}`}>
                  {ORDER_STATUS_LABEL[order.status]}
                </p>
                <p className="text-lg font-black text-gray-200 mt-1">{formatLKR(order.total)}</p>
              </div>
            </div>

            <StatusTimeline status={order.status} />

            <ul className="mt-4 flex flex-col gap-1 text-sm text-gray-400">
              {(order.order_items ?? []).map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {item.quantity}× {item.name}{" "}
                    <span className="text-gray-600">({item.size === "full" ? "Full" : "Normal"})</span>
                  </span>
                  <span>{formatLKR(item.line_total)}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-[#1d1d1d]">
              <p className="text-xs text-gray-500">
                Delivering to: {order.delivery_address}
              </p>
              {(order.status === "pending" || order.status === "accepted") && (
                <button
                  onClick={() => cancelOrder(order.id)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-red-400 bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d]"
                >
                  Cancel order
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
