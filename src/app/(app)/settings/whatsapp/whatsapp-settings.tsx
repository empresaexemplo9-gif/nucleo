"use client";
import { useState } from "react";
import { Bot, Check, Copy, MessageCircle, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { useToast } from "@/components/toast";
import { disconnectWhatsapp, saveWhatsappBot, saveWhatsappConnection } from "@/actions/whatsapp";
import { DEFAULT_BOT, type BotConfig, type BotOption } from "@/lib/whatsapp/bot-config";

type Account = {
  phoneNumberId: string;
  displayPhone: string | null;
  verifyToken: string;
  sendStart: number;
  sendEnd: number;
  autoCreateContact: boolean;
  botEnabled: boolean;
  botMode: string;
  bot: BotConfig;
};

function CopyRow({ label, value }: { label: string; value: string }) {
  const toast = useToast();
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-fg-2">{label}</p>
      <div className="flex gap-2">
        <Input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
        <Button type="button" variant="secondary" size="icon" className="size-10 shrink-0" aria-label={`Copiar ${label}`} onClick={() => navigator.clipboard.writeText(value).then(() => toast("Copiado"))}>
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function WhatsappSettings({ account, webhookUrl, cronReady, ai }: { account: Account | null; webhookUrl: string; cronReady: boolean; ai: { plan: boolean; key: boolean } }) {
  const { run, pending } = useAction();
  const bot = account?.bot ?? DEFAULT_BOT;
  const [mode, setMode] = useState(account?.botMode ?? "MENU");
  const [options, setOptions] = useState<BotOption[]>(bot.options);
  const setOpt = (i: number, patch: Partial<BotOption>) => setOptions((o) => o.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const aiReady = ai.plan && ai.key;
  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold"><MessageCircle className="size-4 text-ok" /> WhatsApp da empresa</h2>
            <p className="text-sm text-muted">Conexão com a API oficial do WhatsApp Business (Meta). As mensagens saem do número da sua empresa.</p>
          </div>
          {account ? <Badge color="var(--ok)" dot>Conectado{account.displayPhone ? ` · ${account.displayPhone}` : ""}</Badge> : <Badge dot>Não conectado</Badge>}
        </div>

        <details className="mb-4 rounded-lg border border-line p-3 text-sm" open={!account}>
          <summary className="cursor-pointer font-medium">Como obter os dados de conexão</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg-2">
            <li>Em <b>developers.facebook.com</b>, crie um app do tipo <b>Empresa</b> e adicione o produto <b>WhatsApp</b>.</li>
            <li>Em <b>WhatsApp → Configuração da API</b>, cadastre o número da empresa e copie o <b>ID do número de telefone</b>.</li>
            <li>Em <b>Configurações do negócio → Usuários do sistema</b>, gere um <b>token permanente</b> com as permissões <code>whatsapp_business_messaging</code> e <code>whatsapp_business_management</code>.</li>
            <li>Em <b>Configurações do app → Básico</b>, copie a <b>Chave secreta do app</b>.</li>
            <li>Salve aqui e depois cadastre o webhook (os dados aparecem abaixo após conectar).</li>
          </ol>
        </details>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => saveWhatsappConnection(fd));
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field label="ID do número de telefone"><Input name="phoneNumberId" required inputMode="numeric" defaultValue={account?.phoneNumberId} placeholder="Ex.: 123456789012345" /></Field>
          <Field label="Chave secreta do app" hint={account ? "Em branco = manter a atual" : undefined}><Input name="appSecret" type="password" autoComplete="off" required={!account} placeholder={account ? "••••••••" : ""} /></Field>
          <Field label="Token de acesso permanente" className="sm:col-span-2" hint={account ? "Em branco = manter o atual" : undefined}><Input name="token" type="password" autoComplete="off" required={!account} placeholder={account ? "••••••••" : "EAAG…"} /></Field>
          <Field label="Mensagens automáticas: enviar a partir das">
            <Select name="sendStart" defaultValue={String(account?.sendStart ?? 8)}>{hours.slice(0, 24).map((h) => <option key={h} value={h}>{h}h</option>)}</Select>
          </Field>
          <Field label="até as" hint="Fora desse horário, lembretes e follow-ups esperam o próximo dia.">
            <Select name="sendEnd" defaultValue={String(account?.sendEnd ?? 20)}>{hours.slice(1).map((h) => <option key={h} value={h}>{h}h</option>)}</Select>
          </Field>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="autoCreateContact" defaultChecked={account?.autoCreateContact ?? true} className="mt-0.5 accent-brand" />
            <span>Criar um contato (lead) automaticamente quando um número desconhecido escrever</span>
          </label>
          <div className="flex flex-wrap justify-between gap-2 sm:col-span-2">
            {account ? <Button type="button" variant="danger" onClick={() => confirm("Desconectar o WhatsApp? As mensagens agendadas serão canceladas.") && run(() => disconnectWhatsapp())}>Desconectar</Button> : <span />}
            <Button loading={pending}>{account ? "Salvar conexão" : "Conectar"}</Button>
          </div>
        </form>

        {account && (
          <div className="mt-5 space-y-3 rounded-lg bg-surface-2 p-4">
            <p className="text-sm font-medium">Webhook — para receber mensagens e status de entrega</p>
            <p className="text-xs text-muted">No app da Meta, em <b>WhatsApp → Configuração → Webhook</b>, informe os dados abaixo e assine o campo <code>messages</code>.</p>
            <CopyRow label="URL de retorno (Callback URL)" value={webhookUrl} />
            <CopyRow label="Token de verificação" value={account.verifyToken} />
            {!cronReady && (
              <p className="rounded-md border border-[color-mix(in_oklab,var(--warn)_40%,transparent)] p-2 text-xs text-fg-2">
                O agendador ainda não está ativo no servidor (variável <code>CRON_SECRET</code>). Sem ele, lembretes e mensagens agendadas só são processados enquanto alguém usa o sistema.
              </p>
            )}
          </div>
        )}
      </Card>

      {account && (
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Bot className="size-4" /> Chatbot</h2>
            <p className="text-sm text-muted">Responde os clientes na hora, a qualquer momento. Quando alguém da equipe assume a conversa, o robô se cala.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("options", JSON.stringify(options));
              run(() => saveWhatsappBot(fd));
            }}
            className="space-y-4"
          >
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="botEnabled" defaultChecked={account.botEnabled} className="size-4 accent-brand" /> Chatbot ativo
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["MENU", "Menu de respostas", "O cliente escolhe uma opção numerada e recebe a resposta pronta.", true],
                  ["AI", "Assistente com IA", !ai.plan ? "Não incluído no plano desta empresa." : !ai.key ? "Chave de IA da plataforma não configurada." : "Conversa naturalmente usando as informações da sua empresa.", aiReady],
                ] as const
              ).map(([v, l, d, ok]) => (
                <label key={v} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${mode === v ? "border-[var(--accent)]" : "border-line"} ${ok ? "" : "cursor-not-allowed opacity-60"}`}>
                  <input type="radio" name="botMode" value={v} checked={mode === v} disabled={!ok} onChange={() => setMode(v)} className="mt-0.5 accent-brand" />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium">{l} {mode === v && <Check className="size-3.5 text-ok" />}</span>
                    <span className="block text-xs text-muted">{d}</span>
                  </span>
                </label>
              ))}
            </div>

            {mode === "AI" && (
              <Field label="Informações da empresa para o assistente" hint="O assistente só informa o que estiver aqui. O que não souber, ele transfere para a equipe.">
                <Textarea name="aiInstructions" rows={10} defaultValue={bot.aiInstructions} placeholder={"Ex.:\nSomos a Clínica Sorriso, em Campinas/SP. Atendemos de segunda a sexta, das 8h às 18h.\nServiços e preços: limpeza R$ 180; clareamento a partir de R$ 600…\nAgendamentos: peça nome completo e melhor horário, e transfira para a equipe."} />
              </Field>
            )}
            {mode !== "AI" && <input type="hidden" name="aiInstructions" value={bot.aiInstructions} />}

            <div className={mode === "AI" ? "space-y-3 rounded-lg border border-line p-3" : "space-y-3"}>
              {mode === "AI" && <p className="text-xs text-muted">Menu de reserva: usado apenas se o assistente estiver indisponível.</p>}
              <Field label="Saudação" hint="{nome} vira “, Maria” quando o contato é conhecido; {empresa} é o nome da sua empresa.">
                <Textarea name="greeting" rows={2} defaultValue={bot.greeting} />
              </Field>
              <div>
                <p className="mb-1.5 text-xs font-medium text-fg-2">Opções do menu</p>
                <div className="space-y-2">
                  {options.map((o, i) => (
                    <div key={i} className="rounded-lg border border-line p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted">{i + 1}</span>
                        <Input value={o.label} onChange={(e) => setOpt(i, { label: e.target.value })} placeholder="Texto da opção" maxLength={60} aria-label={`Opção ${i + 1}`} />
                        <Button type="button" size="icon" variant="ghost" aria-label="Remover opção" onClick={() => setOptions((x) => x.filter((_, j) => j !== i))}><Trash2 className="size-3.5" /></Button>
                      </div>
                      <label className="my-2 flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={o.handoff} onChange={(e) => setOpt(i, { handoff: e.target.checked })} className="accent-brand" /> Transferir para um atendente e avisar a equipe
                      </label>
                      <Textarea value={o.answer} onChange={(e) => setOpt(i, { answer: e.target.value })} rows={2} placeholder={o.handoff ? "Mensagem ao transferir (opcional)" : "Resposta enviada ao cliente"} aria-label={`Resposta da opção ${i + 1}`} />
                    </div>
                  ))}
                </div>
                {options.length < 9 && <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setOptions((x) => [...x, { label: "", answer: "", handoff: false }])}><Plus className="size-3.5" /> Adicionar opção</Button>}
              </div>
              <Field label="Quando não entender"><Input name="fallback" defaultValue={bot.fallback} /></Field>
            </div>
            <Field label="Mensagem ao transferir para a equipe"><Input name="handoffMessage" defaultValue={bot.handoffMessage} /></Field>
            <p className="text-xs text-muted">O cliente pode enviar <b>SAIR</b> a qualquer momento para deixar de receber mensagens automáticas.</p>
            <div className="flex justify-end"><Button loading={pending}>Salvar chatbot</Button></div>
          </form>
        </Card>
      )}
    </div>
  );
}
