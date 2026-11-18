import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { hasRole, requireContext } from "@/lib/auth";
import { formSettings } from "@/lib/module-public";
import { baseUrl } from "@/lib/automation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { canEditModule, getModuleByKey, moduleRules, recordScope } from "@/lib/modules";
import { numericValue } from "@/lib/module-logic";
import { parseGrade } from "@/lib/fashion-colors";
import { resolveRefs } from "@/lib/module-data";
import { ModuleView, type RecordRow } from "./module-view";

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const ctx = await requireContext();
  const mod = await getModuleByKey(ctx, (await params).module);
  return { title: mod?.name ?? "Módulo" };
}

const PAGE = 100;

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireContext();
  const mod = await getModuleByKey(ctx, (await params).module);
  if (!mod) notFound();
  const sp = await searchParams;
  const hasDue = !!mod.dueFieldKey;
  const rules = moduleRules(mod.settings, mod.templateKey);
  // moda: produtos abrem na vitrine de fotos
  const defaultView = rules.look === "moda" && mod.templateKey === "moda-estoque" ? "gallery" : "list";
  const asked = sp.view ?? defaultView;
  const view = asked === "board" ? "board" : asked === "calendar" && hasDue ? "calendar" : asked === "gallery" ? "gallery" : "list";
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : new Date().toISOString().slice(0, 7);
  const [my, mm] = month.split("-").map(Number) as [number, number];
  const monthFrom = new Date(Date.UTC(my, mm - 1, 1) - 7 * 86400000);
  const monthTo = new Date(Date.UTC(my, mm, 1) + 7 * 86400000);
  const page = Math.max(1, Number(sp.page) || 1);
  const scopeOpen = sp.scope !== "all";
  const finals = mod.statuses.filter((s) => s.isFinal).map((s) => s.id);
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86400000);

  const base: Prisma.ModuleRecordWhereInput = { orgId: ctx.org.id, moduleId: mod.id, ...recordScope(ctx) };
  const openWhere: Prisma.ModuleRecordWhereInput = { ...base, OR: [{ statusId: null }, { statusId: { notIn: finals } }] };
  const where: Prisma.ModuleRecordWhereInput = {
    ...base,
    ...(view === "calendar" ? { dueAt: { gte: monthFrom, lt: monthTo } } : {}),
    ...(sp.status ? { statusId: sp.status } : (view === "list" || view === "gallery") && scopeOpen ? { OR: [{ statusId: null }, { statusId: { notIn: finals } }] } : {}),
    ...(sp.who ? { assigneeId: sp.who === "me" ? ctx.user.id : sp.who } : {}),
    ...(sp.q
      ? {
          AND: [
            {
              OR: [
                { title: { contains: sp.q, mode: "insensitive" as const } },
                ...(Number.isFinite(Number(sp.q.replace(/\D/g, ""))) && sp.q.replace(/\D/g, "") ? [{ number: Number(sp.q.replace(/\D/g, "")) }] : []),
              ],
            },
          ],
        }
      : {}),
  };

  const [total, records, openCount, overdue, dueSoon, openSum, allCount] = await Promise.all([
    db.moduleRecord.count({ where }),
    db.moduleRecord.findMany({
      where,
      orderBy: view === "board" ? [{ position: "asc" }] : view === "calendar" ? [{ dueAt: "asc" }] : [{ updatedAt: "desc" }],
      skip: view === "list" || view === "gallery" ? (page - 1) * PAGE : 0,
      take: view === "list" || view === "gallery" ? PAGE : 800,
      include: { status: true },
    }),
    db.moduleRecord.count({ where: openWhere }),
    db.moduleRecord.count({ where: { ...openWhere, dueAt: { lt: now } } }),
    db.moduleRecord.count({ where: { ...openWhere, dueAt: { gte: now, lt: week } } }),
    db.moduleRecord.aggregate({ where: openWhere, _sum: { amount: true } }),
    db.moduleRecord.count({ where: base }),
  ]);
  // ?new=1&f_<campo>=<valor>: formulário de criação já preenchido (ex.: nova visita a partir do imóvel)
  const prefill: Record<string, unknown> = {};
  for (const f of mod.fields) {
    const v = sp[`f_${f.key}`];
    if (v) prefill[f.key] = v;
  }
  const refs = await resolveRefs(ctx.org.id, mod.fields, [...records.map((r) => (r.data ?? {}) as Record<string, unknown>), prefill]);
  const isAdmin = hasRole(ctx, "ADMIN");

  // capas: primeira foto de cada registro (vitrine, quadro e cabeçalho editorial)
  const imgs = await db.storedFile.findMany({
    where: { orgId: ctx.org.id, mime: { startsWith: "image/" }, record: { moduleId: mod.id } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, recordId: true },
    take: 2000,
  });
  const covers: Record<string, string> = {};
  for (const f of imgs) if (f.recordId && !covers[f.recordId]) covers[f.recordId] = f.id;

  // indicadores do segmento (ex.: peças em estoque, margem média, ticket médio, conversão das malinhas)
  let kpis: { label: string; value: number | null; format: string; hint?: string }[] | null = null;
  let palette: string[] = [];
  if (rules.kpis || rules.look) {
    const all = await db.moduleRecord.findMany({ where: base, select: { data: true, statusId: true }, take: 5000 });
    const open = all.filter((r) => !r.statusId || !finals.includes(r.statusId));
    kpis = (rules.kpis ?? []).map((k) => {
      const list = k.scope === "open" ? open : all;
      if (k.agg === "count") return { label: k.label, value: list.length, format: k.format, hint: k.hint };
      const f = mod.fields.find((x) => x.key === k.field);
      const vals = f ? list.map((r) => numericValue(f.type, ((r.data ?? {}) as Record<string, unknown>)[f.key], f.options)).filter((v): v is number => v != null && Number.isFinite(v)) : [];
      const sum = vals.reduce((a, b) => a + b, 0);
      return { label: k.label, value: !f ? null : k.agg === "sum" ? sum : vals.length ? sum / vals.length : null, format: k.format, hint: k.hint };
    });
    // cores mais presentes na coleção (amostras do cabeçalho)
    const count = new Map<string, number>();
    for (const r of open) {
      const d = (r.data ?? {}) as Record<string, unknown>;
      for (const f of mod.fields) {
        if (f.type === "GRADE") for (const g of parseGrade(d[f.key], f.options)) count.set(g.cor, (count.get(g.cor) ?? 0) + 1);
        else if (/^cor(es)?(_|$)/.test(f.key) && typeof d[f.key] === "string") for (const c of String(d[f.key]).split(/[,;/]| e /)) if (c.trim()) count.set(c.trim(), (count.get(c.trim()) ?? 0) + 1);
      }
    }
    palette = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);
  }
  const h = await headers();
  const origin = baseUrl(ctx.org) || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  const rows: RecordRow[] = records.map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    statusId: r.statusId,
    assigneeId: r.assigneeId,
    data: (r.data ?? {}) as Record<string, unknown>,
    dueAt: r.dueAt?.toISOString() ?? null,
    isFinal: !!r.status?.isFinal,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <ModuleView
      key={mod.id + view + (sp.new ?? "") + month}
      mod={{
        id: mod.id,
        key: mod.key,
        name: mod.name,
        singular: mod.singular,
        description: mod.description,
        icon: mod.icon,
        color: mod.color,
        prefix: mod.prefix,
        dueFieldKey: mod.dueFieldKey,
        amountFieldKey: mod.amountFieldKey,
        recurrenceFieldKey: mod.recurrenceFieldKey,
        canEdit: canEditModule(ctx, mod),
        // vínculo com módulo ainda não instalado fica oculto até a instalação
        fields: mod.fields.filter((f) => !(f.type === "RECORD" && (f.options[0] ?? "").startsWith("tpl:"))).map((f) => ({ id: f.id, key: f.key, label: f.label, type: f.type, options: f.options, required: f.required, showInList: f.showInList })),
        statuses: mod.statuses.map((s) => ({ id: s.id, name: s.name, color: s.color, isFinal: s.isFinal })),
      }}
      rows={rows}
      refs={refs}
      view={view}
      total={total}
      page={page}
      pageSize={PAGE}
      stats={{ open: openCount, overdue, dueSoon, openSum: Number(openSum._sum.amount ?? 0), all: allCount }}
      filters={{ q: sp.q ?? "", status: sp.status ?? "", who: sp.who ?? "", scope: sp.scope ?? "" }}
      openNew={sp.new === "1"}
      look={rules.look}
      kpis={kpis && kpis.length ? kpis : null}
      covers={covers}
      lookbook={[...new Set(Object.values(covers))].slice(0, 4)}
      palette={palette}
      prefill={prefill}
      month={month}
      share={
        isAdmin
          ? {
              formUrl: mod.formToken ? `${origin}/f/${mod.formToken}` : null,
              feedUrl: mod.feedToken ? `${origin}/api/public/feed/${mod.feedToken}` : null,
              feedAvailable: mod.templateKey === "imoveis",
              form: formSettings(mod.settings),
            }
          : null
      }
    />
  );
}
