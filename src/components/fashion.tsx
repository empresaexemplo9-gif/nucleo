"use client";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "./ui";
import { gradeTotal, isLight, parseGrade, swatchFor, type GradeRow } from "@/lib/fashion-colors";

/** Bolinha com a cor (ou padrão) da peça. */
export function Swatch({ name, size = 14, className }: { name: string; size?: number; className?: string }) {
  const bg = swatchFor(name);
  return (
    <span
      title={name}
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: bg ?? "repeating-linear-gradient(45deg, var(--line) 0 2px, transparent 2px 4px)",
        boxShadow: `inset 0 0 0 1px ${!bg || isLight(bg) ? "color-mix(in oklab, var(--text) 18%, transparent)" : "color-mix(in oklab, #000 12%, transparent)"}, 0 1px 2px color-mix(in oklab, #000 10%, transparent)`,
      }}
    />
  );
}

/** Nome da cor com a amostra ao lado. */
export function ColorName({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Swatch name={name} /> {name}
    </span>
  );
}

/** Etiqueta de tamanho no estilo de provador. */
export function SizeChip({ size, muted, className }: { size: string; muted?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-[6px] border px-1.5 font-mono text-[10.5px] font-medium tracking-wide",
        muted ? "border-dashed border-line text-muted line-through" : "border-line-strong bg-[var(--surface-1)] text-fg",
        className,
      )}
    >
      {size}
    </span>
  );
}

/** Resumo da grade: total, cores e tamanhos disponíveis (para lista, quadro e vitrine). */
export function GradeSummary({ value, sizes, compact }: { value: unknown; sizes: string[]; compact?: boolean }) {
  const rows = parseGrade(value, sizes);
  const total = gradeTotal(rows);
  if (!rows.length) return <span className="text-muted">—</span>;
  const inStock = sizes.filter((s) => rows.some((r) => (r.q[s] ?? 0) > 0));
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="tabular-nums font-medium">{total} pç</span>
      <span className="inline-flex -space-x-1">{rows.slice(0, 6).map((r) => <Swatch key={r.cor} name={r.cor} size={13} className="ring-2 ring-[var(--card-bg,var(--surface-1))]" />)}</span>
      {!compact && <span className="text-xs text-muted">{inStock.join(" · ")}</span>}
    </span>
  );
}

/** Tabela da grade (ficha do produto): quantidades por cor e tamanho, com faltas destacadas. */
export function GradeTable({ value, sizes, min }: { value: unknown; sizes: string[]; min?: number | null }) {
  const rows = parseGrade(value, sizes);
  const total = gradeTotal(rows);
  if (!rows.length) return <span className="text-muted">—</span>;
  const colTotal = (s: string) => rows.reduce((t, r) => t + (r.q[s] ?? 0), 0);
  return (
    <div className="overflow-x-auto rounded-[10px] border border-line">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          <tr>
            <th className="px-3 py-2 text-left font-normal">Cor</th>
            {sizes.map((s) => <th key={s} className="px-2 py-2 text-center font-normal">{s}</th>)}
            <th className="px-3 py-2 text-right font-normal">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const rt = Object.values(r.q).reduce((a, b) => a + b, 0);
            return (
              <tr key={r.cor}>
                <td className="px-3 py-2"><ColorName name={r.cor} /></td>
                {sizes.map((s) => {
                  const n = r.q[s] ?? 0;
                  return (
                    <td key={s} className="px-1 py-1.5 text-center">
                      <span className={cn("inline-flex h-7 min-w-8 items-center justify-center rounded-md font-mono text-xs tabular-nums", n === 0 ? "text-muted/60" : n <= 1 ? "bg-[color-mix(in_oklab,var(--warn)_14%,transparent)] text-warn" : "bg-tint text-fg")}>
                        {n || "·"}
                      </span>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">{rt}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t border-line bg-surface-2 font-mono text-xs">
          <tr>
            <td className="px-3 py-2 text-muted">Total</td>
            {sizes.map((s) => <td key={s} className={cn("px-2 py-2 text-center tabular-nums", colTotal(s) === 0 && "text-err")}>{colTotal(s)}</td>)}
            <td className={cn("px-3 py-2 text-right font-semibold tabular-nums", min != null && total <= min && "text-warn")}>{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const QUICK_COLORS = ["Preto", "Branco", "Off-white", "Nude", "Bege", "Caramelo", "Marrom", "Cinza", "Azul marinho", "Jeans", "Verde oliva", "Vinho", "Rosa", "Terracota", "Estampado"];

/** Editor da grade no formulário (gravado como JSON no campo f_<chave>). */
export function GradeInput({ name, value, sizes }: { name: string; value: unknown; sizes: string[] }) {
  const [rows, setRows] = useState<GradeRow[]>(() => {
    const r = parseGrade(value, sizes);
    return r.length ? r : [{ cor: "", q: {} }];
  });
  const json = useMemo(() => JSON.stringify(rows.filter((r) => r.cor.trim() || Object.values(r.q).some(Boolean))), [rows]);
  const set = (i: number, patch: Partial<GradeRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const total = gradeTotal(parseGrade(json, sizes));
  return (
    <div className="rounded-[var(--radius-sm)] border border-line-strong bg-[var(--field-bg)] p-2.5">
      <input type="hidden" name={name} value={json} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="pb-1.5 text-left font-normal">Cor</th>
              {sizes.map((s) => <th key={s} className="pb-1.5 text-center font-normal">{s}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <div className="flex min-w-36 items-center gap-1.5">
                    <Swatch name={r.cor || "?"} size={16} />
                    <input
                      list="grade-cores"
                      value={r.cor}
                      onChange={(e) => set(i, { cor: e.target.value })}
                      placeholder="Ex.: Off-white"
                      aria-label={`Cor da linha ${i + 1}`}
                      className="h-8 w-full rounded-md border border-line bg-[var(--surface-1)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </td>
                {sizes.map((s) => (
                  <td key={s} className="px-0.5 py-1">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={r.q[s] ?? ""}
                      onChange={(e) => set(i, { q: { ...r.q, [s]: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })}
                      aria-label={`${r.cor || "cor"} tamanho ${s}`}
                      className="h-8 w-12 rounded-md border border-line bg-[var(--surface-1)] text-center font-mono text-xs tabular-nums outline-none focus:border-[var(--accent)]"
                    />
                  </td>
                ))}
                <td className="pl-1">
                  <button type="button" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [{ cor: "", q: {} }]))} className="rounded p-1 text-muted hover:text-err" aria-label="Remover cor">
                    <X className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="grade-cores">{QUICK_COLORS.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={() => setRows((rs) => [...rs, { cor: "", q: {} }])} className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">
          <Plus className="size-3.5" /> Adicionar cor
        </button>
        <span className="font-mono text-[11px] text-muted">total {total} peça(s)</span>
      </div>
    </div>
  );
}
