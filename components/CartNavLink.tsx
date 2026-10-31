"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

/** Nav link with the live item count (client component inside the server layout). */
export default function CartNavLink() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="relative px-5 py-2.5 text-sm font-bold rounded-xl bg-[#121212] text-gray-400 shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] hover:text-[#FFD700] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all duration-300"
    >
      Cart
      {count > 0 && (
        <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-[#FFD700] text-[#121212] text-[10px] font-black flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
