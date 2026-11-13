"use client";
import Link from "next/link";
import { Field, Input, Select, Textarea } from "./ui";
import { EntityPicker } from "./pickers";
import { useOrg } from "./org-context";
import { date } from "@/lib/format";

export type MField = { id: string; key: string; label: string; type: string; options: string[]; required: boolean; showInList: boolean };
export type Refs = Record<string, string>;

/** Campo de formulário para um campo personalizado de módulo (nome: f_<chave>). */
export function RecordFieldInput({ f, value, refs }: { f: MField; value: unknown; refs: Refs }) {
  const name = `f_${f.key}`;
  const sv = value == null ? "" : Array.isArray(value) ? "" : String(value);
  const label = f.label + (f.required ? " *" : "");
  const wide = f.type === "TEXTAREA" || f.type === "MULTISELECT";
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
export function RecordFieldValue({ f, value, refs }: { f: MField; value: unknown; refs: Refs }) {
  const { fmt } = useOrg();
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return <span className="text-muted">—</span>;
  switch (f.type) {
    case "CURRENCY":
      return <span className="tabular-nums">{fmt(Number(value))}</span>;
    case "NUMBER":
      return <span className="tabular-nums">{Number(value).toLocaleString("pt-BR")}</span>;
    case "DATE":
      return <span className="whitespace-nowrap">{date(String(value) + "T12:00:00")}</span>;
    case "BOOLEAN":
      return <span>{value ? "Sim" : "Não"}</span>;
    case "MULTISELECT":
      return <span>{(value as string[]).join(", ")}</span>;
    case "URL":
      return (
        <a href={String(value)} target="_blank" rel="noreferrer" className="text-accent-text underline-offset-4 hover:underline">
          abrir link
        </a>
      );
    case "CONTACT":
      return <Link href={`/contacts/${value}`} className="hover:text-accent-text">{refs[String(value)] ?? "—"}</Link>;
    case "COMPANY":
      return <Link href={`/companies/${value}`} className="hover:text-accent-text">{refs[String(value)] ?? "—"}</Link>;
    default:
      return <span className="break-words">{String(value)}</span>;
  }
}
