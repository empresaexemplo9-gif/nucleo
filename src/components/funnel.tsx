/** Funil visual: faixas centralizadas que se afunilam, com quantidade, valor e participação de cada etapa. */
export function Funnel({ stages }: { stages: { name: string; color: string; count: number; value: string }[] }) {
  const n = stages.length;
  const total = stages.reduce((a, s) => a + s.count, 0) || 1;
  return (
    <div className="space-y-1.5">
      {stages.map((s, i) => {
        const width = n > 1 ? 100 - (i * 34) / (n - 1) : 100;
        const next = n > 1 ? 100 - ((i + 1) * 34) / (n - 1) : 100;
        const inset = (width - next) / 2 / width * 100;
        const share = Math.round((s.count / total) * 100);
        return (
          <div key={s.name} className="group flex items-center gap-3">
            <div className="relative flex flex-1 justify-center">
              <div
                className="relative flex h-12 items-center justify-between px-5 text-white transition duration-200 group-hover:scale-[1.02] group-hover:brightness-110"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, color-mix(in oklab, ${s.color} 78%, white), ${s.color})`,
                  clipPath: i === n - 1 ? "inset(0 round 10px)" : `polygon(0 0, 100% 0, ${100 - inset}% 100%, ${inset}% 100%)`,
                  borderRadius: i === 0 ? "12px 12px 0 0" : undefined,
                  boxShadow: `0 10px 24px -14px ${s.color}`,
                }}
              >
                <span className="truncate text-xs font-bold drop-shadow-sm">{s.name}</span>
                <span className="text-right">
                  <span className="block font-display text-sm font-extrabold leading-tight drop-shadow-sm">{s.count}</span>
                  <span className="block text-[10px] font-medium opacity-90">{s.value}</span>
                </span>
              </div>
            </div>
            <span className="w-10 shrink-0 text-right text-[11px] font-bold" style={{ color: s.color }} title="Participação no total de negócios abertos">
              {share}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
