import "server-only";
import { db } from "./db";
import { logEvent } from "./events";
import { notify } from "./notify";

/**
 * Transferência de atendimento: valida o novo responsável, registra quem transferiu e quando
 * (aviso automático no card do funil) e avisa o novo e o antigo responsável.
 */
export async function transferDeals(ctx: { org: { id: string }; user: { id: string; name: string } }, deals: { id: string; title: string; ownerId: string | null }[], toId: string | null) {
  if (toId && !(await db.membership.findFirst({ where: { orgId: ctx.org.id, userId: toId, active: true } }))) throw new Error("Responsável inválido");
  const moved = deals.filter((d) => d.ownerId !== toId);
  if (!moved.length) return;
  const now = new Date();
  for (const d of moved) {
    await db.deal.update({ where: { id: d.id }, data: { ownerId: toId, transferredAt: now, transferFromId: d.ownerId, transferById: ctx.user.id } });
    await logEvent({ orgId: ctx.org.id, type: "DEAL_OWNER", userId: ctx.user.id, dealId: d.id });
  }
  const one = moved.length === 1 ? moved[0]! : null;
  const href = one ? `/deals/${one.id}` : "/deals";
  const what = one ? `“${one.title}”` : `${moved.length} negócios`;
  // novo responsável recebe o atendimento; o anterior fica sabendo (sem avisar quem fez a ação)
  await notify(ctx.org.id, [toId].filter((x) => x !== ctx.user.id), { type: "DEAL_TRANSFER", title: `Atendimento transferido para você: ${what}`, body: `Transferido por ${ctx.user.name}`, href });
  const previous = [...new Set(moved.map((d) => d.ownerId))].filter((x) => x && x !== ctx.user.id && x !== toId);
  await notify(ctx.org.id, previous, { type: "DEAL_TRANSFER", title: `Atendimento transferido: ${what}`, body: `Transferido por ${ctx.user.name}`, href });
}
