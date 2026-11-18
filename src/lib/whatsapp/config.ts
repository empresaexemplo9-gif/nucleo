/** Tipos e padrões do WhatsApp compartilhados entre servidor e telas. */

export type WaTemplate = {
  /** Nome do modelo aprovado na Meta */
  name: string;
  /** Idioma do modelo, ex.: pt_BR */
  language: string;
  /** Nome amigável no CRM */
  label: string;
  /** Texto do modelo com {{1}}, {{2}}… (para pré-visualização e histórico) */
  body: string;
  /** Quantidade de variáveis do corpo */
  params: number;
};

export type MenuAction = "reply" | "handoff" | "ai";

export type MenuOption = {
  id: string;
  label: string;
  action: MenuAction;
  /** Resposta enviada ao escolher (action "reply") ou antes de transferir */
  reply?: string;
  /** Etiqueta aplicada ao contato ao escolher */
  tag?: string;
};

export type BotConfig = {
  enabled: boolean;
  welcome: string;
  menuTitle: string;
  menu: MenuOption[];
  /** Mensagem quando o atendimento passa para a equipe */
  handoffText: string;
  /** Mensagem quando o atendimento é encerrado */
  closingText: string;
  ai: { enabled: boolean; knowledge: string; persona: string };
  /** Cria um negócio no funil quando o atendimento passa para a equipe */
  createDeal: boolean;
  pipelineId: string | null;
  /** round_robin: distribui entre consultores e gestores; none: fica na fila */
  assign: "round_robin" | "none";
  /** Horário de atendimento humano (opcional) */
  hours: { enabled: boolean; start: string; end: string; days: number[]; offText: string };
};

export const DEFAULT_BOT: BotConfig = {
  enabled: true,
  welcome: "Olá, {nome}! 👋 Seja bem-vindo(a) à {empresa}.",
  menuTitle: "Como podemos ajudar?",
  menu: [
    { id: "comprar", label: "Quero comprar", action: "handoff", reply: "Ótimo! Vou te passar para um consultor.", tag: "Interesse em compra" },
    { id: "duvidas", label: "Tirar dúvidas", action: "ai", reply: "Claro! Pode perguntar o que quiser." },
    { id: "atendente", label: "Falar com atendente", action: "handoff" },
  ],
  handoffText: "Um de nossos consultores vai continuar seu atendimento por aqui em instantes.",
  closingText: "Atendimento encerrado. Obrigado pelo contato! Se precisar, é só mandar uma mensagem.",
  ai: { enabled: false, knowledge: "", persona: "simpático, objetivo e profissional" },
  createDeal: true,
  pipelineId: null,
  assign: "round_robin",
  hours: { enabled: false, start: "08:00", end: "18:00", days: [1, 2, 3, 4, 5], offText: "Nosso time atende de segunda a sexta, das 8h às 18h. Assim que abrirmos, um consultor responde por aqui." },
};

const s = (v: unknown, max: number, fallback = "") => (typeof v === "string" ? v.slice(0, max) : fallback);

export function resolveBot(raw: unknown): BotConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<BotConfig>;
  const menu = Array.isArray(r.menu)
    ? r.menu
        .filter((o) => o && typeof o.label === "string" && o.label.trim())
        .slice(0, 10)
        .map((o, i) => ({
          id: s(o.id, 40) || `op${i + 1}`,
          label: s(o.label, 24).trim(),
          action: (["reply", "handoff", "ai"] as const).includes(o.action) ? o.action : "reply",
          reply: s(o.reply, 1000) || undefined,
          tag: s(o.tag, 40).trim() || undefined,
        }))
    : DEFAULT_BOT.menu;
  const h = { ...DEFAULT_BOT.hours, ...(r.hours ?? {}) };
  return {
    enabled: r.enabled ?? DEFAULT_BOT.enabled,
    welcome: s(r.welcome, 1000, DEFAULT_BOT.welcome),
    menuTitle: s(r.menuTitle, 200, DEFAULT_BOT.menuTitle) || DEFAULT_BOT.menuTitle,
    menu,
    handoffText: s(r.handoffText, 1000, DEFAULT_BOT.handoffText),
    closingText: s(r.closingText, 1000, DEFAULT_BOT.closingText),
    ai: {
      enabled: !!r.ai?.enabled,
      knowledge: s(r.ai?.knowledge, 20000),
      persona: s(r.ai?.persona, 200, DEFAULT_BOT.ai.persona) || DEFAULT_BOT.ai.persona,
    },
    createDeal: r.createDeal ?? DEFAULT_BOT.createDeal,
    pipelineId: typeof r.pipelineId === "string" && r.pipelineId ? r.pipelineId : null,
    assign: r.assign === "none" ? "none" : "round_robin",
    hours: {
      enabled: !!h.enabled,
      start: /^\d{2}:\d{2}$/.test(h.start) ? h.start : DEFAULT_BOT.hours.start,
      end: /^\d{2}:\d{2}$/.test(h.end) ? h.end : DEFAULT_BOT.hours.end,
      days: Array.isArray(h.days) ? h.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : DEFAULT_BOT.hours.days,
      offText: s(h.offText, 1000, DEFAULT_BOT.hours.offText),
    },
  };
}

export function resolveTemplates(raw: unknown): WaTemplate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && typeof t.name === "string" && /^[a-z0-9_]+$/.test(t.name))
    .slice(0, 100)
    .map((t) => ({
      name: t.name,
      language: s(t.language, 10, "pt_BR") || "pt_BR",
      label: s(t.label, 80) || t.name,
      body: s(t.body, 1024),
      params: Math.max(0, Math.min(10, Number(t.params) || countParams(String(t.body ?? "")))),
    }));
}

export function countParams(body: string) {
  const m = body.match(/\{\{\s*(\d+)\s*\}\}/g) ?? [];
  return m.reduce((n, x) => Math.max(n, Number(x.replace(/\D/g, ""))), 0);
}

/** Preenche {{1}}, {{2}}… com os valores (para histórico e pré-visualização). */
export function fillTemplate(body: string, params: string[]) {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => params[Number(n) - 1] ?? "");
}

/** Normaliza telefone brasileiro para o formato do WhatsApp (55 + DDD + número, só dígitos). */
export function toWaId(phone: string | null | undefined): string | null {
  let d = (phone ?? "").replace(/\D/g, "");
  if (!d) return null;
  d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d.length >= 12 && d.length <= 15 ? d : null;
}

/** Mesmo número com e sem o nono dígito (a Meta pode devolver qualquer uma das formas). */
export function waIdVariants(waId: string) {
  const v = new Set([waId]);
  const m = waId.match(/^55(\d{2})(\d{8,9})$/);
  if (m) {
    const [, ddd, n] = m;
    if (n.length === 9 && n.startsWith("9")) v.add(`55${ddd}${n.slice(1)}`);
    if (n.length === 8) v.add(`55${ddd}9${n}`);
  }
  return [...v];
}

export function formatWa(waId: string) {
  const m = waId.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : `+${waId}`;
}

export const WINDOW_MS = 24 * 60 * 60 * 1000;
export const inWindow = (lastInboundAt: string | Date | null | undefined) => !!lastInboundAt && Date.now() - new Date(lastInboundAt).getTime() < WINDOW_MS;

export const CONVERSATION_STATUS: Record<string, { label: string; color: string }> = {
  BOT: { label: "Chatbot", color: "var(--info, #3b82f6)" },
  QUEUE: { label: "Na fila", color: "var(--warn)" },
  OPEN: { label: "Em atendimento", color: "var(--ok)" },
  CLOSED: { label: "Encerrado", color: "var(--muted, #888)" },
};

/** Variáveis aceitas nos textos: {nome}, {primeiro_nome}, {empresa}, {negocio}, {consultor}. */
export function fillVars(text: string, vars: Record<string, string | null | undefined>) {
  return text.replace(/\{(nome|primeiro_nome|empresa|negocio|consultor|valor)\}/g, (_, k) => vars[k] ?? "").replace(/ {2,}/g, " ").replace(/\s+([,!.?])/g, "$1");
}
