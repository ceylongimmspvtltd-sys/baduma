// app/(admin)/layout.tsx
import '../globals.css';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#121212] text-gray-200 font-sans min-h-screen flex selection:bg-[#FFD700] selection:text-[#121212]">
        
        {/* 3D Neumorphic Admin Sidebar */}
        <aside className="w-64 bg-[#121212] p-6 shadow-[6px_0px_12px_#070707] z-10 flex flex-col gap-8 border-r border-[#1d1d1d]">
          <div className="text-center pb-6 border-b border-[#1d1d1d] shadow-[0_4px_4px_-4px_#070707]">
            <h2 className="text-2xl font-black text-[#FFD700]">BADUMA</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Master Admin</p>
          </div>
          
          <nav className="flex flex-col gap-4">
            {['Dashboard', 'Products', 'Orders', 'Expenses', 'Employees'].map((item) => (
              <Link 
                key={item} 
                href={`/admin/${item.toLowerCase()}`}
                className="px-4 py-3 rounded-xl text-sm font-bold text-gray-400 bg-[#121212] shadow-[4px_4px_8px_#070707,-4px_-4px_8px_#1d1d1d] hover:text-[#FFD700] hover:shadow-[inset_4px_4px_8px_#070707,inset_-4px_-4px_8px_#1d1d1d] transition-all"
              >
                {item}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Admin Content Area */}
        <main className="flex-1 p-8 h-screen overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
