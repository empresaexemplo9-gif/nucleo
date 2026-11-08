import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CircleDollarSign,
  Clock,
  Flame,
  KanbanSquare,
  Percent,
  Plus,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { requireContext, ownerScope } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, daysSince, dateTime, date as dateFmt, currentHour } from "@/lib/format";
import { delta, monthlySeries, PERIODS, periodRange, previousRange, wonByMonth, type Period } from "@/lib/metrics";
import { ACTIVITY_TYPES } from "@/lib/defaults";
import { Ring, TrendChart } from "@/components/charts";
import { Funnel } from "@/components/funnel";
import { Sparkline } from "@/components/sparkline";
import { ActivityIcon } from "@/components/activity-icon";
import { Avatar, Badge, Card, CardHeader, EmptyState, IconTile, SectionTitle, StatCard } from "@/components/ui";
import { HeroActions, PeriodSelect, Welcome } from "./dashboard-client";

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
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [openDeals, won, lost, created, prevWon, prevLost, prevCreated, monthly, series, pipeline, overdue, todayCount, upcoming, goal, sellers, hot] =
    await Promise.all([
      db.deal.findMany({ where: { ...base, status: "OPEN" }, include: { stage: true }, orderBy: { stageChangedAt: "asc" } }),
      db.deal.findMany({ where: { ...base, status: "WON", closedAt: { gte: from, lt: to } }, select: { value: true, createdAt: true, closedAt: true, ownerId: true } }),
      db.deal.count({ where: { ...base, status: "LOST", closedAt: { gte: from, lt: to } } }),
      db.deal.count({ where: { ...base, createdAt: { gte: from, lt: to } } }),
      db.deal.findMany({ where: { ...base, status: "WON", closedAt: { gte: prev.from, lt: prev.to } }, select: { value: true } }),
      db.deal.count({ where: { ...base, status: "LOST", closedAt: { gte: prev.from, lt: prev.to } } }),
      db.deal.count({ where: { ...base, createdAt: { gte: prev.from, lt: prev.to } } }),
      wonByMonth(base, 6),
      monthlySeries(base, 6),
      db.pipeline.findFirst({ where: { orgId, isDefault: true }, include: { stages: { where: { type: "OPEN" }, orderBy: { position: "asc" } } } }),
      db.activity.count({ where: { orgId, assigneeId: ctx.user.id, done: false, dueAt: { lt: now } } }),
      db.activity.count({ where: { orgId, assigneeId: ctx.user.id, done: false, dueAt: { gte: dayStart, lt: dayEnd } } }),
      db.activity.findMany({
        where: { orgId, assigneeId: ctx.user.id, done: false },
        orderBy: { dueAt: { sort: "asc", nulls: "last" } },
        take: 6,
        include: { deal: { select: { id: true, title: true } } },
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
  const openValue = sum(openDeals);
  const weighted = openDeals.reduce((s, d) => s + Number(d.value) * ((d.probability ?? d.stage.probability) / 100), 0);
  const wonValue = sum(won);
  const prevWonValue = sum(prevWon);
  const winRate = won.length + lost ? Math.round((won.length / (won.length + lost)) * 100) : 0;
  const prevWinRate = prevWon.length + prevLost ? Math.round((prevWon.length / (prevWon.length + prevLost)) * 100) : 0;
  const avgTicket = won.length ? wonValue / won.length : 0;
  const prevTicket = prevWon.length ? prevWonValue / prevWon.length : 0;
  const cycle = won.length ? Math.round(won.reduce((s, d) => s + (d.closedAt!.getTime() - d.createdAt.getTime()) / 86400000, 0) / won.length) : 0;
  const rottingAll = openDeals.filter((d) => d.stage.rottingDays != null && daysSince(d.stageChangedAt) > d.stage.rottingDays);
  const rotting = rottingAll.slice(0, 5);

  const funnel = (pipeline?.stages ?? []).map((s) => {
    const list = openDeals.filter((d) => d.stageId === s.id);
    return { name: s.name, color: s.color, count: list.length, value: fmt(sum(list), true) };
  });

  const ranking = sellers
    .map((m) => {
      const list = won.filter((d) => d.ownerId === m.userId);
      return { id: m.userId, name: m.user.name, color: m.user.avatarColor, value: sum(list), count: list.length };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const topValue = ranking[0]?.value || 1;

  const monthWon = monthly[monthly.length - 1]?.value ?? 0;
  const goalPct = goal ? Math.round((monthWon / Number(goal.target)) * 100) : null;
  const L = ctx.labels;
  const hour = currentHour();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const big = (v: number) => fmt(v, v >= 100000);

  const summary =
    overdue > 0
      ? `Você tem ${overdue} atividade(s) atrasada(s) — que tal começar por elas?`
      : todayCount > 0
        ? `Você tem ${todayCount} atividade(s) para hoje. Bora vender! 🚀`
        : "Sua agenda de hoje está livre — ótimo momento para prospectar.";

  return (
    <div className="mx-auto max-w-[1400px] p-4 lg:p-8">
      {sp.welcome && <Welcome />}

      {/* ======== Faixa de boas-vindas ======== */}
      <section className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lift lg:p-8" style={{ background: "linear-gradient(120deg, var(--brand), color-mix(in oklab, var(--brand) 50%, var(--accent)) 55%, var(--accent))" }}>
        <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-fuchsia-400/25 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_left,black,transparent_65%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0 max-w-xl">
            <p className="text-sm font-medium text-white/75 first-letter:uppercase">{dateFmt(now, "pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight lg:text-[34px]">
              {greeting}, {ctx.user.name.split(" ")[0]}! 👋
            </h1>
            <p className="mt-2 text-sm text-white/85 lg:text-base">{summary}</p>
            <HeroActions />
          </div>
          <div className="grid w-full grid-cols-3 gap-2.5 sm:w-auto">
            {[
              { label: "Para hoje", value: todayCount, icon: CalendarCheck, href: "/activities?when=today&who=me" },
              { label: "Atrasadas", value: overdue, icon: Clock, href: "/activities?when=overdue&who=me", alert: overdue > 0 },
              { label: "Parados", value: rottingAll.length, icon: AlertTriangle, href: "/deals", alert: rottingAll.length > 0 },
            ].map((x, i) => (
              <Link
                key={x.label}
                href={x.href}
                className="animate-float rounded-2xl border border-white/25 bg-white/12 p-3.5 text-center backdrop-blur-md transition hover:bg-white/20 sm:w-28"
                style={{ animationDelay: `${i * 0.6}s` }}
              >
                <x.icon className="mx-auto size-5 opacity-90" />
                <p className="font-display mt-1.5 text-2xl font-extrabold leading-none">{x.value}</p>
                <p className="mt-1 text-[11px] font-medium text-white/80">
                  {x.label}
                  {x.alert && <span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-rose-300" />}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ======== Seu dia ======== */}
      <SectionTitle emoji="☀️" title="Seu dia" description="O que precisa da sua atenção agora" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardHeader
            icon={<CalendarClock />}
            title={`Próximas ${L.activity.plural.toLowerCase()}`}
            description="Sua agenda pessoal"
            action={
              <Link href="/activities" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                Agenda completa <ArrowRight className="size-3" />
              </Link>
            }
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            {upcoming.map((a) => {
              const late = a.dueAt && a.dueAt < now;
              const t = ACTIVITY_TYPES[a.type];
              return (
                <li key={a.id} className={`flex items-center gap-3 rounded-xl border p-3 transition hover:shadow-card ${late ? "border-rose-500/25 bg-rose-500/[0.04]" : "border-line bg-surface-2/40"}`}>
                  <IconTile color={late ? "#e11d48" : t.color} size={38} className="[&>svg]:size-[18px]">
                    <ActivityIcon type={a.type} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    <p className={`truncate text-xs ${late ? "font-semibold text-rose-600" : "text-muted"}`}>{a.dueAt ? dateTime(a.dueAt) : "Sem data"}</p>
                    {a.deal && (
                      <Link href={`/deals/${a.deal.id}`} className="block truncate text-xs text-muted hover:text-brand">
                        {a.deal.title}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {!upcoming.length && <EmptyState icon={<CalendarClock />} title="Agenda livre 🎉" description="Nenhuma atividade pendente para você." />}
        </Card>

        <Card className="p-5">
          <CardHeader
            icon={<AlertTriangle />}
            title={`${L.deal.plural} parados`}
            description="Precisam de um empurrão"
            action={rottingAll.length > 0 ? <Badge color="#d97706" dot>{rottingAll.length}</Badge> : undefined}
          />
          <ul className="space-y-1">
            {rotting.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2">
                  <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-sm">
                    <span className="font-display text-sm font-extrabold leading-none">{daysSince(d.stageChangedAt)}</span>
                    <span className="text-[8px] font-semibold uppercase">dias</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{d.title}</span>
                    <span className="text-xs text-muted">{d.stage.name}</span>
                  </span>
                  <span className="font-display text-sm font-bold">{fmt(Number(d.value), true)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {!rotting.length && <EmptyState icon={<Trophy />} title="Tudo em movimento" description="Nenhum negócio parado. Ótimo trabalho!" />}
        </Card>
      </div>

      {/* ======== Resultados ======== */}
      <SectionTitle emoji="📈" title="Resultados" description={`${PERIODS[period]} · comparado ao período anterior`} action={<PeriodSelect value={period} options={PERIODS} />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard className="animate-rise" label="Receita ganha" value={big(wonValue)} delta={delta(wonValue, prevWonValue)} sub="vs. anterior" icon={<Trophy />} color="#10b981" spark={<Sparkline id="won" values={series.map((s) => s.won)} color="#10b981" width={70} />} />
        <StatCard className="animate-rise [animation-delay:50ms]" label="Taxa de conversão" value={`${winRate}%`} delta={prevWinRate || winRate ? winRate - prevWinRate : null} sub={`${won.length}G · ${lost}P`} icon={<Percent />} color="#8b5cf6" spark={<Sparkline id="rate" values={series.map((s) => s.rate)} color="#8b5cf6" width={70} />} />
        <StatCard className="animate-rise [animation-delay:100ms]" label="Ticket médio" value={big(avgTicket)} delta={delta(avgTicket, prevTicket)} sub="vs. anterior" icon={<Target />} color="#f59e0b" spark={<Sparkline id="ticket" values={series.map((s) => s.ticket)} color="#f59e0b" width={70} />} />
        <StatCard className="animate-rise [animation-delay:150ms]" label={`Novos ${L.deal.plural.toLowerCase()}`} value={String(created)} delta={delta(created, prevCreated)} sub={`ciclo ${cycle}d`} icon={<Plus />} color="#ec4899" spark={<Sparkline id="created" values={series.map((s) => s.created)} color="#ec4899" width={70} />} />
        <StatCard className="animate-rise [animation-delay:200ms]" label="Pipeline aberto" value={big(openValue)} sub={`${openDeals.length} em andamento`} icon={<CircleDollarSign />} color="#6366f1" />
        <StatCard className="animate-rise [animation-delay:250ms]" label="Previsão ponderada" value={big(weighted)} sub="valor × probabilidade" icon={<TrendingUp />} color="#0ea5e9" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardHeader
            icon={<TrendingUp />}
            title="Evolução da receita"
            description="Negócios ganhos nos últimos 6 meses"
            action={
              <div className="text-right">
                <p className="text-brand-gradient font-display text-xl font-extrabold">{fmt(monthly.reduce((s, m) => s + m.value, 0), true)}</p>
                <p className="text-[11px] text-muted">{monthly.reduce((s, m) => s + (m.count ?? 0), 0)} fechados</p>
              </div>
            }
          />
          <TrendChart data={monthly} />
        </Card>

        <Card className="ring-gradient flex flex-col p-5">
          <CardHeader icon={<Target />} title="Meta do mês" description={dateFmt(now, "pt-BR", { month: "long", year: "numeric" })} />
          {goal ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <Ring value={goalPct ?? 0} size={156} stroke={14}>
                <span className="font-display text-4xl font-extrabold">{goalPct}%</span>
                <span className="text-[11px] font-medium text-muted">{(goalPct ?? 0) >= 100 ? "meta batida! 🎉" : "atingido"}</span>
              </Ring>
              <div className="grid w-full grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-emerald-500/10 p-2.5">
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Realizado</p>
                  <p className="font-display text-sm font-extrabold">{fmt(monthWon, true)}</p>
                </div>
                <div className="rounded-xl bg-brand/10 p-2.5">
                  <p className="text-[11px] font-medium text-brand">Faltam</p>
                  <p className="font-display text-sm font-extrabold">{fmt(Math.max(0, Number(goal.target) - monthWon), true)}</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Target />}
              title="Nenhuma meta definida"
              description="Defina uma meta de receita para engajar o time."
              action={
                ctx.role !== "SALES" && ctx.role !== "VIEWER" ? (
                  <Link href="/settings/goals" className="text-sm font-semibold text-brand hover:underline">Definir meta →</Link>
                ) : undefined
              }
            />
          )}
        </Card>
      </div>

      {/* ======== Pipeline & equipe ======== */}
      <SectionTitle
        emoji="🎯"
        title="Pipeline e equipe"
        description={pipeline ? `Funil ${pipeline.name}` : undefined}
        action={
          <Link href="/deals" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
            Abrir funil <ArrowRight className="size-3" />
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <CardHeader icon={<KanbanSquare />} title="Funil de vendas" description="Quantidade, valor e % do total por etapa" />
          {funnel.length ? <Funnel stages={funnel} /> : <p className="text-sm text-muted">Sem dados.</p>}
        </Card>

        <Card className="p-5">
          <CardHeader icon={<Flame />} title="Maiores oportunidades" description="Abertas, por valor" />
          <ul className="space-y-1">
            {hot.map((d, i) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm"
                    style={{ background: `linear-gradient(140deg, color-mix(in oklab, ${d.stage.color} 70%, white), ${d.stage.color})` }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{d.title}</span>
                    <span className="block truncate text-xs text-muted">{d.company?.name ?? d.contact?.name ?? "—"} · {d.stage.name}</span>
                  </span>
                  <span className="font-display text-sm font-extrabold">{fmt(Number(d.value), true)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {!hot.length && <EmptyState icon={<Flame />} title="Nada por aqui" description="Crie oportunidades para vê-las aqui." />}
        </Card>

        <Card className="p-5">
          <CardHeader icon={<Trophy />} title="Ranking de vendedores" description={PERIODS[period]} />
          {ranking.length ? (
            <ol className="space-y-3.5">
              {ranking.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-lg">{["🥇", "🥈", "🥉"][i] ?? <span className="text-xs font-bold text-muted">{i + 1}º</span>}</span>
                  <Avatar name={r.name} color={r.color} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{r.name}</p>
                      <p className="font-display text-sm font-extrabold">{fmt(r.value, true)}</p>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: `${(r.value / topValue) * 100}%`, background: "linear-gradient(90deg, var(--brand), var(--accent))" }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={<Trophy />} title="Sem vendas no período" description="O ranking aparece no primeiro negócio ganho." />
          )}
        </Card>
      </div>
    </div>
  );
}
