import { getContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { getModuleByKey, recordCode, recordScope } from "@/lib/modules";
import { resolveRefs } from "@/lib/module-data";

/** Exporta os registros de um módulo de controle interno em CSV. */
export async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  const ctx = await getContext();
  if (!ctx) return new Response("Não autorizado", { status: 401 });
  const mod = await getModuleByKey(ctx, (await params).key);
  if (!mod) return new Response("Módulo não encontrado", { status: 404 });
  const list = await db.moduleRecord.findMany({
    where: { orgId: ctx.org.id, moduleId: mod.id, ...recordScope(ctx) },
    include: { status: true, assignee: true },
    orderBy: { number: "asc" },
  });
  const datas = list.map((r) => (r.data ?? {}) as Record<string, unknown>);
  const refs = await resolveRefs(ctx.org.id, mod.fields, datas);
  const rows = list.map((r, i) => {
    const d = datas[i]!;
    const out: Record<string, unknown> = { codigo: recordCode(mod.prefix, r.number), titulo: r.title, status: r.status?.name, responsavel: r.assignee?.name };
    for (const f of mod.fields) {
      const v = d[f.key];
      out[f.label] = (f.type === "CONTACT" || f.type === "COMPANY") && typeof v === "string" ? (refs[v] ?? v) : f.type === "BOOLEAN" && v != null ? (v ? "Sim" : "Não") : v;
    }
    out.criado_em = r.createdAt;
    out.concluido_em = r.closedAt;
    return out;
  });
  return new Response(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${mod.key}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
