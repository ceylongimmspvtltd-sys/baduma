import { notFound } from "next/navigation";
import { getProductById, getAllProductIds, type Product } from "@/lib/products";
import { getMenuItemById, isDatabaseId } from "@/lib/menu";
import ProductDetailClient from "./ProductDetailClient";

/**
 * Product detail page.
 *
 * Two id shapes are supported:
 *   - static catalogue ids (`fr-1`, `kt-3`…) from lib/products.ts — prerendered
 *   - Postgres uuids from `public.products` — rendered on demand (ISR, 60 s)
 * so admin-created menu items are linkable from the storefront.
 */

export const revalidate = 60;
export const dynamicParams = true;

export function generateStaticParams() {
  return getAllProductIds().map((id) => ({ id }));
}

const CATEGORY_MAP: Record<string, Product["category"]> = {
  KOTTU: "Kottu",
  "FRIED RICE": "Fried Rice",
  PASTA: "Pasta",
};

async function resolveProduct(id: string): Promise<Product | undefined> {
  const curated = getProductById(id);
  if (curated) return curated;

  if (!isDatabaseId(id)) return undefined;

  const item = await getMenuItemById(id);
  if (!item) return undefined;

  // Adapt a database row to the shape the detail client renders.
  return {
    id: item.id,
    name: item.name,
    category: CATEGORY_MAP[item.category] ?? "Special",
    veg: true,
    priceNormal: item.normalPrice,
    priceFull: item.fullPrice,
    image: item.image,
    prepTime: 20,
    ingredients: ["Freshly prepared to order", "No artificial flavouring", "Made in Baduma kitchen"],
    description: item.desc,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await resolveProduct(id);
  if (!product) return { title: "Product" };
  return { title: product.name, description: product.description };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await resolveProduct(id);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
