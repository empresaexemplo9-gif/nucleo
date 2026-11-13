import "server-only";
import { db } from "./db";
import { INTERVALS } from "./commerce";

export type ProductStat = {
  id: string;
  name: string;
  sku: string | null;
  billing: string;
  interval: string | null;
  qty: number;
  revenue: number;
  mrr: number;
  orders: number;
  share: number;
  curve: "A" | "B" | "C" | "-";
  rank: number;
};

/** Vendas por produto no período: pedidos (exceto cancelados) + negócios ganhos sem pedido vinculado. */
export async function productSales(orgId: string, days: number) {
  const since = new Date(Date.now() - days * 86400000);
  const [products, orderItems, dealItems, activeRecurring] = await Promise.all([
    db.product.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    db.orderItem.findMany({ where: { order: { orgId, status: { not: "CANCELED" }, createdAt: { gte: since } } }, select: { productId: true, quantity: true, total: true, orderId: true } }),
    db.dealProduct.findMany({
      where: { deal: { orgId, status: "WON", closedAt: { gte: since }, orders: { none: {} } } },
      select: { productId: true, quantity: true, price: true, discount: true, dealId: true },
    }),
    db.orderItem.findMany({ where: { billing: "RECURRING", order: { orgId, status: { not: "CANCELED" } } }, select: { productId: true, quantity: true, price: true, interval: true } }),
  ]);
  const acc = new Map<string, { qty: number; revenue: number; mrr: number; orders: Set<string> }>();
  const get = (id: string) => acc.get(id) ?? (acc.set(id, { qty: 0, revenue: 0, mrr: 0, orders: new Set() }), acc.get(id)!);
  for (const i of orderItems) {
    if (!i.productId) continue;
    const a = get(i.productId);
    a.qty += Number(i.quantity);
    a.revenue += Number(i.total);
    a.orders.add(i.orderId);
  }
  for (const i of dealItems) {
    const a = get(i.productId);
    a.qty += Number(i.quantity);
    a.revenue += Number(i.quantity) * Number(i.price) * (1 - Number(i.discount) / 100);
    a.orders.add(i.dealId);
  }
  for (const i of activeRecurring) {
    if (!i.productId) continue;
    get(i.productId).mrr += (Number(i.quantity) * Number(i.price)) / (INTERVALS[i.interval ?? "MONTHLY"]?.months ?? 1);
  }
  const total = [...acc.values()].reduce((s, a) => s + a.revenue, 0) || 1;
  const stats: ProductStat[] = products.map((p) => {
    const a = acc.get(p.id);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      billing: p.billing,
      interval: p.interval,
      qty: a?.qty ?? 0,
      revenue: Math.round((a?.revenue ?? 0) * 100) / 100,
      mrr: Math.round((a?.mrr ?? 0) * 100) / 100,
      orders: a?.orders.size ?? 0,
      share: (a?.revenue ?? 0) / total,
      curve: "-",
      rank: 0,
    };
  });
  stats.sort((x, y) => y.revenue - x.revenue || y.qty - x.qty);
  let cum = 0;
  stats.forEach((s, i) => {
    s.rank = i + 1;
    if (!s.revenue && !s.qty) return;
    cum += s.share;
    s.curve = cum - s.share < 0.8 ? "A" : cum - s.share < 0.95 ? "B" : "C";
  });
  return stats;
}

export type StockRow = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  stock: number;
  minStock: number;
  leadTimeDays: number;
  dailyAvg: number;
  coverageDays: number | null;
  reorderPoint: number;
  suggested: number;
  status: "repor" | "atencao" | "ok" | "sem-giro";
};

/** Estoque x demanda (média diária dos últimos 90 dias) e sugestão de reposição para 30 dias + prazo de entrega. */
export async function stockPlan(orgId: string) {
  const since = new Date(Date.now() - 90 * 86400000);
  const [products, sold] = await Promise.all([
    db.product.findMany({ where: { orgId, trackStock: true }, orderBy: { name: "asc" } }),
    db.stockMove.groupBy({ by: ["productId"], where: { orgId, reason: { in: ["ORDER", "CANCEL"] }, createdAt: { gte: since } }, _sum: { quantity: true } }),
  ]);
  return products.map<StockRow>((p) => {
    const out = -Number(sold.find((s) => s.productId === p.id)?._sum.quantity ?? 0);
    const dailyAvg = Math.max(0, out) / 90;
    const stock = Number(p.stock);
    const minStock = Number(p.minStock);
    const reorderPoint = Math.ceil(dailyAvg * p.leadTimeDays + minStock);
    const suggested = Math.max(0, Math.ceil(dailyAvg * (p.leadTimeDays + 30) + minStock - stock));
    const coverageDays = dailyAvg > 0 ? Math.floor(stock / dailyAvg) : null;
    const status: StockRow["status"] = stock <= reorderPoint && (dailyAvg > 0 || stock <= minStock) ? "repor" : coverageDays != null && coverageDays < p.leadTimeDays + 15 ? "atencao" : dailyAvg === 0 ? "sem-giro" : "ok";
    return { id: p.id, name: p.name, sku: p.sku, unit: p.unit, stock, minStock, leadTimeDays: p.leadTimeDays, dailyAvg: Math.round(dailyAvg * 100) / 100, coverageDays, reorderPoint, suggested, status };
  });
}
