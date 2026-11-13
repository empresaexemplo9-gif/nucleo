import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { productSales, stockPlan } from "@/lib/sales-analytics";
import { ProductsView } from "./products-view";

export const metadata = { title: "Produtos" };

const PERIODS: Record<string, number> = { "30": 30, "90": 90, "365": 365 };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ tab?: string; period?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const tab = sp.tab === "stock" || sp.tab === "ranking" ? sp.tab : "catalog";
  const period = sp.period && sp.period in PERIODS ? sp.period : "90";
  const [products, ranking, stock] = await Promise.all([
    db.product.findMany({ where: { orgId: ctx.org.id }, orderBy: [{ active: "desc" }, { name: "asc" }], include: { _count: { select: { deals: true, proposalItems: true, orderItems: true } } } }),
    tab === "ranking" ? productSales(ctx.org.id, PERIODS[period]!) : Promise.resolve([]),
    tab === "stock" ? stockPlan(ctx.org.id) : Promise.resolve([]),
  ]);
  return (
    <ProductsView
      tab={tab}
      period={period}
      ranking={ranking}
      stock={stock}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        details: p.details,
        unit: p.unit,
        price: Number(p.price),
        setupFee: Number(p.setupFee),
        billing: p.billing,
        interval: p.interval,
        trackStock: p.trackStock,
        stock: Number(p.stock),
        minStock: Number(p.minStock),
        leadTimeDays: p.leadTimeDays,
        active: p.active,
        uses: p._count.deals + p._count.proposalItems + p._count.orderItems,
      }))}
    />
  );
}
