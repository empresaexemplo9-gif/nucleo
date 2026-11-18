"use client";
import Link from "next/link";
import { cn } from "@/components/ui";
import { ModuleIcon } from "@/components/module-icon";
import { useOrg } from "@/components/org-context";
import { Swatch, SizeChip } from "@/components/fashion";
import { RecordFieldValue, type Refs } from "@/components/record-fields";
import { gradeTotal, parseGrade, swatchFor } from "@/lib/fashion-colors";
import type { ModInfo, RecordRow } from "./module-view";
import { code, DueBadge } from "./module-view";

export type Kpi = { label: string; value: number | null; format: string; hint?: string };

/** Cabeçalho editorial (revista de moda): título na fonte de destaque, trama de tecido, cores da coleção e lookbook. */
export function ModaHero({ mod, palette, lookbook, actions, total }: { mod: ModInfo; palette: string[]; lookbook: string[]; actions: React.ReactNode; total: number }) {
  return (
    <section className="moda-hero animate-rise relative mb-6 overflow-hidden rounded-[calc(var(--radius,12px)+6px)] border border-line" style={{ "--mod": mod.color } as React.CSSProperties}>
      <div aria-hidden className="moda-weave absolute inset-0" />
      <div aria-hidden className="moda-glow absolute -right-24 -top-32 size-[420px] rounded-full" />
      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0 max-w-2xl">
          <p className="moda-eyebrow mb-4 flex items-center gap-2.5">
            <span className="inline-flex size-7 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--mod)_35%,transparent)] bg-[color-mix(in_oklab,var(--mod)_10%,var(--surface-1))]" style={{ color: mod.color }}>
              <ModuleIcon name={mod.icon} className="size-3.5" />
            </span>
            <span>Loja</span>
            <span className="h-px w-8 bg-[color-mix(in_oklab,var(--text)_25%,transparent)]" />
            <span>{mod.prefix} · {String(total).padStart(2, "0")} {total === 1 ? "registro" : "registros"}</span>
          </p>
          <h1 className="moda-title font-display text-[clamp(38px,5vw,68px)] leading-[0.98]">{mod.name}</h1>
          {mod.description && <p className="mt-4 max-w-xl text-[15.5px] font-light leading-relaxed text-fg-2">{mod.description}</p>}
          {palette.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Cartela da coleção</span>
              <span className="flex -space-x-1.5">
                {palette.map((c) => <Swatch key={c} name={c} size={22} className="ring-[3px] ring-[var(--card-bg,var(--surface-1))] transition hover:z-10 hover:-translate-y-0.5" />)}
              </span>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-2">{actions}</div>
        </div>
        {lookbook.length > 0 && (
          <div className="hidden gap-2 lg:flex" aria-hidden>
            {lookbook.slice(0, 3).map((id, i) => (
              <div key={id} className={cn("moda-polaroid overflow-hidden rounded-[10px] border border-line bg-surface-2", i === 1 ? "h-56 w-40 -translate-y-3" : "h-48 w-32")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/files/${id}`} alt="" className="size-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** Indicadores do segmento no estilo de etiqueta de roupa. */
export function KpiRow({ kpis }: { kpis: Kpi[] }) {
  const { fmt } = useOrg();
  const show = (k: Kpi) =>
    k.value == null ? "—" : k.format === "CURRENCY" ? fmt(k.value, k.value >= 1e6) : k.format === "PERCENT" ? `${k.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : Math.round(k.value).toLocaleString("pt-BR");
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((k, i) => (
        <div key={k.label} className="moda-tag animate-rise relative overflow-hidden rounded-[var(--radius,12px)] border border-line bg-[var(--card-bg,var(--surface-1))] p-4 pl-5" style={{ animationDelay: `${i * 60}ms` }}>
          <span aria-hidden className="moda-tag-hole absolute right-4 top-4 size-2.5 rounded-full" />
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{k.label}</p>
          <p className="moda-title font-display mt-2 truncate text-[22px] leading-none tabular-nums sm:text-[clamp(24px,2.4vw,32px)]" title={show(k)}>{show(k)}</p>
          {k.hint && <p className="mt-2 text-xs text-muted">{k.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/** Placeholder elegante quando o produto ainda não tem foto: tecido nos tons da peça e cabide desenhado. */
function FabricPlaceholder({ colors, label }: { colors: string[]; label: string }) {
  const tones = colors.map((c) => swatchFor(c)).filter((b): b is string => !!b && b.startsWith("#")).slice(0, 3);
  const a = tones[0] ?? "var(--accent)";
  const b = tones[1] ?? a;
  return (
    <div
      className="relative flex size-full items-center justify-center"
      style={{ background: `radial-gradient(120% 90% at 30% 15%, color-mix(in oklab, ${a} 26%, var(--surface-1)), color-mix(in oklab, ${b} 18%, var(--surface-2)) 75%)` }}
    >
      <div aria-hidden className="moda-weave absolute inset-0 opacity-80" />
      <svg aria-hidden viewBox="0 0 120 80" className="relative w-2/5 opacity-60" fill="none" stroke="color-mix(in oklab, var(--text) 55%, transparent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 22c0-6 4-9 8-9s7 3 7 7c0 5-4 6-8 8l-7 4L10 62c-4 2-3 8 2 8h96c5 0 6-6 2-8L60 32" />
      </svg>
      <span className="absolute bottom-[38%] rounded-full bg-[color-mix(in_oklab,var(--surface-1)_80%,transparent)] px-2.5 py-1 text-[10.5px] text-fg-2 backdrop-blur-sm">{label}</span>
    </div>
  );
}

/** Vitrine: produtos como cards de loja, com capa, preço, tamanhos e cores. */
export function Gallery({ mod, rows, refs, covers }: { mod: ModInfo; rows: RecordRow[]; refs: Refs; covers: Record<string, string> }) {
  const { fmt } = useOrg();
  const statusOf = (id: string | null) => mod.statuses.find((s) => s.id === id);
  const grade = mod.fields.find((f) => f.type === "GRADE");
  const priceKey = mod.amountFieldKey;
  const promo = mod.fields.find((f) => f.key === "preco_promocional");
  const facts = mod.fields.filter((f) => f.showInList && !["GRADE", "TEXTAREA", "FORMULA"].includes(f.type) && f.key !== priceKey && f.type !== "CONTACT").slice(0, 2);
  const sub = mod.fields.find((f) => f.showInList && (f.type === "CONTACT" || f.type === "FORMULA"));
  if (!rows.length) return null;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {rows.map((r, i) => {
        const st = statusOf(r.statusId);
        const g = grade ? parseGrade(r.data[grade.key], grade.options) : [];
        const sizesIn = grade ? grade.options.filter((s) => g.some((x) => (x.q[s] ?? 0) > 0)) : [];
        const single = typeof r.data.tamanho === "string" ? [r.data.tamanho as string] : [];
        const colors = g.length ? g.map((x) => x.cor) : typeof r.data.cor === "string" ? [r.data.cor as string] : [];
        const price = priceKey ? r.data[priceKey] : null;
        const promoV = promo ? r.data[promo.key] : null;
        const hasPromo = typeof promoV === "number" && typeof price === "number" && promoV > 0 && promoV < price;
        const stock = g.length ? gradeTotal(g) : typeof r.data.total_pecas === "number" ? (r.data.total_pecas as number) : null;
        return (
          <Link key={r.id} href={`/m/${mod.key}/${r.id}`} className="moda-card group animate-rise block" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(var(--radius,12px)+2px)] border border-line bg-surface-2">
              {covers[r.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${covers[r.id]}`} alt={r.title} loading="lazy" className="size-full object-cover transition duration-700 ease-[var(--ease)] group-hover:scale-[1.06]" />
              ) : (
                <FabricPlaceholder colors={colors} label="Adicione a foto" />
              )}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
              {st && (
                <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)] px-2.5 py-1 text-[10.5px] font-medium shadow-sm backdrop-blur" style={{ color: st.color }}>
                  <span className="size-1.5 rounded-full" style={{ background: st.color }} /> {st.name}
                </span>
              )}
              {hasPromo && <span className="absolute right-2.5 top-2.5 rounded-full bg-[var(--text)] px-2 py-1 text-[10px] font-semibold tracking-wide text-[var(--bg)]">−{Math.round((1 - (promoV as number) / (price as number)) * 100)}%</span>}
              {stock != null && (
                <span className="absolute bottom-2.5 right-2.5 rounded-full bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)] px-2 py-0.5 font-mono text-[10px] tabular-nums text-fg-2 opacity-0 backdrop-blur transition duration-300 group-hover:opacity-100">
                  {stock} pç
                </span>
              )}
              {colors.length > 0 && (
                <span className="absolute bottom-2.5 left-2.5 flex -space-x-1">
                  {colors.slice(0, 5).map((c) => <Swatch key={c} name={c} size={15} className="ring-2 ring-[var(--surface-1)]" />)}
                </span>
              )}
            </div>
            <div className="px-0.5 pt-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {code(mod.prefix, r.number)}
                {facts.map((f) => (r.data[f.key] ? <span key={f.id}> · <RecordFieldValue f={f} value={r.data[f.key]} refs={refs} plain /></span> : null))}
              </p>
              <p className="mt-1 line-clamp-2 text-[15px] leading-snug text-fg transition group-hover:text-accent-text">{r.title}</p>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                {typeof price === "number" && (
                  hasPromo ? (
                    <>
                      <span className="moda-title font-display text-lg tabular-nums">{fmt(promoV)}</span>
                      <span className="text-xs text-muted line-through tabular-nums">{fmt(price)}</span>
                    </>
                  ) : (
                    <span className="moda-title font-display text-lg tabular-nums">{fmt(price)}</span>
                  )
                )}
                {sub && r.data[sub.key] != null && (
                  <span className="text-xs text-muted">
                    <RecordFieldValue f={sub} value={r.data[sub.key]} refs={refs} plain />
                    {sub.type === "FORMULA" && sub.options[1] === "NUMBER" && ` ${sub.label.toLowerCase()}`}
                  </span>
                )}
              </div>
              {(sizesIn.length > 0 || single.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(grade ? grade.options : single).map((s) => (grade ? <SizeChip key={s} size={s} muted={!sizesIn.includes(s)} /> : <SizeChip key={s} size={s} />))}
                </div>
              )}
              {r.dueAt && !price && <div className="mt-2"><DueBadge dueAt={r.dueAt} isFinal={r.isFinal} /></div>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
