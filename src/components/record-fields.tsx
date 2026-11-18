"use client";
import Link from "next/link";
import { Field, Input, Select, Textarea } from "./ui";
import { EntityPicker } from "./pickers";
import { useOrg } from "./org-context";
import { date } from "@/lib/format";
import { ColorName, GradeInput, GradeSummary, SizeChip } from "./fashion";

/** Campos de cor e tamanho ganham amostra e etiqueta (moda). */
const isColorField = (f: MField) => /^cor(es)?(_|$)/.test(f.key) || /^cor(es)?\b/i.test(f.label);
const isSizeField = (f: MField) => /^tamanho/.test(f.key);

export type MField = { id: string; key: string; label: string; type: string; options: string[]; required: boolean; showInList: boolean };
export type Refs = Record<string, string>;

/** Campo de formulário para um campo personalizado de módulo (nome: f_<chave>). */
export function RecordFieldInput({ f, value, refs }: { f: MField; value: unknown; refs: Refs }) {
  const name = `f_${f.key}`;
  const sv = value == null ? "" : Array.isArray(value) ? "" : String(value);
  const label = f.label + (f.required ? " *" : "");
  const wide = f.type === "TEXTAREA" || f.type === "MULTISELECT" || f.type === "CHECKLIST" || f.type === "GRADE";
  let input: React.ReactNode;
  switch (f.type) {
    case "TEXTAREA":
      input = <Textarea name={name} defaultValue={sv} required={f.required} />;
      break;
    case "NUMBER":
      input = <Input name={name} type="number" step="any" defaultValue={sv} required={f.required} />;
      break;
    case "CURRENCY":
      input = <Input name={name} inputMode="decimal" defaultValue={sv} placeholder="0,00" required={f.required} />;
      break;
    case "DATE":
      input = <Input name={name} type="date" defaultValue={sv} required={f.required} />;
      break;
    case "DATETIME":
      input = <Input name={name} type="datetime-local" defaultValue={sv} required={f.required} />;
      break;
    case "FORMULA":
      input = (
        <div className="flex h-10 items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-dashed border-line px-3 text-sm text-fg-2">
          {value == null ? <span className="text-muted">calculado ao salvar</span> : <RecordFieldValue f={f} value={value} refs={refs} />}
          <span className="font-mono text-[10px] text-muted" title={f.options[0]}>ƒ automático</span>
        </div>
      );
      break;
    case "RECORD":
      input = f.options[0]?.startsWith("tpl:") ? (
        <p className="rounded-[var(--radius-sm)] border border-dashed border-line p-2.5 text-xs text-muted">Instale o módulo vinculado para usar este campo.</p>
      ) : (
        <EntityPicker type="record" module={f.options[0]} name={name} defaultValue={sv ? { id: sv, label: refs[sv] ?? "—" } : null} />
      );
      break;
    case "GRADE":
      input = <GradeInput name={name} value={value} sizes={f.options} />;
      break;
    case "CHECKLIST": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      input = (
        <div className="space-y-1.5 rounded-[var(--radius-sm)] border border-line-strong bg-[var(--field-bg)] p-2.5">
          <input type="hidden" name={name} value="" />
          {f.options.map((o) => (
            <label key={o} className="flex items-start gap-2 text-sm">
              <input type="checkbox" name={name} value={o} defaultChecked={arr.includes(o)} className="mt-0.5 accent-[var(--accent)]" /> {o}
            </label>
          ))}
        </div>
      );
      break;
    }
    case "SELECT":
      input = (
        <Select name={name} defaultValue={sv} required={f.required}>
          <option value="">Selecione…</option>
          {f.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      );
      break;
    case "MULTISELECT": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      input = (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-[var(--radius-sm)] border border-line-strong bg-[var(--field-bg)] p-2.5">
          <input type="hidden" name={name} value="" />
          {f.options.map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name={name} value={o} defaultChecked={arr.includes(o)} className="accent-[var(--accent)]" /> {o}
            </label>
          ))}
        </div>
      );
      break;
    }
    case "BOOLEAN":
      input = (
        <Select name={name} defaultValue={value === true ? "sim" : value === false ? "não" : ""}>
          <option value="">—</option>
          <option value="sim">Sim</option>
          <option value="não">Não</option>
        </Select>
      );
      break;
    case "CONTACT":
    case "COMPANY":
      input = (
        <>
          <EntityPicker type={f.type === "CONTACT" ? "contact" : "company"} name={name} defaultValue={sv ? { id: sv, label: refs[sv] ?? "—" } : null} />
        </>
      );
      break;
    default:
      input = <Input name={name} type={f.type === "EMAIL" ? "email" : f.type === "URL" ? "url" : f.type === "PHONE" ? "tel" : "text"} defaultValue={sv} required={f.required} />;
  }
  return (
    <Field label={label} className={wide ? "sm:col-span-2" : undefined}>
      {input}
    </Field>
  );
}

/** Exibe o valor de um campo de módulo. */
export function RecordFieldValue({ f, value, refs, plain }: { f: MField; value: unknown; refs: Refs; plain?: boolean }) {
  const { fmt } = useOrg();
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return <span className="text-muted">—</span>;
  switch (f.type) {
    case "CURRENCY":
      return <span className="tabular-nums">{fmt(Number(value))}</span>;
    case "NUMBER":
      return <span className="tabular-nums">{Number(value).toLocaleString("pt-BR")}</span>;
    case "DATE":
      return <span className="whitespace-nowrap">{date(String(value) + "T12:00:00")}</span>;
    case "DATETIME":
      return <span className="whitespace-nowrap">{String(value).replace(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/, "$3/$2/$1 · $4")}</span>;
    case "GRADE":
      return <GradeSummary value={value} sizes={f.options} compact={plain} />;
    case "CHECKLIST": {
      const done = (value as string[]).length;
      const total = f.options.length || done;
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-tint"><span className="block h-full rounded-full bg-[var(--ok)]" style={{ width: `${Math.round((done / Math.max(1, total)) * 100)}%` }} /></span>
          {done}/{total}
        </span>
      );
    }
    case "FORMULA": {
      const n = Number(value);
      if (f.options[1] === "CURRENCY") return <span className="tabular-nums">{fmt(n)}</span>;
      if (f.options[1] === "PERCENT") return <span className="tabular-nums">{n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</span>;
      return <span className="tabular-nums">{n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>;
    }
    case "RECORD":
      if (plain || !f.options[0] || f.options[0].startsWith("tpl:")) return <>{refs[String(value)] ?? "—"}</>;
      return <Link href={`/m/${f.options[0]}/${value}`} className="hover:text-accent-text">{refs[String(value)] ?? "—"}</Link>;
    case "BOOLEAN":
      return <span>{value ? "Sim" : "Não"}</span>;
    case "MULTISELECT":
      return <span>{(value as string[]).join(", ")}</span>;
    case "URL":
      if (plain) return <span>link</span>;
      return (
        <a href={String(value)} target="_blank" rel="noreferrer" className="text-accent-text underline-offset-4 hover:underline">
          abrir link
        </a>
      );
    case "CONTACT":
      if (plain) return <>{refs[String(value)] ?? "—"}</>;
      return <Link href={`/contacts/${value}`} className="hover:text-accent-text">{refs[String(value)] ?? "—"}</Link>;
    case "COMPANY":
      if (plain) return <>{refs[String(value)] ?? "—"}</>;
      return <Link href={`/companies/${value}`} className="hover:text-accent-text">{refs[String(value)] ?? "—"}</Link>;
    case "SELECT":
      if (isSizeField(f)) return <SizeChip size={String(value)} />;
      if (isColorField(f)) return <ColorName name={String(value)} />;
      return <span className="break-words">{String(value)}</span>;
    default:
      if (isColorField(f)) return <ColorName name={String(value)} />;
      return <span className="break-words">{String(value)}</span>;
  }
}
