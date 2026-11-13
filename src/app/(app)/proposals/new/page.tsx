import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { catalogFor, templatesFor } from "@/lib/proposal-data";
import { ProposalEditor } from "../proposal-editor";

const plusDays = (n: number) => new Date(new Date().getTime() + n * 86400000).toISOString().slice(0, 10);

export const metadata = { title: "Nova proposta" };

export default async function NewProposalPage({ searchParams }: { searchParams: Promise<{ deal?: string; contact?: string; company?: string }> }) {
  const ctx = await requireRole("SALES");
  const sp = await searchParams;
  const [catalog, templates, deal, contact, company] = await Promise.all([
    catalogFor(ctx.org.id),
    templatesFor(ctx.org.id),
    sp.deal ? db.deal.findFirst({ where: { id: sp.deal, orgId: ctx.org.id }, include: { contact: true, company: true } }) : null,
    sp.contact ? db.contact.findFirst({ where: { id: sp.contact, orgId: ctx.org.id } }) : null,
    sp.company ? db.company.findFirst({ where: { id: sp.company, orgId: ctx.org.id } }) : null,
  ]);
  const c = contact ?? deal?.contact;
  const co = company ?? deal?.company;
  return (
    <ProposalEditor
      catalog={catalog}
      templates={templates}
      defaults={{
        deal: deal ? { id: deal.id, label: deal.title } : null,
        contact: c ? { id: c.id, label: c.name } : null,
        company: co ? { id: co.id, label: co.name } : null,
        title: deal?.title,
        validUntil: plusDays(15),
      }}
    />
  );
}
