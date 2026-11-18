import "server-only";
import type { Ctx } from "../auth";

/** Consultor com visibilidade "só os próprios" vê os atendimentos dele e os ainda sem responsável. */
export function conversationScope(ctx: Ctx) {
  if (ctx.settings.visibility === "OWN" && ctx.role === "SALES") return { OR: [{ assigneeId: ctx.user.id }, { assigneeId: null }] };
  return {};
}
