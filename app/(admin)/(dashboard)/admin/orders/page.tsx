// app/(admin)/(dashboard)/admin/orders/page.tsx — Order Management.
export default function AdminOrdersPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="p-6 rounded-3xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d]">
        <h2 className="text-2xl font-black text-[#FFD700]">Order Management</h2>
        <p className="text-sm text-gray-400 mt-1">Track and manage customer orders.</p>
      </div>

      <div className="p-10 rounded-3xl bg-[#121212] shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d] text-center py-20">
        <div className="text-5xl mb-5">🧾</div>
        <h3 className="text-lg font-bold text-gray-300">Order queue coming soon</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          Live order tracking and fulfillment will appear here once the orders pipeline is connected. Customers can already place
          orders and track them from the storefront.
        </p>
      </div>
    </div>
  );
}
