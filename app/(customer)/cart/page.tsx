// app/(customer)/cart/page.tsx — cart + checkout (server-side re-pricing).
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatLKR, FREE_DELIVERY_THRESHOLD } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";

type PlacedOrder = { code: string; total: number };

export default function CartPage() {
  const router = useRouter();
  const cart = useCart();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
    paymentMethod: "cash" as "cash" | "card",
  });
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setSignedIn(Boolean(data.user));
      if (data.user?.phone) setForm((f) => ({ ...f, phone: f.phone || data.user!.phone || "" }));
    })();
  }, []);

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!signedIn) {
      router.push("/login?next=/cart");
      return;
    }
    if (cart.lines.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setPlacing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        router.push("/login?next=/cart");
        return;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        body: JSON.stringify({
          // Only ids/sizes/quantities are sent — the server prices the order.
          items: cart.lines.map((line) => ({
            productId: line.productId,
            size: line.size,
            quantity: line.quantity,
          })),
          customer: {
            name: form.name,
            phone: form.phone,
            address: form.address,
            notes: form.notes,
            paymentMethod: form.paymentMethod,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not place the order.");

      cart.clear();
      setPlaced({ code: json.order.code, total: json.order.total });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place the order.");
    } finally {
      setPlacing(false);
    }
  }

  const inputBase =
    "w-full px-4 py-3 rounded-xl bg-[#121212] text-gray-200 placeholder:text-gray-600 shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all";

  if (placed) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center flex flex-col gap-5">
        <div className="text-6xl">✅</div>
        <h1 className="text-2xl font-black text-white">Order placed!</h1>
        <p className="text-gray-300">
          Your order <span className="font-mono font-black text-[#FFD700]">{placed.code}</span> is with the kitchen.
        </p>
        <p className="text-sm text-gray-400">Total: {formatLKR(placed.total)} (cash on delivery)</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <Link href="/track-orders" className="px-6 py-3 rounded-xl font-black text-[#121212] bg-[#FFD700]">
            Track this order
          </Link>
          <Link href="/" className="px-6 py-3 rounded-xl font-bold text-gray-300 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d]">
            Order more
          </Link>
        </div>
      </div>
    );
  }

  if (cart.ready && cart.lines.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center flex flex-col gap-5">
        <div className="text-5xl">🛒</div>
        <h1 className="text-2xl font-black text-white">Your cart is empty</h1>
        <p className="text-gray-400 text-sm">Add something from the menu to get started.</p>
        <Link href="/" className="mx-auto px-6 py-3 rounded-xl font-black text-[#121212] bg-[#FFD700]">
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 pt-2">
      <h1 className="text-3xl font-black text-white tracking-wide">Your Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Lines */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {cart.lines.map((line) => (
            <div
              key={`${line.productId}-${line.size}`}
              className="flex gap-4 p-4 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]"
            >
              <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                <Image src={line.image} alt={line.name} fill sizes="80px" className="object-cover" />
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-black text-gray-200 truncate">{line.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {line.size === "full" ? "Full portion" : "Normal portion"} · {formatLKR(line.unitPrice)}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => cart.setQuantity(line.productId, line.size, line.quantity - 1)}
                    className="w-8 h-8 rounded-lg font-black text-[#FFD700] bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d]"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="font-black text-gray-200 w-6 text-center">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => cart.setQuantity(line.productId, line.size, line.quantity + 1)}
                    className="w-8 h-8 rounded-lg font-black text-[#FFD700] bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d]"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => cart.remove(line.productId, line.size)}
                    className="ml-auto text-xs font-bold text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right font-black text-[#FFD700] shrink-0">
                {formatLKR(line.unitPrice * line.quantity)}
              </div>
            </div>
          ))}
        </div>

        {/* Checkout */}
        <form
          onSubmit={handlePlaceOrder}
          className="lg:col-span-2 flex flex-col gap-4 p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d] h-fit"
        >
          <h2 className="text-lg font-black text-[#FFD700]">Delivery details</h2>

          {error && (
            <p className="p-3 rounded-xl border border-red-500/40 text-red-400 text-xs">{error}</p>
          )}
          {signedIn === false && (
            <p className="p-3 rounded-xl border border-[#FFD700]/30 text-[#FFD700] text-xs">
              You&apos;ll be asked for a one-time code (OTP) before the order is placed.
            </p>
          )}

          <input
            className={inputBase}
            placeholder="Your name"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className={inputBase}
            placeholder="Phone (07X XXX XXXX)"
            required
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <textarea
            className={`${inputBase} min-h-[84px]`}
            placeholder="Delivery address"
            required
            minLength={8}
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
          <input
            className={inputBase}
            placeholder="Notes for the kitchen (optional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />

          <div className="flex gap-3">
            {(["cash", "card"] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setForm((f) => ({ ...f, paymentMethod: method }))}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  form.paymentMethod === method
                    ? "text-[#121212] bg-[#FFD700]"
                    : "text-gray-400 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d]"
                }`}
              >
                {method === "cash" ? "Cash on delivery" : "Card on delivery"}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>{formatLKR(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Delivery</span>
              <span>{cart.deliveryFee === 0 ? "FREE" : formatLKR(cart.deliveryFee)}</span>
            </div>
            {cart.subtotal < FREE_DELIVERY_THRESHOLD && (
              <p className="text-[11px] text-gray-600">
                Free delivery over {formatLKR(FREE_DELIVERY_THRESHOLD)}.
              </p>
            )}
            <div className="flex justify-between font-black text-[#FFD700] text-lg mt-2">
              <span>Total</span>
              <span>{formatLKR(cart.total)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={placing}
            className="mt-2 py-4 rounded-xl font-black text-[#121212] bg-[#FFD700] shadow-[5px_5px_10px_#070707,-5px_-5px_10px_#332b00] disabled:opacity-60 tracking-wider"
          >
            {placing ? "Placing order…" : signedIn ? "Place order" : "Sign in & place order"}
          </button>
        </form>
      </div>
    </div>
  );
}
