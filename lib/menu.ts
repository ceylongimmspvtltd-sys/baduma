/**
 * lib/menu.ts — storefront menu source.
 *
 * The menu shown to customers is read from `public.products` (what the Master
 * Admin edits in Menu & Inventory), with the curated static list below as a
 * fallback so the site still renders when Supabase is not configured or the
 * table is empty. Previously the storefront was 100% hard-coded, so every admin
 * price/availability change was invisible to customers.
 *
 * Server-only helper (`getMenuItems`); the static data is safe to import on the
 * client because it is plain JSON-serialisable data.
 */

import { createClient } from "@supabase/supabase-js";

export type MenuItem = {
  id: string;
  name: string;
  category: string; // uppercase for the filter pills: 'FRIED RICE', 'KOTTU'…
  normalPrice?: number;
  fullPrice?: number;
  image: string;
  desc: string;
};

const FALLBACK_IMAGE = "/images/hero-restaurant.jpg";

/** Curated menu used when the database has no active products (or is unreachable). */
export const STATIC_MENU: MenuItem[] = [
  // ── Fried Rice ──
  { id: 'fr-1', name: 'Vegetables Fried Rice', category: 'FRIED RICE', normalPrice: 500, fullPrice: 750, image: '/images/fried-rice-veg.jpg', desc: 'A colorful wok-tossed fried rice loaded with fresh garden vegetables.' },
  { id: 'fr-2', name: 'Egg Fried Rice', category: 'FRIED RICE', normalPrice: 600, fullPrice: 850, image: '/images/fried-rice-egg.jpg', desc: 'Classic egg fried rice with scrambled eggs and aromatic garlic.' },
  { id: 'fr-3', name: 'Fish Fried Rice', category: 'FRIED RICE', normalPrice: 700, fullPrice: 1000, image: '/images/fried-rice-fish.jpg', desc: 'Flaked fish fried rice with a light garlicky aroma.' },
  { id: 'fr-4', name: 'Chicken Fried Rice', category: 'FRIED RICE', normalPrice: 700, fullPrice: 1000, image: '/images/fried-rice-chicken.jpg', desc: 'Tender chicken pieces tossed into fragrant fried rice.' },
  { id: 'fr-5', name: 'Seafood Fried Rice', category: 'FRIED RICE', normalPrice: 1200, fullPrice: 1400, image: '/images/fried-rice-seafood.jpg', desc: 'A decadent seafood fried rice with prawns and fish.' },
  { id: 'fr-6', name: 'Mixed Fried Rice', category: 'FRIED RICE', normalPrice: 1200, fullPrice: 1400, image: '/images/monday-bowl.jpg', desc: 'Everything-in-the-wok fried rice with chicken, fish, and vegetables.' },
  { id: 'fr-7', name: 'Set Menu', category: 'FRIED RICE', normalPrice: 1000, fullPrice: 1300, image: '/images/set-menu.jpg', desc: 'A complete set meal with fried rice and curd sambal.' },
  { id: 'fr-8', name: 'Nasigurang', category: 'FRIED RICE', normalPrice: 1100, fullPrice: 1400, image: '/images/nasigurang.jpg', desc: 'Sri Lankan nasi gureng with rich rempah and coconut milk.' },
  { id: 'fr-9', name: 'Biriyani', category: 'FRIED RICE', normalPrice: 1200, fullPrice: 1500, image: '/images/biriyani.jpg', desc: 'Aromatic biriyani layered with chicken, spices, and saffron rice.' },

  // ── Kottu ──
  { id: 'kt-1', name: 'Chicken Kottu', category: 'KOTTU', normalPrice: 700, fullPrice: 950, image: '/images/kottu-chicken.jpg', desc: 'The iconic kottu rotti shredded and fried with chicken.' },
  { id: 'kt-2', name: 'Chicken Kottu Special', category: 'KOTTU', normalPrice: 700, fullPrice: 950, image: '/images/tuesday-bowl.jpg', desc: 'Special chicken kottu with an extra egg and richer gravy.' },
  { id: 'kt-3', name: 'Seafood Kottu', category: 'KOTTU', normalPrice: 1000, fullPrice: 1300, image: '/images/kottu-seafood.jpg', desc: 'Kottu with prawns and fish in a spicy gravy.' },
  { id: 'kt-4', name: 'Mixed Kottu', category: 'KOTTU', normalPrice: 1300, fullPrice: 1700, image: '/images/wednesday-bowl.jpg', desc: 'A hearty mixed kottu with chicken, beef, and vegetables.' },
  { id: 'kt-5', name: 'Beef Kottu', category: 'KOTTU', normalPrice: 1000, fullPrice: 1250, image: '/images/thursday-bowl.jpg', desc: 'Succulent beef kottu with a deeply savoury gravy.' },
  { id: 'kt-6', name: 'Cheese Kottu', category: 'KOTTU', normalPrice: 1100, fullPrice: 1500, image: '/images/friday-bowl.jpg', desc: 'Kottu rotti tossed in melted cheese and vegetables.' },
  { id: 'kt-7', name: 'Lava Kottu', category: 'KOTTU', fullPrice: 2000, image: '/images/kottu-lava.jpg', desc: 'The ultimate lava kottu — molten cheese with chicken and veg.' },

  // ── Pasta ──
  { id: 'ps-1', name: 'Baduma Special Pasta', category: 'PASTA', normalPrice: 1000, image: '/images/pasta-special.jpg', desc: 'Our signature pasta with chicken in a creamy garlic parmesan sauce.' },
  { id: 'ps-2', name: 'Chilly Pasta', category: 'PASTA', normalPrice: 1000, image: '/images/pasta-chilly.jpg', desc: 'A spicy chilli pasta with crisp green peppers and garlic.' },
];

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  normal_price: number | string | null;
  full_price: number | string | null;
};

function toPrice(value: number | string | null | undefined): number | undefined {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;
}

function mapRow(row: ProductRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    category: (row.category ?? "OTHER").toUpperCase(),
    normalPrice: toPrice(row.normal_price),
    fullPrice: toPrice(row.full_price),
    image: row.image_url && row.image_url.length > 0 ? row.image_url : FALLBACK_IMAGE,
    desc: row.description ?? "",
  };
}

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDatabaseId(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Menu for the storefront: active products from Postgres, falling back to the
 * curated static list when the table is empty/unavailable.
 */
export async function getMenuItems(): Promise<MenuItem[]> {
  const supabase = serverClient();
  if (!supabase) return STATIC_MENU;

  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, category, image_url, normal_price, full_price")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data || data.length === 0) return STATIC_MENU;
    return (data as ProductRow[]).map(mapRow);
  } catch {
    return STATIC_MENU;
  }
}

/** Resolve one menu item — static id (`fr-1`) or database uuid. */
export async function getMenuItemById(id: string): Promise<MenuItem | undefined> {
  if (!isDatabaseId(id)) {
    return STATIC_MENU.find((item) => item.id === id);
  }
  const supabase = serverClient();
  if (!supabase) return undefined;

  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, category, image_url, normal_price, full_price")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data as ProductRow);
  } catch {
    return undefined;
  }
}

/** Distinct categories in display order, for the filter pills. */
export function menuCategories(items: MenuItem[]): string[] {
  const seen: string[] = [];
  for (const item of items) {
    if (!seen.includes(item.category)) seen.push(item.category);
  }
  return ["ALL", ...seen];
}
