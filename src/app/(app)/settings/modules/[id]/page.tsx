import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { guard } from "../../guard";
import { ModuleEditor } from "./module-editor";

export const metadata = { title: "Configurar módulo" };

export default async function ModuleEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await guard("ADMIN");
  const m = await db.customModule.findFirst({
    where: { id: (await params).id, orgId: ctx.org.id },
    include: { fields: { orderBy: { position: "asc" } }, statuses: { orderBy: { position: "asc" } }, _count: { select: { records: true } } },
  });
  if (!m) notFound();
  return (
    <ModuleEditor
      key={m.statuses.map((s) => s.id + s.name + s.color + s.isFinal).join("|")}
      mod={{
        id: m.id,
        key: m.key,
        name: m.name,
        singular: m.singular,
        description: m.description,
        icon: m.icon,
        color: m.color,
        prefix: m.prefix,
        group: m.group,
        minRoleView: m.minRoleView,
        minRoleEdit: m.minRoleEdit,
        dueFieldKey: m.dueFieldKey,
        amountFieldKey: m.amountFieldKey,
        records: m._count.records,
        fields: m.fields.map((f) => ({ id: f.id, key: f.key, label: f.label, type: f.type, options: f.options, required: f.required, showInList: f.showInList })),
        statuses: m.statuses.map((s) => ({ id: s.id, name: s.name, color: s.color, isFinal: s.isFinal })),
      }}
    />
  );
}
