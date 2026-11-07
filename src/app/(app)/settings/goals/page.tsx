import { db } from "@/lib/db";
import { guard } from "../guard";
import { GoalsManager } from "./goals-manager";

export const metadata = { title: "Metas" };

export default async function GoalsPage() {
  const ctx = await guard("MANAGER");
  const goals = await db.goal.findMany({ where: { orgId: ctx.org.id }, orderBy: [{ period: "desc" }], include: { user: true } });
  // progresso: receita ganha / negócios ganhos / atividades no mês
  const rows = await Promise.all(
    goals.map(async (g) => {
      const [y, m] = g.period.split("-").map(Number);
      const from = new Date(y!, m! - 1, 1);
      const to = new Date(y!, m!, 1);
      const who = g.userId ? { ownerId: g.userId } : {};
      let actual = 0;
      if (g.metric === "REVENUE") {
        const r = await db.deal.aggregate({ where: { orgId: ctx.org.id, status: "WON", closedAt: { gte: from, lt: to }, ...who }, _sum: { value: true } });
        actual = Number(r._sum.value ?? 0);
      } else if (g.metric === "DEALS_WON") {
        actual = await db.deal.count({ where: { orgId: ctx.org.id, status: "WON", closedAt: { gte: from, lt: to }, ...who } });
      } else {
        actual = await db.activity.count({ where: { orgId: ctx.org.id, done: true, doneAt: { gte: from, lt: to }, ...(g.userId ? { assigneeId: g.userId } : {}) } });
      }
      return { id: g.id, period: g.period, metric: g.metric, user: g.user?.name ?? null, target: Number(g.target), actual };
    }),
  );
  return <GoalsManager goals={rows} />;
}
