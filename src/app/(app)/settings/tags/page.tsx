import { db } from "@/lib/db";
import { guard } from "../guard";
import { TagsManager } from "./tags-manager";

export const metadata = { title: "Etiquetas e motivos" };

export default async function TagsPage() {
  const ctx = await guard("MANAGER");
  const [tags, reasons] = await Promise.all([
    db.tag.findMany({ where: { orgId: ctx.org.id }, orderBy: { name: "asc" } }),
    db.lostReason.findMany({ where: { orgId: ctx.org.id }, orderBy: { label: "asc" } }),
  ]);
  return <TagsManager tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))} reasons={reasons.map((r) => ({ id: r.id, label: r.label }))} />;
}
