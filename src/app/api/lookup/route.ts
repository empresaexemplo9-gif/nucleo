import { getContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordScope, visibleModules } from "@/lib/modules";

/** Busca rápida usada nos seletores e na busca global (Ctrl+K). */
export async function GET(req: Request) {
  const ctx = await getContext();
  if (!ctx) return Response.json([], { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type") ?? "all";
  const orgId = ctx.org.id;
  const scope = ownerScope(ctx);
  const ci = { contains: q, mode: "insensitive" as const };
  const take = type === "all" ? 6 : 15;
  const out: { type: string; id: string; label: string; sub?: string | null; href?: string; kind?: string }[] = [];

  if (type === "all" || type === "deal") {
    const deals = await db.deal.findMany({
      where: { orgId, ...scope, ...(q ? { OR: [{ title: ci }, { contact: { name: ci } }, { company: { name: ci } }] } : {}) },
      include: { stage: true, company: true },
      orderBy: { updatedAt: "desc" },
      take,
    });
    out.push(...deals.map((d) => ({ type: "deal", id: d.id, label: d.title, sub: [d.stage.name, d.company?.name].filter(Boolean).join(" · ") })));
  }
  if (type === "all" || type === "contact") {
    const contacts = await db.contact.findMany({
      where: { orgId, ...scope, ...(q ? { OR: [{ name: ci }, { email: ci }, { phone: ci }] } : {}) },
      include: { company: true },
      orderBy: { updatedAt: "desc" },
      take,
    });
    out.push(...contacts.map((c) => ({ type: "contact", id: c.id, label: c.name, sub: c.email ?? c.company?.name, companyId: c.companyId })));
  }
  if (type === "all" || type === "company") {
    const companies = await db.company.findMany({
      where: { orgId, ...scope, ...(q ? { OR: [{ name: ci }, { domain: ci }, { document: ci }] } : {}) },
      orderBy: { updatedAt: "desc" },
      take,
    });
    out.push(...companies.map((c) => ({ type: "company", id: c.id, label: c.name, sub: c.city ?? c.domain })));
  }
  if (type === "product") {
    const products = await db.product.findMany({ where: { orgId, active: true, ...(q ? { name: ci } : {}) }, take, orderBy: { name: "asc" } });
    out.push(...products.map((p) => ({ type: "product", id: p.id, label: p.name, sub: String(p.price) })));
  }
  if (type === "all" || type === "record") {
    const mods = await visibleModules(ctx);
    if (mods.length) {
      const n = Number(q.replace(/\D/g, ""));
      const recs = await db.moduleRecord.findMany({
        where: {
          orgId,
          moduleId: { in: mods.map((m) => m.id) },
          ...recordScope(ctx),
          ...(q ? { OR: [{ title: ci }, ...(n ? [{ number: n }] : [])] } : {}),
        },
        include: { status: true },
        orderBy: { updatedAt: "desc" },
        take: type === "all" ? 8 : 15,
      });
      for (const r of recs) {
        const m = mods.find((x) => x.id === r.moduleId)!;
        out.push({
          type: "record",
          kind: m.singular,
          id: r.id,
          href: `/m/${m.key}/${r.id}`,
          label: `${m.prefix}-${String(r.number).padStart(4, "0")} · ${r.title}`,
          sub: [m.name, r.status?.name].filter(Boolean).join(" · "),
        });
      }
    }
  }
  return Response.json(out);
}
