import "server-only";
import { db } from "./db";

/** Resolve nomes de contatos/empresas referenciados nos dados dos registros. */
export async function resolveRefs(orgId: string, fields: { key: string; type: string }[], datas: Record<string, unknown>[]) {
  const ids = { CONTACT: new Set<string>(), COMPANY: new Set<string>() };
  for (const d of datas)
    for (const f of fields)
      if ((f.type === "CONTACT" || f.type === "COMPANY") && typeof d[f.key] === "string") ids[f.type].add(d[f.key] as string);
  const [contacts, companies] = await Promise.all([
    ids.CONTACT.size ? db.contact.findMany({ where: { orgId, id: { in: [...ids.CONTACT] } }, select: { id: true, name: true } }) : [],
    ids.COMPANY.size ? db.company.findMany({ where: { orgId, id: { in: [...ids.COMPANY] } }, select: { id: true, name: true } }) : [],
  ]);
  return Object.fromEntries([...contacts, ...companies].map((x) => [x.id, x.name]));
}
