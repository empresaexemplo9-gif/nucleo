import type { Prisma } from "@prisma/client";
import { requireContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { CompaniesTable } from "./companies-table";

export const metadata = { title: "Empresas" };
const PAGE = 50;

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ q?: string; owner?: string; tag?: string; page?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const ci = (v: string) => ({ contains: v, mode: "insensitive" as const });
  const where: Prisma.CompanyWhereInput = {
    orgId: ctx.org.id,
    ...ownerScope(ctx),
    ...(sp.owner ? { ownerId: sp.owner === "me" ? ctx.user.id : sp.owner } : {}),
    ...(sp.tag ? { tags: { has: sp.tag } } : {}),
    ...(sp.q ? { OR: [{ name: ci(sp.q) }, { document: ci(sp.q) }, { domain: ci(sp.q) }, { city: ci(sp.q) }] } : {}),
  };
  const [total, companies] = await Promise.all([
    db.company.count({ where }),
    db.company.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { _count: { select: { contacts: true, deals: { where: { status: "OPEN" } } } } },
    }),
  ]);
  return (
    <CompaniesTable
      rows={companies.map((c) => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        city: [c.city, c.state].filter(Boolean).join(" / ") || null,
        phone: c.phone,
        ownerId: c.ownerId,
        tags: c.tags,
        contacts: c._count.contacts,
        openDeals: c._count.deals,
      }))}
      total={total}
      page={page}
      pageSize={PAGE}
      filters={{ q: sp.q ?? "", owner: sp.owner ?? "", tag: sp.tag ?? "" }}
    />
  );
}
