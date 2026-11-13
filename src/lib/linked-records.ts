import "server-only";
import type { Ctx } from "./auth";
import { db } from "./db";
import { recordCode, recordScope, visibleModules } from "./modules";
import type { LinkedRecord } from "@/components/linked-records";

/** Registros de módulos vinculados a um contato ou empresa. */
export async function loadLinkedRecords(ctx: Ctx, where: { contactId?: string; companyId?: string }): Promise<LinkedRecord[]> {
  const mods = await visibleModules(ctx);
  if (!mods.length) return [];
  const recs = await db.moduleRecord.findMany({
    where: { orgId: ctx.org.id, moduleId: { in: mods.map((m) => m.id) }, ...recordScope(ctx), ...where },
    include: { status: true },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  return recs.map((r) => {
    const m = mods.find((x) => x.id === r.moduleId)!;
    return {
      id: r.id,
      href: `/m/${m.key}/${r.id}`,
      code: recordCode(m.prefix, r.number),
      title: r.title,
      module: m.name,
      icon: m.icon,
      color: m.color,
      status: r.status ? { name: r.status.name, color: r.status.color } : null,
    };
  });
}
