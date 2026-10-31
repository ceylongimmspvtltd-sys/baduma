// app/(customer)/page.tsx — storefront menu (server component).
//
// Reads the active menu from Supabase (`public.products`) so anything the Master
// Admin changes in Menu & Inventory appears here within the revalidation window
// (or immediately in development). Falls back to the curated static menu when
// Supabase is not configured or the table is empty.

import CustomerMenuGrid from "@/components/CustomerMenuGrid";
import { getMenuItems } from "@/lib/menu";

/** Re-render the menu at most once a minute so admin edits show up. */
export const revalidate = 60;

export default async function CustomerHomePage() {
  const items = await getMenuItems();
  return <CustomerMenuGrid items={items} />;
}
