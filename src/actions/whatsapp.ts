"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hasRole, requireContext, requireSuperadmin } from "@/lib/auth";
import { conversationScope } from "@/lib/whatsapp/scope";
import { seal } from "@/lib/secret-box";
import { notify } from "@/lib/notify";
import { transferDeals } from "@/lib/transfer";
import * as cloud from "@/lib/whatsapp/cloud";
import { countParams, fillVars, resolveBot, resolveTemplates, toWaId, type BotConfig, type WaTemplate } from "@/lib/whatsapp/config";
import { ensureConversation, ensureLead, getChannel, sendMessage, systemNote } from "@/lib/whatsapp/service";
import type { ActionResult } from "@/components/use-action";
import { fail, str } from "./helpers";

const SETTINGS = "/settings/whatsapp";

/* ------------------------- implantação (superadmin) ------------------------- */

/** Credenciais do número na API oficial da Meta. Tokens ficam criptografados no banco. */
export async function saveWhatsAppChannel(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
    const phoneNumberId = str(fd, "phoneNumberId")?.replace(/\D/g, "");
    if (!phoneNumberId) return { ok: false, error: "Informe o ID do número (Phone number ID)" };
    const token = str(fd, "accessToken");
    const appSecret = str(fd, "appSecret");
    const current = await db.whatsAppChannel.findUnique({ where: { orgId: ctx.org.id } });
    if (!current && !token) return { ok: false, error: "Informe o token de acesso" };
    const taken = await db.whatsAppChannel.findUnique({ where: { phoneNumberId } });
    if (taken && taken.orgId !== ctx.org.id) return { ok: false, error: "Esse número já está conectado a outra empresa" };
    const data = {
      phoneNumberId,
      wabaId: str(fd, "wabaId")?.replace(/\D/g, "") || null,
      displayPhone: str(fd, "displayPhone"),
      active: fd.get("active") === "on",
      ...(token ? { accessToken: seal(token) } : {}),
      ...(appSecret ? { appSecret: seal(appSecret) } : fd.get("clearAppSecret") === "on" ? { appSecret: null } : {}),
    };
    if (current) await db.whatsAppChannel.update({ where: { id: current.id }, data });
    else await db.whatsAppChannel.create({ data: { ...data, orgId: ctx.org.id, accessToken: seal(token!), verifyToken: randomBytes(18).toString("base64url") } });
    revalidatePath(SETTINGS);
    return { ok: true, message: "Conexão salva" };
  } catch (e) {
    return fail(e);
  }
}

export async function testWhatsAppChannel(): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
    const channel = await getChannel(ctx.org.id);
    if (!channel) return { ok: false, error: "Conexão inativa ou função WhatsApp fora do plano" };
    const info = await cloud.phoneInfo(channel.creds);
    await db.whatsAppChannel.update({ where: { id: channel.id }, data: { displayPhone: info.display_phone_number ?? undefined } });
    revalidatePath(SETTINGS);
    return { ok: true, message: `Conectado: ${info.verified_name ?? ""} ${info.display_phone_number ?? ""}${info.quality_rating ? ` · qualidade ${info.quality_rating}` : ""}`.trim() };
  } catch (e) {
    return fail(e);
  }
}

export async function rotateVerifyToken(): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
    await db.whatsAppChannel.update({ where: { orgId: ctx.org.id }, data: { verifyToken: randomBytes(18).toString("base64url") } });
    revalidatePath(SETTINGS);
    return { ok: true, message: "Novo token de verificação gerado: atualize no app da Meta" };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------- modelos e chatbot (administração) ------------------------- */

async function requireWaAdmin() {
  const ctx = await requireContext();
  if (!ctx.superadmin && !hasRole(ctx, "ADMIN")) throw new Error("Somente a administração pode alterar o WhatsApp.");
  if (!ctx.settings.modules.whatsapp) throw new Error("WhatsApp fora do plano da empresa.");
  const row = await db.whatsAppChannel.findUnique({ where: { orgId: ctx.org.id } });
  if (!row) throw new Error("Conecte o número do WhatsApp primeiro.");
  return { ctx, row };
}

/** Busca na Meta os modelos aprovados e mantém os nomes amigáveis já definidos. */
export async function syncWhatsAppTemplates(): Promise<ActionResult> {
  try {
    const { ctx, row } = await requireWaAdmin();
    const channel = await getChannel(ctx.org.id);
    if (!channel) return { ok: false, error: "Conexão inativa" };
    const remote = await cloud.listTemplates(channel.creds);
    const current = resolveTemplates(row.templates);
    const list: WaTemplate[] = remote.map((t) => {
      const body = t.components?.find((c) => c.type === "BODY")?.text ?? "";
      const prev = current.find((c) => c.name === t.name && c.language === t.language);
      return { name: t.name, language: t.language, label: prev?.label ?? t.name.replace(/_/g, " "), body, params: countParams(body) };
    });
    await db.whatsAppChannel.update({ where: { id: row.id }, data: { templates: list } });
    revalidatePath(SETTINGS);
    return { ok: true, message: `${list.length} modelo(s) aprovado(s) importado(s)` };
  } catch (e) {
    return fail(e);
  }
}

export async function saveWhatsAppTemplates(list: WaTemplate[]): Promise<ActionResult> {
  try {
    const { row } = await requireWaAdmin();
    await db.whatsAppChannel.update({ where: { id: row.id }, data: { templates: resolveTemplates(list) } });
    revalidatePath(SETTINGS);
    return { ok: true, message: "Modelos salvos" };
  } catch (e) {
    return fail(e);
  }
}

export async function saveWhatsAppBot(bot: BotConfig): Promise<ActionResult> {
  try {
    const { ctx, row } = await requireWaAdmin();
    const clean = resolveBot(bot);
    if (clean.pipelineId && !(await db.pipeline.findFirst({ where: { id: clean.pipelineId, orgId: ctx.org.id } }))) clean.pipelineId = null;
    await db.whatsAppChannel.update({ where: { id: row.id }, data: { bot: clean } });
    revalidatePath(SETTINGS);
    return { ok: true, message: "Chatbot salvo" };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------- atendimento ------------------------- */

async function access(id: string, min: "SALES" | "VIEWER" = "SALES") {
  const ctx = await requireContext();
  if (!ctx.settings.modules.whatsapp) throw new Error("WhatsApp fora do plano da empresa.");
  if (!hasRole(ctx, min)) throw new Error("Seu acesso é somente de visualização.");
  const conv = await db.conversation.findFirst({ where: { id, orgId: ctx.org.id, ...conversationScope(ctx) } });
  if (!conv) throw new Error("Atendimento não encontrado");
  const channel = await getChannel(ctx.org.id);
  if (!channel) throw new Error("WhatsApp desconectado. Fale com a administração.");
  return { ctx, conv, channel };
}

const refresh = () => revalidatePath("/inbox");

export async function sendWhatsAppText(conversationId: string, text: string): Promise<ActionResult> {
  try {
    const { ctx, conv, channel } = await access(conversationId);
    const body = text.trim().slice(0, 4096);
    if (!body) return { ok: false, error: "Escreva a mensagem" };
    await sendMessage({ channel, conversationId, message: { kind: "text", text: body }, authorId: ctx.user.id, sender: "user" });
    // quem responde assume o atendimento que estava na fila ou com o chatbot
    if (conv.status !== "OPEN" || !conv.assigneeId)
      await db.conversation.update({ where: { id: conv.id }, data: { status: "OPEN", assigneeId: conv.assigneeId ?? ctx.user.id, botState: {} } });
    refresh();
    return { ok: true };
  } catch (e) {
    refresh();
    return fail(e);
  }
}

export async function sendWhatsAppTemplate(conversationId: string, name: string, params: string[]): Promise<ActionResult> {
  try {
    const { ctx, conv, channel } = await access(conversationId);
    const t = channel.templates.find((x) => x.name === name);
    if (!t) return { ok: false, error: "Modelo não encontrado" };
    const contact = conv.contactId ? await db.contact.findUnique({ where: { id: conv.contactId }, select: { name: true } }) : null;
    const first = (contact?.name ?? conv.name ?? "").split(" ")[0];
    const vars = { nome: contact?.name ?? conv.name, primeiro_nome: first, empresa: channel.orgName, consultor: ctx.user.name.split(" ")[0] };
    const values = Array.from({ length: t.params }, (_, i) => fillVars(String(params[i] ?? "").trim(), vars).slice(0, 1000));
    if (values.some((v) => !v)) return { ok: false, error: "Preencha todas as variáveis do modelo" };
    await sendMessage({ channel, conversationId, message: { kind: "template", template: { name: t.name, language: t.language, params: values } }, authorId: ctx.user.id, sender: "user" });
    if (conv.status === "CLOSED" || !conv.assigneeId)
      await db.conversation.update({ where: { id: conv.id }, data: { status: "OPEN", assigneeId: conv.assigneeId ?? ctx.user.id, botState: {} } });
    refresh();
    return { ok: true, message: "Modelo enviado" };
  } catch (e) {
    refresh();
    return fail(e);
  }
}

/** Assumir (para si) ou transferir o atendimento. O negócio ligado acompanha o novo responsável. */
export async function assignConversation(conversationId: string, toId: string | null): Promise<ActionResult> {
  try {
    const { ctx, conv } = await access(conversationId);
    if (toId && !(await db.membership.findFirst({ where: { orgId: ctx.org.id, userId: toId, active: true } }))) return { ok: false, error: "Responsável inválido" };
    if (toId === conv.assigneeId) return { ok: true };
    await db.conversation.update({ where: { id: conv.id }, data: { assigneeId: toId, status: toId ? "OPEN" : "QUEUE", botState: {} } });
    const to = toId ? await db.user.findUnique({ where: { id: toId }, select: { name: true } }) : null;
    await systemNote(ctx.org.id, conv.id, toId === ctx.user.id ? `${ctx.user.name} assumiu o atendimento.` : to ? `${ctx.user.name} transferiu o atendimento para ${to.name}.` : `${ctx.user.name} devolveu o atendimento para a fila.`);
    if (toId && toId !== ctx.user.id)
      await notify(ctx.org.id, [toId], { type: "WHATSAPP", title: `Atendimento transferido para você: ${conv.name || conv.waId}`, body: `Transferido por ${ctx.user.name}`, href: `/inbox?c=${conv.id}` });
    if (conv.dealId && toId) {
      const deal = await db.deal.findFirst({ where: { id: conv.dealId, orgId: ctx.org.id, status: "OPEN" }, select: { id: true, title: true, ownerId: true } });
      if (deal && deal.ownerId !== toId) await transferDeals(ctx, [deal], toId);
    }
    refresh();
    return { ok: true, message: toId === ctx.user.id ? "Atendimento assumido" : toId ? "Atendimento transferido" : "Devolvido para a fila" };
  } catch (e) {
    return fail(e);
  }
}

export async function closeConversation(conversationId: string, sendClosing: boolean): Promise<ActionResult> {
  try {
    const { ctx, conv, channel } = await access(conversationId);
    if (sendClosing && channel.bot.closingText && conv.lastInboundAt && Date.now() - conv.lastInboundAt.getTime() < 864e5)
      await sendMessage({ channel, conversationId, message: { kind: "text", text: channel.bot.closingText }, authorId: ctx.user.id, sender: "user" }).catch(() => null);
    await db.conversation.update({ where: { id: conv.id }, data: { status: "CLOSED", unread: 0, botState: {} } });
    await systemNote(ctx.org.id, conv.id, `${ctx.user.name} encerrou o atendimento.`);
    refresh();
    return { ok: true, message: "Atendimento encerrado" };
  } catch (e) {
    return fail(e);
  }
}

export async function returnToBot(conversationId: string): Promise<ActionResult> {
  try {
    const { ctx, conv } = await access(conversationId);
    await db.conversation.update({ where: { id: conv.id }, data: { status: "BOT", assigneeId: null, botState: { step: "menu" } } });
    await systemNote(ctx.org.id, conv.id, `${ctx.user.name} devolveu o atendimento para o chatbot.`);
    refresh();
    return { ok: true, message: "Chatbot retomou o atendimento" };
  } catch (e) {
    return fail(e);
  }
}

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    await db.conversation.updateMany({ where: { id: conversationId, orgId: ctx.org.id, unread: { gt: 0 } }, data: { unread: 0 } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Cria (ou reaproveita) o contato e o negócio no funil a partir da conversa. */
export async function createLeadFromConversation(conversationId: string): Promise<ActionResult> {
  try {
    const { ctx, conv, channel } = await access(conversationId);
    const r = await ensureLead({ ...channel, bot: { ...channel.bot, createDeal: true } }, conv.id, conv.assigneeId ?? ctx.user.id);
    refresh();
    return { ok: true, id: r.dealId ?? undefined, message: r.dealId ? "Negócio no funil" : "Contato criado" };
  } catch (e) {
    return fail(e);
  }
}

/** Abre a conversa com um contato do CRM (para iniciar pelo modelo aprovado ou responder). */
export async function openConversationForContact(contactId: string): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    if (!ctx.settings.modules.whatsapp) return { ok: false, error: "WhatsApp fora do plano da empresa." };
    const contact = await db.contact.findFirst({ where: { id: contactId, orgId: ctx.org.id } });
    if (!contact) return { ok: false, error: "Contato não encontrado" };
    const waId = toWaId(contact.whatsapp) ?? toWaId(contact.phone);
    if (!waId) return { ok: false, error: "Contato sem WhatsApp ou telefone válido (com DDD)" };
    if (!(await getChannel(ctx.org.id))) return { ok: false, error: "WhatsApp desconectado. Fale com a administração." };
    const conv = await ensureConversation(ctx.org.id, waId, contact.name);
    if (!conv.contactId) await db.conversation.update({ where: { id: conv.id }, data: { contactId: contact.id } });
    if (!conv.assigneeId && hasRole(ctx, "SALES"))
      await db.conversation.update({ where: { id: conv.id }, data: { assigneeId: ctx.user.id, status: conv.status === "CLOSED" || conv.status === "BOT" ? "OPEN" : conv.status } });
    return { ok: true, id: conv.id };
  } catch (e) {
    return fail(e);
  }
}
