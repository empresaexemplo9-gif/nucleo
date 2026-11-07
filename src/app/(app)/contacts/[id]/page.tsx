import { notFound } from "next/navigation";
import { requireContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadFeed } from "@/lib/feed-data";
import { ContactDetail } from "./contact-detail";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const c = await db.contact.findFirst({
    where: { id, orgId: ctx.org.id, ...ownerScope(ctx) },
    include: { company: true, deals: { include: { stage: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!c) notFound();
  const feed = await loadFeed({ contactId: id });
  return (
    <ContactDetail
      contact={{
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        whatsapp: c.whatsapp,
        position: c.position,
        ownerId: c.ownerId,
        source: c.source,
        lifecycle: c.lifecycle,
        birthday: c.birthday?.toISOString() ?? null,
        tags: c.tags,
        customFields: c.customFields as Record<string, unknown>,
        company: c.company ? { id: c.company.id, label: c.company.name } : null,
        createdAt: c.createdAt.toISOString(),
      }}
      deals={c.deals.map((d) => ({ id: d.id, title: d.title, value: Number(d.value), status: d.status, stage: d.stage.name, color: d.stage.color }))}
      feed={feed}
    />
  );
}
