import type { Prisma } from "@prisma/client";
import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeActivity } from "@/lib/feed-data";
import { ActivitiesView } from "./activities-view";

export const metadata = { title: "Atividades" };

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ when?: string; who?: string; type?: string; view?: string; month?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const when = sp.when ?? "pending";
  const view = sp.view === "calendar" ? "calendar" : "list";
  const who = sp.who ?? (ctx.role === "SALES" ? "me" : "");
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const week = new Date(start);
  week.setDate(week.getDate() + 7);

  let range: Prisma.ActivityWhereInput = {};
  let monthStart: Date | null = null;
  if (view === "calendar") {
    const [y, m] = (sp.month ?? `${now.getFullYear()}-${now.getMonth() + 1}`).split("-").map(Number);
    monthStart = new Date(y!, m! - 1, 1);
    const from = new Date(monthStart);
    from.setDate(from.getDate() - 7);
    const to = new Date(y!, m!, 7);
    range = { dueAt: { gte: from, lt: to } };
  } else {
    range =
      when === "overdue" ? { done: false, dueAt: { lt: now } }
      : when === "today" ? { dueAt: { gte: start, lt: end } }
      : when === "week" ? { done: false, dueAt: { gte: start, lt: week } }
      : when === "done" ? { done: true }
      : when === "all" ? {}
      : { done: false };
  }
  const where: Prisma.ActivityWhereInput = {
    orgId: ctx.org.id,
    ...range,
    ...(who ? { assigneeId: who === "me" ? ctx.user.id : who } : {}),
    ...(sp.type ? { type: sp.type as never } : {}),
  };
  const [list, counts] = await Promise.all([
    db.activity.findMany({
      where,
      orderBy: when === "done" ? { doneAt: "desc" } : [{ dueAt: { sort: "asc", nulls: "last" } }],
      take: 500,
      include: { deal: { select: { id: true, title: true } }, contact: { select: { id: true, name: true } }, company: { select: { id: true, name: true } } },
    }),
    Promise.all([
      db.activity.count({ where: { orgId: ctx.org.id, done: false, dueAt: { lt: now }, ...(who ? { assigneeId: who === "me" ? ctx.user.id : who } : {}) } }),
      db.activity.count({ where: { orgId: ctx.org.id, done: false, dueAt: { gte: start, lt: end }, ...(who ? { assigneeId: who === "me" ? ctx.user.id : who } : {}) } }),
    ]),
  ]);
  return (
    <ActivitiesView
      activities={list.map(serializeActivity)}
      when={when}
      who={who}
      type={sp.type ?? ""}
      view={view}
      month={monthStart?.toISOString() ?? null}
      counts={{ overdue: counts[0], today: counts[1] }}
    />
  );
}
