import { db } from "@/lib/db";
import { guard } from "../guard";
import { TemplatesEditor } from "./templates-editor";

export const metadata = { title: "Modelos de contrato" };

export default async function ContractTemplatesPage() {
  const ctx = await guard("ADMIN");
  const list = await db.contractTemplate.findMany({ where: { orgId: ctx.org.id }, orderBy: { name: "asc" }, include: { file: { select: { id: true, name: true, size: true } }, _count: { select: { contracts: true } } } });
  return (
    <TemplatesEditor
      templates={list.map((t) => ({ id: t.id, name: t.name, kind: t.kind, body: t.body, file: t.file, uses: t._count.contracts, updatedAt: t.updatedAt.toISOString() }))}
    />
  );
}
