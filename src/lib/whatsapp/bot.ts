import "server-only";
import type { WhatsappAccount, WhatsappConversation } from "@prisma/client";
import { db } from "../db";
import { resolveSettings } from "../labels";
import { aiReply } from "./ai";
import { menuText, resolveBot, type BotConfig } from "./bot-config";
import { leadForHandoff, notifyConversation, queueMessage } from "./service";

const HUMAN = /\b(atendente|humano|pessoa|vendedor|consultor|falar com (algu[eé]m|voc[eê]s))\b/i;
const GREET = /^(oi+|ol[aá]|menu|in[ií]cio|bom dia|boa tarde|boa noite|opa|e a[ií])\b/i;

const fill = (t: string, vars: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);

async function say(conv: WhatsappConversation, body: string) {
  if (body.trim()) await queueMessage({ orgId: conv.orgId, conversationId: conv.id, body: body.trim(), source: "BOT" });
}

async function handoff(conv: WhatsappConversation, cfg: BotConfig, message: string, reason?: string) {
  await db.whatsappConversation.update({ where: { id: conv.id }, data: { botPaused: true } });
  await say(conv, message || cfg.handoffMessage);
  // responsável em rodízio e negócio no funil antes do aviso, para o link já levar ao lead completo
  await leadForHandoff(conv, cfg, reason).catch((e) => console.error("Falha ao preparar o lead do WhatsApp", e));
  await notifyConversation(conv, `${conv.name || conv.phone} pediu atendimento no WhatsApp`, reason);
}

/** Responde à mensagem do cliente. O robô fica calado enquanto houver atendimento humano. */
export async function runBot(account: WhatsappAccount, conv: WhatsappConversation, text: string, first: boolean) {
  if (!account.botEnabled || conv.botPaused) return;
  const org = await db.organization.findUnique({ where: { id: conv.orgId }, select: { name: true, settings: true } });
  if (!org) return;
  const cfg = resolveBot(account.botConfig);
  const firstName = conv.contactId ? (conv.name ?? "").trim().split(/\s+/)[0] : "";
  const vars = { nome: firstName && !/^WhatsApp\b/.test(conv.name ?? "") ? `, ${firstName}` : "", empresa: org.name };
  const t = text.trim();

  if (account.botMode === "AI" && resolveSettings(org.settings).modules.aiBot) {
    const rows = await db.whatsappMessage.findMany({
      where: { conversationId: conv.id, status: { notIn: ["SCHEDULED", "SENDING", "FAILED", "CANCELED"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { direction: true, body: true },
    });
    const history = rows.reverse().map((m) => ({ role: m.direction === "IN" ? ("user" as const) : ("assistant" as const), content: m.body }));
    while (history.length && history[0]!.role !== "user") history.shift();
    const r = await aiReply(org.name, cfg.aiInstructions, history);
    if (r) {
      if (r.handoff) return handoff(conv, cfg, r.text, r.reason);
      if (r.text) return say(conv, r.text);
    }
    // IA indisponível: cai no menu para o cliente nunca ficar sem resposta
  }

  if (HUMAN.test(t)) return handoff(conv, cfg, cfg.handoffMessage, t.slice(0, 140));
  const menu = menuText(cfg.options);
  const n = /^\d$/.test(t) ? Number(t) : NaN;
  const picked = cfg.options[n - 1] ?? cfg.options.find((o) => o.label.toLowerCase() === t.toLowerCase());
  if (picked) {
    if (picked.handoff) return handoff(conv, cfg, fill(picked.answer, vars) || cfg.handoffMessage, picked.label);
    return say(conv, fill(picked.answer, vars));
  }
  if (first || GREET.test(t)) return say(conv, [fill(cfg.greeting, vars), menu].filter(Boolean).join("\n\n"));
  return say(conv, [cfg.fallback, menu].filter(Boolean).join("\n\n"));
}
