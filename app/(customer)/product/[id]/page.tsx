import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getProductById, getAllProductIds, type Product } from '@/lib/products';

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

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 py-10">
      
      {/* Back Button */}
      <div className="w-full max-w-4xl mb-6">
        <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] text-gray-400 hover:text-[#FFD700] hover:shadow-[inset_3px_3px_6px_#070707,inset_-3px_-3px_6px_#1d1d1d] transition-all text-sm font-bold">
          ← Back to Menu
        </Link>
      </div>

      <div className="w-full max-w-4xl bg-[#121212] rounded-[2.5rem] shadow-[12px_12px_24px_#070707,-12px_-12px_24px_#1d1d1d] border border-[#1d1d1d] overflow-hidden flex flex-col md:flex-row">
        
        {/* 3D Image Section */}
        <div className="w-full md:w-1/2 p-6 md:p-10 flex items-center justify-center">
          <div className="relative w-full aspect-square rounded-[2rem] bg-[#121212] shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] overflow-hidden">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover opacity-90 hover:scale-105 transition-transform duration-500"
            />
            <span className="absolute top-4 left-4 text-xs font-bold px-4 py-2 rounded-full bg-[#121212]/90 text-[#FFD700] shadow-[2px_2px_4px_#070707]">
              {product.category}
            </span>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="w-full md:w-1/2 p-6 md:p-10 md:pl-0 flex flex-col justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-100 mb-2 tracking-wide">
              {product.name}
            </h1>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              {product.description}
            </p>

            {/* Preparation Time */}
            <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Estimated Prep Time</p>
                <p className="text-[#FFD700] font-black">{product.prepTime} Mins</p>
              </div>
            </div>

            {/* Ingredients List */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-400 mb-4 border-b border-[#1d1d1d] pb-2">Key Ingredients</h3>
              <div className="flex flex-wrap gap-3">
                {product.ingredients.map((item, idx) => (
                  <span key={idx} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 bg-[#121212] shadow-[3px_3px_6px_#070707,-3px_-3px_6px_#1d1d1d]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing & Add to Cart (Neumorphic Actions) */}
          <div className="flex flex-col gap-4 pt-6 border-t border-[#1d1d1d]">
            {product.priceNormal && (
              <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
                <span className="text-sm font-bold text-gray-400">Normal Portion</span>
                <span className="text-lg font-black text-[#FFD700]">Rs. {product.priceNormal}/=</span>
              </div>
            )}
            {product.priceFull && (
              <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
                <span className="text-sm font-bold text-gray-400">Full Portion</span>
                <span className="text-lg font-black text-[#FFD700]">Rs. {product.priceFull}/=</span>
              </div>
            )}

            <Link
              href="/cart"
              className="mt-4 w-full py-5 rounded-2xl font-black text-[#121212] bg-[#FFD700] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#332b00] active:shadow-[inset_4px_4px_8px_#ccac00,inset_-4px_-4px_8px_#ffea4d] transition-all tracking-wider text-lg hover:brightness-110 text-center block"
            >
              Add to Cart
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
