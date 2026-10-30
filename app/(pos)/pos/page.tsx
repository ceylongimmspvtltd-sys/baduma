'use client';

export default function PosDashboard() {
  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center bg-[#121212] p-6 rounded-3xl shadow-[8px_8px_16px_#070707,-8px_-8px_16px_#1d1d1d] border border-[#1d1d1d]">
        <div>
          <h1 className="text-2xl font-bold text-[#FFD700]">Live POS System</h1>
          <p className="text-xs text-gray-400 mt-1">Manager: Front Desk</p>
        </div>
        <button className="px-6 py-3 rounded-xl font-bold text-[#121212] bg-[#FFD700] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#332b00] active:shadow-[inset_3px_3px_6px_#ccac00,inset_-3px_-3px_6px_#ffea4d] transition-all">
          + New Walk-in Order
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Incoming Online Orders Column */}
        <div className="lg:col-span-2 bg-[#121212] p-6 rounded-3xl shadow-[inset_6px_6px_12px_#070707,inset_-6px_-6px_12px_#1d1d1d] overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-300 mb-6">Incoming Online Orders (Pending)</h2>
          
          {/* Sample Order Card */}
          <div className="p-5 rounded-2xl bg-[#121212] shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] mb-4 border-l-4 border-[#FFD700]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-[#FFD700]">Order #1024</h3>
                <p className="text-xs text-gray-400">Customer: Nimal Perera (077 123 4567)</p>
              </div>
              <span className="px-3 py-1 text-[10px] font-bold rounded-full bg-[#121212] shadow-[inset_2px_2px_4px_#070707,inset_-2px_-2px_4px_#1d1d1d] text-yellow-500">
                AWAITING KITCHEN
              </span>
            </div>
            <ul className="text-sm text-gray-300 mb-4 list-disc pl-4">
              <li>2x Chicken Kottu (Normal)</li>
              <li>1x Seafood Fried Rice (Full)</li>
            </ul>
            <div className="flex gap-3">
              <button className="flex-1 py-2 rounded-xl text-sm font-bold text-gray-300 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] active:shadow-[inset_2px_2px_4px_#070707,inset_-2px_-2px_4px_#1d1d1d] hover:text-[#8FBC8F] transition-all border border-[#8FBC8F]/20">
                Accept & Print KOT
              </button>
              <button className="flex-1 py-2 rounded-xl text-sm font-bold text-gray-300 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] active:shadow-[inset_2px_2px_4px_#070707,inset_-2px_-2px_4px_#1d1d1d] hover:text-red-400 transition-all border border-red-500/20">
                Reject
              </button>
            </div>
          </div>
        </div>

        {/* Quick KOT / Print Area */}
        <div className="bg-[#121212] p-6 rounded-3xl shadow-[6px_6px_12px_#070707,-6px_-6px_12px_#1d1d1d] border border-[#1d1d1d] flex flex-col">
          <h2 className="text-lg font-bold text-gray-300 mb-6">Dispatch & Print</h2>
          <div className="flex-1 flex items-center justify-center bg-[#121212] rounded-2xl shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] border border-[#1d1d1d]/50 p-4 text-center text-sm text-gray-500">
            Select an order to view E-Bill or assign a Driver.
          </div>
        </div>
      </div>
    </div>
  );
}
