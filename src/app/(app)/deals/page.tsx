import { requireContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { DealsView, type BoardDeal } from "./deals-view";

export const metadata = { title: "Negócios" };

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string; view?: string; owner?: string; q?: string; status?: string; tag?: string }>;
}) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const pipelines = await db.pipeline.findMany({ where: { orgId: ctx.org.id }, orderBy: { position: "asc" } });
  const pipeline = pipelines.find((p) => p.id === sp.pipeline) ?? pipelines.find((p) => p.isDefault) ?? pipelines[0];
  if (!pipeline) return <p className="p-6">Nenhum funil configurado.</p>;
  const status = (sp.status ?? "OPEN").toUpperCase();
  const view = sp.view === "list" ? "list" : "board";

  const where: Prisma.DealWhereInput = {
    orgId: ctx.org.id,
    pipelineId: pipeline.id,
    ...ownerScope(ctx),
    ...(status !== "ALL" ? { status: status as "OPEN" | "WON" | "LOST" } : {}),
    ...(sp.owner ? { ownerId: sp.owner === "me" ? ctx.user.id : sp.owner } : {}),
    ...(sp.tag ? { tags: { has: sp.tag } } : {}),
    ...(sp.q
      ? {
          OR: [
            { title: { contains: sp.q, mode: "insensitive" } },
            { contact: { name: { contains: sp.q, mode: "insensitive" } } },
            { company: { name: { contains: sp.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [stages, deals] = await Promise.all([
    db.stage.findMany({ where: { pipelineId: pipeline.id }, orderBy: { position: "asc" } }),
    db.deal.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      take: 2000,
      include: {
        contact: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        activities: { where: { done: false }, orderBy: { dueAt: "asc" }, take: 1, select: { dueAt: true, title: true, type: true } },
      },
    }),
  ]);

  const data: BoardDeal[] = deals.map((d) => ({
    id: d.id,
    title: d.title,
    value: Number(d.value),
    stageId: d.stageId,
    status: d.status,
    position: d.position,
    ownerId: d.ownerId,
    tags: d.tags,
    probability: d.probability,
    expectedClose: d.expectedClose?.toISOString() ?? null,
    stageChangedAt: d.stageChangedAt.toISOString(),
    createdAt: d.createdAt.toISOString(),
    contact: d.contact,
    company: d.company,
    nextActivity: d.activities[0] ? { title: d.activities[0].title, type: d.activities[0].type, dueAt: d.activities[0].dueAt?.toISOString() ?? null } : null,
  }));

  return (
    <DealsView
      key={pipeline.id + view}
      pipelineId={pipeline.id}
      view={view}
      status={status}
      stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color, probability: s.probability, type: s.type, rottingDays: s.rottingDays }))}
      deals={data}
      filters={{ owner: sp.owner ?? "", q: sp.q ?? "", tag: sp.tag ?? "" }}
    />
  );
}
