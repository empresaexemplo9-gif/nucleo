import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Clock,
  Flame,
  LayoutDashboard,
  Percent,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { requireContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, daysSince, dateTime, date as dateFmt } from "@/lib/format";
import { delta, PERIODS, periodRange, previousRange, wonByMonth, type Period } from "@/lib/metrics";
import { ACTIVITY_TYPES } from "@/lib/defaults";
import { HBarChart, Ring, TrendChart } from "@/components/charts";
import { ActivityIcon } from "@/components/activity-icon";
import { Avatar, Badge, Card, CardHeader, EmptyState, IconTile, PageHeader, StatCard } from "@/components/ui";
import { PeriodSelect, Welcome } from "./dashboard-client";

export const metadata = { title: "Painel" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ period?: string; welcome?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const period = (sp.period && sp.period in PERIODS ? sp.period : "month") as Period;
  const { from, to } = periodRange(period);
  const prev = previousRange(period);
  const orgId = ctx.org.id;
  const scope = ownerScope(ctx);
  const base = { orgId, ...scope };
  const fmt = (v: number, c = false) => money(v, ctx.org.currency, ctx.org.locale, c);
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [openDeals, won, lost, created, prevWon, prevLost, prevCreated, monthly, pipeline, overdue, upcoming, goal, sellers, hot] = await Promise.all([
    db.deal.findMany({ where: { ...base, status: "OPEN" }, include: { stage: true }, orderBy: { stageChangedAt: "asc" } }),
    db.deal.findMany({ where: { ...base, status: "WON", closedAt: { gte: from, lt: to } }, select: { value: true, createdAt: true, closedAt: true, ownerId: true } }),
    db.deal.count({ where: { ...base, status: "LOST", closedAt: { gte: from, lt: to } } }),
    db.deal.count({ where: { ...base, createdAt: { gte: from, lt: to } } }),
    db.deal.findMany({ where: { ...base, status: "WON", closedAt: { gte: prev.from, lt: prev.to } }, select: { value: true, createdAt: true, closedAt: true } }),
    db.deal.count({ where: { ...base, status: "LOST", closedAt: { gte: prev.from, lt: prev.to } } }),
    db.deal.count({ where: { ...base, createdAt: { gte: prev.from, lt: prev.to } } }),
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
    db.deal.findMany({
      where: { ...base, status: "OPEN" },
      orderBy: { value: "desc" },
      take: 5,
      include: { stage: true, company: { select: { name: true } }, contact: { select: { name: true } } },
    }),
  ]);

  const sum = (l: { value: unknown }[]) => l.reduce((s, d) => s + Number(d.value), 0);
  const cycleOf = (l: { createdAt: Date; closedAt: Date | null }[]) =>
    l.length ? Math.round(l.reduce((s, d) => s + (d.closedAt!.getTime() - d.createdAt.getTime()) / 86400000, 0) / l.length) : 0;

  const openValue = sum(openDeals);
  const weighted = openDeals.reduce((s, d) => s + Number(d.value) * ((d.probability ?? d.stage.probability) / 100), 0);
  const wonValue = sum(won);
  const prevWonValue = sum(prevWon);
  const winRate = won.length + lost ? Math.round((won.length / (won.length + lost)) * 100) : 0;
  const prevWinRate = prevWon.length + prevLost ? Math.round((prevWon.length / (prevWon.length + prevLost)) * 100) : 0;
  const avgTicket = won.length ? wonValue / won.length : 0;
  const prevTicket = prevWon.length ? prevWonValue / prevWon.length : 0;
  const cycle = cycleOf(won);
  const rotting = openDeals.filter((d) => d.stage.rottingDays != null && daysSince(d.stageChangedAt) > d.stage.rottingDays).slice(0, 5);

  const byStage = (pipeline?.stages ?? []).map((s) => {
    const list = openDeals.filter((d) => d.stageId === s.id);
    return { name: s.name, value: sum(list), color: s.color, count: list.length };
  });

  const ranking = sellers
    .map((m) => {
      const list = won.filter((d) => d.ownerId === m.userId);
      return { id: m.userId, name: m.user.name, color: m.user.avatarColor, value: sum(list), count: list.length };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const topValue = ranking[0]?.value ?? 1;

  const monthWon = monthly[monthly.length - 1]?.value ?? 0;
  const goalPct = goal ? Math.round((monthWon / Number(goal.target)) * 100) : null;
  const L = ctx.labels;

  return (
    <div className="mx-auto max-w-[1400px] p-4 lg:p-8">
      {sp.welcome && <Welcome />}
      <PageHeader
        icon={<LayoutDashboard />}
        title="Painel de vendas"
        description={`Acompanhe os resultados de ${ctx.org.name} em tempo real.`}
        actions={<PeriodSelect value={period} options={PERIODS} />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard className="animate-rise" label="Pipeline em aberto" value={fmt(openValue, openValue >= 1e6)} sub={`${openDeals.length} ${(openDeals.length === 1 ? L.deal.singular : L.deal.plural).toLowerCase()}`} icon={<CircleDollarSign />} color="#6366f1" />
        <StatCard className="animate-rise [animation-delay:40ms]" label="Previsão ponderada" value={fmt(weighted, weighted >= 1e6)} sub="valor × probabilidade" icon={<TrendingUp />} color="#0ea5e9" />
        <StatCard className="animate-rise [animation-delay:80ms]" label="Receita ganha" value={fmt(wonValue, wonValue >= 1e6)} delta={delta(wonValue, prevWonValue)} sub="vs. anterior" icon={<Trophy />} color="#10b981" />
        <StatCard className="animate-rise [animation-delay:120ms]" label="Taxa de conversão" value={`${winRate}%`} delta={prevWinRate || winRate ? winRate - prevWinRate : null} sub={`${won.length} ganhos · ${lost} perdidos`} icon={<Percent />} color="#8b5cf6" />
        <StatCard className="animate-rise [animation-delay:160ms]" label="Ticket médio" value={fmt(avgTicket, avgTicket >= 1e6)} delta={delta(avgTicket, prevTicket)} sub="vs. anterior" icon={<Target />} color="#f59e0b" />
        <StatCard className="animate-rise [animation-delay:200ms]" label="Novos no período" value={String(created)} delta={delta(created, prevCreated)} sub={`ciclo médio ${cycle}d`} icon={<Clock />} color="#ec4899" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardHeader
            icon={<TrendingUp />}
            title="Receita ganha"
            description="Últimos 6 meses"
            action={
              <div className="text-right">
                <p className="font-display text-lg font-bold">{fmt(monthly.reduce((s, m) => s + m.value, 0), true)}</p>
                <p className="text-[11px] text-muted">{monthly.reduce((s, m) => s + (m.count ?? 0), 0)} negócios fechados</p>
              </div>
            }
          />
          <TrendChart data={monthly} />
        </Card>

        <Card className="flex flex-col p-5">
          <CardHeader icon={<Target />} title="Meta do mês" description={dateFmt(new Date(), "pt-BR", { month: "long", year: "numeric" })} />
          {goal ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <Ring value={goalPct ?? 0} size={150} stroke={13}>
                <span className="font-display text-3xl font-bold">{goalPct}%</span>
                <span className="text-[11px] text-muted">atingido</span>
              </Ring>
              <div className="grid w-full grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-surface-2 p-2.5">
                  <p className="text-[11px] text-muted">Realizado</p>
                  <p className="font-display text-sm font-bold">{fmt(monthWon, true)}</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-2.5">
                  <p className="text-[11px] text-muted">Faltam</p>
                  <p className="font-display text-sm font-bold">{fmt(Math.max(0, Number(goal.target) - monthWon), true)}</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Target />}
              title="Nenhuma meta definida"
              description="Defina uma meta de receita para acompanhar o progresso do time."
              action={
                ctx.role !== "SALES" && ctx.role !== "VIEWER" ? (
                  <Link href="/settings/goals" className="text-sm font-medium text-brand hover:underline">Definir meta →</Link>
                ) : undefined
              }
            />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <CardHeader
            icon={<LayoutDashboard />}
            title="Pipeline por etapa"
            description={pipeline?.name}
            action={<Link href="/deals" className="text-xs font-medium text-brand hover:underline">Ver funil</Link>}
          />
          {byStage.length ? <HBarChart data={byStage} /> : <p className="text-sm text-muted">Sem dados.</p>}
        </Card>

        <Card className="p-5">
          <CardHeader
            icon={<Trophy />}
            title="Ranking de vendedores"
            description={PERIODS[period]}
          />
          {ranking.length ? (
            <ol className="space-y-3.5">
              {ranking.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3">
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i === 0 ? "bg-amber-400/20 text-amber-600" : i === 1 ? "bg-slate-400/20 text-slate-500" : i === 2 ? "bg-orange-400/20 text-orange-600" : "bg-surface-2 text-muted"}`}>
                    {i + 1}
                  </span>
                  <Avatar name={r.name} color={r.color} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="font-display text-sm font-bold">{fmt(r.value, true)}</p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(r.value / topValue) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={<Trophy />} title="Sem vendas no período" description="O ranking aparece assim que o primeiro negócio for ganho." />
          )}
        </Card>

        <Card className="p-5">
          <CardHeader
            icon={<Flame />}
            title="Maiores oportunidades"
            description="Negócios abertos de maior valor"
          />
          <ul className="space-y-1">
            {hot.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2">
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: d.stage.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{d.title}</span>
                    <span className="block truncate text-xs text-muted">{d.company?.name ?? d.contact?.name ?? "—"} · {d.stage.name}</span>
                  </span>
                  <span className="font-display text-sm font-bold">{fmt(Number(d.value), true)}</span>
                </Link>
              </li>
            ))}
            {!hot.length && <p className="text-sm text-muted">Nenhuma oportunidade aberta.</p>}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader
            icon={<CalendarClock />}
            title={`Minhas próximas ${L.activity.plural.toLowerCase()}`}
            description="Agenda pessoal"
            action={
              overdue > 0 ? (
                <Link href="/activities?when=overdue&who=me">
                  <Badge color="#e11d48" dot>{overdue} atrasada(s)</Badge>
                </Link>
              ) : (
                <Badge color="#16a34a" dot>Em dia</Badge>
              )
            }
          />
          <ul className="space-y-1">
            {upcoming.map((a) => {
              const late = a.dueAt && a.dueAt < now;
              const t = ACTIVITY_TYPES[a.type];
              return (
                <li key={a.id} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2">
                  <IconTile color={late ? "#e11d48" : t.color} size={34} className="[&>svg]:size-4">
                    <ActivityIcon type={a.type} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className={`truncate text-xs ${late ? "font-medium text-rose-600" : "text-muted"}`}>
                      {a.dueAt ? dateTime(a.dueAt) : "Sem data"}
                      {a.deal && (
                        <>
                          {" · "}
                          <Link href={`/deals/${a.deal.id}`} className="hover:text-brand">{a.deal.title}</Link>
                        </>
                      )}
                    </p>
                  </div>
                  {late && <Badge color="#e11d48">Atrasada</Badge>}
                </li>
              );
            })}
            {!upcoming.length && <EmptyState icon={<CalendarClock />} title="Agenda livre 🎉" description="Nenhuma atividade pendente para você." />}
          </ul>
          <Link href="/activities" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
            Ver agenda completa <ArrowRight className="size-3" />
          </Link>
        </Card>

        <Card className="p-5">
          <CardHeader
            icon={<AlertTriangle />}
            title={`${L.deal.plural} parados`}
            description="Sem movimentação além do limite da etapa"
            action={rotting.length > 0 ? <Badge color="#d97706" dot>{rotting.length}</Badge> : undefined}
          />
          <ul className="space-y-1">
            {rotting.map((d) => {
              const days = daysSince(d.stageChangedAt);
              return (
                <li key={d.id}>
                  <Link href={`/deals/${d.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2">
                    <IconTile color="#d97706" size={34} className="[&>svg]:size-4">
                      <AlertTriangle />
                    </IconTile>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{d.title}</span>
                      <span className="text-xs text-muted">{d.stage.name} · parado há <b className="text-amber-600">{days} dias</b></span>
                    </span>
                    <span className="font-display text-sm font-bold">{fmt(Number(d.value), true)}</span>
                  </Link>
                </li>
              );
            })}
            {!rotting.length && <EmptyState icon={<Trophy />} title="Tudo em movimento" description="Nenhum negócio parado. Ótimo trabalho!" />}
          </ul>
        </Card>
      </div>
    </div>
  );
}
