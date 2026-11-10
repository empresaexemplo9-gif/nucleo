export default function Loading() {
  const block = "animate-pulse rounded-[var(--radius)] bg-surface-3/70";
  return (
    <div className="w-full space-y-4 p-4 lg:p-8" aria-busy="true" aria-label="Carregando">
      <div className="flex items-center gap-3.5">
        <div className={`${block} size-11`} />
        <div className="space-y-2">
          <div className={`${block} h-5 w-48 rounded-lg`} />
          <div className={`${block} h-3.5 w-72 rounded-lg`} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${block} h-28`} style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${block} h-80 lg:col-span-2`} />
        <div className={`${block} h-80`} />
      </div>
    </div>
  );
}
