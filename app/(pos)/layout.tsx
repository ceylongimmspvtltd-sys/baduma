// app/(pos)/layout.tsx
import '../globals.css';

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#121212] text-gray-200 font-sans selection:bg-[#FFD700] selection:text-[#121212]">
        {/* Full-screen container so the POS dashboard's h-full layout works */}
        <div className="h-screen overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
