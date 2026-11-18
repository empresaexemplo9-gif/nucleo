"use client";
import { useState } from "react";
import { Bot, Copy, KeyRound, MessageCircle, Plus, RefreshCw, Send, Sparkles, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Tabs, Textarea } from "@/components/ui";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import {
  rotateVerifyToken,
  saveWhatsAppBot,
  saveWhatsAppChannel,
  saveWhatsAppTemplates,
  syncWhatsAppTemplates,
  testWhatsAppChannel,
} from "@/actions/whatsapp";
import { countParams, type BotConfig, type MenuOption, type WaTemplate } from "@/lib/whatsapp/config";
import { dateTime } from "@/lib/format";

type ChannelInfo = { phoneNumberId: string; wabaId: string | null; displayPhone: string | null; active: boolean; hasAppSecret: boolean; verifyToken: string | null } | null;
type Job = { id: string; to: string; contact: string | null; status: string; error: string | null; sendAt: string; what: string };

const JOB_STATUS: Record<string, [string, string]> = {
  PENDING: ["Agendado", "var(--warn)"],
  SENDING: ["Enviando", "var(--warn)"],
  SENT: ["Enviado", "var(--ok)"],
  SKIPPED: ["Cliente respondeu antes", "var(--text-mute)"],
  FAILED: ["Falhou", "var(--err)"],
};

export function WhatsAppSettings(props: {
  superadmin: boolean;
  aiReady: boolean;
  cronReady: boolean;
  webhookUrl: string;
  channel: ChannelInfo;
  bot: BotConfig;
  templates: WaTemplate[];
  jobs: Job[];
  counts: Record<string, number>;
}) {
  const { channel, superadmin } = props;
  const [tab, setTab] = useState<"conexao" | "chatbot" | "modelos" | "envios">(channel ? "chatbot" : "conexao");
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <CardHeader
          icon={<MessageCircle />}
          title="WhatsApp e chatbot"
          description="API oficial da Meta: atendimento inicial automático, caixa de atendimento da equipe e envios das automações."
          action={channel ? <Badge color={channel.active ? "var(--ok)" : "var(--warn)"} dot>{channel.active ? channel.displayPhone || "Conectado" : "Pausado"}</Badge> : <Badge color="var(--warn)" dot>Não conectado</Badge>}
        />
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "conexao", label: "Conexão" },
            { value: "chatbot", label: "Chatbot" },
            { value: "modelos", label: `Modelos (${props.templates.length})` },
            { value: "envios", label: "Envios agendados" },
          ]}
        />
      </Card>
      {tab === "conexao" && (superadmin ? <Connection {...props} /> : <Card className="p-5 text-sm text-muted">A conexão do número é feita pela equipe da plataforma na implantação. {channel ? `Número conectado: ${channel.displayPhone ?? channel.phoneNumberId}.` : "Ainda não há número conectado."}</Card>)}
      {tab === "chatbot" && (channel ? <BotEditor bot={props.bot} aiReady={props.aiReady} /> : <NeedsChannel />)}
      {tab === "modelos" && (channel ? <Templates templates={props.templates} hasWaba={!!channel.wabaId} /> : <NeedsChannel />)}
      {tab === "envios" && <Jobs jobs={props.jobs} counts={props.counts} cronReady={props.cronReady} />}
    </div>
  );
}

function NeedsChannel() {
  return <Card className="p-5 text-sm text-muted">Conecte o número do WhatsApp na aba Conexão para configurar esta parte.</Card>;
}

function Copyable({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="secondary" size="icon" aria-label={`Copiar ${label}`} onClick={() => navigator.clipboard?.writeText(value)}>
          <Copy className="size-3.5" />
        </Button>
      </div>
    </Field>
  );
}

function Connection({ channel, webhookUrl }: { channel: ChannelInfo; webhookUrl: string }) {
  const { run, pending } = useAction();
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card className="p-5">
        <CardHeader icon={<KeyRound />} title="Credenciais da Meta" description="Painel de desenvolvedores da Meta → seu app → WhatsApp → Configuração da API." />
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => saveWhatsAppChannel(fd), { onSuccess: () => e.currentTarget?.reset() });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ID do número (Phone number ID)"><Input name="phoneNumberId" required defaultValue={channel?.phoneNumberId} inputMode="numeric" /></Field>
            <Field label="ID da conta (WhatsApp Business Account ID)"><Input name="wabaId" defaultValue={channel?.wabaId ?? ""} inputMode="numeric" placeholder="Para importar os modelos" /></Field>
          </div>
          <Field label="Número exibido"><Input name="displayPhone" defaultValue={channel?.displayPhone ?? ""} placeholder="+55 11 99999-9999 (preenchido ao testar)" /></Field>
          <Field label={channel ? "Token de acesso (deixe vazio para manter o atual)" : "Token de acesso permanente (usuário do sistema)"}>
            <Input name="accessToken" type="password" autoComplete="off" required={!channel} placeholder={channel ? "••••••••  guardado com criptografia" : "EAAG…"} />
          </Field>
          <Field label={channel?.hasAppSecret ? "Chave secreta do app (cadastrada · deixe vazio para manter)" : "Chave secreta do app (recomendado: valida a assinatura do webhook)"}>
            <Input name="appSecret" type="password" autoComplete="off" placeholder={channel?.hasAppSecret ? "••••••••" : "App secret"} />
          </Field>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={channel?.active ?? true} className="size-4 accent-brand" /> Integração ativa</label>
            {channel?.hasAppSecret && <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="clearAppSecret" className="accent-brand" /> Remover chave secreta</label>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button loading={pending}>Salvar conexão</Button>
            {channel && <Button type="button" variant="secondary" onClick={() => run(() => testWhatsAppChannel())}>Testar conexão</Button>}
          </div>
        </form>
      </Card>
      <Card className="h-fit space-y-3 p-5">
        <CardHeader icon={<Send />} title="Webhook" description="Cadastre no app da Meta (WhatsApp → Configuração) e assine o campo messages." />
        <Copyable label="URL de retorno" value={webhookUrl} />
        {channel?.verifyToken ? (
          <>
            <Copyable label="Token de verificação" value={channel.verifyToken} />
            <Button size="sm" variant="ghost" onClick={() => confirm("Gerar um novo token? O webhook precisa ser verificado de novo na Meta.") && run(() => rotateVerifyToken())}>
              <RefreshCw className="size-3.5" /> Gerar novo token
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted">O token de verificação aparece depois de salvar a conexão.</p>
        )}
        <ol className="list-decimal space-y-1 pl-4 text-xs text-muted">
          <li>Crie um usuário do sistema no Meta Business com permissão whatsapp_business_messaging e gere um token permanente.</li>
          <li>Cole o ID do número, o ID da conta e o token aqui.</li>
          <li>No app da Meta, cole a URL e o token de verificação e assine <b>messages</b>.</li>
          <li>Clique em Testar conexão e mande uma mensagem para o número.</li>
        </ol>
      </Card>
    </div>
  );
}

const ACTION_LABEL: Record<MenuOption["action"], string> = { reply: "Responder e voltar ao menu", ai: "IA responde as dúvidas", handoff: "Passar para a equipe" };
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function BotEditor({ bot: initial, aiReady }: { bot: BotConfig; aiReady: boolean }) {
  const { pipelines } = useOrg();
  const { run, pending } = useAction();
  const [bot, setBot] = useState(initial);
  const set = <K extends keyof BotConfig>(k: K, v: BotConfig[K]) => setBot((b) => ({ ...b, [k]: v }));
  const setOpt = (i: number, patch: Partial<MenuOption>) => set("menu", bot.menu.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveWhatsAppBot(bot));
      }}
    >
      <Card className="space-y-3 p-5">
        <CardHeader
          icon={<Bot />}
          title="Atendimento inicial"
          description="O chatbot recebe o cliente, mostra o menu, responde e passa para a equipe com o lead já no funil."
          action={
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bot.enabled} onChange={(e) => set("enabled", e.target.checked)} className="size-4 accent-brand" /> Chatbot ligado
            </label>
          }
        />
        <Field label="Boas-vindas">
          <Textarea rows={2} value={bot.welcome} onChange={(e) => set("welcome", e.target.value)} />
        </Field>
        <Field label="Pergunta do menu">
          <Input value={bot.menuTitle} onChange={(e) => set("menuTitle", e.target.value)} />
        </Field>
        <div className="space-y-2">
          <p className="mono-label text-[10.5px] text-muted">Opções do menu · até 3 viram botões, até 10 viram lista</p>
          {bot.menu.map((o, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input value={o.label} maxLength={24} onChange={(e) => setOpt(i, { label: e.target.value })} placeholder={`Opção ${i + 1}`} aria-label={`Opção ${i + 1}`} />
              <Select value={o.action} onChange={(e) => setOpt(i, { action: e.target.value as MenuOption["action"] })} aria-label={`Ação da opção ${i + 1}`}>
                {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <Button type="button" size="icon" variant="ghost" aria-label="Remover opção" onClick={() => set("menu", bot.menu.filter((_, j) => j !== i))}>
                <Trash2 className="size-3.5" />
              </Button>
              <Textarea rows={2} className="sm:col-span-2" value={o.reply ?? ""} onChange={(e) => setOpt(i, { reply: e.target.value })} placeholder={o.action === "reply" ? "Resposta (horários, endereço, formas de pagamento…)" : "Mensagem antes de seguir (opcional)"} />
              <Input value={o.tag ?? ""} onChange={(e) => setOpt(i, { tag: e.target.value })} placeholder="Etiqueta" className="sm:w-36" aria-label="Etiqueta" />
            </div>
          ))}
          {bot.menu.length < 10 && (
            <Button type="button" size="sm" variant="secondary" onClick={() => set("menu", [...bot.menu, { id: `op${Date.now().toString(36)}`, label: "", action: "reply" }])}>
              <Plus className="size-3.5" /> Adicionar opção
            </Button>
          )}
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <CardHeader
          icon={<Sparkles />}
          title="IA para dúvidas"
          description="Responde perguntas livres com base nas informações abaixo e chama um consultor quando o cliente quer comprar, negociar ou falar com alguém."
          action={
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bot.ai.enabled} onChange={(e) => set("ai", { ...bot.ai, enabled: e.target.checked })} className="size-4 accent-brand" /> IA ligada
            </label>
          }
        />
        {!aiReady && <p className="rounded-md border border-line bg-tint px-3 py-2 text-xs text-warn">A chave da IA (ANTHROPIC_API_KEY) não está configurada no servidor. Sem ela, as dúvidas vão direto para a equipe.</p>}
        <Field label="Informações da empresa (produtos, preços, horários, entrega, trocas, pagamento…)">
          <Textarea rows={8} value={bot.ai.knowledge} onChange={(e) => set("ai", { ...bot.ai, knowledge: e.target.value })} placeholder={"Ex.:\nHorário: seg a sex 9h–18h, sáb 9h–13h.\nEntrega para todo o Brasil; frete grátis acima de R$ 299.\nTrocas em até 30 dias com etiqueta.\nPagamento: Pix, cartão em até 6x sem juros, boleto."} />
        </Field>
        <Field label="Jeito de falar">
          <Input value={bot.ai.persona} onChange={(e) => set("ai", { ...bot.ai, persona: e.target.value })} />
        </Field>
      </Card>

      <Card className="space-y-3 p-5">
        <CardHeader icon={<Send />} title="Passagem para a equipe" description="Distribuição, funil e horário de atendimento humano." />
        <Field label="Mensagem ao transferir"><Textarea rows={2} value={bot.handoffText} onChange={(e) => set("handoffText", e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Distribuição">
            <Select value={bot.assign} onChange={(e) => set("assign", e.target.value as BotConfig["assign"])}>
              <option value="round_robin">Rodízio entre consultores e gestores</option>
              <option value="none">Fila: a equipe assume</option>
            </Select>
          </Field>
          <Field label="Funil do lead">
            <Select value={bot.createDeal ? (bot.pipelineId ?? "") : "__none"} onChange={(e) => (e.target.value === "__none" ? setBot((b) => ({ ...b, createDeal: false })) : setBot((b) => ({ ...b, createDeal: true, pipelineId: e.target.value || null })))}>
              <option value="">Funil padrão</option>
              {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="__none">Não criar negócio</option>
            </Select>
          </Field>
        </div>
        <Field label="Mensagem ao encerrar"><Textarea rows={2} value={bot.closingText} onChange={(e) => set("closingText", e.target.value)} /></Field>
        <div className="rounded-lg border border-line p-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={bot.hours.enabled} onChange={(e) => set("hours", { ...bot.hours, enabled: e.target.checked })} className="size-4 accent-brand" /> Avisar quando estiver fora do horário de atendimento
          </label>
          {bot.hours.enabled && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                Das <Input type="time" value={bot.hours.start} onChange={(e) => set("hours", { ...bot.hours, start: e.target.value })} className="w-28" /> às
                <Input type="time" value={bot.hours.end} onChange={(e) => set("hours", { ...bot.hours, end: e.target.value })} className="w-28" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d, i) => (
                  <label key={d} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs">
                    <input type="checkbox" checked={bot.hours.days.includes(i)} onChange={(e) => set("hours", { ...bot.hours, days: e.target.checked ? [...bot.hours.days, i] : bot.hours.days.filter((x) => x !== i) })} className="accent-brand" />
                    {d}
                  </label>
                ))}
              </div>
              <Textarea rows={2} value={bot.hours.offText} onChange={(e) => set("hours", { ...bot.hours, offText: e.target.value })} aria-label="Mensagem fora do horário" />
            </div>
          )}
        </div>
        <p className="text-xs text-muted">Variáveis: {"{nome}"}, {"{empresa}"}. O cliente pode digitar <b>menu</b> para voltar às opções ou <b>atendente</b> para falar com a equipe a qualquer momento.</p>
      </Card>
      <Button loading={pending}>Salvar chatbot</Button>
    </form>
  );
}

function Templates({ templates: initial, hasWaba }: { templates: WaTemplate[]; hasWaba: boolean }) {
  const { run, pending } = useAction();
  const [list, setList] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setList(initial);
  }
  const set = (i: number, patch: Partial<WaTemplate>) => setList((l) => l.map((t, j) => (j === i ? { ...t, ...patch, ...(patch.body !== undefined ? { params: countParams(patch.body) } : {}) } : t)));
  return (
    <Card className="space-y-3 p-5">
      <CardHeader
        icon={<Send />}
        title="Modelos aprovados"
        description="Fora da janela de 24h desde a última mensagem do cliente, a Meta só permite modelos aprovados (follow-ups, boas-vindas, avisos). Crie os modelos no Gerenciador do WhatsApp e importe aqui."
        action={
          <Button size="sm" variant="secondary" disabled={!hasWaba} title={hasWaba ? undefined : "Informe o ID da conta (WABA) na conexão"} onClick={() => run(() => syncWhatsAppTemplates())}>
            <RefreshCw className="size-3.5" /> Importar da Meta
          </Button>
        }
      />
      {list.map((t, i) => (
        <div key={i} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_1fr_100px_auto]">
          <Input value={t.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Nome no CRM" aria-label="Nome no CRM" />
          <Input value={t.name} onChange={(e) => set(i, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="nome_na_meta" className="font-mono text-xs" aria-label="Nome na Meta" />
          <Input value={t.language} onChange={(e) => set(i, { language: e.target.value })} className="font-mono text-xs" aria-label="Idioma" />
          <Button type="button" size="icon" variant="ghost" aria-label="Remover modelo" onClick={() => setList((l) => l.filter((_, j) => j !== i))}>
            <Trash2 className="size-3.5" />
          </Button>
          <Textarea rows={2} className="sm:col-span-4" value={t.body} onChange={(e) => set(i, { body: e.target.value })} placeholder="Texto do modelo com {{1}}, {{2}}… (igual ao aprovado na Meta)" />
          {t.params > 0 && <p className="text-xs text-muted sm:col-span-4">{t.params} variável(is)</p>}
        </div>
      ))}
      {!list.length && <p className="text-sm text-muted">Nenhum modelo ainda.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => setList((l) => [...l, { name: "", language: "pt_BR", label: "", body: "", params: 0 }])}>
          <Plus className="size-3.5" /> Adicionar manualmente
        </Button>
        <Button size="sm" loading={pending} onClick={() => run(() => saveWhatsAppTemplates(list))}>Salvar modelos</Button>
      </div>
    </Card>
  );
}

function Jobs({ jobs, counts, cronReady }: { jobs: Job[]; counts: Record<string, number>; cronReady: boolean }) {
  return (
    <Card className="space-y-3 p-5">
      <CardHeader icon={<Send />} title="Envios das automações" description="Follow-ups agendados pelas automações com a ação “Enviar WhatsApp”." />
      <div className="flex flex-wrap gap-2">
        {Object.entries(JOB_STATUS).map(([k, [l, c]]) => (counts[k] ? <Badge key={k} color={c} dot>{l}: {counts[k]}</Badge> : null))}
      </div>
      {!cronReady && <p className="rounded-md border border-line bg-tint px-3 py-2 text-xs text-warn">Configure CRON_SECRET no servidor e um agendador chamando /api/cron/whatsapp a cada 5 minutos para os follow-ups saírem no horário certo. Sem ele, saem quando chegar uma nova mensagem ou na rotina diária.</p>}
      <div className="divide-y divide-line">
        {jobs.map((j) => (
          <div key={j.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
            <Badge color={JOB_STATUS[j.status]?.[1]} dot>{JOB_STATUS[j.status]?.[0] ?? j.status}</Badge>
            <span className="min-w-0 flex-1 truncate">
              <b>{j.contact ?? j.to}</b> · <span className="text-muted">{j.what}</span>
              {j.error && <span className="block text-xs text-err">{j.error}</span>}
            </span>
            <span className="font-mono text-xs text-muted">{dateTime(j.sendAt)}</span>
          </div>
        ))}
        {!jobs.length && <p className="py-2 text-sm text-muted">Nenhum envio ainda.</p>}
      </div>
    </Card>
  );
}
