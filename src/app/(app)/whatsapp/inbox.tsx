"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Bot, Check, CheckCheck, Clock, MessageCircle, Send, User, X, Zap } from "lucide-react";
import { Avatar, Badge, Button, Card, EmptyState, Input, Select, Textarea, cn } from "@/components/ui";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { cancelWhatsappMessage, markWhatsappRead, sendWhatsappMessage, setWhatsappBotPaused, transferWhatsappConversation } from "@/actions/whatsapp";
import { dateTime, relative } from "@/lib/format";
import { formatPhone } from "@/lib/whatsapp/phone";

type Conv = { id: string; name: string; phone: string; preview: string | null; at: string; unread: number; botPaused: boolean; optedOut: boolean };
type Msg = { id: string; out: boolean; body: string; status: string; source: string; error: string | null; at: string };
type Current = { id: string; contactId: string | null; ownerId: string | null; deal: { id: string; title: string } | null; lastInboundAt: string | null; messages: Msg[] };

const DAY = 86_400_000;

function StatusIcon({ status }: { status: string }) {
  if (status === "READ") return <CheckCheck className="size-3.5 text-[var(--accent-2,var(--accent))]" aria-label="Lida" />;
  if (status === "DELIVERED") return <CheckCheck className="size-3.5" aria-label="Entregue" />;
  if (status === "SENT") return <Check className="size-3.5" aria-label="Enviada" />;
  if (status === "FAILED") return <AlertCircle className="size-3.5 text-err" aria-label="Falhou" />;
  if (status === "CANCELED") return <X className="size-3.5" aria-label="Cancelada" />;
  return <Clock className="size-3.5" aria-label="Agendada" />;
}

export function Inbox({ conversations, current, canSend, botEnabled }: { conversations: Conv[]; current: Current | null; canSend: boolean; botEnabled: boolean }) {
  const router = useRouter();
  const { members, member } = useOrg();
  const { run, pending } = useAction();
  const [text, setText] = useState("");
  const [useTemplate, setUseTemplate] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const end = useRef<HTMLDivElement>(null);
  const conv = current ? conversations.find((c) => c.id === current.id) : null;
  const lastId = current?.messages.at(-1)?.id;

  // novas mensagens chegam pelo webhook: atualiza a tela periodicamente
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      router.refresh();
    }, 8000);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lastId]);
  const unread = conv?.unread ?? 0;
  useEffect(() => {
    if (current && unread > 0 && canSend) markWhatsappRead(current.id).then(() => router.refresh());
  }, [current, unread, canSend, router]);

  const windowOpen = !!current?.lastInboundAt && now - new Date(current.lastInboundAt).getTime() < DAY - 600_000;

  return (
    <div className="w-full px-4 pb-10 pt-6 lg:px-8">
      <Card className="grid h-[calc(100vh-11rem)] min-h-[480px] overflow-hidden md:grid-cols-[320px_1fr]">
        <aside className={cn("flex min-h-0 flex-col border-line md:border-r", current && "hidden md:flex")}>
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <MessageCircle className="size-4 text-ok" />
            <h1 className="text-sm font-semibold">Conversas</h1>
            <span className="ml-auto text-xs text-muted">{conversations.length}</span>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
            {conversations.map((c) => (
              <Link key={c.id} href={`/whatsapp?c=${c.id}`} scroll={false} className={cn("flex items-center gap-3 border-b border-line px-4 py-3 transition hover:bg-tint", c.id === current?.id && "bg-tint")}>
                <Avatar name={c.name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{c.name}</span>
                    <span className="shrink-0 text-[11px] text-muted">{relative(c.at)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">{c.preview ?? formatPhone(c.phone)}</span>
                    {c.unread > 0 && <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[var(--ok)] px-1 text-[10px] font-semibold text-white">{c.unread}</span>}
                  </span>
                </span>
              </Link>
            ))}
            {!conversations.length && <p className="p-6 text-center text-sm text-muted">Nenhuma conversa ainda. Elas aparecem aqui quando um cliente escreve ou quando uma mensagem é enviada.</p>}
          </div>
        </aside>

        <section className={cn("flex min-h-0 flex-col", !current && "hidden md:flex")}>
          {!current || !conv ? (
            <div className="flex flex-1 items-center justify-center"><EmptyState icon={<MessageCircle className="size-6" />} title="Selecione uma conversa" description="Ou abra a ficha de um contato e clique em Conversar." /></div>
          ) : (
            <>
              <header className="flex items-center gap-2 sm:gap-3 border-b border-line px-4 py-3">
                <Link href="/whatsapp" className="rounded-md p-1 text-muted md:hidden" aria-label="Voltar"><ArrowLeft className="size-4" /></Link>
                <Avatar name={conv.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{conv.name}</p>
                  <p className="truncate text-xs text-muted">
                    {formatPhone(conv.phone)}
                    {member(current.ownerId) && ` · com ${member(current.ownerId)!.name.split(" ")[0]}`}
                  </p>
                </div>
                {conv.optedOut && <Badge color="var(--err)">Não quer mensagens automáticas</Badge>}
                {current.deal && <Link href={`/deals/${current.deal.id}`} title={current.deal.title}><Button size="sm" variant="ghost"><Zap className="size-3.5" /> <span className="hidden sm:inline">Negócio</span></Button></Link>}
                {current.contactId && canSend && (
                  <Select
                    aria-label="Transferir atendimento"
                    value=""
                    onChange={(e) => e.target.value && run(() => transferWhatsappConversation(current.id, e.target.value))}
                    className="h-8 w-auto max-w-40 text-xs"
                  >
                    <option value="">Transferir…</option>
                    {members.filter((m) => m.id !== current.ownerId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                )}
                {current.contactId && <Link href={`/contacts/${current.contactId}`}><Button size="sm" variant="ghost"><User className="size-3.5" /> <span className="hidden sm:inline">Ficha</span></Button></Link>}
                {botEnabled && canSend && (
                  <Button size="sm" variant={conv.botPaused ? "secondary" : "soft"} onClick={() => run(() => setWhatsappBotPaused(current.id, !conv.botPaused))}>
                    <Bot className="size-3.5" /> {conv.botPaused ? "Reativar robô" : "Assumir"}<span className="hidden sm:inline">{conv.botPaused ? "" : " conversa"}</span>
                  </Button>
                )}
              </header>
              <div className="scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto bg-surface-2 px-4 py-4">
                {current.messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.out ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[78%] rounded-xl border border-line px-3 py-2 text-sm shadow-sm", m.out ? "bg-[color-mix(in_oklab,var(--ok)_12%,var(--surface-1))]" : "bg-[var(--surface-1)]", (m.status === "CANCELED" || m.status === "SCHEDULED") && "opacity-70")}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="mt-1 flex items-center justify-end gap-1 text-[10.5px] text-muted">
                        {m.source === "BOT" && <><Bot className="size-3" /> robô ·</>}
                        {m.source === "AUTOMATION" && <><Zap className="size-3" /> automação ·</>}
                        {m.status === "SCHEDULED" ? `agendada para ${dateTime(m.at)}` : dateTime(m.at)}
                        {m.out && <StatusIcon status={m.status} />}
                      </p>
                      {m.error && m.status !== "SENT" && <p className="mt-1 text-[11px] text-err">{m.error}</p>}
                      {m.status === "SCHEDULED" && canSend && (
                        <button className="mt-1 text-[11px] text-fg-2 underline" onClick={() => run(() => cancelWhatsappMessage(m.id))}>Cancelar envio</button>
                      )}
                    </div>
                  </div>
                ))}
                {!current.messages.length && <p className="py-10 text-center text-sm text-muted">Nenhuma mensagem nesta conversa.</p>}
                <div ref={end} />
              </div>
              {canSend && (
                <form
                  className="space-y-2 border-t border-line p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    if (!text.trim()) return;
                    run(() => sendWhatsappMessage(current.id, fd), { onSuccess: () => setText("") });
                  }}
                >
                  {!windowOpen && (
                    <div className="rounded-lg border border-line bg-surface-2 p-2.5 text-xs text-fg-2">
                      <p>O cliente não escreveu nas últimas 24 horas. O WhatsApp só aceita, agora, um <b>modelo de mensagem aprovado</b> na Meta.</p>
                      <label className="mt-1.5 flex items-center gap-2">
                        <input type="checkbox" checked={useTemplate} onChange={(e) => setUseTemplate(e.target.checked)} className="accent-brand" /> Enviar usando um modelo aprovado
                      </label>
                      {useTemplate && (
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <Input name="templateName" required placeholder="nome_do_modelo" className="h-9 text-xs" />
                          <Input name="templateLang" defaultValue="pt_BR" className="h-9 text-xs" />
                          <Input name="templateParams" placeholder="Valores de {{1}} | {{2}} …" className="h-9 text-xs" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <Textarea
                      name="body"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                      rows={2}
                      maxLength={4000}
                      placeholder={!windowOpen && useTemplate ? "Texto do modelo (para o histórico da conversa)" : "Escreva uma mensagem…"}
                      className="min-h-11 flex-1 resize-none"
                    />
                    <Button loading={pending} disabled={!text.trim() || (!windowOpen && !useTemplate)} aria-label="Enviar"><Send className="size-4" /></Button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      </Card>
    </div>
  );
}
