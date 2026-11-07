import type { Prisma } from "@prisma/client";

export const DEFAULT_STAGES = [
  { name: "Prospecção", color: "#64748b", probability: 10, rottingDays: 7 },
  { name: "Qualificação", color: "#3b82f6", probability: 25, rottingDays: 7 },
  { name: "Apresentação", color: "#8b5cf6", probability: 45, rottingDays: 10 },
  { name: "Proposta", color: "#f59e0b", probability: 65, rottingDays: 10 },
  { name: "Negociação", color: "#f97316", probability: 85, rottingDays: 14 },
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
  CALL: { label: "Ligação", color: "#0ea5e9" },
  MEETING: { label: "Reunião", color: "#8b5cf6" },
  TASK: { label: "Tarefa", color: "#64748b" },
  EMAIL: { label: "E-mail", color: "#f59e0b" },
  DEADLINE: { label: "Prazo", color: "#ef4444" },
  LUNCH: { label: "Almoço", color: "#10b981" },
  WHATSAPP: { label: "WhatsApp", color: "#22c55e" },
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
      { name: "Ganho", color: "#16a34a", probability: 100, position: 100, type: "WON" as const, pipelineId: pipeline.id },
      { name: "Perdido", color: "#dc2626", probability: 0, position: 101, type: "LOST" as const, pipelineId: pipeline.id },
    ],
  });
  await tx.lostReason.createMany({ data: DEFAULT_LOST_REASONS.map((label) => ({ orgId, label })) });
  await tx.tag.createMany({
    data: [
      { orgId, name: "Quente", color: "#ef4444" },
      { orgId, name: "VIP", color: "#a855f7" },
      { orgId, name: "Retorno", color: "#0ea5e9" },
    ],
  });
  return pipeline;
}
