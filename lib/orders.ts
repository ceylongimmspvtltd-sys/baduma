/**
 * lib/orders.ts — shared order model (safe for client + server).
 *
 * Money rules:
 *   - every price is resolved SERVER-SIDE from `public.products`
 *   - the client only ever sends product ids, sizes and quantities
 *   - totals are stored on the order row so history never drifts
 */

export const ORDER_STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "text-yellow-500",
  accepted: "text-blue-400",
  preparing: "text-orange-400",
  out_for_delivery: "text-purple-400",
  delivered: "text-green-400",
  cancelled: "text-red-400",
};

/** Happy-path progress used by the customer timeline. */
export const ORDER_PROGRESS: OrderStatus[] = ["pending", "accepted", "preparing", "out_for_delivery", "delivered"];

/** Which transitions are legal, and who may perform them. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "preparing", "cancelled"],
  accepted: ["preparing", "out_for_delivery", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

/** Flat delivery fee (LKR). Kept here so the API and the UI agree. */
export const DELIVERY_FEE = 200;

/** Free delivery above this subtotal. */
export const FREE_DELIVERY_THRESHOLD = 5000;

export function deliveryFeeFor(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

export function formatLKR(value: number): string {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ */
/* Cart / order shapes                                                 */
/* ------------------------------------------------------------------ */

export type OrderSize = "normal" | "full";

export type CartLine = {
  productId: string;
  name: string;
  image: string;
  size: OrderSize;
  unitPrice: number;
  quantity: number;
};

export type IncomingOrderLine = {
  productId: unknown;
  size: unknown;
  quantity: unknown;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  size: OrderSize;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type OrderRow = {
  id: string;
  code: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  notes: string | null;
  payment_method: "cash" | "card";
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  driver_id: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItemRow[];
};

/** Human-friendly, unguessable order code: BD-7K4Q2M */
export function generateOrderCode(random: (size: number) => Uint8Array): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  const bytes = random(6);
  let code = "";
  for (let i = 0; i < 6; i += 1) code += alphabet[bytes[i] % alphabet.length];
  return `BD-${code}`;
}

/** Cheap validation shared by the API routes. */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength);
}

/** Loose Sri Lankan phone check: digits, optional +, 9–15 digits. */
export function isPlausiblePhone(value: string): boolean {
  return /^\+?[0-9][0-9\s-]{7,17}$/.test(value);
}
