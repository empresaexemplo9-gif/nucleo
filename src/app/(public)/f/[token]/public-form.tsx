"use client";
import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { MField } from "@/components/record-fields";
import { submitModuleForm } from "@/actions/public";

function Control({ f }: { f: MField }) {
  const name = `f_${f.key}`;
  switch (f.type) {
    case "TEXTAREA":
      return <Textarea name={name} required={f.required} rows={4} />;
    case "NUMBER":
      return <Input name={name} type="number" step="any" required={f.required} />;
    case "CURRENCY":
      return <Input name={name} inputMode="decimal" placeholder="0,00" required={f.required} />;
    case "DATE":
      return <Input name={name} type="date" required={f.required} />;
    case "DATETIME":
      return <Input name={name} type="datetime-local" required={f.required} />;
    case "SELECT":
      return (
        <Select name={name} defaultValue="" required={f.required}>
          <option value="">Selecione…</option>
          {f.options.map((o) => <option key={o}>{o}</option>)}
        </Select>
      );
    case "MULTISELECT":
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-[var(--radius-sm)] border border-line-strong p-2.5">
          {f.options.map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name={name} value={o} className="accent-[var(--accent)]" /> {o}</label>
          ))}
        </div>
      );
    case "BOOLEAN":
      return (
        <Select name={name} defaultValue="" required={f.required}>
          <option value="">—</option>
          <option value="sim">Sim</option>
          <option value="não">Não</option>
        </Select>
      );
    default:
      return <Input name={name} type={f.type === "EMAIL" ? "email" : f.type === "URL" ? "url" : f.type === "PHONE" ? "tel" : "text"} required={f.required} />;
  }
}

export function PublicForm({ token, fields }: { token: string; fields: MField[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  if (done)
    return (
      <div className="mt-8 flex items-start gap-3 rounded-[12px] border border-[color-mix(in_oklab,var(--ok)_40%,transparent)] bg-[color-mix(in_oklab,var(--ok)_8%,transparent)] p-5">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" />
        <p className="text-[15px]">{done}</p>
      </div>
    );
  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const r = await submitModuleForm(token, fd);
          if (r.ok) setDone(r.message ?? "Recebemos seu envio!");
          else setError(r.error);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Seu nome *" className="sm:col-span-2"><Input name="__name" required autoComplete="name" /></Field>
        <Field label="WhatsApp"><Input name="__phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" /></Field>
        <Field label="E-mail"><Input name="__email" type="email" autoComplete="email" /></Field>
        {fields.map((f) => (
          <Field key={f.id} label={f.label + (f.required ? " *" : "")} className={f.type === "TEXTAREA" || f.type === "MULTISELECT" ? "sm:col-span-2" : undefined}>
            <Control f={f} />
          </Field>
        ))}
      </div>
      {/* armadilha para robôs */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {error && <p className="rounded-md border border-[color-mix(in_oklab,var(--err)_40%,transparent)] p-2.5 text-sm text-err">{error}</p>}
      <p className="text-xs text-muted">Ao enviar, você autoriza o contato pelos meios informados. Para deixar de receber mensagens automáticas no WhatsApp, responda SAIR.</p>
      <div className="flex justify-end"><Button trail loading={pending}>Enviar</Button></div>
    </form>
  );
}
