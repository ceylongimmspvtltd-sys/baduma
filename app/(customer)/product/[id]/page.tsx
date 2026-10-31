import { notFound } from 'next/navigation';
import { getProductById, getAllProductIds, type Product } from '@/lib/products';
import ProductDetailClient from './ProductDetailClient';

export function generateStaticParams() {
  return getAllProductIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return { title: 'Product' };
  return {
    title: `${product.name}`,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductById(id) as Product | undefined;

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
