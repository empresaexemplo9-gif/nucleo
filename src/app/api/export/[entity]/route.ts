import { getContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";

/** Exporta contatos, empresas ou negócios em CSV. */
export async function GET(_: Request, { params }: { params: Promise<{ entity: string }> }) {
  const ctx = await getContext();
  if (!ctx) return new Response("Não autorizado", { status: 401 });
  const { entity } = await params;
  const orgId = ctx.org.id;
  const scope = ownerScope(ctx);
  let rows: Record<string, unknown>[] = [];

  if (entity === "contacts") {
    const list = await db.contact.findMany({ where: { orgId, ...scope }, include: { company: true, owner: true }, orderBy: { name: "asc" } });
    rows = list.map((c) => ({
      nome: c.name, email: c.email, telefone: c.phone, whatsapp: c.whatsapp, cargo: c.position, empresa: c.company?.name,
      ciclo: c.lifecycle, origem: c.source, etiquetas: c.tags, responsavel: c.owner?.name, criado_em: c.createdAt, ...flat(c.customFields),
    }));
  } else if (entity === "companies") {
    const list = await db.company.findMany({ where: { orgId, ...scope }, include: { owner: true }, orderBy: { name: "asc" } });
    rows = list.map((c) => ({
      nome: c.name, documento: c.document, segmento: c.industry, porte: c.size, telefone: c.phone, email: c.email, site: c.website,
      cidade: c.city, uf: c.state, etiquetas: c.tags, responsavel: c.owner?.name, criado_em: c.createdAt, ...flat(c.customFields),
    }));
  } else if (entity === "deals") {
    const list = await db.deal.findMany({ where: { orgId, ...scope }, include: { stage: true, pipeline: true, contact: true, company: true, owner: true }, orderBy: { createdAt: "desc" } });
    rows = list.map((d) => ({
      titulo: d.title, valor: Number(d.value), funil: d.pipeline.name, etapa: d.stage.name, status: d.status, contato: d.contact?.name,
      empresa: d.company?.name, responsavel: d.owner?.name, previsao: d.expectedClose, origem: d.source, motivo_perda: d.lostReason,
      etiquetas: d.tags, criado_em: d.createdAt, fechado_em: d.closedAt, ...flat(d.customFields),
    }));
  } else return new Response("Entidade inválida", { status: 400 });

  return new Response(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${entity}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}

function flat(cf: unknown) {
  return Object.fromEntries(Object.entries((cf ?? {}) as Record<string, unknown>).map(([k, v]) => [`cf_${k}`, v]));
}
