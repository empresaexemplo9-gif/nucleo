import { notFound } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadFeed } from "@/lib/feed-data";
import { canEditModule, getModuleByKey, recordScope } from "@/lib/modules";
import { resolveRefs } from "@/lib/module-data";
import { RecordDetail } from "./record-detail";

export default async function RecordPage({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module, id } = await params;
  const ctx = await requireContext();
  const mod = await getModuleByKey(ctx, module);
  if (!mod) notFound();
  const r = await db.moduleRecord.findFirst({
    where: { id, orgId: ctx.org.id, moduleId: mod.id, ...recordScope(ctx) },
    include: { contact: { select: { id: true, name: true } }, company: { select: { id: true, name: true } }, createdBy: { select: { name: true } } },
  });
  if (!r) notFound();
  const data = (r.data ?? {}) as Record<string, unknown>;
  const [refs, feed] = await Promise.all([resolveRefs(ctx.org.id, mod.fields, [data]), loadFeed({ recordId: r.id })]);
  return (
    <RecordDetail
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
      record={{
        id: r.id,
        number: r.number,
        title: r.title,
        statusId: r.statusId,
        assigneeId: r.assigneeId,
        data,
        dueAt: r.dueAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        closedAt: r.closedAt?.toISOString() ?? null,
        createdBy: r.createdBy?.name ?? null,
        contact: r.contact ? { id: r.contact.id, label: r.contact.name } : null,
        company: r.company ? { id: r.company.id, label: r.company.name } : null,
        canDelete: ctx.role !== "VIEWER" && (["OWNER", "ADMIN", "MANAGER"].includes(ctx.role) || r.createdById === ctx.user.id),
      }}
      refs={refs}
      feed={feed}
    />
  );
}
