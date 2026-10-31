// app/(admin)/(dashboard)/admin/orders/page.tsx — Order Management (all orders).
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  ORDER_STATUSES,
  formatLKR,
  type OrderRow,
  type OrderStatus,
} from "@/lib/orders";

type Driver = { id: string; full_name: string | null; username: string };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store", credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load orders.");
      setOrders(json.orders as OrderRow[]);
      setDrivers((json.drivers ?? []) as Driver[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders.");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20_000);
    return () => clearInterval(timer);
  }, [load]);

  async function patch(id: string, body: { status?: OrderStatus; driverId?: string | null }) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ id, ...body }),
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

  const panel =
    "p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]";

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className={`${panel} flex flex-wrap justify-between items-center gap-4`}>
        <div>
          <h2 className="text-2xl font-black text-[#FFD700]">Order Management</h2>
          <p className="text-sm text-gray-400 mt-1">
            Every customer order, newest first. Status changes are written server-side with the service role.
          </p>
        </div>
        <button
          onClick={load}
          className="px-5 py-3 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00]"
        >
          ↻ Refresh
        </button>
      </div>

      {error && <div className="p-4 rounded-2xl border border-red-500/40 text-red-400 text-sm">{error}</div>}

      <div className={panel}>
        {orders === null ? (
          <p className="text-gray-500 py-10 text-center">Loading orders…</p>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-4">🧾</div>
            <p className="text-gray-300 font-bold">No orders yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Customer checkouts will appear here in real time (and on the POS board).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#1d1d1d]">
                  <th className="py-3 px-2 font-bold">Order</th>
                  <th className="py-3 px-2 font-bold">Customer</th>
                  <th className="py-3 px-2 font-bold">Items</th>
                  <th className="py-3 px-2 font-bold">Total</th>
                  <th className="py-3 px-2 font-bold">Status</th>
                  <th className="py-3 px-2 font-bold">Driver</th>
                  <th className="py-3 px-2 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-[#1d1d1d] last:border-0 align-top">
                    <td className="py-3 px-2">
                      <div className="font-mono font-black text-[#FFD700]">{order.code}</div>
                      <div className="text-[10px] text-gray-500">
                        {new Date(order.created_at).toLocaleString("en-LK")}
                      </div>
                      <div className="text-[10px] text-gray-600">
                        {order.payment_method === "cash" ? "Cash" : "Card"} on delivery
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-gray-200">{order.customer_name}</div>
                      <div className="text-xs text-gray-500">{order.customer_phone}</div>
                      <div className="text-xs text-gray-600 max-w-[220px] truncate">{order.delivery_address}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-400">
                      {(order.order_items ?? []).map((item) => (
                        <div key={item.id} className="text-xs">
                          {item.quantity}× {item.name} ({item.size === "full" ? "F" : "N"})
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-2 font-bold text-gray-200">{formatLKR(order.total)}</td>
                    <td className="py-3 px-2">
                      <span className={`text-xs font-black ${ORDER_STATUS_STYLE[order.status]}`}>
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={order.driver_id ?? ""}
                        onChange={(e) => patch(order.id, { driverId: e.target.value || null })}
                        disabled={busyId === order.id}
                        className="px-2 py-1.5 rounded-lg bg-[#121212] text-xs text-gray-200 shadow-[inset_2px_2px_4px_#070707] border border-[#1d1d1d]"
                      >
                        <option value="">Unassigned</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.full_name || driver.username}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <select
                        value={order.status}
                        onChange={(e) => patch(order.id, { status: e.target.value as OrderStatus })}
                        disabled={busyId === order.id}
                        className="px-2 py-1.5 rounded-lg bg-[#121212] text-xs text-gray-200 shadow-[inset_2px_2px_4px_#070707] border border-[#1d1d1d]"
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {ORDER_STATUS_LABEL[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
