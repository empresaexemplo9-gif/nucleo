export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-7 w-48 animate-pulse rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-surface-2" />
    </div>
  );
}
