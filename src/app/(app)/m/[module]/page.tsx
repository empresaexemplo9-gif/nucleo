import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { canEditModule, getModuleByKey, recordScope } from "@/lib/modules";
import { resolveRefs } from "@/lib/module-data";
import { ModuleView, type RecordRow } from "./module-view";

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const ctx = await requireContext();
  const mod = await getModuleByKey(ctx, (await params).module);
  return { title: mod?.name ?? "Módulo" };
}

const PAGE = 100;

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ q?: string; status?: string; who?: string; view?: string; page?: string; scope?: string; new?: string }>;
}) {
  const ctx = await requireContext();
  const mod = await getModuleByKey(ctx, (await params).module);
  if (!mod) notFound();
  const sp = await searchParams;
  const view = sp.view === "board" ? "board" : "list";
  const page = Math.max(1, Number(sp.page) || 1);
  const scopeOpen = sp.scope !== "all";
  const finals = mod.statuses.filter((s) => s.isFinal).map((s) => s.id);
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86400000);

  const base: Prisma.ModuleRecordWhereInput = { orgId: ctx.org.id, moduleId: mod.id, ...recordScope(ctx) };
  const openWhere: Prisma.ModuleRecordWhereInput = { ...base, OR: [{ statusId: null }, { statusId: { notIn: finals } }] };
  const where: Prisma.ModuleRecordWhereInput = {
    ...base,
    ...(sp.status ? { statusId: sp.status } : view === "list" && scopeOpen ? { OR: [{ statusId: null }, { statusId: { notIn: finals } }] } : {}),
    ...(sp.who ? { assigneeId: sp.who === "me" ? ctx.user.id : sp.who } : {}),
    ...(sp.q
      ? {
          AND: [
            {
              OR: [
                { title: { contains: sp.q, mode: "insensitive" as const } },
                ...(Number.isFinite(Number(sp.q.replace(/\D/g, ""))) && sp.q.replace(/\D/g, "") ? [{ number: Number(sp.q.replace(/\D/g, "")) }] : []),
              ],
            },
          ],
        }
      : {}),
  };

  const [total, records, openCount, overdue, dueSoon, openSum, allCount] = await Promise.all([
    db.moduleRecord.count({ where }),
    db.moduleRecord.findMany({
      where,
      orderBy: view === "board" ? [{ position: "asc" }] : [{ updatedAt: "desc" }],
      skip: view === "board" ? 0 : (page - 1) * PAGE,
      take: view === "board" ? 500 : PAGE,
      include: { status: true },
    }),
    db.moduleRecord.count({ where: openWhere }),
    db.moduleRecord.count({ where: { ...openWhere, dueAt: { lt: now } } }),
    db.moduleRecord.count({ where: { ...openWhere, dueAt: { gte: now, lt: week } } }),
    db.moduleRecord.aggregate({ where: openWhere, _sum: { amount: true } }),
    db.moduleRecord.count({ where: base }),
  ]);
  const refs = await resolveRefs(ctx.org.id, mod.fields, records.map((r) => (r.data ?? {}) as Record<string, unknown>));

  const rows: RecordRow[] = records.map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    statusId: r.statusId,
    assigneeId: r.assigneeId,
    data: (r.data ?? {}) as Record<string, unknown>,
    dueAt: r.dueAt?.toISOString() ?? null,
    isFinal: !!r.status?.isFinal,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <ModuleView
      key={mod.id + view + (sp.new ?? "")}
      mod={{
        id: mod.id,
        key: mod.key,
        name: mod.name,
        singular: mod.singular,
        description: mod.description,
        icon: mod.icon,
        color: mod.color,
        prefix: mod.prefix,
        dueFieldKey: mod.dueFieldKey,
        amountFieldKey: mod.amountFieldKey,
        canEdit: canEditModule(ctx, mod),
        fields: mod.fields.map((f) => ({ id: f.id, key: f.key, label: f.label, type: f.type, options: f.options, required: f.required, showInList: f.showInList })),
        statuses: mod.statuses.map((s) => ({ id: s.id, name: s.name, color: s.color, isFinal: s.isFinal })),
      }}
      rows={rows}
      refs={refs}
      view={view}
      total={total}
      page={page}
      pageSize={PAGE}
      stats={{ open: openCount, overdue, dueSoon, openSum: Number(openSum._sum.amount ?? 0), all: allCount }}
      filters={{ q: sp.q ?? "", status: sp.status ?? "", who: sp.who ?? "", scope: sp.scope ?? "" }}
      openNew={sp.new === "1"}
    />
  );
}
