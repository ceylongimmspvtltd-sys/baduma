// app/driver/page.tsx — driver delivery runs (staff session required).
"use client";

import { useCallback, useEffect, useState } from "react";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE, formatLKR, type OrderRow, type OrderStatus } from "@/lib/orders";

type Board = {
  staff: { username: string; position: string; permission_level: string };
  orders: OrderRow[];
};

export default function DriverPortal() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/orders", { cache: "no-store", credentials: "same-origin" });
      if (res.status === 401) {
        window.location.href = "/employee/login";
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load your runs.");
      setBoard(json as Board);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your runs.");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20_000);
    return () => clearInterval(timer);
  }, [load]);

  async function update(id: string, status: OrderStatus) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/staff/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not update the order.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the order.");
    } finally {
      setBusyId(null);
    }
  }

  async function signOut() {
    await fetch("/api/employee/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    document.cookie = "baduma_employee_session=; Path=/; Max-Age=0";
    window.location.replace("/employee/login");
  }

  const orders = board?.orders ?? [];

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 p-4 md:p-6 pb-24">
      <div className="flex justify-between items-center bg-[#121212] p-4 rounded-2xl shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] mb-6 border border-[#1d1d1d]">
        <div>
          <h1 className="text-xl font-black text-[#FFD700]">බැදුම Delivery</h1>
          <p className="text-xs text-gray-400">
            {board ? `Driver: ${board.staff.username}` : "Loading…"} · {orders.length} run
            {orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={signOut}
          className="px-3 py-1 rounded-full text-xs font-bold text-gray-400 bg-[#121212] shadow-[inset_2px_2px_4px_#070707,inset_-2px_-2px_4px_#1d1d1d]"
        >
          Sign out
        </button>
      </div>

      {error && <p className="mb-4 p-3 rounded-xl border border-red-500/40 text-red-400 text-sm">{error}</p>}

      {orders.length === 0 ? (
        <div className="p-10 rounded-3xl bg-[#121212] shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] text-center text-gray-500">
          No deliveries assigned yet.
        </div>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className="bg-[#121212] p-6 rounded-3xl shadow-[8px_8px_16px_#070707,-8px_-8px_16px_#1d1d1d] border border-[#1d1d1d] mb-6"
          >
            <div className="flex justify-between items-start mb-4 border-b border-[#1d1d1d] pb-4">
              <div>
                <span className={`text-[10px] font-bold ${ORDER_STATUS_STYLE[order.status]}`}>
                  {ORDER_STATUS_LABEL[order.status].toUpperCase()}
                </span>
                <h2 className="text-2xl font-bold text-white font-mono">{order.code}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Collect</p>
                <p className="text-xl font-bold text-[#FFD700]">{formatLKR(order.total)}</p>
                <p className="text-[10px] text-gray-500">
                  {order.payment_method === "cash" ? "Cash" : "Card"}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
                <p className="text-xs text-gray-500 mb-1">Customer</p>
                <p className="text-sm font-bold text-gray-200">{order.customer_name}</p>
                <a href={`tel:${order.customer_phone.replace(/\s/g, "")}`} className="text-sm text-[#FFD700] mt-1 block">
                  📞 {order.customer_phone}
                </a>
              </div>

              <div className="p-4 rounded-xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
                <p className="text-xs text-gray-500 mb-1">Delivery Address</p>
                <p className="text-sm font-bold text-gray-200">{order.delivery_address}</p>
                {order.notes && <p className="text-xs text-gray-400 mt-2">📝 {order.notes}</p>}
              </div>

              <div className="p-4 rounded-xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
                <p className="text-xs text-gray-500 mb-1">Items</p>
                <ul className="text-sm text-gray-300 list-disc pl-4">
                  {(order.order_items ?? []).map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.name} ({item.size === "full" ? "Full" : "Normal"})
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl font-bold text-gray-300 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] flex items-center justify-center gap-2"
              >
                📍 Open in Google Maps
              </a>

              {order.status !== "delivered" && (
                <div className="flex gap-3">
                  {order.status !== "out_for_delivery" && (
                    <button
                      onClick={() => update(order.id, "out_for_delivery")}
                      disabled={busyId === order.id}
                      className="flex-1 py-3 rounded-xl font-bold text-gray-300 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] disabled:opacity-50"
                    >
                      Start delivery
                    </button>
                  )}
                  <button
                    onClick={() => update(order.id, "delivered")}
                    disabled={busyId === order.id}
                    className="flex-1 py-4 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] disabled:opacity-50"
                  >
                    {busyId === order.id ? "Saving…" : "Mark delivered"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
