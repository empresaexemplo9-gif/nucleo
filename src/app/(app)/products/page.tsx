import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductsView } from "./products-view";

export const metadata = { title: "Produtos" };

export default async function ProductsPage() {
  const ctx = await requireContext();
  const products = await db.product.findMany({
    where: { orgId: ctx.org.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { deals: true } } },
  });
  return (
    <ProductsView
      products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, description: p.description, unit: p.unit, price: Number(p.price), active: p.active, uses: p._count.deals }))}
    />
  );
}
