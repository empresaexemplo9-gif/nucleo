import "server-only";
import { db } from "../db";
import { fillVars, type MenuOption } from "./config";
import { aiAvailable, aiReply } from "./ai";
import { handoff, sendMessage, systemNote, type Channel } from "./service";

type BotState = { step?: "menu" | "ai"; misses?: number; aiTurns?: number };

const MENU_WORDS = /^(menu|in[ií]cio|0|voltar|op[cç][oõ]es)$/i;
const HUMAN_WORDS = /\b(atendente|humano|pessoa|consultor|vendedor|falar com algu[eé]m)\b/i;
/** Limite de respostas da IA por atendimento antes de chamar a equipe. */
const MAX_AI_TURNS = 12;

function withinHours(h: Channel["bot"]["hours"]) {
  if (!h.enabled) return true;
  // horário de Brasília
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  if (!h.days.includes(now.getDay())) return false;
  const hm = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = h.start.split(":").map(Number);
  const [eh, em] = h.end.split(":").map(Number);
  return hm >= sh! * 60 + sm! && hm < eh! * 60 + em!;
}

function matchOption(menu: MenuOption[], input: { text: string; choiceId?: string }) {
  if (input.choiceId) {
    const byId = menu.find((o) => o.id === input.choiceId);
    if (byId) return byId;
  }
  const t = input.text.trim().toLowerCase();
  const n = Number(t.replace(/[^\d]/g, ""));
  if (/^\d{1,2}[.)]?$/.test(t) && n >= 1 && n <= menu.length) return menu[n - 1];
  return menu.find((o) => o.label.toLowerCase() === t) ?? null;
}

/** Atendimento inicial: boas-vindas, menu, respostas, IA e passagem para a equipe. */
export async function runBot(channel: Channel, conversationId: string, input: { text: string; choiceId?: string }) {
  const bot = channel.bot;
  // IA ligada no chatbot e com chave configurada no servidor
  const ai = bot.ai.enabled && aiAvailable();
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  const state = (conv.botState ?? {}) as BotState;
  const first = (conv.name ?? "").split(" ")[0] || "";
  const vars = { nome: first, primeiro_nome: first, empresa: channel.orgName };
  const say = (text: string, sender: "bot" | "ia" = "bot") => sendMessage({ channel, conversationId, message: { kind: "text", text: fillVars(text, vars) }, sender });
  const showMenu = () =>
    bot.menu.length
      ? sendMessage({ channel, conversationId, message: { kind: "menu", text: fillVars(bot.menuTitle, vars), options: bot.menu.map((o) => ({ id: o.id, label: o.label })) }, sender: "bot" })
      : null;
  const setState = (s: BotState) => db.conversation.update({ where: { id: conversationId }, data: { botState: s } });

  const toTeam = async (opts?: { tag?: string; reason?: string; note?: string }) => {
    if (!withinHours(bot.hours)) await say(bot.hours.offText);
    else if (bot.handoffText) await say(bot.handoffText);
    await handoff(channel, conversationId, opts);
  };

  if (!bot.enabled) return toTeam({ reason: input.text.slice(0, 120) });

  // primeira mensagem do atendimento
  if (!state.step) {
    if (bot.welcome) await say(bot.welcome);
    if (bot.menu.length) {
      await showMenu();
      await setState({ step: "menu" });
    } else if (ai) {
      await setState({ step: "ai" });
      return answerWithAi(channel, conversationId, state, toTeam);
    } else return toTeam({ reason: input.text.slice(0, 120) });
    return;
  }

  if (MENU_WORDS.test(input.text.trim()) && bot.menu.length) {
    await showMenu();
    return setState({ step: "menu" });
  }
  if (HUMAN_WORDS.test(input.text) && !matchOption(bot.menu, input)) return toTeam({ reason: input.text.slice(0, 120) });

  if (state.step === "menu") {
    const opt = matchOption(bot.menu, input);
    if (opt) {
      if (opt.action === "handoff" || (opt.action === "ai" && !ai)) {
        if (opt.reply && opt.action === "handoff") await say(opt.reply);
        return toTeam({ tag: opt.tag, reason: `Escolheu “${opt.label}”` });
      }
      if (opt.tag) await tagContact(conv.contactId, opt.tag);
      if (opt.action === "ai") {
        await say(opt.reply || "Pode mandar sua pergunta 😊");
        return setState({ step: "ai" });
      }
      await say(`${opt.reply || "Certo!"}\n\nDigite *menu* para ver as opções ou *atendente* para falar com a equipe.`);
      return setState({ step: "menu", misses: 0 });
    }
    // texto livre no menu: a IA responde se estiver ativa
    if (ai) {
      await setState({ ...state, step: "ai" });
      return answerWithAi(channel, conversationId, state, toTeam);
    }
    const misses = (state.misses ?? 0) + 1;
    if (misses >= 2) return toTeam({ reason: input.text.slice(0, 120) });
    await say("Não entendi 🤔 Responda com o número de uma das opções:");
    await showMenu();
    return setState({ step: "menu", misses });
  }

  if (state.step === "ai") {
    if (!ai) return toTeam({ reason: input.text.slice(0, 120) });
    return answerWithAi(channel, conversationId, state, toTeam);
  }
}

async function tagContact(contactId: string | null, tag: string) {
  if (!contactId) return;
  const c = await db.contact.findUnique({ where: { id: contactId }, select: { tags: true } });
  if (c && !c.tags.includes(tag)) await db.contact.update({ where: { id: contactId }, data: { tags: { push: tag } } });
}

async function answerWithAi(channel: Channel, conversationId: string, state: BotState, toTeam: (o?: { tag?: string; reason?: string; note?: string }) => Promise<unknown>) {
  const turns = (state.aiTurns ?? 0) + 1;
  if (turns > MAX_AI_TURNS) return toTeam({ reason: "Conversa longa com a IA" });
  const history = await db.whatsAppMessage.findMany({
    where: { conversationId, kind: { not: "system" } },
    orderBy: { createdAt: "desc" },
    take: 24,
    select: { direction: true, body: true },
  });
  const r = await aiReply(channel, history.reverse());
  if (!r) {
    await systemNote(channel.orgId, conversationId, "IA indisponível: atendimento enviado para a equipe.");
    return toTeam({ reason: "IA indisponível" });
  }
  if (r.reply) await sendMessage({ channel, conversationId, message: { kind: "text", text: r.reply }, sender: "ia" });
  await db.conversation.update({ where: { id: conversationId }, data: { botState: { ...state, step: "ai", aiTurns: turns } } });
  if (r.handoff) {
    const note = r.summary ? `Resumo do atendimento pela IA: ${r.summary}` : undefined;
    if (r.summary) await systemNote(channel.orgId, conversationId, `Resumo da IA: ${r.summary}`);
    // a IA já avisou o cliente: transfere sem repetir a mensagem de transferência
    await handoff(channel, conversationId, { reason: r.summary?.slice(0, 120) || "Pedido de atendimento humano", note, tag: r.interest || undefined });
  }
}
