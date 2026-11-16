import "server-only";
import { db } from "./db";

/** Limpa a lista padrão de uma etapa: sem vazios, sem repetidos, tamanho controlado. */
export function cleanChecklist(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const raw of items) {
    const t = String(raw ?? "").trim().slice(0, 160);
    if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out.slice(0, 30);
}

/**
 * Cria no negócio os itens do checklist padrão da etapa (só os que ainda não existem para aquela etapa).
 * Chamado quando o negócio é criado ou entra numa etapa aberta.
 */
export async function applyStageChecklist(orgId: string, dealId: string, stageId: string, userId: string | null) {
  const stage = await db.stage.findUnique({ where: { id: stageId }, select: { checklist: true, type: true } });
  if (!stage || stage.type !== "OPEN" || !stage.checklist.length) return;
  const existing = await db.dealChecklistItem.findMany({ where: { dealId }, select: { title: true, stageId: true, position: true } });
  const have = new Set(existing.filter((i) => i.stageId === stageId).map((i) => i.title.toLowerCase()));
  let pos = existing.reduce((m, i) => Math.max(m, i.position), 0);
  const data = stage.checklist
    .filter((t) => !have.has(t.toLowerCase()))
    .map((title) => ({ orgId, dealId, title, stageId, position: (pos += 10), createdById: userId }));
  if (data.length) await db.dealChecklistItem.createMany({ data });
}

/**
 * Bloqueio de avanço: se a etapa atual exige o checklist, retorna a mensagem de erro
 * quando ainda há itens dela pendentes; senão, null.
 */
export async function checklistBlock(deal: { id: string; stageId: string; stage: { name: string; checklistRequired: boolean } }) {
  if (!deal.stage.checklistRequired) return null;
  const pending = await db.dealChecklistItem.count({ where: { dealId: deal.id, stageId: deal.stageId, done: false } });
  if (!pending) return null;
  return `Conclua o checklist da etapa “${deal.stage.name}” antes de avançar (${pending} ${pending === 1 ? "item pendente" : "itens pendentes"}).`;
}
