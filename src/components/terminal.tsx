/** Terminal estilo DRAP (peça-assinatura). Linhas aparecem em sequência. */
export type TermLine = { kind: "cmd" | "ok" | "warn" | "info" | "blank"; text?: string };

export function Terminal({ title, lines, footerLeft, footerRight, live = true }: { title: string; lines: TermLine[]; footerLeft?: string; footerRight?: string; live?: boolean }) {
  return (
    <div className="terminal relative overflow-hidden text-[12.5px] leading-[1.75]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="t-mute ml-2 flex-1 truncate text-[11px]">{title}</span>
        {live && (
          <span className="flex items-center gap-1.5 rounded-[5px] border border-[color-mix(in_oklab,var(--term-ok)_40%,transparent)] px-1.5 py-px text-[9.5px] tracking-[0.12em] text-[var(--term-ok)]">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--term-ok)]" /> LIVE
          </span>
        )}
      </div>
      <div className="px-4 py-4">
        {lines.map((l, i) => (
          <div key={i} className="t-line truncate" style={{ animationDelay: `${150 + i * 220}ms` }}>
            {l.kind === "cmd" && (
              <>
                <span className="t-prompt">drap@crm ~ $</span> <span>{l.text}</span>
              </>
            )}
            {l.kind === "ok" && (
              <>
                <span className="t-ok">✓</span> <span>{l.text}</span>
              </>
            )}
            {l.kind === "warn" && (
              <>
                <span className="text-[var(--term-prompt)]">!</span> <span>{l.text}</span>
              </>
            )}
            {l.kind === "info" && <span className="t-mute">{l.text}</span>}
            {l.kind === "blank" && <span>&nbsp;</span>}
          </div>
        ))}
        <div className="t-line" style={{ animationDelay: `${150 + lines.length * 220}ms` }}>
          <span className="t-prompt">drap@crm ~ $</span> <span className="inline-block h-3.5 w-2 translate-y-0.5 animate-pulse bg-[var(--term-fg)]" />
        </div>
      </div>
      {(footerLeft || footerRight) && (
        <div className="t-mute flex items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5 text-[10.5px]">
          <span className="truncate">{footerLeft}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[var(--term-ok)]" /> {footerRight}
          </span>
        </div>
      )}
    </div>
  );
}

/** Faixa contínua com itens em mono separados por ◇. */
export function Marquee({ items }: { items: string[] }) {
  if (!items.length) return null;
  const row = items.map((t, i) => (
    <span key={i} className="flex items-center gap-6 pr-6">
      <span>{t}</span>
      <span className="text-[var(--accent)]">◇</span>
    </span>
  ));
  return (
    <div className="marquee overflow-hidden border-y border-line py-3.5" aria-hidden>
      <div className="marquee-track font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {row}
        {row}
      </div>
    </div>
  );
}
