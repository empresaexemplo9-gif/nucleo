import { notFound } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { templatesFor } from "@/lib/proposal-data";
import { ProposalDetail } from "./proposal-detail";

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  const { id } = await params;
  const p = await db.proposal.findFirst({
    where: { id, orgId: ctx.org.id },
    include: {
      items: { orderBy: { position: "asc" } },
      contact: true,
      company: true,
      deal: true,
      owner: true,
      orders: { select: { id: true, number: true, status: true } },
      contracts: { select: { id: true, number: true, status: true, title: true } },
    },
  });
  if (!p) notFound();
  const templates = await templatesFor(ctx.org.id);
  return (
    <ProposalDetail
      templates={templates}
      p={{
        id: p.id,
        number: p.number,
        token: p.token,
        title: p.title,
        status: p.status,
        intro: p.intro,
        terms: p.terms,
        validUntil: p.validUntil?.toISOString() ?? null,
        discount: Number(p.discount),
        totalOnce: Number(p.totalOnce),
        totalMonthly: Number(p.totalMonthly),
        sentAt: p.sentAt?.toISOString() ?? null,
        viewedAt: p.viewedAt?.toISOString() ?? null,
        acceptedAt: p.acceptedAt?.toISOString() ?? null,
        acceptedName: p.acceptedName,
        acceptedEmail: p.acceptedEmail,
        acceptedDoc: p.acceptedDoc,
        acceptedIp: p.acceptedIp,
        rejectedAt: p.rejectedAt?.toISOString() ?? null,
        rejectedReason: p.rejectedReason,
        createdAt: p.createdAt.toISOString(),
        owner: p.owner?.name ?? null,
        contact: p.contact ? { id: p.contact.id, label: p.contact.name, phone: p.contact.whatsapp ?? p.contact.phone, email: p.contact.email } : null,
        company: p.company ? { id: p.company.id, label: p.company.name } : null,
        deal: p.deal ? { id: p.deal.id, label: p.deal.title } : null,
        orders: p.orders,
        contracts: p.contracts,
        items: p.items.map((i) => ({
          id: i.id,
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
