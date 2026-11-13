import "server-only";
import { db } from "./db";

/** Catálogo completo (com preços) disponível para montar propostas. */
export async function catalogFor(orgId: string) {
  const products = await db.product.findMany({ where: { orgId, active: true }, orderBy: { name: "asc" } });
  return products.map((p) => ({
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
    stock: p.trackStock ? Number(p.stock) : null,
  }));
}
export type CatalogItem = Awaited<ReturnType<typeof catalogFor>>[number];

export async function templatesFor(orgId: string) {
  return db.contractTemplate.findMany({ where: { orgId }, orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } });
}
