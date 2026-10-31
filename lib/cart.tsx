"use client";

/**
 * lib/cart.tsx — customer cart context (client-only, persisted to localStorage).
 *
 * Prices shown here are a *preview*; `POST /api/orders` re-prices every line from
 * `public.products` before creating the order, so a tampered cart cannot change
 * what is charged.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { deliveryFeeFor, type CartLine, type OrderSize } from "@/lib/orders";

const STORAGE_KEY = "baduma.cart.v1";
const MAX_QTY = 20;

type AddArgs = {
  productId: string;
  name: string;
  image: string;
  size: OrderSize;
  unitPrice: number;
  quantity?: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  ready: boolean;
  add: (args: AddArgs) => void;
  setQuantity: (productId: string, size: OrderSize, quantity: number) => void;
  remove: (productId: string, size: OrderSize) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.productId === "string" &&
    typeof line.name === "string" &&
    (line.size === "normal" || line.size === "full") &&
    typeof line.unitPrice === "number" &&
    typeof line.quantity === "number"
  );
}

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage full / blocked — cart still works for this session */
    }
  }, [lines, ready]);

  const add = useCallback((args: AddArgs) => {
    const quantity = Math.max(1, Math.min(MAX_QTY, Math.round(args.quantity ?? 1)));
    setLines((current) => {
      const index = current.findIndex((l) => l.productId === args.productId && l.size === args.size);
      if (index >= 0) {
        const next = [...current];
        next[index] = {
          ...next[index],
          quantity: Math.min(MAX_QTY, next[index].quantity + quantity),
        };
        return next;
      }
      return [
        ...current,
        {
          productId: args.productId,
          name: args.name,
          image: args.image,
          size: args.size,
          unitPrice: args.unitPrice,
          quantity,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((productId: string, size: OrderSize, quantity: number) => {
    setLines((current) =>
      current
        .map((line) =>
          line.productId === productId && line.size === size
            ? { ...line, quantity: Math.max(0, Math.min(MAX_QTY, Math.round(quantity))) }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  }, []);

  const remove = useCallback((productId: string, size: OrderSize) => {
    setLines((current) => current.filter((l) => !(l.productId === productId && l.size === size)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const deliveryFee = lines.length === 0 ? 0 : deliveryFeeFor(subtotal);
    return {
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      ready,
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, ready, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart() must be used inside <CartProvider>.");
  return context;
}
