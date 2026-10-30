import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BADUMA_MENU, getProductById, getAllProductIds, type Product } from '@/lib/products';
import ProductDetailActions from '@/components/ProductDetailActions';

export function generateStaticParams() {
  return getAllProductIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return { title: 'Product | Baduma.sl' };
  return {
    title: `${product.name} | Baduma.sl`,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductById(id) as Product | undefined;

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-[70vh] py-6">
      {/* Back to Menu */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#121212] text-gray-300 text-sm font-bold shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:text-[#FFD700] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all duration-300 mb-8"
      >
        ← Back to Menu
      </Link>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image — 3D Neumorphic Frame */}
        <div className="relative w-full h-80 md:h-96 rounded-3xl overflow-hidden bg-[#121212] shadow-[8px_8px_16px_#070707,-8px_-8px_16px_#1d1d1d] border border-[#1d1d1d]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover opacity-90"
          />
          <span className="absolute top-4 left-4 text-[10px] font-bold px-3 py-1.5 rounded-full bg-[#121212]/90 text-[#FFD700] shadow-[2px_2px_4px_#070707]">
            {product.category}
          </span>
        </div>

        {/* Product Details */}
        <div className="flex flex-col gap-6">
          {/* Name + Description */}
          <div>
            <h1 className="text-3xl font-black text-[#FFD700] mb-3 tracking-wide drop-shadow-md">
              {product.name}
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Price Tiers */}
          <div className="grid grid-cols-2 gap-4">
            {product.priceNormal && (
              <div className="p-5 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Normal</p>
                <p className="text-2xl font-black text-[#FFD700]">Rs. {product.priceNormal}/=</p>
              </div>
            )}
            {product.priceFull && (
              <div className="p-5 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full</p>
                <p className="text-2xl font-black text-[#FFD700]">Rs. {product.priceFull}/=</p>
              </div>
            )}
          </div>

          {/* Preparation Time */}
          <div className="p-5 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#121212] shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] flex items-center justify-center text-2xl">
              ⏱
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preparation Time</p>
              <p className="text-lg font-bold text-gray-100">{product.prepTime} minutes</p>
            </div>
          </div>

          {/* Ingredients */}
          <div className="p-5 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Ingredients</p>
            <ul className="flex flex-col gap-2">
              {product.ingredients.map((ingredient, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-sm text-gray-300"
                >
                  <span className="text-[#8FBC8F] font-bold">✓</span>
                  {ingredient}
                </li>
              ))}
            </ul>
          </div>

          {/* Add to Cart Action */}
          <ProductDetailActions product={product} />
        </div>
      </div>
    </div>
  );
}
