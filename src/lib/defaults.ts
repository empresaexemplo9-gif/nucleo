import type { Prisma } from "@prisma/client";

/** Cores iniciais das etapas (dados editáveis pelo cliente), derivadas da paleta DRAP. */
export const DEFAULT_STAGES = [
  { name: "Prospecção", color: "#7d828c", probability: 10, rottingDays: 7 },
  { name: "Qualificação", color: "#3c78c0", probability: 25, rottingDays: 7 },
  { name: "Apresentação", color: "#2d63a3", probability: 45, rottingDays: 10 },
  { name: "Proposta", color: "#b48a4f", probability: 65, rottingDays: 10 },
  { name: "Negociação", color: "#8a672f", probability: 85, rottingDays: 14 },
];

export const DEFAULT_LOST_REASONS = [
  "Preço alto",
  "Escolheu concorrente",
  "Sem orçamento",
  "Sem resposta / sumiu",
  "Momento inadequado",
  "Produto não atende",
];

export const ACTIVITY_TYPES = {
  CALL: { label: "Ligação", color: "var(--accent-2)" },
  MEETING: { label: "Reunião", color: "var(--accent)" },
  TASK: { label: "Tarefa", color: "var(--text-dim)" },
  EMAIL: { label: "E-mail", color: "var(--accent-2-text)" },
  DEADLINE: { label: "Prazo", color: "var(--err)" },
  LUNCH: { label: "Almoço", color: "var(--accent-text)" },
  WHATSAPP: { label: "WhatsApp", color: "var(--ok)" },
} as const;

export const LIFECYCLES = [
  { value: "lead", label: "Lead" },
  { value: "mql", label: "Lead qualificado (MQL)" },
  { value: "sql", label: "Oportunidade (SQL)" },
  { value: "customer", label: "Cliente" },
  { value: "evangelist", label: "Promotor" },
  { value: "churned", label: "Ex-cliente" },
];

export const SOURCES = ["Indicação", "Site", "Google Ads", "Meta Ads", "Instagram", "LinkedIn", "Evento", "Prospecção ativa", "WhatsApp", "Outro"];

export async function setupOrganization(tx: Prisma.TransactionClient, orgId: string) {
  const pipeline = await tx.pipeline.create({
    data: { orgId, name: "Vendas", isDefault: true, position: 0 },
  });
  await tx.stage.createMany({
    data: [
      ...DEFAULT_STAGES.map((s, i) => ({ ...s, pipelineId: pipeline.id, position: i })),
      { name: "Ganho", color: "#17905f", probability: 100, position: 100, type: "WON" as const, pipelineId: pipeline.id },
      { name: "Perdido", color: "#cf3a56", probability: 0, position: 101, type: "LOST" as const, pipelineId: pipeline.id },
    ],
  });
  await tx.lostReason.createMany({ data: DEFAULT_LOST_REASONS.map((label) => ({ orgId, label })) });
  await tx.tag.createMany({
    data: [
      { orgId, name: "Quente", color: "#cf3a56" },
      { orgId, name: "VIP", color: "#b48a4f" },
      { orgId, name: "Retorno", color: "#3c78c0" },
    ],
  });
  return pipeline;
}
