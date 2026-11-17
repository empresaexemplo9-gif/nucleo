"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bell, Clock, MessageCircle, Pencil, Plus, Sparkles, Trash2, Zap } from "lucide-react";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { MemberSelect } from "@/components/pickers";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { deleteAutomation, saveAutomation, toggleAutomation } from "@/actions/settings";
import { ACTIVITY_TYPES, LIFECYCLES } from "@/lib/defaults";
import { ACTIONS, actionsFor, TRIGGERS, VARIABLES, type AutomationTrigger } from "@/lib/automation-defs";

type Cfg = Record<string, string | number | boolean | null | undefined>;
type A = { id: string; name: string; trigger: string; stageId: string | null; action: string; active: boolean; config: Cfg };

const TEMPLATES: (Omit<A, "id" | "active"> & { icon: "wa" | "bell" | "zap" })[] = [
  { icon: "wa", name: "Lembrete de compromisso (1 dia antes)", trigger: "ACTIVITY_REMINDER", stageId: null, action: "SEND_WHATSAPP", config: { hoursBefore: 24, reminderType: "MEETING", message: "Olá, {nome}! Passando para lembrar do nosso compromisso: {titulo}, {data} às {hora}. Podemos confirmar?" } },
  { icon: "wa", name: "Follow-up de proposta sem resposta", trigger: "PROPOSAL_PENDING", stageId: null, action: "SEND_WHATSAPP", config: { days: 2, message: "Olá, {nome}! Conseguiu avaliar a proposta que enviamos? Fico à disposição para tirar qualquer dúvida. {link}" } },
  { icon: "wa", name: "Boas-vindas ao novo lead", trigger: "DEAL_CREATED", stageId: null, action: "SEND_WHATSAPP", config: { delayValue: 0, delayUnit: "MIN", message: "Olá, {nome}! Aqui é {responsavel}, da {empresa}. Recebemos seu contato e já vamos te atender. 🙂" } },
  { icon: "wa", name: "Mensagem ao fechar negócio", trigger: "DEAL_WON", stageId: null, action: "SEND_WHATSAPP", config: { delayValue: 0, delayUnit: "MIN", message: "{nome}, seja bem-vindo(a) à {empresa}! 🎉 Em breve entraremos em contato com os próximos passos." } },
  { icon: "wa", name: "Lembrete de vencimento", trigger: "RECORD_DUE", stageId: null, action: "SEND_WHATSAPP", config: { when: "BEFORE", days: 1, message: "Olá, {nome}! Lembrete da {empresa}: {titulo} vence em {data}." } },
  { icon: "wa", name: "Parabéns pelo aniversário", trigger: "CONTACT_BIRTHDAY", stageId: null, action: "SEND_WHATSAPP", config: { message: "Feliz aniversário, {nome}! 🎂 A equipe da {empresa} deseja um dia incrível para você." } },
  { icon: "wa", name: "Confirmação de agendamento (24h antes)", trigger: "RECORD_DUE", stageId: null, action: "SEND_WHATSAPP", config: { dueUnit: "HOUR", hoursBefore: 24, message: "Olá, {nome}! Confirmando seu horário na {empresa}: {data} às {hora}. Responda *SIM* para confirmar ou nos avise se precisar remarcar." } },
  { icon: "wa", name: "Pesquisa de satisfação ao concluir", trigger: "RECORD_STATUS", stageId: null, action: "SEND_WHATSAPP", config: { statusName: "Concluída", message: "Olá, {nome}! O serviço {codigo} foi concluído. De 0 a 10, quanto você recomendaria a {empresa}? Sua opinião nos ajuda muito. 🙏" } },
  { icon: "bell", name: "Avisar a equipe sobre novo registro", trigger: "RECORD_CREATED", stageId: null, action: "NOTIFY_TEAM", config: { notifyTo: "BOTH", title: "Novo registro: {codigo} · {titulo}" } },
  { icon: "bell", name: "Avisar sobre negócio parado", trigger: "DEAL_STALE", stageId: null, action: "NOTIFY_TEAM", config: { days: 7, notifyTo: "BOTH", title: "Negócio parado há 7 dias: {negocio}", note: "Retome o contato com {nome_completo}." } },
  { icon: "zap", name: "Follow-up após proposta", trigger: "DEAL_STAGE_ENTERED", stageId: null, action: "CREATE_ACTIVITY", config: { activityType: "CALL", title: "Follow-up da proposta: {negocio}", daysOffset: 2 } },
];

const s = (v: unknown, d = "") => (v == null || v === "" ? d : String(v));

type ModOpt = { key: string; name: string; statuses: string[]; fields: string[]; hasTime: boolean };

export function AutomationsManager({ automations, whatsapp, modules }: { automations: A[]; whatsapp: boolean; modules: ModOpt[] }) {
  const { pipelines, tags } = useOrg();
  const [modKey, setModKey] = useState("");
  const [dueUnit, setDueUnit] = useState("DAY");
  const { run, pending } = useAction();
  const [edit, setEdit] = useState<Partial<A> | null>(null);
  const [trigger, setTrigger] = useState("DEAL_CREATED");
  const [action, setAction] = useState("CREATE_ACTIVITY");
  const [gallery, setGallery] = useState(false);
  const stages = pipelines.flatMap((p) => p.stages.filter((st) => st.type === "OPEN").map((st) => ({ ...st, pipeline: p.name })));
  const stageName = (id: string | null) => stages.find((st) => st.id === id)?.name;
  const open = (a: Partial<A>) => {
    setModKey(String(a.config?.moduleKey ?? ""));
    setDueUnit(String(a.config?.dueUnit ?? (a.trigger === "RECORD_DUE" && modules.find((m) => m.key === a.config?.moduleKey)?.hasTime ? "HOUR" : "DAY")));
    setTrigger(a.trigger ?? "DEAL_CREATED");
    setAction(a.action ?? "SEND_WHATSAPP");
    setEdit(a);
    setGallery(false);
  };
  const pickTrigger = (t: string) => {
    setTrigger(t);
    if (!actionsFor(t).includes(action as never)) setAction(actionsFor(t)[0]!);
  };
  const c = edit?.config ?? {};
  const mod = modules.find((m) => m.key === modKey);
  const moduleSelect = (anyLabel: string, required = false) => (
    <Select name="moduleKey" value={modKey} onChange={(e) => setModKey(e.target.value)} required={required}>
      <option value="">{anyLabel}</option>
      {modules.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
    </Select>
  );
  const scheduled = TRIGGERS[trigger as AutomationTrigger]?.scheduled;
  const groups = [...new Set(Object.values(TRIGGERS).map((t) => t.group))];
  const usesWhatsapp = automations.some((a) => a.action === "SEND_WHATSAPP");
  const summary = (a: A) =>
    a.action === "SEND_WHATSAPP" ? s(a.config.message) : a.config.title ? s(a.config.title) : a.config.tag ? s(a.config.tag) : "";
  const templateButtons = (
    <div className="grid gap-2 sm:grid-cols-2">
      {TEMPLATES.map((t) => (
        <button key={t.name} type="button" onClick={() => open(t)} className="flex items-start gap-2.5 rounded-lg border border-line p-3 text-left text-sm transition hover:border-line-strong hover:bg-tint">
          {t.icon === "wa" ? <MessageCircle className="mt-0.5 size-4 shrink-0 text-ok" /> : t.icon === "bell" ? <Bell className="mt-0.5 size-4 shrink-0 text-warn" /> : <Zap className="mt-0.5 size-4 shrink-0 text-warn" />}
          <span>
            <span className="block font-medium">{t.name}</span>
            <span className="block text-xs text-muted">{TRIGGERS[t.trigger as AutomationTrigger].label.replace("…", "")} → {ACTIONS[t.action as keyof typeof ACTIONS]}</span>
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Automações</h2>
          <p className="text-sm text-muted">Lembretes, notificações e follow-ups que trabalham por você — no sistema e direto no WhatsApp do cliente.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setGallery(true)}><Sparkles className="size-4" /> Modelos</Button>
          <Button onClick={() => open({})}><Plus className="size-4" /> Nova automação</Button>
        </div>
      </div>
      {!whatsapp && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-2 p-3 text-sm">
          <MessageCircle className="size-4 text-ok" />
          <span className="min-w-0 flex-1">{usesWhatsapp ? "Há automações de WhatsApp, mas o número da empresa ainda não está conectado: as mensagens não serão enviadas." : "Conecte o WhatsApp da empresa para enviar lembretes e follow-ups direto aos clientes."}</span>
          <Link href="/settings/whatsapp"><Button size="sm" variant="secondary">Conectar WhatsApp</Button></Link>
        </div>
      )}
      <div className="space-y-2">
        {automations.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3">
            {a.action === "SEND_WHATSAPP" ? <MessageCircle className={a.active ? "size-4 text-ok" : "size-4 text-muted"} /> : TRIGGERS[a.trigger as AutomationTrigger]?.scheduled ? <Clock className={a.active ? "size-4 text-warn" : "size-4 text-muted"} /> : <Zap className={a.active ? "size-4 text-warn" : "size-4 text-muted"} />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{a.name}</p>
              <p className="flex flex-wrap items-center gap-1 text-xs text-muted">
                {(TRIGGERS[a.trigger as AutomationTrigger]?.label ?? a.trigger).replace("…", "").replace("X dias", `${s(a.config.days, "1")} dia(s)`)} {a.stageId && <b>{stageName(a.stageId)}</b>} <ArrowRight className="size-3" /> {ACTIONS[a.action as keyof typeof ACTIONS] ?? a.action}
              </p>
              {summary(a) && <p className="mt-0.5 truncate text-xs text-fg-2">{summary(a)}</p>}
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs">
              <input type="checkbox" checked={a.active} onChange={(e) => run(() => toggleAutomation(a.id, e.target.checked))} className="accent-brand" /> Ativa
            </label>
            <Button size="icon" variant="ghost" onClick={() => open(a)} aria-label="Editar"><Pencil className="size-3.5" /></Button>
            <Button size="icon" variant="ghost" onClick={() => confirm("Excluir automação?") && run(() => deleteAutomation(a.id))} aria-label="Excluir"><Trash2 className="size-3.5" /></Button>
          </div>
        ))}
        {!automations.length && <EmptyState icon={<Sparkles className="size-6" />} title="Nenhuma automação" description="Comece com um modelo pronto e ajuste o texto:" action={<div className="max-w-2xl text-left">{templateButtons}</div>} />}
      </div>

      <Modal open={gallery} onClose={() => setGallery(false)} title="Modelos de automação" description="Escolha um ponto de partida e ajuste antes de salvar." wide>
        {templateButtons}
      </Modal>

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
            <Select name="trigger" value={trigger} onChange={(e) => pickTrigger(e.target.value)}>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {Object.entries(TRIGGERS).filter(([, v]) => v.group === g).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </optgroup>
              ))}
            </Select>
            <div className="mt-2 space-y-2 text-sm">
              {(trigger === "DEAL_STAGE_ENTERED" || trigger === "DEAL_STALE") && (
                <Select name="stageId" defaultValue={edit?.stageId ?? ""} required={trigger === "DEAL_STAGE_ENTERED"}>
                  <option value="">{trigger === "DEAL_STALE" ? "Em qualquer etapa" : "Selecione a etapa…"}</option>
                  {stages.map((st) => <option key={st.id} value={st.id}>{st.pipeline} → {st.name}</option>)}
                </Select>
              )}
              {(trigger === "DEAL_STALE" || trigger === "PROPOSAL_PENDING") && (
                <div className="flex items-center gap-2">
                  após <Input name="days" type="number" min={1} max={365} defaultValue={s(c.days, "2")} className="w-20" /> dia(s) {trigger === "DEAL_STALE" ? "na mesma etapa" : "do envio, sem aceite nem recusa"}
                </div>
              )}
              {trigger === "ACTIVITY_REMINDER" && (
                <>
                  <Select name="reminderType" defaultValue={s(c.reminderType, "ANY")}>
                    <option value="ANY">Qualquer atividade com cliente</option>
                    {Object.entries(ACTIVITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </Select>
                  <div className="flex items-center gap-2">
                    <Input name="hoursBefore" type="number" min={1} max={168} defaultValue={s(c.hoursBefore, "24")} className="w-20" /> hora(s) antes do horário marcado
                  </div>
                  <p className="text-xs text-muted">Vale para atividades não concluídas que tenham um contato vinculado. Se o compromisso for remarcado, o lembrete acompanha.</p>
                </>
              )}
              {trigger === "RECORD_DUE" && (
                <>
                  {moduleSelect("Qualquer módulo com data")}
                  <div className="flex flex-wrap items-center gap-2">
                    <Select name="dueUnit" value={dueUnit} onChange={(e) => setDueUnit(e.target.value)} className="w-auto">
                      <option value="DAY">Por dia (vencimentos)</option>
                      <option value="HOUR">Por hora (horários marcados)</option>
                    </Select>
                  </div>
                  {dueUnit === "HOUR" ? (
                    <div className="flex items-center gap-2">
                      <Input name="hoursBefore" type="number" min={1} max={168} defaultValue={s(c.hoursBefore, "24")} className="w-20" /> hora(s) antes do horário marcado
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input name="days" type="number" min={0} max={365} defaultValue={s(c.days, "1")} className="w-20" /> dia(s)
                      <Select name="when" defaultValue={s(c.when, "BEFORE")} className="w-auto">
                        <option value="BEFORE">antes da data</option>
                        <option value="ON">— no próprio dia</option>
                        <option value="AFTER">depois da data (em atraso)</option>
                      </Select>
                    </div>
                  )}
                  <p className="text-xs text-muted">
                    {dueUnit === "HOUR" ? "Ideal para consultas, visitas, aulas e audiências. Se o horário mudar ou o registro for concluído, o lembrete é cancelado." : "Considera registros em aberto com contato vinculado. Dispara uma vez por registro, pela manhã."}
                    {mod && <> Variáveis deste módulo: {mod.fields.map((k) => <code key={k} className="mr-1 rounded bg-tint px-1">{`{${k}}`}</code>)}</>}
                  </p>
                </>
              )}
              {(trigger === "RECORD_CREATED" || trigger === "RECORD_STATUS") && (
                <>
                  {moduleSelect(trigger === "RECORD_STATUS" ? "Selecione o módulo…" : "Qualquer módulo", trigger === "RECORD_STATUS")}
                  {trigger === "RECORD_STATUS" && (
                    <Select name="statusName" defaultValue={s(c.statusName)} required key={modKey}>
                      <option value="">Selecione o status…</option>
                      {(mod?.statuses ?? []).map((st) => <option key={st} value={st}>{st}</option>)}
                    </Select>
                  )}
                  {mod && <p className="text-xs text-muted">Variáveis deste módulo: {[...mod.fields, "codigo", "status"].map((k) => <code key={k} className="mr-1 rounded bg-tint px-1">{`{${k}}`}</code>)}</p>}
                </>
              )}
              {trigger === "CONTACT_BIRTHDAY" && <p className="text-xs text-muted">Dispara uma vez por ano, na manhã do aniversário cadastrado no contato.</p>}
            </div>
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted">Então</p>
            <Select name="action" value={action} onChange={(e) => setAction(e.target.value)}>
              {actionsFor(trigger).map((k) => <option key={k} value={k}>{ACTIONS[k]}</option>)}
            </Select>
            <div className="mt-2 space-y-2">
              {action === "SEND_WHATSAPP" && (
                <>
                  <Textarea name="message" required rows={4} defaultValue={s(c.message)} placeholder="Olá, {nome}! …" />
                  <p className="text-xs text-muted">
                    Variáveis: {Object.entries(VARIABLES).map(([k, v]) => <code key={k} title={v} className="mr-1.5 cursor-help rounded bg-tint px-1">{`{${k}}`}</code>)}
                  </p>
                  {!scheduled && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      Enviar após <Input name="delayValue" type="number" min={0} defaultValue={s(c.delayValue, "0")} className="w-20" />
                      <Select name="delayUnit" defaultValue={s(c.delayUnit, "MIN")} className="w-auto">
                        <option value="MIN">minuto(s)</option>
                        <option value="HOUR">hora(s)</option>
                        <option value="DAY">dia(s)</option>
                      </Select>
                      <span className="text-xs text-muted">(0 = na hora)</span>
                    </div>
                  )}
                  {!scheduled && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="stopOnReply" defaultChecked={!!c.stopOnReply} className="accent-brand" /> Não enviar se o cliente responder antes
                    </label>
                  )}
                  {trigger === "DEAL_STAGE_ENTERED" && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="whileInStage" defaultChecked={c.whileInStage !== false} className="accent-brand" /> Só enviar se o negócio ainda estiver nesta etapa
                    </label>
                  )}
                  <details className="rounded-lg border border-line p-2.5 text-sm" open={!!c.templateName}>
                    <summary className="cursor-pointer font-medium">Modelo aprovado na Meta (primeiro contato)</summary>
                    <p className="my-2 text-xs text-muted">
                      O WhatsApp só permite texto livre se o cliente tiver escrito nas últimas 24 horas. Fora disso, a mensagem precisa ser um modelo aprovado no Gerenciador do WhatsApp. Informe o nome do modelo e as variáveis que preenchem {"{{1}}"}, {"{{2}}"}… na ordem.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <Input name="templateName" defaultValue={s(c.templateName)} placeholder="nome_do_modelo" className="col-span-2" />
                      <Input name="templateLang" defaultValue={s(c.templateLang, "pt_BR")} placeholder="pt_BR" />
                    </div>
                    <Input name="templateParams" defaultValue={s(c.templateParams)} placeholder="Variáveis na ordem, ex.: nome, titulo, data" className="mt-2" />
                  </details>
                </>
              )}
              {action === "NOTIFY_TEAM" && (
                <>
                  <Select name="notifyTo" defaultValue={s(c.notifyTo, "OWNER")}>
                    <option value="OWNER">Responsável pelo cliente (ou gestores, se não houver)</option>
                    <option value="MANAGERS">Gestores e administradores</option>
                    <option value="BOTH">Responsável e gestores</option>
                  </Select>
                  <Input name="title" defaultValue={s(c.title)} placeholder="Título do aviso (aceita variáveis, ex.: {negocio})" required />
                  <Textarea name="note" defaultValue={s(c.note)} placeholder="Detalhe (opcional)" />
                </>
              )}
              {action === "CREATE_ACTIVITY" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Select name="activityType" defaultValue={s(c.activityType, "TASK")}>
                      {Object.entries(ACTIVITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Select>
                    <div className="flex items-center gap-2 text-sm">
                      em <Input name="daysOffset" type="number" min={0} defaultValue={s(c.daysOffset, "1")} className="w-20" /> dia(s)
                    </div>
                  </div>
                  <Input name="title" defaultValue={s(c.title)} placeholder="Título (use {negocio} para o nome do negócio)" />
                </>
              )}
              {action === "ADD_TAG" && <Input name="tag" list="tags-list" defaultValue={s(c.tag)} placeholder="Etiqueta" required />}
              {action === "SET_OWNER" && <MemberSelect name="ownerId" defaultValue={s(c.ownerId)} />}
              {action === "ADD_NOTE" && <Textarea name="note" defaultValue={s(c.note)} placeholder="Texto da nota (ex.: checklist da etapa)" required />}
              {action === "SET_LIFECYCLE" && (
                <Select name="lifecycle" defaultValue={s(c.lifecycle, "customer")}>
                  {LIFECYCLES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </Select>
              )}
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
