// app/(admin)/layout.tsx — root layout for the Master Admin route group.
import "../globals.css";

export const metadata = {
  title: "බැදුම | Master Admin",
  description: "Baduma Master Admin Dashboard",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#121212] text-gray-200 font-sans min-h-screen flex selection:bg-[#FFD700] selection:text-[#121212]">
        {children}
      </body>
    </html>
  );
}
