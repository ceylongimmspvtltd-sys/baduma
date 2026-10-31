export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-3xl bg-[#121212] shadow-[10px_10px_20px_#070707,-10px_-10px_20px_#1d1d1d,0_0_0_1px_#2a2a2a] border border-[#1d1d1d]">
      <h1 className="text-2xl font-bold text-[#D4AF37] mb-2 tracking-wide">{title}</h1>
      <p className="text-sm text-gray-400 font-bold">{description}</p>
    </div>
  );
}
