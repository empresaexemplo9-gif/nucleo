import { notFound } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { ContractDetail } from "./contract-detail";

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  const c = await db.contract.findFirst({
    where: { id: (await params).id, orgId: ctx.org.id },
    include: { signers: { orderBy: { position: "asc" } }, file: { select: { id: true, name: true, size: true } }, proposal: { select: { id: true, number: true } }, contact: true, company: true, template: { select: { name: true } } },
  });
  if (!c) notFound();
  return (
    <ContractDetail
      c={{
        id: c.id,
        number: c.number,
        title: c.title,
        status: c.status,
        kind: c.kind,
        body: c.body,
        hash: c.hash,
        requireSelfie: c.requireSelfie,
        file: c.file,
        template: c.template?.name ?? null,
        proposal: c.proposal,
        client: c.company?.name ?? c.contact?.name ?? null,
        contact: c.contact ? { phone: c.contact.whatsapp ?? c.contact.phone, email: c.contact.email } : null,
        sentAt: c.sentAt?.toISOString() ?? null,
        completedAt: c.completedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        signers: c.signers.map((s) => ({
          id: s.id,
          token: s.token,
          name: s.name,
          email: s.email,
          document: s.document,
          role: s.role,
          status: s.status,
          viewedAt: s.viewedAt?.toISOString() ?? null,
          signedAt: s.signedAt?.toISOString() ?? null,
          signature: s.signature,
          selfie: s.selfie,
          faceCheck: s.faceCheck,
          ip: s.ip,
          geo: s.geo,
          userAgent: s.userAgent,
        })),
      }}
    />
  );
}
