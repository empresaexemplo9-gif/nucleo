import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { logEvent } from "../events";
import { managers, notify } from "../notify";
import { applyStageChecklist } from "../checklist";
import { unseal } from "../secret-box";
import { resolveSettings } from "../labels";
import * as cloud from "./cloud";
import { fillTemplate, inWindow, resolveBot, resolveTemplates, toWaId, waIdVariants, type BotConfig, type WaTemplate } from "./config";

export type Channel = {
  id: string;
  orgId: string;
  orgName: string;
  creds: cloud.Creds;
  appSecret: string | null;
  bot: BotConfig;
  templates: WaTemplate[];
};

type ChannelRow = Prisma.WhatsAppChannelGetPayload<{ include: { org: { select: { name: true; settings: true } } } }>;

function toChannel(c: ChannelRow | null): Channel | null {
  if (!c || !c.active) return null;
  if (!resolveSettings(c.org.settings).modules.whatsapp) return null;
  const accessToken = unseal(c.accessToken);
  if (!accessToken) return null;
  return {
    id: c.id,
    orgId: c.orgId,
    orgName: c.org.name,
    creds: { phoneNumberId: c.phoneNumberId, accessToken, wabaId: c.wabaId },
    appSecret: unseal(c.appSecret),
    bot: resolveBot(c.bot),
    templates: resolveTemplates(c.templates),
  };
}

const include = { org: { select: { name: true, settings: true } } } as const;

/** Canal ativo da empresa (com a função WhatsApp no plano). */
export async function getChannel(orgId: string) {
  return toChannel(await db.whatsAppChannel.findUnique({ where: { orgId }, include }));
}

export async function channelByPhoneId(phoneNumberId: string) {
  return toChannel(await db.whatsAppChannel.findUnique({ where: { phoneNumberId }, include }));
}

/* ------------------------- contatos e conversas ------------------------- */

/** Contato da empresa com esse número (WhatsApp ou telefone), se existir. */
export async function findContactByWa(orgId: string, waId: string) {
  const variants = waIdVariants(waId);
  const tails = variants.map((v) => v.slice(-8));
  const candidates = await db.contact.findMany({
    where: { orgId, OR: tails.flatMap((t) => [{ whatsapp: { contains: t.slice(-4) } }, { phone: { contains: t.slice(-4) } }]) },
    select: { id: true, name: true, whatsapp: true, phone: true, ownerId: true },
    take: 200,
  });
  return candidates.find((c) => [c.whatsapp, c.phone].some((p) => { const w = toWaId(p); return !!w && variants.includes(w); })) ?? null;
}

export async function ensureConversation(orgId: string, waId: string, name?: string | null) {
  const existing = await db.conversation.findFirst({ where: { orgId, waId: { in: waIdVariants(waId) } } });
  if (existing) {
    if (!existing.contactId) {
      const c = await findContactByWa(orgId, waId);
      if (c) return db.conversation.update({ where: { id: existing.id }, data: { contactId: c.id } });
    }
    return existing;
  }
  const contact = await findContactByWa(orgId, waId);
  return db.conversation.create({ data: { orgId, waId, name: name ?? contact?.name ?? null, contactId: contact?.id ?? null } });
}

/* ------------------------- envio ------------------------- */

type Outgoing =
  | { kind: "text"; text: string }
  | { kind: "template"; template: { name: string; language: string; params: string[] } }
  | { kind: "menu"; text: string; options: { id: string; label: string }[] };

export type SendInput = { channel: Channel; conversationId: string; message: Outgoing; authorId?: string | null; sender: "user" | "bot" | "ia" | "automacao" };

/** Envia pela Meta e registra no histórico. Texto livre só dentro da janela de 24h. */
export async function sendMessage({ channel, conversationId, message, authorId = null, sender }: SendInput) {
  const conv = await db.conversation.findFirstOrThrow({ where: { id: conversationId, orgId: channel.orgId } });
  if (message.kind !== "template" && !inWindow(conv.lastInboundAt))
    throw new cloud.WhatsAppError("Fora da janela de 24h desde a última mensagem do cliente: envie um modelo aprovado.");
  let body: string;
  let kind: string;
  if (message.kind === "template") {
    const t = channel.templates.find((x) => x.name === message.template.name);
    body = t?.body ? fillTemplate(t.body, message.template.params) : `[modelo] ${t?.label ?? message.template.name}`;
    kind = "template";
  } else if (message.kind === "menu") {
    body = `${message.text}\n${message.options.map((o, i) => `${i + 1}. ${o.label}`).join("\n")}`;
    kind = "interactive";
  } else {
    body = message.text;
    kind = "text";
  }
  const row = await db.whatsAppMessage.create({ data: { orgId: channel.orgId, conversationId, direction: "OUT", kind, body, authorId, sender, status: "pending" } });
  try {
    const id =
      message.kind === "template"
        ? await cloud.sendTemplate(channel.creds, conv.waId, message.template.name, message.template.language, message.template.params)
        : message.kind === "menu"
          ? await cloud.sendMenu(channel.creds, conv.waId, message.text, message.options)
          : await cloud.sendText(channel.creds, conv.waId, message.text);
    await db.whatsAppMessage.update({ where: { id: row.id }, data: { externalId: id, status: "sent" } });
  } catch (e) {
    await db.whatsAppMessage.update({ where: { id: row.id }, data: { status: "failed", error: (e as Error).message.slice(0, 500) } });
    throw e;
  } finally {
    await db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), preview: body.slice(0, 140) } });
  }
  return row.id;
}

/* ------------------------- distribuição e passagem para a equipe ------------------------- */

/** Consultor ou gestor ativo com menos atendimentos abertos (rodízio). */
export async function pickAssignee(orgId: string) {
  const members = await db.membership.findMany({ where: { orgId, active: true, role: { in: ["SALES", "MANAGER"] } }, select: { userId: true } });
  if (!members.length) return null;
  const load = await db.conversation.groupBy({ by: ["assigneeId"], where: { orgId, status: "OPEN", assigneeId: { in: members.map((m) => m.userId) } }, _count: true });
  const count = new Map(load.map((l) => [l.assigneeId, l._count]));
  return members.map((m) => m.userId).sort((a, b) => (count.get(a) ?? 0) - (count.get(b) ?? 0))[0] ?? null;
}

/** Garante contato e (opcionalmente) negócio no funil para a conversa. */
export async function ensureLead(channel: Channel, conversationId: string, ownerId: string | null, extra?: { tag?: string; note?: string }) {
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  let contactId = conv.contactId;
  if (!contactId) {
    const c = await db.contact.create({
      data: { orgId: channel.orgId, name: conv.name || `WhatsApp ${conv.waId}`, whatsapp: conv.waId, phone: conv.waId, source: "WhatsApp", ownerId, tags: extra?.tag ? [extra.tag] : [] },
    });
    contactId = c.id;
    await logEvent({ orgId: channel.orgId, type: "CONTACT_CREATED", contactId, data: { via: "WhatsApp" } });
  } else if (extra?.tag) {
    const c = await db.contact.findUnique({ where: { id: contactId }, select: { tags: true } });
    if (c && !c.tags.includes(extra.tag)) await db.contact.update({ where: { id: contactId }, data: { tags: { push: extra.tag } } });
  }
  let dealId = conv.dealId;
  const openDeal = dealId ? await db.deal.findFirst({ where: { id: dealId, status: "OPEN" } }) : null;
  if (!openDeal && channel.bot.createDeal) {
    const pipeline = await db.pipeline.findFirst({
      where: { orgId: channel.orgId, ...(channel.bot.pipelineId ? { id: channel.bot.pipelineId } : { isDefault: true }) },
      include: { stages: { where: { type: "OPEN" }, orderBy: { position: "asc" }, take: 1 } },
    });
    const stage = pipeline?.stages[0];
    if (pipeline && stage) {
      const last = await db.deal.findFirst({ where: { stageId: stage.id }, orderBy: { position: "desc" } });
      const deal = await db.deal.create({
        data: {
          orgId: channel.orgId,
          title: `${conv.name || conv.waId} · WhatsApp`,
          pipelineId: pipeline.id,
          stageId: stage.id,
          contactId,
          ownerId,
          source: "WhatsApp",
          tags: extra?.tag ? [extra.tag] : [],
          position: (last?.position ?? 0) + 1,
        },
      });
      dealId = deal.id;
      await applyStageChecklist(channel.orgId, deal.id, stage.id, null);
      await logEvent({ orgId: channel.orgId, type: "DEAL_CREATED", dealId: deal.id, contactId, data: { title: deal.title, via: "WhatsApp" } });
      if (extra?.note) await db.note.create({ data: { orgId: channel.orgId, dealId: deal.id, contactId, content: extra.note } });
      const { runAutomations } = await import("../automation");
      await runAutomations(channel.orgId, "DEAL_CREATED", deal.id);
    }
  }
  await db.conversation.update({ where: { id: conversationId }, data: { contactId, dealId } });
  return { contactId, dealId };
}

/** Passa o atendimento do chatbot para a equipe. */
export async function handoff(channel: Channel, conversationId: string, opts?: { tag?: string; note?: string; reason?: string }) {
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  const assigneeId = conv.assigneeId ?? (channel.bot.assign === "round_robin" ? await pickAssignee(channel.orgId) : null);
  const { dealId } = await ensureLead(channel, conversationId, assigneeId, opts);
  await db.conversation.update({ where: { id: conversationId }, data: { status: assigneeId ? "OPEN" : "QUEUE", assigneeId, botState: {} } });
  await systemNote(channel.orgId, conversationId, assigneeId ? "Atendimento transferido do chatbot para a equipe." : "Chatbot colocou o atendimento na fila da equipe.");
  const to = assigneeId ? [assigneeId] : await managers(channel.orgId);
  await notify(channel.orgId, to, {
    type: "WHATSAPP",
    title: `${assigneeId ? "Novo atendimento para você" : "Atendimento na fila"}: ${conv.name || conv.waId}`,
    body: opts?.reason ?? "Cliente aguardando no WhatsApp",
    href: `/inbox?c=${conversationId}`,
  });
  return { assigneeId, dealId };
}

export async function systemNote(orgId: string, conversationId: string, body: string) {
  await db.whatsAppMessage.create({ data: { orgId, conversationId, direction: "OUT", kind: "system", body, status: "sent", sender: "bot" } });
}

/* ------------------------- webhook ------------------------- */

type InboundMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body: string };
  button?: { text: string; payload?: string };
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
  image?: { caption?: string };
  document?: { caption?: string; filename?: string };
  location?: { name?: string; address?: string; latitude: number; longitude: number };
};

export function inboundText(m: InboundMessage): { text: string; choiceId?: string; kind: string } {
  switch (m.type) {
    case "text":
      return { text: m.text?.body ?? "", kind: "text" };
    case "button":
      return { text: m.button?.text ?? "", choiceId: m.button?.payload, kind: "interactive" };
    case "interactive": {
      const r = m.interactive?.button_reply ?? m.interactive?.list_reply;
      return { text: r?.title ?? "", choiceId: r?.id, kind: "interactive" };
    }
    case "image":
      return { text: m.image?.caption ? `📷 ${m.image.caption}` : "📷 Imagem", kind: "media" };
    case "document":
      return { text: `📎 ${m.document?.filename ?? "Documento"}${m.document?.caption ? ` — ${m.document.caption}` : ""}`, kind: "media" };
    case "audio":
      return { text: "🎤 Áudio", kind: "media" };
    case "video":
      return { text: "🎬 Vídeo", kind: "media" };
    case "sticker":
      return { text: "Figurinha", kind: "media" };
    case "location":
      return { text: `📍 ${m.location?.name ?? m.location?.address ?? `${m.location?.latitude}, ${m.location?.longitude}`}`, kind: "media" };
    default:
      return { text: `[${m.type}]`, kind: "media" };
  }
}

export async function handleInbound(channel: Channel, m: InboundMessage, profileName?: string) {
  if (await db.whatsAppMessage.findUnique({ where: { externalId: m.id } })) return; // reentrega da Meta
  const conv = await ensureConversation(channel.orgId, m.from, profileName);
  const { text, choiceId, kind } = inboundText(m);
  await db.whatsAppMessage.create({ data: { orgId: channel.orgId, conversationId: conv.id, direction: "IN", kind, body: text, externalId: m.id, status: "received" } });
  // atendimento encerrado: a próxima mensagem começa um novo atendimento pelo chatbot
  const reopened = conv.status === "CLOSED";
  const status = reopened ? (channel.bot.enabled ? "BOT" : "QUEUE") : conv.status;
  const updated = await db.conversation.update({
    where: { id: conv.id },
    data: {
      lastInboundAt: new Date(),
      lastMessageAt: new Date(),
      preview: text.slice(0, 140),
      unread: { increment: 1 },
      status,
      ...(reopened ? { botState: {}, assigneeId: channel.bot.enabled ? null : conv.assigneeId } : {}),
      ...(profileName && !conv.name ? { name: profileName } : {}),
    },
  });
  void cloud.markRead(channel.creds, m.id);
  if (status === "BOT") {
    const { runBot } = await import("./bot");
    await runBot(channel, updated.id, { text, choiceId });
  } else if (status === "QUEUE" && reopened) {
    await handoff(channel, updated.id, { reason: text.slice(0, 120) });
  } else if (updated.assigneeId) {
    await notify(channel.orgId, [updated.assigneeId], { type: "WHATSAPP", title: `Nova mensagem de ${updated.name || updated.waId}`, body: text.slice(0, 120), href: `/inbox?c=${updated.id}` });
  }
}

type StatusUpdate = { id: string; status: string; errors?: { code: number; title?: string; message?: string; error_data?: { details?: string } }[] };
const STATUS_ORDER = ["pending", "sent", "delivered", "read"];

export async function handleStatus(s: StatusUpdate) {
  const msg = await db.whatsAppMessage.findUnique({ where: { externalId: s.id } });
  if (!msg) return;
  if (s.status === "failed") {
    const e = s.errors?.[0];
    await db.whatsAppMessage.update({ where: { id: msg.id }, data: { status: "failed", error: (e?.error_data?.details || e?.message || e?.title || "Falha no envio").slice(0, 500) } });
    return;
  }
  // as notificações podem chegar fora de ordem: nunca volta o status
  if (STATUS_ORDER.indexOf(s.status) > STATUS_ORDER.indexOf(msg.status)) await db.whatsAppMessage.update({ where: { id: msg.id }, data: { status: s.status } });
}

/* ------------------------- envios das automações ------------------------- */

export type WaPayload = { template?: { name: string; language: string; params: string[] }; text?: string; skipIfReplied?: boolean };

/**
 * Envia para um número: texto se a janela de 24h estiver aberta, senão o modelo aprovado.
 * Sem modelo e fora da janela, registra a falha.
 */
export async function deliver(channel: Channel, to: string, payload: WaPayload, opts?: { contactName?: string | null; since?: Date }) {
  const conv = await ensureConversation(channel.orgId, to, opts?.contactName);
  if (payload.skipIfReplied && opts?.since && conv.lastInboundAt && conv.lastInboundAt > opts.since) return "SKIPPED" as const;
  const message: Outgoing | null =
    payload.text && inWindow(conv.lastInboundAt) ? { kind: "text", text: payload.text } : payload.template ? { kind: "template", template: payload.template } : null;
  if (!message) throw new cloud.WhatsAppError("Fora da janela de 24h e sem modelo aprovado configurado.");
  await sendMessage({ channel, conversationId: conv.id, message, sender: "automacao" });
  return "SENT" as const;
}

/** Processa envios agendados vencidos (chamado pelo cron e pelo webhook). */
export async function processScheduled(limit = 25) {
  const due = await db.whatsAppScheduled.findMany({ where: { status: "PENDING", sendAt: { lte: new Date() } }, orderBy: { sendAt: "asc" }, take: limit });
  let sent = 0;
  for (const job of due) {
    // trava otimista: evita envio duplicado com execuções simultâneas
    const lock = await db.whatsAppScheduled.updateMany({ where: { id: job.id, status: "PENDING" }, data: { status: "SENDING" } });
    if (!lock.count) continue;
    try {
      const channel = await getChannel(job.orgId);
      if (!channel) throw new Error("WhatsApp desativado para a empresa");
      if (job.dealId) {
        const deal = await db.deal.findUnique({ where: { id: job.dealId }, select: { status: true } });
        if (!deal) throw new Error("Negócio excluído");
      }
      const contact = job.contactId ? await db.contact.findUnique({ where: { id: job.contactId }, select: { name: true } }) : null;
      const r = await deliver(channel, job.to, job.payload as WaPayload, { contactName: contact?.name, since: job.createdAt });
      await db.whatsAppScheduled.update({ where: { id: job.id }, data: { status: r } });
      if (r === "SENT") sent++;
    } catch (e) {
      await db.whatsAppScheduled.update({ where: { id: job.id }, data: { status: "FAILED", error: (e as Error).message.slice(0, 500) } });
    }
  }
  return { processed: due.length, sent };
}
