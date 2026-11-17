import "server-only";
import type { Prisma, WhatsappAccount, WhatsappConversation } from "@prisma/client";
import { db } from "../db";
import { decrypt } from "../crypto";
import { logEvent } from "../events";
import { managers, notify } from "../notify";
import { nextSendTime } from "../zoned";
import { OUTSIDE_WINDOW, sendTemplate, sendText, type WaResult, type WaTemplate } from "./client";
import { normalizePhone, phoneKey } from "./phone";

const DAY = 86_400_000;
/** Margem de segurança da janela de 24h de texto livre da Meta. */
const FREE_WINDOW = DAY - 10 * 60_000;

export const OUTSIDE_WINDOW_HELP = "Fora da janela de 24h: o cliente não escreveu nas últimas 24 horas. Informe um modelo aprovado na Meta para enviar.";

export type Guard = { stageId?: string; stopOnReply?: boolean; activityId?: string; activityDueAt?: string; recordId?: string; recordDueAt?: string };

export function getAccount(orgId: string) {
  return db.whatsappAccount.findUnique({ where: { orgId } });
}

/** Contato da empresa dono deste número (tolerante a máscara e ao nono dígito). */
export async function findContactByPhone(orgId: string, phone: string) {
  const key = phoneKey(phone);
  if (!key) return null;
  const rows = await db.$queryRaw<{ id: string; phone: string | null; whatsapp: string | null }[]>`
    SELECT id, phone, whatsapp FROM "Contact"
    WHERE "orgId" = ${orgId}
      AND (regexp_replace(coalesce(whatsapp, ''), '\\D', '', 'g') LIKE ${"%" + key.slice(-8)}
        OR regexp_replace(coalesce(phone, ''), '\\D', '', 'g') LIKE ${"%" + key.slice(-8)})
    ORDER BY "createdAt" ASC LIMIT 20`;
  return rows.find((r) => phoneKey(r.whatsapp) === key) ?? rows.find((r) => phoneKey(r.phone) === key) ?? null;
}

/** Conversa com o contato (cria se ainda não existir). */
export async function conversationForContact(orgId: string, contactId: string) {
  const contact = await db.contact.findFirst({ where: { id: contactId, orgId } });
  if (!contact) return null;
  const phone = normalizePhone(contact.whatsapp || contact.phone);
  const existing = await db.whatsappConversation.findFirst({ where: { orgId, OR: [{ contactId }, ...(phone ? [{ phone }] : [])] }, orderBy: { lastMessageAt: "desc" } });
  if (existing) {
    if (!existing.contactId) return db.whatsappConversation.update({ where: { id: existing.id }, data: { contactId, name: contact.name } });
    return existing;
  }
  if (!phone) return null;
  return db.whatsappConversation.create({ data: { orgId, phone, contactId, name: contact.name } });
}

/* ------------------------------------------------------------------ */
/* Envio                                                               */
/* ------------------------------------------------------------------ */

export type QueueInput = {
  orgId: string;
  conversationId: string;
  body: string;
  source: "MANUAL" | "BOT" | "AUTOMATION";
  scheduledAt?: Date | null;
  template?: WaTemplate | null;
  guard?: Guard | null;
  automationId?: string | null;
  dealId?: string | null;
  userId?: string | null;
};

/** Registra a mensagem de saída. Sem agendamento futuro, já tenta enviar. */
export async function queueMessage(input: QueueInput) {
  const now = new Date();
  const scheduledAt = input.scheduledAt && input.scheduledAt > now ? input.scheduledAt : now;
  const msg = await db.whatsappMessage.create({
    data: {
      orgId: input.orgId,
      conversationId: input.conversationId,
      direction: "OUT",
      body: input.body,
      status: "SCHEDULED",
      source: input.source,
      scheduledAt,
      template: (input.template ?? undefined) as Prisma.InputJsonValue | undefined,
      guard: (input.guard ?? undefined) as Prisma.InputJsonValue | undefined,
      automationId: input.automationId,
      dealId: input.dealId,
      userId: input.userId,
    },
  });
  if (scheduledAt <= now) return dispatchMessage(msg.id);
  return { id: msg.id, status: "SCHEDULED" as string, error: null as string | null };
}

async function finish(id: string, status: string, error: string | null = null, extra: Prisma.WhatsappMessageUpdateInput = {}) {
  await db.whatsappMessage.update({ where: { id }, data: { status, error, ...extra } });
  return { id, status, error };
}

/** Envia uma mensagem agendada, conferindo antes se ela ainda faz sentido. */
export async function dispatchMessage(id: string): Promise<{ id: string; status: string; error: string | null }> {
  // reserva a mensagem: duas execuções simultâneas nunca enviam em duplicidade
  const claim = await db.whatsappMessage.updateMany({ where: { id, status: "SCHEDULED" }, data: { status: "SENDING" } });
  if (!claim.count) return { id, status: "SKIPPED", error: null };
  const msg = await db.whatsappMessage.findUniqueOrThrow({ where: { id }, include: { conversation: true, org: { select: { timezone: true } } } });
  try {
    const conv = msg.conversation;
    const account = await getAccount(msg.orgId);
    if (!account || !account.active) return await finish(id, "FAILED", "WhatsApp não conectado. Configure em Configurações → WhatsApp.");
    const guard = (msg.guard ?? {}) as Guard;
    const now = new Date();

    if (msg.source === "AUTOMATION") {
      if (conv.optedOut) return await finish(id, "CANCELED", "O cliente pediu para não receber mensagens automáticas.");
      if (guard.stopOnReply && conv.lastInboundAt && conv.lastInboundAt > msg.createdAt) return await finish(id, "CANCELED", "Cancelada: o cliente respondeu antes do envio.");
      if (guard.stageId && msg.dealId) {
        const deal = await db.deal.findUnique({ where: { id: msg.dealId }, select: { stageId: true, status: true } });
        if (!deal || deal.status !== "OPEN" || deal.stageId !== guard.stageId) return await finish(id, "CANCELED", "Cancelada: o negócio saiu da etapa.");
      }
      // mensagens automáticas só saem no horário comercial da empresa
      let when = nextSendTime(now, msg.org.timezone, account.sendStart, account.sendEnd);
      if (guard.activityId) {
        const act = await db.activity.findUnique({ where: { id: guard.activityId }, select: { done: true, dueAt: true } });
        if (!act || act.done || act.dueAt?.toISOString() !== guard.activityDueAt) return await finish(id, "CANCELED", "Cancelada: o compromisso foi concluído, remarcado ou excluído.");
        if (act.dueAt && act.dueAt < now) return await finish(id, "CANCELED", "Cancelada: o compromisso já passou.");
        // lembrete que só caberia depois do compromisso sai agora mesmo
        if (act.dueAt && when >= act.dueAt) when = now;
      }
      if (guard.recordId) {
        const rec = await db.moduleRecord.findUnique({ where: { id: guard.recordId }, select: { closedAt: true, dueAt: true, status: { select: { isFinal: true } } } });
        if (!rec || rec.closedAt || rec.status?.isFinal) return await finish(id, "CANCELED", "Cancelada: o registro foi concluído ou excluído.");
        if (guard.recordDueAt && rec.dueAt?.toISOString() !== guard.recordDueAt) return await finish(id, "CANCELED", "Cancelada: a data do registro mudou.");
        if (guard.recordDueAt && rec.dueAt && rec.dueAt > now && when >= rec.dueAt) when = now;
      }
      if (when > now) return await finish(id, "SCHEDULED", null, { scheduledAt: when });
    }

    const token = decrypt(account.tokenEnc);
    const template = msg.template as WaTemplate | null;
    const inWindow = !!conv.lastInboundAt && now.getTime() - conv.lastInboundAt.getTime() < FREE_WINDOW;
    let r: WaResult;
    if (inWindow) {
      r = await sendText(account.phoneNumberId, token, conv.phone, msg.body);
      if (!r.ok && r.code === OUTSIDE_WINDOW && template) r = await sendTemplate(account.phoneNumberId, token, conv.phone, template);
    } else if (template) {
      r = await sendTemplate(account.phoneNumberId, token, conv.phone, template);
    } else {
      return await finish(id, "FAILED", OUTSIDE_WINDOW_HELP);
    }

    if (!r.ok) {
      // falha temporária (rede, limite da Meta): tenta de novo nas próximas execuções, por até 1 hora
      const since = now.getTime() - (msg.scheduledAt ?? msg.createdAt).getTime();
      if (r.retryable && since < 3_600_000) return await finish(id, "SCHEDULED", r.error);
      return await finish(id, "FAILED", r.code === OUTSIDE_WINDOW ? OUTSIDE_WINDOW_HELP : r.error);
    }
    await db.whatsappConversation.update({ where: { id: conv.id }, data: { lastMessageAt: now, lastPreview: msg.body.slice(0, 120) } });
    if (msg.source === "AUTOMATION" && (msg.dealId || conv.contactId))
      await logEvent({ orgId: msg.orgId, type: "WHATSAPP_SENT", dealId: msg.dealId, contactId: conv.contactId, data: { title: msg.body.slice(0, 80) } }).catch(() => {});
    return await finish(id, "SENT", null, { waId: r.waId, sentAt: now });
  } catch (e) {
    console.error("Falha ao enviar WhatsApp", e);
    return await finish(id, "FAILED", "Erro inesperado ao enviar.").catch(() => ({ id, status: "FAILED", error: "Erro inesperado ao enviar." }));
  }
}

/** Envia tudo o que já venceu na fila (chamado pelo agendador). */
export async function dispatchDue(orgId?: string, limit = 60) {
  const due = await db.whatsappMessage.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() }, ...(orgId ? { orgId } : {}) },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    select: { id: true },
  });
  let sent = 0;
  for (const m of due) if ((await dispatchMessage(m.id)).status === "SENT") sent += 1;
  return { due: due.length, sent };
}

/* ------------------------------------------------------------------ */
/* Recebimento (webhook)                                               */
/* ------------------------------------------------------------------ */

const OPT_OUT = /^(sair|parar|pare|stop|cancelar|descadastrar|n[aã]o quero (mais )?receber)\b/i;
const OPT_IN = /^(voltar|retomar|quero receber)\b/i;

export type Inbound = { waId: string; from: string; text: string; name?: string | null };

/** Guarda a mensagem do cliente. Devolve a conversa quando a mensagem é nova (para o robô responder). */
export async function receiveMessage(account: WhatsappAccount, m: Inbound): Promise<{ conversation: WhatsappConversation; first: boolean; optOut: boolean } | null> {
  const orgId = account.orgId;
  const phone = normalizePhone(m.from);
  if (!phone) return null;
  if (await db.whatsappMessage.findUnique({ where: { waId: m.waId }, select: { id: true } })) return null; // a Meta reenviou
  const now = new Date();
  const key = phoneKey(phone)!;
  let conv =
    (await db.whatsappConversation.findUnique({ where: { orgId_phone: { orgId, phone } } })) ??
    // mesmo número cadastrado com/sem o nono dígito
    (await db.whatsappConversation.findMany({ where: { orgId, phone: { endsWith: key.slice(-8) } } })).find((c) => phoneKey(c.phone) === key) ??
    null;
  let created = false;
  let contactId = conv?.contactId ?? null;
  if (!contactId) {
    contactId = (await findContactByPhone(orgId, phone))?.id ?? null;
    if (!contactId && account.autoCreateContact) {
      const c = await db.contact.create({ data: { orgId, name: m.name?.trim() || `WhatsApp ${phone}`, whatsapp: phone, source: "WhatsApp", lifecycle: "lead" } });
      contactId = c.id;
      created = true;
      await logEvent({ orgId, type: "CONTACT_CREATED", contactId: c.id, data: { name: "via WhatsApp" } }).catch(() => {});
    }
  }
  const first = !conv || !conv.lastInboundAt || now.getTime() - conv.lastInboundAt.getTime() > DAY;
  const optOut = OPT_OUT.test(m.text.trim());
  const data = {
    phone, // o número que o WhatsApp entrega é o que funciona para responder
    contactId,
    lastMessageAt: now,
    lastInboundAt: now,
    lastPreview: m.text.slice(0, 120),
    unread: { increment: 1 },
    ...(optOut ? { optedOut: true } : OPT_IN.test(m.text.trim()) ? { optedOut: false } : {}),
  };
  const wasUnread = conv?.unread ?? 0;
  conv = conv
    ? await db.whatsappConversation.update({ where: { id: conv.id }, data: { ...data, name: conv.name ?? m.name ?? null } })
    : await db.whatsappConversation.create({ data: { ...data, unread: 1, orgId, name: m.name ?? null } });
  try {
    await db.whatsappMessage.create({ data: { orgId, conversationId: conv.id, direction: "IN", body: m.text, status: "RECEIVED", source: "CUSTOMER", waId: m.waId } });
  } catch {
    return null; // entrega duplicada em paralelo
  }
  const who = conv.name || phone;
  if (created) await notify(orgId, await managers(orgId), { type: "WHATSAPP", title: `Novo lead pelo WhatsApp: ${who}`, body: m.text.slice(0, 140), href: `/whatsapp?c=${conv.id}` });
  else if ((!account.botEnabled || conv.botPaused) && wasUnread === 0) await notifyConversation(conv, `Nova mensagem de ${who}`, m.text.slice(0, 140));
  return { conversation: conv, first, optOut };
}

/** Avisa o responsável pelo contato (ou os gestores, se não houver). */
export async function notifyConversation(conv: WhatsappConversation, title: string, body?: string) {
  const owner = conv.contactId ? (await db.contact.findUnique({ where: { id: conv.contactId }, select: { ownerId: true } }))?.ownerId : null;
  await notify(conv.orgId, owner ? [owner] : await managers(conv.orgId), { type: "WHATSAPP", title, body, href: `/whatsapp?c=${conv.id}` });
}

const RANK: Record<string, number> = { SENT: 1, DELIVERED: 2, READ: 3 };

/** Atualiza o status de entrega informado pela Meta. */
export async function receiveStatus(orgId: string, s: { id: string; status: string; error?: string }) {
  const msg = await db.whatsappMessage.findFirst({ where: { waId: s.id, orgId, direction: "OUT" } });
  if (!msg) return;
  const status = s.status.toUpperCase();
  if (status === "FAILED") await db.whatsappMessage.update({ where: { id: msg.id }, data: { status: "FAILED", error: (s.error || "A Meta não conseguiu entregar a mensagem.").slice(0, 300) } });
  else if (RANK[status] && RANK[status] > (RANK[msg.status] ?? 0)) await db.whatsappMessage.update({ where: { id: msg.id }, data: { status } });
}
