"use client";
import { useState } from "react";
import { ArrowRight, Pencil, Plus, Sparkles, Trash2, Zap } from "lucide-react";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { MemberSelect } from "@/components/pickers";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { deleteAutomation, saveAutomation, toggleAutomation } from "@/actions/settings";
import { ACTIVITY_TYPES, LIFECYCLES } from "@/lib/defaults";
import type { WaTemplate } from "@/lib/whatsapp/config";

const TRIGGERS: Record<string, string> = {
  DEAL_CREATED: "Negócio criado",
  DEAL_STAGE_ENTERED: "Negócio entrou na etapa…",
  DEAL_WON: "Negócio ganho",
  DEAL_LOST: "Negócio perdido",
};
const ACTIONS: Record<string, string> = {
  CREATE_ACTIVITY: "Criar atividade",
  ADD_TAG: "Adicionar etiqueta",
  SET_OWNER: "Definir responsável",
  ADD_NOTE: "Adicionar nota",
  SET_LIFECYCLE: "Alterar ciclo de vida do contato",
  SEND_WHATSAPP: "Enviar WhatsApp",
};

type A = { id: string; name: string; trigger: string; stageId: string | null; action: string; active: boolean; config: Record<string, string | number | boolean | null> };

const TEMPLATES: Omit<A, "id" | "active">[] = [
  { name: "Follow-up após proposta", trigger: "DEAL_STAGE_ENTERED", stageId: null, action: "CREATE_ACTIVITY", config: { activityType: "CALL", title: "Follow-up da proposta: {negocio}", daysOffset: 2 } },
  { name: "Boas-vindas ao novo cliente", trigger: "DEAL_WON", stageId: null, action: "CREATE_ACTIVITY", config: { activityType: "MEETING", title: "Reunião de onboarding: {negocio}", daysOffset: 1 } },
  { name: "Primeiro contato com lead", trigger: "DEAL_CREATED", stageId: null, action: "CREATE_ACTIVITY", config: { activityType: "WHATSAPP", title: "Primeiro contato: {negocio}", daysOffset: 0 } },
];

const WA_TEMPLATES: Omit<A, "id" | "active">[] = [
  { name: "Boas-vindas no WhatsApp", trigger: "DEAL_CREATED", stageId: null, action: "SEND_WHATSAPP", config: { waParams: "{primeiro_nome} | {empresa}", waText: "Olá, {primeiro_nome}! Aqui é {consultor}, da {empresa}. Recebi seu contato e já vou te ajudar 😊", delayHours: 0 } },
  { name: "Follow-up 2 dias após a proposta", trigger: "DEAL_STAGE_ENTERED", stageId: null, action: "SEND_WHATSAPP", config: { waParams: "{primeiro_nome} | {negocio}", waText: "Oi, {primeiro_nome}! Conseguiu avaliar a proposta de {negocio}? Fico à disposição para qualquer dúvida.", delayHours: 48, skipIfReplied: true } },
  { name: "Agradecimento pela compra", trigger: "DEAL_WON", stageId: null, action: "SEND_WHATSAPP", config: { waParams: "{primeiro_nome}", waText: "{primeiro_nome}, muito obrigado pela confiança! Qualquer coisa, é só chamar por aqui.", delayHours: 1 } },
];

export function AutomationsManager({ automations, whatsapp }: { automations: A[]; whatsapp: { templates: WaTemplate[] } | null }) {
  const { pipelines, tags } = useOrg();
  const { run, pending } = useAction();
  const [edit, setEdit] = useState<Partial<A> | null>(null);
  const [trigger, setTrigger] = useState("DEAL_CREATED");
  const [action, setAction] = useState("CREATE_ACTIVITY");
  const stages = pipelines.flatMap((p) => p.stages.filter((s) => s.type === "OPEN").map((s) => ({ ...s, pipeline: p.name })));
  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name;
  const open = (a: Partial<A>) => {
    setTrigger(a.trigger ?? "DEAL_CREATED");
    setAction(a.action ?? "CREATE_ACTIVITY");
    setEdit(a);
  };
  const c = edit?.config ?? {};

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Automações</h2>
          <p className="text-sm text-muted">Regras “quando… então…” que trabalham por você e garantem que nenhum lead fique sem follow-up.</p>
        </div>
        <Button onClick={() => open({})}><Plus className="size-4" /> Nova automação</Button>
      </div>
      <div className="space-y-2">
        {automations.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3">
            <Zap className={a.active ? "size-4 text-warn" : "size-4 text-muted"} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{a.name}</p>
              <p className="flex flex-wrap items-center gap-1 text-xs text-muted">
                {TRIGGERS[a.trigger]?.replace("…", "")} {a.stageId && <b>{stageName(a.stageId)}</b>} <ArrowRight className="size-3" /> {ACTIONS[a.action]}
                {a.config.title ? `: ${a.config.title}` : a.config.tag ? `: ${a.config.tag}` : ""}
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs">
              <input type="checkbox" checked={a.active} onChange={(e) => run(() => toggleAutomation(a.id, e.target.checked))} className="accent-brand" /> Ativa
            </label>
            <Button size="icon" variant="ghost" onClick={() => open(a)} aria-label="Editar"><Pencil className="size-3.5" /></Button>
            <Button size="icon" variant="ghost" onClick={() => confirm("Excluir automação?") && run(() => deleteAutomation(a.id))} aria-label="Excluir"><Trash2 className="size-3.5" /></Button>
          </div>
        ))}
        {!automations.length && (
          <EmptyState icon={<Sparkles className="size-6" />} title="Nenhuma automação" description="Comece com um modelo:" action={
            <div className="flex flex-wrap justify-center gap-2">
              {[...TEMPLATES, ...(whatsapp ? WA_TEMPLATES : [])].map((t) => (
                <Button key={t.name} variant="secondary" size="sm" onClick={() => open(t)}>{t.name}</Button>
              ))}
            </div>
          } />
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar automação" : "Nova automação"}>
        <form
          key={edit?.id ?? edit?.name ?? "new"}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => saveAutomation(edit?.id ?? null, fd), { onSuccess: () => setEdit(null) });
          }}
          className="space-y-3"
        >
          <Field label="Nome"><Input name="name" required defaultValue={edit?.name} autoFocus /></Field>
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted">Quando</p>
            <Select name="trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
              {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            {trigger === "DEAL_STAGE_ENTERED" && (
              <Select name="stageId" defaultValue={edit?.stageId ?? ""} className="mt-2" required>
                <option value="">Selecione a etapa…</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.pipeline} → {s.name}</option>)}
              </Select>
            )}
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted">Então</p>
            <Select name="action" value={action} onChange={(e) => setAction(e.target.value)}>
              {Object.entries(ACTIONS)
                .filter(([k]) => k !== "SEND_WHATSAPP" || whatsapp || action === k)
                .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <div className="mt-2 space-y-2">
              {action === "CREATE_ACTIVITY" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Select name="activityType" defaultValue={String(c.activityType ?? "TASK")}>
                      {Object.entries(ACTIVITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Select>
                    <Field label="" className="-mt-1">
                      <div className="flex items-center gap-2 text-sm">
                        em <Input name="daysOffset" type="number" min={0} defaultValue={String(c.daysOffset ?? 1)} className="w-20" /> dia(s)
                      </div>
                    </Field>
                  </div>
                  <Input name="title" defaultValue={String(c.title ?? "")} placeholder="Título (use {negocio} para o nome do negócio)" />
                </>
              )}
              {action === "ADD_TAG" && (
                <Input name="tag" list="tags-list" defaultValue={String(c.tag ?? "")} placeholder="Etiqueta" required />
              )}
              {action === "SET_OWNER" && <MemberSelect name="ownerId" defaultValue={String(c.ownerId ?? "")} />}
              {action === "ADD_NOTE" && <Textarea name="note" defaultValue={String(c.note ?? "")} placeholder="Texto da nota (ex.: checklist da etapa)" required />}
              {action === "SET_LIFECYCLE" && (
                <Select name="lifecycle" defaultValue={String(c.lifecycle ?? "customer")}>
                  {LIFECYCLES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </Select>
              )}
              {action === "SEND_WHATSAPP" && <WhatsAppFields c={c} templates={whatsapp?.templates ?? []} />}
              <datalist id="tags-list">{tags.map((t) => <option key={t.name} value={t.name} />)}</datalist>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button loading={pending}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

function WhatsAppFields({ c, templates }: { c: A["config"]; templates: WaTemplate[] }) {
  const [tpl, setTpl] = useState(String(c.waTemplate ?? templates[0]?.name ?? ""));
  const t = templates.find((x) => x.name === tpl);
  return (
    <div className="space-y-2 text-sm">
      <Field label="Mensagem (enviada se o cliente falou com a empresa nas últimas 24h)">
        <Textarea name="waText" rows={3} defaultValue={String(c.waText ?? "")} placeholder="Olá, {primeiro_nome}! …" />
      </Field>
      <Field label="Modelo aprovado (usado fora da janela de 24h, exigência da Meta)">
        <Select name="waTemplate" value={tpl} onChange={(e) => setTpl(e.target.value)}>
          <option value="">Sem modelo (só envia dentro da janela)</option>
          {templates.map((x) => <option key={x.name} value={x.name}>{x.label}</option>)}
        </Select>
      </Field>
      {t && (
        <>
          {t.body && <p className="whitespace-pre-wrap rounded-md border border-line bg-[var(--surface-1)] p-2 text-xs text-fg-2">{t.body}</p>}
          {t.params > 0 && (
            <Field label={`Variáveis do modelo ({{1}} a {{${t.params}}}), separadas por |`}>
              <Input name="waParams" defaultValue={String(c.waParams ?? "")} placeholder="{primeiro_nome} | {negocio}" />
            </Field>
          )}
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        Enviar <Input name="delayHours" type="number" min={0} max={2160} defaultValue={String(c.delayHours ?? 0)} className="w-20" /> hora(s) depois
        <span className="text-xs text-muted">(0 = na hora)</span>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" name="skipIfReplied" defaultChecked={!!c.skipIfReplied} className="accent-brand" /> Não enviar se o cliente responder antes (follow-up)
      </label>
      <p className="text-xs text-muted">Variáveis: {"{nome}"}, {"{primeiro_nome}"}, {"{empresa}"}, {"{negocio}"}, {"{consultor}"}, {"{valor}"}. O número vem do WhatsApp ou telefone do contato do negócio.</p>
    </div>
  );
}
