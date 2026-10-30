// app/driver/layout.tsx
import '../globals.css';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#121212] text-gray-200 font-sans selection:bg-[#FFD700] selection:text-[#121212]">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
