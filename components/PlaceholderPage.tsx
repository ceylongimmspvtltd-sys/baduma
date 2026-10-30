export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-3xl bg-[#121212] shadow-[10px_10px_20px_#070707,-10px_-10px_20px_#1d1d1d] border border-[#1d1d1d]">
      <h1 className="text-2xl font-bold text-[#FFD700] mb-2">{title}</h1>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}
