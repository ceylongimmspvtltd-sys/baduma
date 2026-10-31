// app/(employee)/layout.tsx — root layout for the employee route group.
import "../globals.css";

export const metadata = {
  title: "බැදුම | Employee Sign In",
  description: "බැදුම internal staff portal",
};

export default function EmployeeRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#121212] text-gray-200 font-sans min-h-screen flex selection:bg-[#FFD700] selection:text-[#121212]">
        {children}
      </body>
    </html>
  );
}
