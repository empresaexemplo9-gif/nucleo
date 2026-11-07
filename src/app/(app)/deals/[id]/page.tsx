import { notFound } from "next/navigation";
import { requireContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadFeed } from "@/lib/feed-data";
import { DealDetail } from "./deal-detail";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const deal = await db.deal.findFirst({
    where: { id, orgId: ctx.org.id, ...ownerScope(ctx) },
    include: {
      stage: true,
      pipeline: { include: { stages: { orderBy: { position: "asc" } } } },
      contact: { include: { company: { select: { name: true } } } },
      company: true,
      products: { include: { product: true } },
    },
  });
  if (!deal) notFound();
  const feed = await loadFeed({ dealId: id });
  return (
    <DealDetail
      deal={{
        id: deal.id,
        title: deal.title,
        value: Number(deal.value),
        status: deal.status,
        pipelineId: deal.pipelineId,
        stageId: deal.stageId,
        ownerId: deal.ownerId,
        expectedClose: deal.expectedClose?.toISOString() ?? null,
        source: deal.source,
        probability: deal.probability,
        lostReason: deal.lostReason,
        tags: deal.tags,
        customFields: deal.customFields as Record<string, unknown>,
        createdAt: deal.createdAt.toISOString(),
        closedAt: deal.closedAt?.toISOString() ?? null,
        stageChangedAt: deal.stageChangedAt.toISOString(),
        contact: deal.contact ? { id: deal.contact.id, label: deal.contact.name, email: deal.contact.email, phone: deal.contact.phone, whatsapp: deal.contact.whatsapp, position: deal.contact.position } : null,
        company: deal.company ? { id: deal.company.id, label: deal.company.name, city: deal.company.city, website: deal.company.website } : null,
        products: deal.products.map((p) => ({ id: p.id, name: p.product.name, quantity: Number(p.quantity), price: Number(p.price), discount: Number(p.discount) })),
      }}
      pipelineName={deal.pipeline.name}
      stages={deal.pipeline.stages.map((s) => ({ id: s.id, name: s.name, color: s.color, type: s.type, probability: s.probability }))}
      feed={feed}
    />
  );
}
