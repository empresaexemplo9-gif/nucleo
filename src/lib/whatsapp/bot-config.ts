/** Configuração do chatbot (compartilhada entre servidor e telas). */
export type BotOption = { label: string; answer: string; handoff: boolean };
export type BotConfig = {
  greeting: string;
  options: BotOption[];
  fallback: string;
  handoffMessage: string;
  /** Instruções e informações da empresa para o assistente com IA */
  aiInstructions: string;
  /** Ao passar para a equipe: distribui contatos sem responsável em rodízio entre consultores e gestores */
  roundRobin: boolean;
  /** Ao passar para a equipe: cria o negócio no funil padrão se o contato não tiver um em aberto */
  createDeal: boolean;
};

export const DEFAULT_BOT: BotConfig = {
  greeting: "Olá{nome}! 👋 Aqui é da {empresa}. Como podemos ajudar?",
  options: [
    { label: "Horário de atendimento", answer: "Atendemos de segunda a sexta, das 9h às 18h.", handoff: false },
    { label: "Falar com um atendente", answer: "", handoff: true },
  ],
  fallback: "Não entendi. Responda com o número de uma das opções:",
  handoffMessage: "Certo! Vou chamar alguém da equipe para continuar o atendimento. Aguarde um instante. 🙂",
  aiInstructions: "",
  roundRobin: true,
  createDeal: true,
};

const text = (v: unknown, d: string, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : d);

export function resolveBot(raw: unknown): BotConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<BotConfig>;
  const options = Array.isArray(r.options)
    ? r.options
        .map((o) => ({ label: text(o?.label, "", 60), answer: text(o?.answer, "", 1500), handoff: !!o?.handoff }))
        .filter((o) => o.label && (o.answer || o.handoff))
        .slice(0, 9)
    : DEFAULT_BOT.options;
  return {
    greeting: text(r.greeting, DEFAULT_BOT.greeting, 600),
    options,
    fallback: text(r.fallback, DEFAULT_BOT.fallback, 300),
    handoffMessage: text(r.handoffMessage, DEFAULT_BOT.handoffMessage, 400),
    aiInstructions: typeof r.aiInstructions === "string" ? r.aiInstructions.trim().slice(0, 12_000) : "",
    roundRobin: r.roundRobin ?? DEFAULT_BOT.roundRobin,
    createDeal: r.createDeal ?? DEFAULT_BOT.createDeal,
  };
}

export function menuText(options: BotOption[]) {
  return options.map((o, i) => `*${i + 1}* - ${o.label}`).join("\n");
}
