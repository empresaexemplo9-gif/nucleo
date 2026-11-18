"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Bot, Check, CheckCheck, Clock, Inbox, MessageCircle, Search, Send, Sparkles, UserCheck, X, Zap } from "lucide-react";
import { Avatar, Badge, Button, cn, EmptyState, FilterChip, Input, Select, Textarea } from "@/components/ui";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import {
  assignConversation,
  closeConversation,
  createLeadFromConversation,
  markConversationRead,
  returnToBot,
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "@/actions/whatsapp";
import { CONVERSATION_STATUS, fillTemplate, formatWa, WINDOW_MS, type WaTemplate } from "@/lib/whatsapp/config";
import { dateTime } from "@/lib/format";

export type Filter = "mine" | "queue" | "bot" | "open" | "closed";
type Conv = { id: string; name: string | null; waId: string; status: string; assigneeId: string | null; preview: string | null; unread: number; lastMessageAt: string };
type Msg = { id: string; direction: string; kind: string; body: string; status: string; error: string | null; authorId: string | null; sender: string | null; at: string };
type Selected = Omit<Conv, "preview" | "lastMessageAt"> & {
  lastInboundAt: string | null;
  contact: { id: string; name: string; email: string | null; tags: string[]; lifecycle: string } | null;
  deal: { id: string; title: string; value: number; status: string; stage: string; color: string } | null;
  messages: Msg[];
};

const FILTER_LABEL: Record<Filter, string> = { mine: "Meus", queue: "Fila", bot: "Chatbot", open: "Em aberto", closed: "Encerrados" };

/** Relógio da tela (atualiza a cada 30s) para tempos relativos e a janela de 24h. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function ago(iso: string, now: number) {
  const m = Math.round((now - new Date(iso).getTime()) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function InboxView(props: {
  connected: boolean;
  displayPhone: string | null;
  templates: WaTemplate[];
  filter: Filter;
  q: string;
  counts: Record<Filter, number>;
  conversations: Conv[];
  selected: Selected | null;
}) {
  const { conversations, selected, filter, counts } = props;
  const router = useRouter();
  const sp = useSearchParams();
  const { member } = useOrg();
  const [q, setQ] = useState(props.q);
  const now = useNow();

  // atualização automática enquanto a aba estiver visível
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 5000);
    return () => clearInterval(t);
  }, [router]);

  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/inbox?${p.toString()}`;
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[520px] w-full">
      <aside className={cn("flex w-full shrink-0 flex-col border-r border-line md:w-[340px]", selected && sp.get("c") && "hidden md:flex")}>
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="flex items-center gap-2 text-lg font-semibold"><MessageCircle className="size-5 text-accent-text" /> Atendimento</h1>
            {props.displayPhone && <span className="font-mono text-[11px] text-muted">{props.displayPhone}</span>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.push(href({ q: q.trim() || null, c: null }));
            }}
            className="relative"
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome ou número" className="h-9 pl-8" aria-label="Buscar conversa" />
          </form>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
              <FilterChip key={f} active={filter === f} count={counts[f]} onClick={() => router.push(href({ f: f === "mine" ? null : f, c: null }))}>
                {FILTER_LABEL[f]}
              </FilterChip>
            ))}
          </div>
        </div>
        {!props.connected && (
          <p className="m-3 flex items-start gap-2 rounded-[var(--radius-sm)] border border-line bg-tint p-3 text-xs text-warn">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> WhatsApp desconectado: o histórico continua disponível, mas não é possível enviar mensagens.
          </p>
        )}
        <ul className="scroll-thin flex-1 overflow-y-auto">
          {conversations.map((c) => {
            const st = CONVERSATION_STATUS[c.status];
            const owner = member(c.assigneeId);
            return (
              <li key={c.id}>
                <Link
                  href={href({ c: c.id })}
                  className={cn("flex gap-3 border-b border-line px-4 py-3 transition hover:bg-tint", selected?.id === c.id && "bg-[var(--surface-1)]")}
                >
                  <Avatar name={c.name || c.waId} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{c.name || formatWa(c.waId)}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10.5px] text-muted">{ago(c.lastMessageAt, now)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-xs text-muted">{c.preview}</span>
                      {c.unread > 0 && <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-semibold text-[var(--accent-fg,#fff)]">{c.unread}</span>}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[10.5px] text-muted">
                      <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ background: st?.color }} /> {st?.label}</span>
                      {owner && <span className="truncate">· {owner.name.split(" ")[0]}</span>}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
          {!conversations.length && (
            <li className="p-6">
              <EmptyState icon={<Inbox className="size-6" />} title="Nada por aqui" description={filter === "mine" ? "Nenhum atendimento com você agora. Veja a fila." : "Nenhuma conversa neste filtro."} />
            </li>
          )}
        </ul>
      </aside>
      <section className={cn("min-w-0 flex-1 flex-col", selected && sp.get("c") ? "flex" : "hidden md:flex")}>
        {selected ? (
          <Thread key={selected.id} c={selected} templates={props.templates} connected={props.connected} back={href({ c: null })} />
        ) : (
          <div className="grid flex-1 place-items-center p-8">
            <EmptyState icon={<MessageCircle className="size-6" />} title="Selecione uma conversa" description="Os clientes que chamam no WhatsApp aparecem aqui depois do chatbot." />
          </div>
        )}
      </section>
    </div>
  );
}

function Thread({ c, templates, connected, back }: { c: Selected; templates: WaTemplate[]; connected: boolean; back: string }) {
  const { user, members, member, can, fmt } = useOrg();
  const { run, pending } = useAction();
  const end = useRef<HTMLDivElement>(null);
  const editable = can("SALES") && connected;
  const now = useNow();
  const left = c.lastInboundAt ? WINDOW_MS - (now - new Date(c.lastInboundAt).getTime()) : 0;
  const open = left > 0;
  const st = CONVERSATION_STATUS[c.status];
  const last = c.messages[c.messages.length - 1]?.id;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [last]);
  useEffect(() => {
    if (c.unread > 0) void markConversationRead(c.id);
  }, [c.id, c.unread]);

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <Link href={back} className="rounded p-1 text-muted hover:text-fg md:hidden" aria-label="Voltar"><X className="size-4" /></Link>
        <Avatar name={c.name || c.waId} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{c.name || formatWa(c.waId)}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-mono">{formatWa(c.waId)}</span>
            <Badge color={st?.color} dot>{st?.label}</Badge>
            {member(c.assigneeId) && <span>com {member(c.assigneeId)!.name.split(" ")[0]}</span>}
          </p>
        </div>
        {editable && (
          <div className="flex flex-wrap items-center gap-1.5">
            {c.assigneeId !== user.id && (
              <Button size="sm" onClick={() => run(() => assignConversation(c.id, user.id))}><UserCheck className="size-3.5" /> Assumir</Button>
            )}
            <Select
              aria-label="Transferir atendimento"
              value=""
              onChange={(e) => e.target.value && run(() => assignConversation(c.id, e.target.value === "__queue" ? null : e.target.value))}
              className="h-8 w-auto text-xs"
            >
              <option value="">Transferir…</option>
              {members.filter((m) => m.id !== c.assigneeId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              {c.assigneeId && <option value="__queue">Devolver para a fila</option>}
            </Select>
            {c.status !== "BOT" && c.status !== "CLOSED" && (
              <Button size="sm" variant="ghost" title="O chatbot volta a responder" onClick={() => run(() => returnToBot(c.id))}><Bot className="size-3.5" /></Button>
            )}
            {c.status !== "CLOSED" && (
              <Button size="sm" variant="secondary" onClick={() => run(() => closeConversation(c.id, confirm("Enviar a mensagem de encerramento para o cliente?")))}>
                <Check className="size-3.5" /> Encerrar
              </Button>
            )}
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="scroll-thin flex-1 space-y-2 overflow-y-auto bg-[color-mix(in_oklab,var(--bg)_70%,var(--tint,transparent))] px-4 py-4">
            {c.messages.map((m) => <Bubble key={m.id} m={m} author={member(m.authorId)?.name} />)}
            <div ref={end} />
          </div>
          {editable ? (
            open ? (
              <TextComposer id={c.id} hoursLeft={Math.max(0, Math.floor(left / 3600000))} />
            ) : (
              <TemplateComposer id={c.id} templates={templates} name={c.contact?.name ?? c.name} />
            )
          ) : (
            <p className="border-t border-line px-4 py-3 text-xs text-muted">{connected ? "Seu acesso é somente de visualização." : "WhatsApp desconectado."}</p>
          )}
        </div>
        <aside className="hidden w-[260px] shrink-0 space-y-4 overflow-y-auto border-l border-line p-4 text-sm xl:block">
          <div>
            <p className="mono-label mb-1.5 text-[10px] text-muted">Contato</p>
            {c.contact ? (
              <Link href={`/contacts/${c.contact.id}`} className="block rounded-[var(--radius-sm)] border border-line p-3 hover:border-line-strong">
                <span className="block font-medium">{c.contact.name}</span>
                {c.contact.email && <span className="block truncate text-xs text-muted">{c.contact.email}</span>}
                {c.contact.tags.length > 0 && <span className="mt-1 block text-[11px] text-muted">{c.contact.tags.join(" · ")}</span>}
              </Link>
            ) : (
              <p className="text-xs text-muted">Ainda não cadastrado.</p>
            )}
          </div>
          <div>
            <p className="mono-label mb-1.5 text-[10px] text-muted">Negócio</p>
            {c.deal ? (
              <Link href={`/deals/${c.deal.id}`} className="block rounded-[var(--radius-sm)] border border-line p-3 hover:border-line-strong">
                <span className="block font-medium">{c.deal.title}</span>
                <span className="mt-1 flex items-center gap-1.5 text-xs text-muted"><span className="size-1.5 rounded-full" style={{ background: c.deal.color }} /> {c.deal.stage} · {fmt(c.deal.value)}</span>
              </Link>
            ) : editable ? (
              <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => createLeadFromConversation(c.id))}><Zap className="size-3.5" /> Criar lead no funil</Button>
            ) : (
              <p className="text-xs text-muted">Sem negócio.</p>
            )}
          </div>
          <div className="rounded-[var(--radius-sm)] border border-line p-3 text-xs text-muted">
            <p className="flex items-center gap-1.5 font-medium text-fg-2"><Clock className="size-3.5" /> Janela de 24h</p>
            <p className="mt-1">{open ? `Aberta · fecha em ${Math.max(0, Math.floor(left / 3600000))}h` : "Fechada: só modelos aprovados até o cliente responder."}</p>
          </div>
        </aside>
      </div>
    </>
  );
}

function Bubble({ m, author }: { m: Msg; author?: string }) {
  if (m.kind === "system")
    return (
      <p className="mx-auto w-fit max-w-[90%] rounded-full border border-line bg-[var(--surface-1)] px-3 py-1 text-center text-[11px] text-muted">
        {m.body} · {dateTime(m.at)}
      </p>
    );
  const out = m.direction === "OUT";
  const who = out ? (m.sender === "ia" ? "IA" : m.sender === "bot" ? "Chatbot" : m.sender === "automacao" ? "Automação" : author?.split(" ")[0]) : null;
  return (
    <div className={cn("flex", out ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-[14px] px-3 py-2 text-sm shadow-[0_1px_0_var(--line)]",
          out ? "rounded-br-[4px] bg-[color-mix(in_oklab,var(--accent)_16%,var(--card,var(--surface-1)))]" : "rounded-bl-[4px] bg-[var(--card,var(--surface-1))]",
        )}
      >
        {who && (
          <p className="mb-0.5 flex items-center gap-1 text-[10.5px] font-medium text-accent-text">
            {m.sender === "ia" && <Sparkles className="size-3" />}
            {m.sender === "bot" && <Bot className="size-3" />}
            {who}
            {m.kind === "template" && <span className="font-normal text-muted">· modelo</span>}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{m.body}</p>
        <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted">
          {new Date(m.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          {out && (m.status === "read" ? <CheckCheck className="size-3 text-[var(--info,#3b82f6)]" /> : m.status === "delivered" ? <CheckCheck className="size-3" /> : m.status === "sent" ? <Check className="size-3" /> : m.status === "failed" ? <AlertCircle className="size-3 text-err" /> : <Clock className="size-3" />)}
        </p>
        {m.status === "failed" && m.error && <p className="mt-1 text-[11px] text-err">{m.error}</p>}
      </div>
    </div>
  );
}

function TextComposer({ id, hoursLeft }: { id: string; hoursLeft: number }) {
  const { run, pending } = useAction();
  const [text, setText] = useState("");
  const submit = () => {
    const t = text.trim();
    if (!t || pending) return;
    setText("");
    run(() => sendWhatsAppText(id, t), { onError: () => setText(t) });
  };
  return (
    <form
      className="flex items-end gap-2 border-t border-line p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder={`Mensagem · Enter envia, Shift+Enter quebra linha${hoursLeft < 3 ? ` · janela fecha em ${hoursLeft}h` : ""}`}
        className="max-h-40 min-h-10 flex-1 resize-none"
        aria-label="Mensagem"
      />
      <Button size="icon" loading={pending} disabled={!text.trim()} aria-label="Enviar"><Send className="size-4" /></Button>
    </form>
  );
}

function TemplateComposer({ id, templates, name }: { id: string; templates: WaTemplate[]; name: string | null }) {
  const { run, pending } = useAction();
  const [tpl, setTpl] = useState(templates[0]?.name ?? "");
  const t = templates.find((x) => x.name === tpl);
  const [params, setParams] = useState<string[]>([]);
  const values = Array.from({ length: t?.params ?? 0 }, (_, i) => params[i] ?? (i === 0 ? "{primeiro_nome}" : ""));
  if (!templates.length)
    return <p className="border-t border-line px-4 py-3 text-xs text-muted">Janela de 24h fechada e nenhum modelo aprovado cadastrado. Peça à administração para importar os modelos em Configurações → WhatsApp.</p>;
  return (
    <form
      className="space-y-2 border-t border-line p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (t) run(() => sendWhatsAppTemplate(id, t.name, values), { onSuccess: () => setParams([]) });
      }}
    >
      <p className="flex items-center gap-1.5 text-xs text-muted"><Clock className="size-3.5" /> Fora da janela de 24h: inicie com um modelo aprovado. Quando {name?.split(" ")[0] || "o cliente"} responder, o texto livre libera.</p>
      <div className="flex flex-wrap gap-2">
        <Select value={tpl} onChange={(e) => { setTpl(e.target.value); setParams([]); }} className="h-9 w-auto min-w-48" aria-label="Modelo">
          {templates.map((x) => <option key={x.name} value={x.name}>{x.label}</option>)}
        </Select>
        {values.map((v, i) => (
          <Input key={i} value={v} onChange={(e) => setParams(values.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`{{${i + 1}}}`} className="h-9 w-40" aria-label={`Variável ${i + 1}`} />
        ))}
        <Button size="sm" loading={pending}><Send className="size-3.5" /> Enviar modelo</Button>
      </div>
      {t?.body && <p className="whitespace-pre-wrap rounded-md bg-tint p-2 text-xs text-fg-2">{fillTemplate(t.body, values.map((v) => v.replace("{primeiro_nome}", name?.split(" ")[0] ?? "")))}</p>}
    </form>
  );
}
