import { BarChart3, Download, Percent, Sparkles, ThumbsDown, Trophy } from "lucide-react";
import { requireContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { PERIODS, periodRange, wonByMonth, type Period } from "@/lib/metrics";
import { ACTIVITY_TYPES } from "@/lib/defaults";
import { ColumnChart, HBarChart } from "@/components/charts";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import { ReportFilters } from "./report-filters";

export const metadata = { title: "Relatórios" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; pipeline?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const period = (sp.period && sp.period in PERIODS ? sp.period : "quarter") as Period;
  const { from, to } = periodRange(period);
  const orgId = ctx.org.id;
  const pipelines = await db.pipeline.findMany({ where: { orgId }, orderBy: { position: "asc" }, include: { stages: { orderBy: { position: "asc" } } } });
  const pipeline = pipelines.find((p) => p.id === sp.pipeline) ?? pipelines.find((p) => p.isDefault) ?? pipelines[0]!;
  const base = { orgId, pipelineId: pipeline.id, ...ownerScope(ctx) };
  const fmt = (v: number, c = false) => money(v, ctx.org.currency, ctx.org.locale, c);

  const [created, closed, open, members, activities, monthly, stageEvents] = await Promise.all([
    db.deal.findMany({ where: { ...base, createdAt: { gte: from, lt: to } }, select: { id: true, source: true, status: true, value: true } }),
    db.deal.findMany({ where: { ...base, status: { in: ["WON", "LOST"] }, closedAt: { gte: from, lt: to } }, select: { status: true, value: true, ownerId: true, lostReason: true, createdAt: true, closedAt: true } }),
    db.deal.findMany({ where: { ...base, status: "OPEN" }, include: { stage: true } }),
    db.membership.findMany({ where: { orgId }, include: { user: true } }),
    db.activity.findMany({ where: { orgId, done: true, doneAt: { gte: from, lt: to } }, select: { type: true, assigneeId: true } }),
    wonByMonth(base, 12),
    db.timelineEvent.findMany({ where: { orgId, type: "DEAL_STAGE", createdAt: { gte: from, lt: to }, deal: { pipelineId: pipeline.id } }, select: { dealId: true, data: true } }),
  ]);

  // Funil de conversão: negócios criados no período que chegaram a cada etapa (ou além)
  const openStages = pipeline.stages.filter((s) => s.type === "OPEN");
  const reached = new Map<string, Set<string>>();
  for (const s of openStages) reached.set(s.name, new Set());
  const createdIds = new Set(created.map((d) => d.id));
  for (const e of stageEvents) {
    const to_ = (e.data as { to?: string })?.to;
    if (e.dealId && createdIds.has(e.dealId) && to_ && reached.has(to_)) reached.get(to_)!.add(e.dealId);
  }
  const allDeals = await db.deal.findMany({ where: { id: { in: [...createdIds] } }, include: { stage: true } });
  for (const d of allDeals) {
    const idx = d.stage.type === "OPEN" ? openStages.findIndex((s) => s.id === d.stageId) : d.status === "WON" ? openStages.length - 1 : -1;
    openStages.forEach((s, i) => {
      if (i <= idx || i === 0) reached.get(s.name)!.add(d.id);
    });
  }
  // garante monotonicidade (quem chegou na etapa N passou pelas anteriores)
  for (let i = openStages.length - 2; i >= 0; i--) for (const id of reached.get(openStages[i + 1]!.name)!) reached.get(openStages[i]!.name)!.add(id);
  const funnel = [
    ...openStages.map((s) => ({ name: s.name, value: reached.get(s.name)!.size, color: s.color })),
    { name: "Ganho", value: created.filter((d) => d.status === "WON").length, color: "var(--ok)" },
  ];

  const won = closed.filter((d) => d.status === "WON");
  const lost = closed.filter((d) => d.status === "LOST");
  const reasons = new Map<string, number>();
  for (const d of lost) {
    const r = (d.lostReason ?? "Não informado").split(" — ")[0]!;
    reasons.set(r, (reasons.get(r) ?? 0) + 1);
  }
  const sources = new Map<string, { count: number; won: number }>();
  for (const d of created) {
    const k = d.source ?? "Não informado";
    const s = sources.get(k) ?? { count: 0, won: 0 };
    s.count++;
    if (d.status === "WON") s.won += Number(d.value);
    sources.set(k, s);
  }
  const forecast = new Map<string, { value: number; weighted: number }>();
  for (const d of open) {
    const k = d.expectedClose ? d.expectedClose.toISOString().slice(0, 7) : "Sem previsão";
    const f = forecast.get(k) ?? { value: 0, weighted: 0 };
    f.value += Number(d.value);
    f.weighted += (Number(d.value) * (d.probability ?? d.stage.probability)) / 100;
    forecast.set(k, f);
  }

  const people = members
    .map((m) => {
      const w = won.filter((d) => d.ownerId === m.userId);
      const l = lost.filter((d) => d.ownerId === m.userId);
      const o = open.filter((d) => d.ownerId === m.userId);
      return {
        name: m.user.name,
        won: w.length,
        wonValue: w.reduce((s, d) => s + Number(d.value), 0),
        lost: l.length,
        rate: w.length + l.length ? Math.round((w.length / (w.length + l.length)) * 100) : 0,
        open: o.reduce((s, d) => s + Number(d.value), 0),
        acts: activities.filter((a) => a.assigneeId === m.userId).length,
      };
    })
    .filter((p) => p.won || p.lost || p.open || p.acts)
    .sort((a, b) => b.wonValue - a.wonValue);

  const actsByType = Object.entries(ACTIVITY_TYPES)
    .map(([k, v]) => ({ name: v.label, value: activities.filter((a) => a.type === k).length, color: v.color }))
    .filter((x) => x.value > 0);

  const wonValue = won.reduce((s, d) => s + Number(d.value), 0);
  const L = ctx.labels;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 pb-16 pt-8 lg:px-8">
      <PageHeader eyebrow="06 / Análise"
        icon={<BarChart3 />}
        title="Relatórios de vendas" highlight="vendas"
        description="Conversão, desempenho da equipe, perdas e previsão de receita."
        actions={
          <>
            <ReportFilters period={period} periods={PERIODS} pipeline={pipeline.id} pipelines={pipelines.map((p) => ({ id: p.id, name: p.name }))} />
            <a href="/api/export/deals" download>
              <Button variant="secondary"><Download className="size-4" /> Exportar CSV</Button>
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Novos no período" value={String(created.length)} icon={<Sparkles />} color="var(--accent)" index={1} />
        <StatCard label="Ganhos" value={fmt(wonValue, true)} sub={`${won.length} negócio(s)`} icon={<Trophy />} color="var(--ok)" index={2} />
        <StatCard label="Perdidos" value={String(lost.length)} sub={`${fmt(lost.reduce((s, d) => s + Number(d.value), 0), true)} em valor`} icon={<ThumbsDown />} color="var(--err)" index={3} />
        <StatCard label="Conversão" value={`${won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0}%`} sub="ganhos ÷ fechados" icon={<Percent />} color="var(--accent-2)" index={4} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Funil de conversão</h2>
          <p className="mb-3 text-xs text-muted">{L.deal.plural} criados no período que alcançaram cada etapa.</p>
          <HBarChart data={funnel} money={false} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {funnel.slice(1).map((f, i) => {
              const prev = funnel[i]!.value;
              return (
                <span key={f.name}>
                  {funnel[i]!.name} → {f.name}: <b className="text-fg">{prev ? Math.round((f.value / prev) * 100) : 0}%</b>
                </span>
              );
            })}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Receita ganha — 12 meses</h2>
          <ColumnChart data={monthly} height={260} />
        </Card>
      </div>

      <Card className="overflow-x-auto p-5">
        <h2 className="mb-3 text-sm font-semibold">Desempenho por vendedor</h2>
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="py-2 font-medium">Vendedor</th>
              <th className="py-2 text-right font-medium">Ganhos</th>
              <th className="py-2 text-right font-medium">Receita</th>
              <th className="py-2 text-right font-medium">Perdidos</th>
              <th className="py-2 text-right font-medium">Conversão</th>
              <th className="py-2 text-right font-medium">Pipeline aberto</th>
              <th className="py-2 text-right font-medium">Atividades feitas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {people.map((p) => (
              <tr key={p.name}>
                <td className="py-2 font-medium">{p.name}</td>
                <td className="py-2 text-right">{p.won}</td>
                <td className="py-2 text-right font-medium">{fmt(p.wonValue)}</td>
                <td className="py-2 text-right">{p.lost}</td>
                <td className="py-2 text-right">{p.rate}%</td>
                <td className="py-2 text-right">{fmt(p.open)}</td>
                <td className="py-2 text-right">{p.acts}</td>
              </tr>
            ))}
            {!people.length && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted">Sem dados no período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Motivos de perda</h2>
          {reasons.size ? (
            <HBarChart data={[...reasons.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value, color: "var(--text-mute)" }))} money={false} />
          ) : (
            <p className="text-sm text-muted">Nenhuma perda no período.</p>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Origem dos {L.deal.plural.toLowerCase()}</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr><th className="pb-2 font-medium">Origem</th><th className="pb-2 text-right font-medium">Qtd.</th><th className="pb-2 text-right font-medium">Receita</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...sources.entries()].sort((a, b) => b[1].count - a[1].count).map(([k, v]) => (
                <tr key={k}><td className="py-1.5">{k}</td><td className="py-1.5 text-right">{v.count}</td><td className="py-1.5 text-right">{fmt(v.won, true)}</td></tr>
              ))}
              {!sources.size && <tr><td colSpan={3} className="py-4 text-center text-muted">Sem dados.</td></tr>}
            </tbody>
          </table>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Atividades concluídas</h2>
          {actsByType.length ? <HBarChart data={actsByType} money={false} /> : <p className="text-sm text-muted">Nenhuma atividade concluída.</p>}
        </Card>
      </div>

      <Card className="overflow-x-auto p-5">
        <h2 className="mb-1 text-sm font-semibold">Previsão de fechamento</h2>
        <p className="mb-3 text-xs text-muted">{L.deal.plural} em aberto agrupados pelo mês previsto de fechamento.</p>
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
            <tr><th className="py-2 font-medium">Mês</th><th className="py-2 text-right font-medium">Valor total</th><th className="py-2 text-right font-medium">Ponderado</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...forecast.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => (
              <tr key={k}>
                <td className="py-2 capitalize">{k === "Sem previsão" ? k : new Date(k + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</td>
                <td className="py-2 text-right">{fmt(v.value)}</td>
                <td className="py-2 text-right font-medium">{fmt(v.weighted)}</td>
              </tr>
            ))}
            {!forecast.size && <tr><td colSpan={3} className="py-4 text-center text-muted">Sem {L.deal.plural.toLowerCase()} em aberto.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
