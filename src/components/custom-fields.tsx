"use client";
import { Field, Input, Select, Textarea } from "./ui";
import { useOrg, type FieldDef } from "./org-context";
import { date } from "@/lib/format";

export function CustomFieldInputs({ entity, values = {} }: { entity: FieldDef["entity"]; values?: Record<string, unknown> }) {
  const { fields } = useOrg();
  const list = fields.filter((f) => f.entity === entity);
  if (!list.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {list.map((f) => {
        const name = `cf_${f.key}`;
        const v = values[f.key];
        const sv = v == null ? "" : Array.isArray(v) ? "" : String(v);
        let input: React.ReactNode;
        switch (f.type) {
          case "TEXTAREA":
            input = <Textarea name={name} defaultValue={sv} required={f.required} />;
            break;
          case "NUMBER":
          case "CURRENCY":
            input = <Input name={name} type="number" step="any" defaultValue={sv} required={f.required} />;
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
            const arr = Array.isArray(v) ? (v as string[]) : sv ? [sv] : [];
            input = (
              <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-line p-2">
                <input type="hidden" name={name} value="" />
                {f.options.map((o) => (
                  <label key={o} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name={name} value={o} defaultChecked={arr.includes(o)} className="accent-brand" /> {o}
                  </label>
                ))}
              </div>
            );
            break;
          }
          case "BOOLEAN":
            input = (
              <Select name={name} defaultValue={sv}>
                <option value="">—</option>
                <option value="sim">Sim</option>
                <option value="não">Não</option>
              </Select>
            );
            break;
          default:
            input = (
              <Input
                name={name}
                type={f.type === "EMAIL" ? "email" : f.type === "URL" ? "url" : f.type === "PHONE" ? "tel" : "text"}
                defaultValue={sv}
                required={f.required}
              />
            );
        }
        return (
          <Field key={f.id} label={f.label + (f.required ? " *" : "")} className={f.type === "TEXTAREA" || f.type === "MULTISELECT" ? "sm:col-span-2" : undefined}>
            {input}
          </Field>
        );
      })}
    </div>
  );
}

export function CustomFieldValues({ entity, values }: { entity: FieldDef["entity"]; values: Record<string, unknown> }) {
  const { fields, fmt } = useOrg();
  const list = fields.filter((f) => f.entity === entity);
  if (!list.length) return null;
  return (
    <>
      {list.map((f) => {
        const v = values?.[f.key];
        let shown: React.ReactNode = "—";
        if (v != null && v !== "" && !(Array.isArray(v) && !v.filter(Boolean).length)) {
          if (Array.isArray(v)) shown = v.filter(Boolean).join(", ");
          else if (f.type === "CURRENCY") shown = fmt(Number(v));
          else if (f.type === "DATE") shown = date(String(v) + "T12:00:00");
          else if (f.type === "URL")
            shown = (
              <a href={String(v)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                {String(v)}
              </a>
            );
          else shown = String(v);
        }
        return <InfoRow key={f.id} label={f.label} value={shown} />;
      })}
    </>
  );
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 break-words">{value || "—"}</span>
    </div>
  );
}
