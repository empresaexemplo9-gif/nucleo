import { db } from "@/lib/db";
import { guard } from "../guard";
import { PipelinesEditor } from "./pipelines-editor";

export const metadata = { title: "Funis e etapas" };

export default async function PipelinesPage() {
  const ctx = await guard("ADMIN");
  const pipelines = await db.pipeline.findMany({
    where: { orgId: ctx.org.id },
    orderBy: { position: "asc" },
    include: { stages: { orderBy: { position: "asc" }, include: { _count: { select: { deals: true } } } }, _count: { select: { deals: true } } },
  });
  return (
    <PipelinesEditor
      pipelines={pipelines.map((p) => ({
        id: p.id,
        name: p.name,
        isDefault: p.isDefault,
        deals: p._count.deals,
        stages: p.stages.map((s) => ({ id: s.id, name: s.name, color: s.color, probability: s.probability, rottingDays: s.rottingDays, type: s.type, deals: s._count.deals })),
      }))}
    />
  );
}
