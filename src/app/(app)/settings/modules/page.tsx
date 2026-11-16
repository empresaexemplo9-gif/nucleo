import { db } from "@/lib/db";
import { superGuard } from "../guard";
import { ModulesGallery } from "./modules-gallery";

export const metadata = { title: "Módulos de controle interno" };

export default async function ModulesSettingsPage() {
  const ctx = await superGuard();
  const mods = await db.customModule.findMany({
    where: { orgId: ctx.org.id },
    orderBy: { position: "asc" },
    include: { _count: { select: { records: true, fields: true } } },
  });
  return (
    <ModulesGallery
      installed={mods.map((m) => ({
        id: m.id,
        key: m.key,
        name: m.name,
        icon: m.icon,
        color: m.color,
        group: m.group,
        prefix: m.prefix,
        templateKey: m.templateKey,
        records: m._count.records,
        fields: m._count.fields,
      }))}
      segment={((ctx.org.settings ?? {}) as { segment?: string }).segment ?? null}
    />
  );
}
