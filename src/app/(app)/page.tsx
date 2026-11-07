import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CircleDollarSign, Clock, Percent, Target, TrendingUp, Trophy } from "lucide-react";
import { requireContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, daysSince, dateTime } from "@/lib/format";
import { PERIODS, periodRange, wonByMonth, type Period } from "@/lib/metrics";
import { ColumnChart, HBarChart } from "@/components/charts";
import { Card } from "@/components/ui";
import { PeriodSelect, Welcome } from "./dashboard-client";

export const metadata = { title: "Painel" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ period?: string; welcome?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const period = (sp.period && sp.period in PERIODS ? sp.period : "month") as Period;
  const { from, to } = periodRange(period);
  const orgId = ctx.org.id;
  const scope = ownerScope(ctx);
  const base = { orgId, ...scope };
  const fmt = (v: number, c = false) => money(v, ctx.org.currency, ctx.org.locale, c);
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [openDeals, won, lost, created, monthly, pipeline, overdue, upcoming, goal, sellers] = await Promise.all([
    db.deal.findMany({ where: { ...base, status: "OPEN" }, include: { stage: true }, orderBy: { stageChangedAt: "asc" } }),
    db.deal.findMany({ where: { ...base, status: "WON", closedAt: { gte: from, lt: to } }, select: { value: true, createdAt: true, closedAt: true, ownerId: true } }),
    db.deal.count({ where: { ...base, status: "LOST", closedAt: { gte: from, lt: to } } }),
    db.deal.count({ where: { ...base, createdAt: { gte: from, lt: to } } }),
    wonByMonth(base, 6),
    db.pipeline.findFirst({ where: { orgId, isDefault: true }, include: { stages: { where: { type: "OPEN" }, orderBy: { position: "asc" } } } }),
    db.activity.count({ where: { orgId, assigneeId: ctx.user.id, done: false, dueAt: { lt: now } } }),
    db.activity.findMany({
      where: { orgId, assigneeId: ctx.user.id, done: false },
      orderBy: { dueAt: { sort: "asc", nulls: "last" } },
      take: 6,
      include: { deal: { select: { id: true, title: true } }, contact: { select: { id: true, name: true } } },
    }),
    db.goal.findFirst({ where: { orgId, period: ym, metric: "REVENUE", userId: null } }),
    db.membership.findMany({ where: { orgId, active: true }, include: { user: true } }),
  ]);

  const openValue = openDeals.reduce((s, d) => s + Number(d.value), 0);
  const weighted = openDeals.reduce((s, d) => s + Number(d.value) * ((d.probability ?? d.stage.probability) / 100), 0);
  const wonValue = won.reduce((s, d) => s + Number(d.value), 0);
  const winRate = won.length + lost ? Math.round((won.length / (won.length + lost)) * 100) : 0;
  const avgTicket = won.length ? wonValue / won.length : 0;
  const cycle = won.length ? Math.round(won.reduce((s, d) => s + (d.closedAt!.getTime() - d.createdAt.getTime()) / 86400000, 0) / won.length) : 0;
  const rotting = openDeals.filter((d) => d.stage.rottingDays != null && daysSince(d.stageChangedAt) > d.stage.rottingDays).slice(0, 6);

  const byStage = (pipeline?.stages ?? []).map((s) => {
    const list = openDeals.filter((d) => d.stageId === s.id);
    return { name: s.name, value: list.reduce((a, d) => a + Number(d.value), 0), color: s.color, count: list.length };
  });

  const ranking = sellers
    .map((m) => {
      const list = won.filter((d) => d.ownerId === m.userId);
      return { name: m.user.name, value: list.reduce((s, d) => s + Number(d.value), 0), count: list.length };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const monthWon = monthly[monthly.length - 1]?.value ?? 0;
  const goalPct = goal ? Math.min(100, Math.round((monthWon / Number(goal.target)) * 100)) : null;
  const L = ctx.labels;

  const kpis = [
    { label: "Pipeline em aberto", value: fmt(openValue), sub: `${openDeals.length} ${(openDeals.length === 1 ? L.deal.singular : L.deal.plural).toLowerCase()}`, icon: CircleDollarSign },
    { label: "Previsão ponderada", value: fmt(weighted), sub: "valor × probabilidade", icon: TrendingUp },
    { label: "Ganhos no período", value: fmt(wonValue), sub: `${won.length} fechado(s)`, icon: Trophy },
    { label: "Taxa de conversão", value: `${winRate}%`, sub: `${won.length} ganhos · ${lost} perdidos`, icon: Percent },
    { label: "Ticket médio", value: fmt(avgTicket), sub: `${created} novos no período`, icon: Target },
    { label: "Ciclo de venda", value: `${cycle} dias`, sub: "da criação ao ganho", icon: Clock },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
      {sp.welcome && <Welcome />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Olá, {ctx.user.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted">Veja como estão as vendas de {ctx.org.name}.</p>
        </div>
        <PeriodSelect value={period} options={PERIODS} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center justify-between text-xs text-muted">
              {k.label}
              <k.icon className="size-4 text-brand" />
            </div>
            <p className="mt-2 text-xl font-semibold tracking-tight">{k.value}</p>
            <p className="mt-0.5 text-xs text-muted">{k.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Receita ganha — últimos 6 meses</h2>
          </div>
          <ColumnChart data={monthly} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Meta do mês</h2>
          {goal ? (
            <div>
              <p className="text-3xl font-semibold">{goalPct}%</p>
              <p className="text-sm text-muted">
                {fmt(monthWon)} de {fmt(Number(goal.target))}
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-brand" style={{ width: `${goalPct}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">Faltam {fmt(Math.max(0, Number(goal.target) - monthWon))}</p>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Nenhuma meta definida.{" "}
              {ctx.role !== "SALES" && ctx.role !== "VIEWER" && (
                <Link href="/settings/goals" className="text-brand hover:underline">Definir meta</Link>
              )}
            </p>
          )}
          <h2 className="mb-2 mt-6 text-sm font-semibold">Ranking do período</h2>
          {ranking.length ? (
            <ol className="space-y-2">
              {ranking.map((r, i) => (
                <li key={r.name} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-center text-xs font-semibold text-muted">{i + 1}º</span>
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="font-medium">{fmt(r.value, true)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Nenhuma venda no período ainda.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pipeline por etapa</h2>
            <Link href="/deals" className="text-xs text-brand hover:underline">Ver funil</Link>
          </div>
          {byStage.length ? <HBarChart data={byStage} /> : <p className="text-sm text-muted">Sem dados.</p>}
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Minhas próximas {L.activity.plural.toLowerCase()}</h2>
            {overdue > 0 && (
              <Link href="/activities?when=overdue&who=me" className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
                {overdue} atrasada(s)
              </Link>
            )}
          </div>
          <ul className="space-y-2.5">
            {upcoming.map((a) => {
              const late = a.dueAt && a.dueAt < now;
              return (
                <li key={a.id} className="flex items-start gap-2 text-sm">
                  <CalendarClock className={`mt-0.5 size-4 shrink-0 ${late ? "text-red-500" : "text-muted"}`} />
                  <div className="min-w-0">
                    <p className="truncate">{a.title}</p>
                    <p className={`text-xs ${late ? "text-red-600" : "text-muted"}`}>
                      {a.dueAt ? dateTime(a.dueAt) : "Sem data"}
                      {a.deal && (
                        <>
                          {" · "}
                          <Link href={`/deals/${a.deal.id}`} className="hover:text-brand">{a.deal.title}</Link>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
            {!upcoming.length && <p className="text-sm text-muted">Nenhuma atividade pendente. 🎉</p>}
          </ul>
          <Link href="/activities" className="mt-3 inline-flex items-center gap-1 text-xs text-brand hover:underline">
            Ver todas <ArrowRight className="size-3" />
          </Link>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <AlertTriangle className="size-4 text-amber-500" /> {L.deal.plural} parados
          </h2>
          <ul className="space-y-2.5">
            {rotting.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="flex items-center justify-between gap-2 text-sm hover:text-brand">
                  <span className="min-w-0">
                    <span className="block truncate">{d.title}</span>
                    <span className="text-xs text-muted">
                      {d.stage.name} · há {daysSince(d.stageChangedAt)} dias
                    </span>
                  </span>
                  <span className="text-xs font-medium">{fmt(Number(d.value), true)}</span>
                </Link>
              </li>
            ))}
            {!rotting.length && <p className="text-sm text-muted">Nenhum negócio parado. Ótimo trabalho!</p>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
