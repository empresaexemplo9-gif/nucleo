import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrdersView } from "./orders-view";

export const metadata = { title: "Pedidos" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const base = { orgId: ctx.org.id };
  const [orders, counts, totals] = await Promise.all([
    db.order.findMany({
      where: { ...base, ...(sp.status ? { status: sp.status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { items: true, contact: true, company: true, proposal: { select: { id: true, number: true } } },
    }),
    db.order.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    db.order.aggregate({ where: { ...base, status: { not: "CANCELED" } }, _sum: { total: true, monthly: true }, _count: { _all: true } }),
  ]);
  return (
    <OrdersView
      status={sp.status ?? ""}
      counts={Object.fromEntries(counts.map((c) => [c.status, c._count._all]))}
      totals={{ count: totals._count._all, once: Number(totals._sum.total ?? 0), monthly: Number(totals._sum.monthly ?? 0) }}
      orders={orders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        total: Number(o.total),
        monthly: Number(o.monthly),
        createdAt: o.createdAt.toISOString(),
        client: o.company?.name ?? o.contact?.name ?? null,
        proposal: o.proposal,
        items: o.items.map((i) => ({ id: i.id, name: i.name, quantity: Number(i.quantity), billing: i.billing, interval: i.interval, total: Number(i.total) })),
      }))}
    />
  );
}
