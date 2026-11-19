import "server-only";
import { db } from "./db";

/** Resolve nomes de contatos/empresas referenciados nos dados dos registros. */
export async function resolveRefs(orgId: string, fields: { key: string; type: string }[], datas: Record<string, unknown>[]) {
  const ids = { CONTACT: new Set<string>(), COMPANY: new Set<string>(), RECORD: new Set<string>() };
  for (const d of datas)
    for (const f of fields)
      if ((f.type === "CONTACT" || f.type === "COMPANY" || f.type === "RECORD") && typeof d[f.key] === "string") ids[f.type].add(d[f.key] as string);
  const [contacts, companies, records] = await Promise.all([
    ids.CONTACT.size ? db.contact.findMany({ where: { orgId, id: { in: [...ids.CONTACT] } }, select: { id: true, name: true } }) : [],
    ids.COMPANY.size ? db.company.findMany({ where: { orgId, id: { in: [...ids.COMPANY] } }, select: { id: true, name: true } }) : [],
    ids.RECORD.size ? db.moduleRecord.findMany({ where: { orgId, id: { in: [...ids.RECORD] } }, select: { id: true, title: true, number: true, module: { select: { prefix: true } } } }) : [],
  ]);
  return Object.fromEntries([
    ...[...contacts, ...companies].map((x) => [x.id, x.name]),
    ...records.map((r) => [r.id, `${r.module.prefix}-${String(r.number).padStart(4, "0")} · ${r.title}`]),
  ]);
}

/**
 * Registros de outros módulos que apontam para este (ex.: visitas de um imóvel, alunos de uma turma).
 * Agrupa por módulo e campo de vínculo.
 */
export async function loadBacklinks(orgId: string, moduleKey: string, recordId: string, visible: { id: string }[]) {
  const fields = await db.moduleField.findMany({
    where: { type: "RECORD", options: { has: moduleKey }, module: { orgId, id: { in: visible.map((m) => m.id) } } },
    include: { module: { include: { statuses: true } } },
  });
  const out = [];
  for (const f of fields) {
    const recs = await db.moduleRecord.findMany({
      where: { orgId, moduleId: f.moduleId, data: { path: [f.key], equals: recordId } },
      orderBy: [{ dueAt: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: { status: true },
    });
    out.push({
      module: { key: f.module.key, name: f.module.name, singular: f.module.singular, icon: f.module.icon, color: f.module.color, prefix: f.module.prefix },
      fieldKey: f.key,
      fieldLabel: f.label,
      records: recs.map((r) => ({ id: r.id, number: r.number, title: r.title, status: r.status ? { name: r.status.name, color: r.status.color } : null, dueAt: r.dueAt?.toISOString() ?? null, amount: r.amount != null ? Number(r.amount) : null, isFinal: !!r.status?.isFinal })),
    });
  }
  return out;
}
