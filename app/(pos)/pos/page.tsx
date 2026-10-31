// app/(pos)/pos/page.tsx — live order board for Managers and Kitchen.
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  canTransition,
  formatLKR,
  type OrderRow,
  type OrderStatus,
} from "@/lib/orders";

type Driver = { id: string; full_name: string | null; username: string };
type Board = {
  staff: { username: string; position: string; permission_level: string };
  drivers: Driver[];
  orders: OrderRow[];
};

const NEXT_ACTIONS: Record<string, { status: OrderStatus; label: string }[]> = {
  pending: [
    { status: "accepted", label: "Accept & print KOT" },
    { status: "cancelled", label: "Reject" },
  ],
  accepted: [
    { status: "preparing", label: "Start cooking" },
    { status: "cancelled", label: "Cancel" },
  ],
  preparing: [{ status: "out_for_delivery", label: "Ready → dispatch" }],
  out_for_delivery: [{ status: "delivered", label: "Mark delivered" }],
};

export default function PosDashboard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/orders", { cache: "no-store", credentials: "same-origin" });
      if (res.status === 401) {
        window.location.href = "/employee/login";
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load the order board.");
      setBoard(json as Board);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the order board.");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  async function update(id: string, status: OrderStatus, driverId?: string | null) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/staff/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ id, status, ...(driverId !== undefined ? { driverId } : {}) }),
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

  const canAssign = board?.staff.position === "Manager" && board.staff.permission_level === "full";
  const orders = board?.orders ?? [];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-wrap justify-between items-center bg-[#121212] p-6 rounded-3xl shadow-[8px_8px_16px_#070707,-8px_-8px_16px_#1d1d1d] border border-[#1d1d1d]">
        <div>
          <h1 className="text-2xl font-bold text-[#FFD700]">Live POS System</h1>
          <p className="text-xs text-gray-400 mt-1">
            {board ? `${board.staff.position}: ${board.staff.username}` : "Loading…"} ·{" "}
            {orders.length} active order{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={load}
          className="px-6 py-3 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00]"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl border border-red-500/40 text-red-400 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {orders.length === 0 ? (
            <div className="p-10 rounded-3xl bg-[#121212] shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] text-center text-gray-500">
              No active orders right now.
            </div>
          ) : (
            orders.map((order) => {
              const actions = (NEXT_ACTIONS[order.status] ?? []).filter((a) =>
                canTransition(order.status, a.status)
              );
              return (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border-l-4 border-[#FFD700]"
                >
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                    <div>
                      <h3 className="font-mono font-bold text-[#FFD700]">{order.code}</h3>
                      <p className="text-xs text-gray-400">
                        {order.customer_name} ({order.customer_phone})
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{order.delivery_address}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold ${ORDER_STATUS_STYLE[order.status]}`}>
                        {ORDER_STATUS_LABEL[order.status].toUpperCase()}
                      </span>
                      <p className="font-black text-gray-200 mt-1">{formatLKR(order.total)}</p>
                      <p className="text-[10px] text-gray-500">
                        {order.payment_method === "cash" ? "Cash on delivery" : "Card on delivery"}
                      </p>
                    </div>
                  </div>

                  <ul className="text-sm text-gray-300 mb-3 list-disc pl-4">
                    {(order.order_items ?? []).map((item) => (
                      <li key={item.id}>
                        {item.quantity}× {item.name} ({item.size === "full" ? "Full" : "Normal"})
                      </li>
                    ))}
                  </ul>

                  {order.notes && (
                    <p className="text-xs text-[#FFD700]/80 bg-[#121212] p-2 rounded-lg mb-3 shadow-[inset_2px_2px_4px_#070707]">
                      📝 {order.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        onClick={() => update(order.id, action.status)}
                        disabled={busyId === order.id}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                          action.status === "cancelled"
                            ? "text-red-400 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] border border-red-500/20"
                            : "text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00]"
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>

                  {canAssign && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1d1d1d]">
                      <span className="text-xs text-gray-500">Driver:</span>
                      <select
                        value={drivers[order.id] ?? order.driver_id ?? ""}
                        onChange={(e) => setDrivers((d) => ({ ...d, [order.id]: e.target.value }))}
                        className="px-3 py-2 rounded-lg bg-[#121212] text-sm text-gray-200 shadow-[inset_3px_3px_6px_#070707] border border-[#1d1d1d]"
                      >
                        <option value="">Unassigned</option>
                        {(board?.drivers ?? []).map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.full_name || driver.username}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          update(order.id, order.status, drivers[order.id] ? drivers[order.id] : null)
                        }
                        disabled={busyId === order.id}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-gray-300 shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] disabled:opacity-50"
                      >
                        Save driver
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="bg-[#121212] p-6 rounded-3xl shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d] h-fit">
          <h2 className="text-lg font-bold text-gray-300 mb-4">Dispatch</h2>
          {canAssign ? (
            <>
              <p className="text-xs text-gray-500 mb-3">Active drivers</p>
              {(board?.drivers ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">
                  No driver accounts yet. Create one in Admin → Manage Staff.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {board!.drivers.map((driver) => (
                    <li
                      key={driver.id}
                      className="p-3 rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] text-sm text-gray-300"
                    >
                      {driver.full_name || driver.username}
                      <span className="block text-[10px] text-gray-600 font-mono">{driver.username}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Only a Manager with full permission can assign drivers. Orders you act on update for everyone.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
