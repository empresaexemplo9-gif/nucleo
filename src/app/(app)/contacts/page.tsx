import type { Prisma } from "@prisma/client";
import { requireContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { ContactsTable } from "./contacts-table";

export const metadata = { title: "Contatos" };
const PAGE = 50;

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string; owner?: string; lifecycle?: string; tag?: string; page?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const ci = (v: string) => ({ contains: v, mode: "insensitive" as const });
  const where: Prisma.ContactWhereInput = {
    orgId: ctx.org.id,
    ...ownerScope(ctx),
    ...(sp.owner ? { ownerId: sp.owner === "me" ? ctx.user.id : sp.owner } : {}),
    ...(sp.lifecycle ? { lifecycle: sp.lifecycle } : {}),
    ...(sp.tag ? { tags: { has: sp.tag } } : {}),
    ...(sp.q ? { OR: [{ name: ci(sp.q) }, { email: ci(sp.q) }, { phone: ci(sp.q) }, { company: { name: ci(sp.q) } }] } : {}),
  };
  const [total, contacts] = await Promise.all([
    db.contact.count({ where }),
    db.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { company: { select: { id: true, name: true } }, _count: { select: { deals: { where: { status: "OPEN" } } } } },
    }),
  ]);
  return (
    <ContactsTable
      rows={contacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        position: c.position,
        lifecycle: c.lifecycle,
        ownerId: c.ownerId,
        tags: c.tags,
        company: c.company,
        openDeals: c._count.deals,
        createdAt: c.createdAt.toISOString(),
      }))}
      total={total}
      page={page}
      pageSize={PAGE}
      filters={{ q: sp.q ?? "", owner: sp.owner ?? "", lifecycle: sp.lifecycle ?? "", tag: sp.tag ?? "" }}
    />
  );
}
