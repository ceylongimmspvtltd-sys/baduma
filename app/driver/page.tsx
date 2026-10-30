'use client';

export default function DriverPortal() {
  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 p-4 md:p-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#121212] p-4 rounded-2xl shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] mb-6 border border-[#1d1d1d]">
        <div>
          <h1 className="text-xl font-black text-[#FFD700]">බැදුම Delivery</h1>
          <p className="text-xs text-gray-400">Driver: Saman Kumara</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-[#121212] shadow-[inset_2px_2px_4px_#070707,inset_-2px_-2px_4px_#1d1d1d]">
          <span className="text-xs font-bold text-[#8FBC8F]">● Online</span>
        </div>
      </div>

      {/* Active Order Card */}
      <div className="bg-[#121212] p-6 rounded-3xl shadow-[8px_8px_16px_#070707,-8px_-8px_16px_#1d1d1d] border border-[#1d1d1d]">
        <div className="flex justify-between items-start mb-4 border-b border-[#1d1d1d] pb-4">
          <div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#121212] shadow-[inset_2px_2px_4px_#070707,inset_-2px_-2px_4px_#1d1d1d] text-yellow-500 mb-2 inline-block">
              ACTIVE DELIVERY
            </span>
            <h2 className="text-2xl font-bold text-white">Order #1024</h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total to Collect</p>
            <p className="text-xl font-bold text-[#FFD700]">Rs. 3,450/=</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
            <p className="text-xs text-gray-500 mb-1">Customer</p>
            <p className="text-sm font-bold text-gray-200">Nimal Perera</p>
            <p className="text-sm text-[#FFD700] mt-1">📞 077 123 4567</p>
          </div>
          
          <div className="p-4 rounded-xl bg-[#121212] shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d]">
            <p className="text-xs text-gray-500 mb-1">Delivery Address</p>
            <p className="text-sm font-bold text-gray-200">No 45, Temple Road, Pilimatalawa</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <button className="w-full py-3 rounded-xl font-bold text-gray-300 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] active:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] flex items-center justify-center gap-2">
            📍 Open in Google Maps
          </button>
          
          <button className="w-full py-4 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_4px_4px_8px_#ccac00,inset_-4px_-4px_8px_#ffea4d] transition-all">
            Collect Cash & Capture Signature
          </button>
        </div>
      </div>
    </div>
  );
}
