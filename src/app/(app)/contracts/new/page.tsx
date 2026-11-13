import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { templatesFor } from "@/lib/proposal-data";
import { code } from "@/lib/commerce";
import { NewContract } from "./new-contract";

export const metadata = { title: "Novo contrato" };

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ proposal?: string }> }) {
  const ctx = await requireRole("SALES");
  const sp = await searchParams;
  const [templates, proposals] = await Promise.all([
    templatesFor(ctx.org.id),
    db.proposal.findMany({ where: { orgId: ctx.org.id }, orderBy: { updatedAt: "desc" }, take: 50, include: { contact: true, company: true } }),
  ]);
  return (
    <NewContract
      templates={templates}
      initialProposal={sp.proposal ?? ""}
      proposals={proposals.map((p) => ({
        id: p.id,
        label: `${code("PROP", p.number)} · ${p.title}`,
        signer: { name: p.acceptedName ?? p.contact?.name ?? p.company?.name ?? "", email: p.acceptedEmail ?? p.contact?.email ?? "", document: p.acceptedDoc ?? p.company?.document ?? "" },
      }))}
    />
  );
}
