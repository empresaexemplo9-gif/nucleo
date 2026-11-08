"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Tabs, Textarea } from "@/components/ui";
import { useOrg, type FieldDef } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { deleteCustomField, moveCustomField, saveCustomField } from "@/actions/settings";

const TYPES: Record<string, string> = {
  TEXT: "Texto curto",
  TEXTAREA: "Texto longo",
  NUMBER: "Número",
  CURRENCY: "Valor monetário",
  DATE: "Data",
  SELECT: "Lista de opções",
  MULTISELECT: "Múltipla escolha",
  BOOLEAN: "Sim / Não",
  URL: "Link",
  EMAIL: "E-mail",
  PHONE: "Telefone",
};

export function FieldsEditor() {
  const { fields, labels } = useOrg();
  const [entity, setEntity] = useState<FieldDef["entity"]>("DEAL");
  const [edit, setEdit] = useState<FieldDef | "new" | null>(null);
  const [type, setType] = useState("TEXT");
  const { run, pending } = useAction();
  const list = fields.filter((f) => f.entity === entity);
  const cur = edit === "new" ? null : edit;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Campos personalizados</h2>
          <p className="text-sm text-muted">Capture as informações específicas do seu negócio em cada cadastro.</p>
        </div>
        <Button onClick={() => { setType("TEXT"); setEdit("new"); }}><Plus className="size-4" /> Novo campo</Button>
      </div>
      <Tabs
        value={entity}
        onChange={setEntity}
        items={[
          { value: "DEAL", label: labels.deal.plural },
          { value: "CONTACT", label: labels.contact.plural },
          { value: "COMPANY", label: labels.company.plural },
        ]}
      />
      <div className="mt-4 divide-y divide-line rounded-lg border border-line">
        {list.map((f, i) => (
          <div key={f.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{f.label} {f.required && <span className="text-red-500">*</span>}</p>
              <p className="text-xs text-muted">
                {TYPES[f.type]}
                {f.options.length > 0 && ` · ${f.options.join(", ")}`}
              </p>
            </div>
            <Badge>{f.key}</Badge>
            <div className="flex">
              <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => run(() => moveCustomField(f.id, -1))} aria-label="Subir"><ArrowUp className="size-3.5" /></Button>
              <Button size="icon" variant="ghost" disabled={i === list.length - 1} onClick={() => run(() => moveCustomField(f.id, 1))} aria-label="Descer"><ArrowDown className="size-3.5" /></Button>
              <Button size="icon" variant="ghost" onClick={() => { setType(f.type); setEdit(f); }} aria-label="Editar"><Pencil className="size-3.5" /></Button>
              <Button size="icon" variant="ghost" onClick={() => confirm("Remover campo? Os valores já preenchidos deixam de ser exibidos.") && run(() => deleteCustomField(f.id))} aria-label="Excluir"><Trash2 className="size-3.5" /></Button>
            </div>
          </div>
        ))}
        {!list.length && <EmptyState title="Nenhum campo personalizado" description="Ex.: CPF, Tipo de imóvel, Curso de interesse, Plano contratado…" />}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={cur ? "Editar campo" : "Novo campo"}>
        <form
          key={cur?.id ?? "new"}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("entity", entity);
            run(() => saveCustomField(cur?.id ?? null, fd), { onSuccess: () => setEdit(null) });
          }}
          className="space-y-3"
        >
          <Field label="Nome do campo *"><Input name="label" required defaultValue={cur?.label} autoFocus /></Field>
          <Field label="Tipo">
            <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          {(type === "SELECT" || type === "MULTISELECT") && (
            <Field label="Opções" hint="Uma por linha">
              <Textarea name="options" defaultValue={cur?.options.join("\n")} required />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="required" defaultChecked={cur?.required} className="accent-brand" /> Preenchimento obrigatório
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button loading={pending}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
