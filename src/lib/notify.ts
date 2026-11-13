import "server-only";
import { db } from "./db";

/** Cria notificações internas para os usuários indicados (sem duplicar). */
export async function notify(orgId: string, userIds: (string | null | undefined)[], n: { type: string; title: string; body?: string; href?: string }) {
  const ids = [...new Set(userIds.filter((x): x is string => !!x))];
  if (!ids.length) return;
  await db.notification.createMany({ data: ids.map((userId) => ({ orgId, userId, ...n })) });
}

/** Gestores da empresa (para avisos comerciais importantes). */
export async function managers(orgId: string) {
  const ms = await db.membership.findMany({ where: { orgId, active: true, role: { in: ["OWNER", "ADMIN", "MANAGER"] } }, select: { userId: true } });
  return ms.map((m) => m.userId);
}
