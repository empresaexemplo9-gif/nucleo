import { notFound } from "next/navigation";
import { requireContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadFeed } from "@/lib/feed-data";
import { CompanyDetail } from "./company-detail";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const c = await db.company.findFirst({
    where: { id, orgId: ctx.org.id, ...ownerScope(ctx) },
    include: { contacts: { orderBy: { name: "asc" } }, deals: { include: { stage: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!c) notFound();
  const feed = await loadFeed({ companyId: id });
  const { contacts, deals, createdAt, updatedAt, orgId, ...rest } = c;
  void updatedAt;
  void orgId;
  return (
    <CompanyDetail
      company={{ ...rest, customFields: c.customFields as Record<string, unknown>, createdAt: createdAt.toISOString() }}
      contacts={contacts.map((x) => ({ id: x.id, name: x.name, position: x.position, email: x.email, phone: x.phone }))}
      deals={deals.map((d) => ({ id: d.id, title: d.title, value: Number(d.value), status: d.status, stage: d.stage.name, color: d.stage.color }))}
      feed={feed}
    />
  );
}
