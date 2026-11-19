"use server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ownerScope, requireRole, requireSuperadmin, type Ctx } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/crypto";
import { fetchPhoneInfo } from "@/lib/whatsapp/client";
import { resolveBot } from "@/lib/whatsapp/bot-config";
import { aiAvailable } from "@/lib/whatsapp/ai";
import { conversationForContact, getAccount, queueMessage } from "@/lib/whatsapp/service";
import { notify } from "@/lib/notify";
import { transferDeals } from "@/lib/transfer";
import { fail, numOr, str } from "./helpers";
import type { ActionResult } from "@/components/use-action";

const done = (message: string, id?: string): ActionResult => {
  revalidatePath("/", "layout");
  return { ok: true, message, id };
};

/* ------------------------------ Conexão ------------------------------ */

/** Conexão do número: parte da implantação, feita pelo superadmin da plataforma. */
export async function saveWhatsappConnection(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
    const current = await getAccount(ctx.org.id);
    const phoneNumberId = str(fd, "phoneNumberId")?.replace(/\D/g, "");
    // campos de segredo em branco mantêm o valor já salvo
    const token = str(fd, "token") ?? (current ? decrypt(current.tokenEnc) : null);
    const appSecret = str(fd, "appSecret") ?? (current ? decrypt(current.appSecretEnc) : null);
    if (!phoneNumberId || !token || !appSecret) return { ok: false, error: "Informe o ID do número, o token de acesso e o segredo do app." };
    // proteção contra preenchimento automático do navegador (e-mail ou senha salvos nos campos errados)
    const rawId = str(fd, "phoneNumberId") ?? "";
    if (/[@a-z]/i.test(rawId) || phoneNumberId.length < 8) return { ok: false, error: "O ID do número de telefone deve ter só números (veja em WhatsApp → Configuração da API, na Meta). Não é o telefone nem o e-mail." };
    if (str(fd, "appSecret") && !/^[a-f0-9]{32}$/i.test(appSecret)) return { ok: false, error: "A chave secreta do app tem 32 letras e números (Meta → Configurações do app → Básico). Confira se o navegador não preencheu uma senha salva." };
    if (str(fd, "token") && !/^EAA[A-Za-z0-9]{20,}$/.test(token)) return { ok: false, error: "O token de acesso começa com EAA… (gerado no usuário do sistema da Meta). Confira se o navegador não preencheu uma senha salva." };
    const taken = await db.whatsappAccount.findFirst({ where: { phoneNumberId, orgId: { not: ctx.org.id } }, select: { id: true } });
    if (taken) return { ok: false, error: "Este número já está conectado a outra empresa." };
    const info = await fetchPhoneInfo(phoneNumberId, token);
    if (!info.ok) return { ok: false, error: `A Meta recusou as credenciais: ${info.error}` };
    const sendStart = Math.min(23, Math.max(0, numOr(fd, "sendStart", 8)));
    const sendEnd = Math.min(24, Math.max(1, numOr(fd, "sendEnd", 20)));
    if (sendStart >= sendEnd) return { ok: false, error: "O horário de início dos envios deve ser anterior ao de término." };
    const data = {
      phoneNumberId,
      displayPhone: info.displayPhone || null,
      tokenEnc: encrypt(token),
      appSecretEnc: encrypt(appSecret),
      sendStart,
      sendEnd,
      autoCreateContact: fd.get("autoCreateContact") === "on",
      active: true,
    };
    await db.whatsappAccount.upsert({ where: { orgId: ctx.org.id }, update: data, create: { ...data, orgId: ctx.org.id, verifyToken: randomBytes(24).toString("hex") } });
    return done(`WhatsApp conectado${info.displayPhone ? `: ${info.displayPhone}` : ""}`);
  } catch (e) {
    return fail(e);
  }
}

export async function disconnectWhatsapp(): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
    await db.whatsappAccount.deleteMany({ where: { orgId: ctx.org.id } });
    await db.whatsappMessage.updateMany({ where: { orgId: ctx.org.id, status: "SCHEDULED" }, data: { status: "CANCELED", error: "WhatsApp desconectado." } });
    return done("WhatsApp desconectado");
  } catch (e) {
    return fail(e);
  }
}

export async function saveWhatsappBot(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const account = await getAccount(ctx.org.id);
    if (!account) return { ok: false, error: "Conecte o WhatsApp antes de configurar o chatbot." };
    let options: unknown = [];
    try {
      options = JSON.parse(str(fd, "options") ?? "[]");
    } catch {}
    const botConfig = resolveBot({
      greeting: str(fd, "greeting"),
      fallback: str(fd, "fallback"),
      handoffMessage: str(fd, "handoffMessage"),
      aiInstructions: str(fd, "aiInstructions") ?? "",
      options,
      roundRobin: fd.get("roundRobin") === "on",
      createDeal: fd.get("createDeal") === "on",
    });
    const wantsAi = str(fd, "botMode") === "AI";
    if (wantsAi && !ctx.settings.modules.aiBot) return { ok: false, error: "O chatbot com IA não está incluído no plano desta empresa." };
    if (wantsAi && !aiAvailable()) return { ok: false, error: "A chave de IA da plataforma (ANTHROPIC_API_KEY) não está configurada." };
    await db.whatsappAccount.update({ where: { id: account.id }, data: { botEnabled: fd.get("botEnabled") === "on", botMode: wantsAi ? "AI" : "MENU", botConfig } });
    return done("Chatbot salvo");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Conversas ------------------------------ */

/** Vendedores com visibilidade restrita só acessam conversas dos próprios contatos. */
function scope(ctx: Ctx) {
  const own = ownerScope(ctx);
  return own.ownerId ? { contact: { ownerId: own.ownerId } } : {};
}

async function conversationOf(ctx: Ctx, id: string) {
  const conv = await db.whatsappConversation.findFirst({ where: { id, orgId: ctx.org.id, ...scope(ctx) } });
  if (!conv) throw new Error("Conversa não encontrada");
  return conv;
}

export async function sendWhatsappMessage(conversationId: string, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const conv = await conversationOf(ctx, conversationId);
    const body = str(fd, "body");
    if (!body) return { ok: false, error: "Escreva a mensagem" };
    const templateName = str(fd, "templateName");
    const r = await queueMessage({
      orgId: ctx.org.id,
      conversationId: conv.id,
      body: body.slice(0, 4000),
      source: "MANUAL",
      userId: ctx.user.id,
      template: templateName ? { name: templateName, lang: str(fd, "templateLang") ?? "pt_BR", params: (str(fd, "templateParams") ?? "").split("|").map((p) => p.trim()).filter(Boolean) } : null,
    });
    // quem responde pela empresa assume a conversa: o robô se cala e o contador zera
    await db.whatsappConversation.update({ where: { id: conv.id }, data: { botPaused: true, unread: 0 } });
    revalidatePath("/whatsapp");
    if (r.status === "FAILED") return { ok: false, error: r.error ?? "Não foi possível enviar." };
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function markWhatsappRead(conversationId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const conv = await conversationOf(ctx, conversationId);
    if (conv.unread) await db.whatsappConversation.update({ where: { id: conv.id }, data: { unread: 0 } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setWhatsappBotPaused(conversationId: string, paused: boolean): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const conv = await conversationOf(ctx, conversationId);
    await db.whatsappConversation.update({ where: { id: conv.id }, data: { botPaused: paused } });
    return done(paused ? "Você assumiu a conversa: o robô não responde mais" : "Robô reativado nesta conversa");
  } catch (e) {
    return fail(e);
  }
}

export async function cancelWhatsappMessage(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const r = await db.whatsappMessage.updateMany({ where: { id, orgId: ctx.org.id, status: "SCHEDULED", conversation: scope(ctx) }, data: { status: "CANCELED", error: `Cancelada por ${ctx.user.name}.` } });
    return r.count ? done("Envio cancelado") : { ok: false, error: "Esta mensagem não está mais agendada." };
  } catch (e) {
    return fail(e);
  }
}

/** Abre (ou cria) a conversa com um contato. */
export async function openWhatsappConversation(contactId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const contact = await db.contact.findFirst({ where: { id: contactId, orgId: ctx.org.id, ...ownerScope(ctx) }, select: { id: true } });
    if (!contact) return { ok: false, error: "Contato não encontrado" };
    const conv = await conversationForContact(ctx.org.id, contact.id);
    if (!conv) return { ok: false, error: "O contato não tem um número de WhatsApp ou telefone válido." };
    return { ok: true, id: conv.id };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Transfere o atendimento: o contato e os negócios em aberto dele passam para o novo responsável
 * (com o aviso de transferência no card do funil) e o robô fica calado na conversa.
 */
export async function transferWhatsappConversation(conversationId: string, toId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const conv = await conversationOf(ctx, conversationId);
    if (!conv.contactId) return { ok: false, error: "Vincule a conversa a um contato antes de transferir." };
    const to = await db.membership.findFirst({ where: { orgId: ctx.org.id, userId: toId, active: true }, include: { user: { select: { name: true } } } });
    if (!to) return { ok: false, error: "Responsável inválido" };
    await db.contact.update({ where: { id: conv.contactId }, data: { ownerId: toId } });
    const deals = await db.deal.findMany({ where: { orgId: ctx.org.id, contactId: conv.contactId, status: "OPEN" }, select: { id: true, title: true, ownerId: true } });
    await transferDeals(ctx, deals, toId);
    await db.whatsappConversation.update({ where: { id: conv.id }, data: { botPaused: true } });
    if (toId !== ctx.user.id)
      await notify(ctx.org.id, [toId], { type: "WHATSAPP", title: `Conversa no WhatsApp transferida para você: ${conv.name || conv.phone}`, body: `Transferida por ${ctx.user.name}`, href: `/whatsapp?c=${conv.id}` });
    return done(toId === ctx.user.id ? "Você assumiu o atendimento" : `Atendimento transferido para ${to.user.name}`);
  } catch (e) {
    return fail(e);
  }
}
