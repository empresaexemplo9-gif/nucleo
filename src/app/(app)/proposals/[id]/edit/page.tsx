import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { catalogFor, templatesFor } from "@/lib/proposal-data";
import { ProposalEditor } from "../../proposal-editor";

export const metadata = { title: "Editar proposta" };

export default async function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole("SALES");
  const { id } = await params;
  const p = await db.proposal.findFirst({ where: { id, orgId: ctx.org.id }, include: { items: { orderBy: { position: "asc" } }, deal: true, contact: true, company: true } });
  if (!p) notFound();
  if (p.status === "ACCEPTED") redirect(`/proposals/${id}`);
  const [catalog, templates] = await Promise.all([catalogFor(ctx.org.id), templatesFor(ctx.org.id)]);
  return (
    <ProposalEditor
      catalog={catalog}
      templates={templates}
      initial={{
        id: p.id,
        title: p.title,
        deal: p.deal ? { id: p.deal.id, label: p.deal.title } : null,
        contact: p.contact ? { id: p.contact.id, label: p.contact.name } : null,
        company: p.company ? { id: p.company.id, label: p.company.name } : null,
        validUntil: p.validUntil?.toISOString().slice(0, 10) ?? null,
        intro: p.intro,
        terms: p.terms,
        discount: Number(p.discount),
        contractTemplateId: p.contractTemplateId,
        items: p.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          description: i.description,
          details: i.details,
          billing: i.billing,
          interval: i.interval,
          quantity: Number(i.quantity),
          price: Number(i.price),
          discount: Number(i.discount),
          setupFee: Number(i.setupFee),
        })),
      }}
    />
  );
}
