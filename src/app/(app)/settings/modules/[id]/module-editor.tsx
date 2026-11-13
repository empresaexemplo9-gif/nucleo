"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, GitBranch, ListChecks, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { ModuleIcon } from "@/components/module-icon";
import type { MField } from "@/components/record-fields";
import { useAction } from "@/components/use-action";
import { deleteModuleField, moveModuleField, saveModuleField, saveModuleStatuses, updateModule, type StatusInput } from "@/actions/modules";
import { FIELD_TYPES } from "@/lib/module-templates";
import { IconColorPicker } from "../modules-gallery";

const ROLES: [string, string][] = [
  ["VIEWER", "Todos (inclui visualizadores)"],
  ["SALES", "Usuários/Vendedores ou acima"],
  ["MANAGER", "Gestores ou acima"],
  ["ADMIN", "Somente administradores"],
];

type Mod = {
  id: string;
  key: string;
  name: string;
  singular: string;
  description: string | null;
  icon: string;
  color: string;
  prefix: string;
  group: string;
  minRoleView: string;
  minRoleEdit: string;
  dueFieldKey: string | null;
  amountFieldKey: string | null;
  records: number;
  fields: MField[];
  statuses: (StatusInput & { id: string })[];
};

export function ModuleEditor({ mod }: { mod: Mod }) {
  const { run, pending } = useAction();
  const [icon, setIcon] = useState(mod.icon);
  const [color, setColor] = useState(mod.color);
  const [edit, setEdit] = useState<MField | "new" | null>(null);
  const [type, setType] = useState("TEXT");
  const [statuses, setStatuses] = useState<StatusInput[]>(mod.statuses);
  const cur = edit === "new" ? null : edit;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/settings/modules" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface hover:text-fg">
          <ArrowLeft className="size-4" /> Módulos
        </Link>
        <Link href={`/m/${mod.key}`}>
          <Button variant="secondary" size="sm" trail={<ExternalLink className="size-3.5" />}>Abrir {mod.name}</Button>
        </Link>
      </div>

      {/* Geral */}
      <Card className="p-5">
        <CardHeader icon={<Settings2 />} title="Geral e permissões" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("icon", icon);
            fd.set("color", color);
            run(() => updateModule(mod.id, fd));
          }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-[12px] border border-line bg-surface-2" style={{ color }}>
              <ModuleIcon name={icon} className="size-6" />
            </span>
            <p className="text-sm text-muted">{mod.records} registro(s) · endereço <span className="font-mono">/m/{mod.key}</span></p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Nome (plural)"><Input name="name" required defaultValue={mod.name} /></Field>
            <Field label="Nome (singular)"><Input name="singular" required defaultValue={mod.singular} /></Field>
            <Field label="Prefixo do código"><Input name="prefix" maxLength={5} defaultValue={mod.prefix} /></Field>
            <Field label="Grupo no menu" hint="Módulos do mesmo grupo aparecem juntos"><Input name="group" defaultValue={mod.group} /></Field>
          </div>
          <Field label="Descrição"><Textarea name="description" rows={2} defaultValue={mod.description ?? ""} /></Field>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Quem pode ver">
              <Select name="minRoleView" defaultValue={mod.minRoleView}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            </Field>
            <Field label="Quem pode criar/editar">
              <Select name="minRoleEdit" defaultValue={mod.minRoleEdit}>{ROLES.filter(([v]) => v !== "VIEWER").map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            </Field>
            <Field label="Campo de prazo" hint="Usado em vencidos e alertas">
              <Select name="dueFieldKey" defaultValue={mod.dueFieldKey ?? ""}>
                <option value="">Nenhum</option>
                {mod.fields.filter((f) => f.type === "DATE").map((f) => <option key={f.id} value={f.key}>{f.label}</option>)}
              </Select>
            </Field>
            <Field label="Campo de valor" hint="Somado nos indicadores">
              <Select name="amountFieldKey" defaultValue={mod.amountFieldKey ?? ""}>
                <option value="">Nenhum</option>
                {mod.fields.filter((f) => f.type === "CURRENCY" || f.type === "NUMBER").map((f) => <option key={f.id} value={f.key}>{f.label}</option>)}
              </Select>
            </Field>
          </div>
          <IconColorPicker icon={icon} color={color} onIcon={setIcon} onColor={setColor} />
          <div className="flex justify-end">
            <Button trail loading={pending}>Salvar módulo</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-2">
        {/* Campos */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <CardHeader icon={<ListChecks />} title={`Campos · ${String(mod.fields.length).padStart(2, "0")}`} />
            <Button size="sm" onClick={() => { setType("TEXT"); setEdit("new"); }}><Plus className="size-4" /> Campo</Button>
          </div>
          <div className="divide-y divide-line rounded-[10px] border border-line">
            {mod.fields.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {f.label} {f.required && <span className="text-err">*</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {FIELD_TYPES[f.type] ?? f.type}
                    {f.options.length > 0 && ` · ${f.options.join(", ")}`}
                  </p>
                </div>
                <div className="hidden gap-1 sm:flex">
                  {f.showInList && <Badge>na lista</Badge>}
                  {f.key === mod.dueFieldKey && <Badge color="var(--warn)">prazo</Badge>}
                  {f.key === mod.amountFieldKey && <Badge color="var(--ok)">valor</Badge>}
                </div>
                <div className="flex">
                  <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => run(() => moveModuleField(mod.id, f.id, -1))} aria-label="Subir"><ArrowUp className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" disabled={i === mod.fields.length - 1} onClick={() => run(() => moveModuleField(mod.id, f.id, 1))} aria-label="Descer"><ArrowDown className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setType(f.type); setEdit(f); }} aria-label="Editar"><Pencil className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => confirm("Remover campo? Os valores preenchidos deixam de ser exibidos.") && run(() => deleteModuleField(mod.id, f.id))} aria-label="Excluir"><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
            ))}
            {!mod.fields.length && <EmptyState title="Nenhum campo" description="Ex.: Equipamento, Prioridade, Valor, Data limite, Cliente…" />}
          </div>
        </Card>

        {/* Status */}
        <Card className="p-5">
          <CardHeader icon={<GitBranch />} title="Fluxo de status" />
          <p className="mb-3 text-xs text-muted">A ordem define as colunas do quadro. Status finais encerram o registro (não contam como abertos nem vencidos).</p>
          <div className="space-y-2">
            {statuses.map((s, i) => (
              <div key={s.id ?? `n${i}`} className="flex items-center gap-2 rounded-[10px] border border-line p-2">
                <input type="color" value={s.color} aria-label="Cor" onChange={(e) => setStatuses(statuses.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} className="h-8 w-9 shrink-0 cursor-pointer rounded border border-line bg-transparent" />
                <Input value={s.name} onChange={(e) => setStatuses(statuses.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="min-w-0 flex-1" />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-fg-2">
                  <input type="checkbox" checked={s.isFinal} onChange={(e) => setStatuses(statuses.map((x, j) => (j === i ? { ...x, isFinal: e.target.checked } : x)))} className="accent-[var(--accent)]" /> Final
                </label>
                <div className="flex shrink-0">
                  <Button type="button" size="icon" variant="ghost" disabled={i === 0} aria-label="Subir" onClick={() => { const n = [...statuses]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; setStatuses(n); }}><ArrowUp className="size-3.5" /></Button>
                  <Button type="button" size="icon" variant="ghost" disabled={i === statuses.length - 1} aria-label="Descer" onClick={() => { const n = [...statuses]; [n[i + 1], n[i]] = [n[i]!, n[i + 1]!]; setStatuses(n); }}><ArrowDown className="size-3.5" /></Button>
                  <Button type="button" size="icon" variant="ghost" disabled={statuses.length <= 1} aria-label="Remover" onClick={() => setStatuses(statuses.filter((_, j) => j !== i))}><X className="size-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStatuses([...statuses, { name: "Novo status", color: "#7d828c", isFinal: false }])}><Plus className="size-4" /> Status</Button>
            <Button size="sm" loading={pending} onClick={() => run(() => saveModuleStatuses(mod.id, statuses))}>Salvar fluxo</Button>
          </div>
          <p className="mt-2 text-[11px] text-muted">Registros em status removidos passam para o primeiro status.</p>
        </Card>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={cur ? "Editar campo" : "Novo campo"}>
        <form
          key={cur?.id ?? "new"}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveModuleField(mod.id, cur?.id ?? null, new FormData(e.currentTarget)), { onSuccess: () => setEdit(null) });
          }}
          className="space-y-3"
        >
          <Field label="Nome do campo *"><Input name="label" required defaultValue={cur?.label} autoFocus /></Field>
          <Field label="Tipo">
            <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(FIELD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          {(type === "SELECT" || type === "MULTISELECT") && (
            <Field label="Opções" hint="Uma por linha">
              <Textarea name="options" defaultValue={cur?.options.join("\n")} required />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="required" defaultChecked={cur?.required} className="accent-[var(--accent)]" /> Preenchimento obrigatório
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showInList" defaultChecked={cur ? cur.showInList : true} className="accent-[var(--accent)]" /> Exibir como coluna na lista e no quadro
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button loading={pending}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
