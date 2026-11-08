import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
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
import { Marquee, Terminal } from "@/components/terminal";
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
  const recentWins = await db.deal.findMany({ where: { ...base, status: "WON" }, orderBy: { closedAt: "desc" }, take: 10, select: { title: true, value: true } });

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
      ? `Você tem ${overdue} atividade(s) atrasada(s). Comece por elas e mantenha o funil em movimento.`
      : todayCount > 0
        ? `Você tem ${todayCount} atividade(s) para hoje e ${fmt(weighted, true)} em previsão ponderada.`
        : "Sua agenda de hoje está livre — ótimo momento para prospectar novas oportunidades.";

  const winsTicker = recentWins.map((w) => `${w.title} · ${fmt(Number(w.value), true)}`);
  const ticker = winsTicker.length ? winsTicker : (pipeline?.stages ?? []).map((st) => st.name);

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-16 pt-8 lg:px-8">
      {sp.welcome && <Welcome />}

      {/* ======== Hero editorial ======== */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="animate-rise min-w-0">
          <span className="glass-pill mono-label inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] text-fg-2">
            <span className="size-1.5 rounded-full bg-[var(--accent)]" />
            {ctx.org.slug}://painel · {dateFmt(now, "pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}
          </span>
          <h1 className="mt-6 text-[clamp(44px,6.2vw,88px)] font-medium leading-[0.98] tracking-[-0.045em]">
            {greeting},
            <br />
            <span className="serif-i text-grad pr-2">{ctx.user.name.split(" ")[0]}.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[19px] font-light leading-relaxed text-fg-2">{summary}</p>
          <HeroActions />
        </div>

        <div className="animate-rise relative min-w-0 [animation-delay:120ms]">
          <Terminal
            title={`drap-crm — ${ctx.org.name.toLowerCase()}`}
            lines={[
              { kind: "cmd", text: "crm status --hoje" },
              { kind: todayCount ? "ok" : "info", text: `${String(todayCount).padStart(2, "0")} atividade(s) para hoje` },
              { kind: overdue ? "warn" : "ok", text: overdue ? `${String(overdue).padStart(2, "0")} atividade(s) atrasada(s)` : "nenhuma atividade atrasada" },
              { kind: rottingAll.length ? "warn" : "ok", text: `${String(rottingAll.length).padStart(2, "0")} ${L.deal.plural.toLowerCase()} parado(s)` },
              { kind: "blank" },
              { kind: "cmd", text: "crm pipeline --resumo" },
              { kind: "ok", text: `aberto ${fmt(openValue, true)} · ponderado ${fmt(weighted, true)}` },
              { kind: "ok", text: `ganho no mês ${fmt(monthWon, true)}${goalPct != null ? ` · meta ${goalPct}%` : ""}` },
            ]}
            footerLeft={`org: ${ctx.org.slug} · funil: ${pipeline?.name ?? "—"}`}
            footerRight="healthy"
          />
          <Link href="/activities?when=overdue&who=me" className="glass-pill animate-float absolute -top-6 right-24 hidden rounded-[10px] px-3 py-2 shadow-card sm:block">
            <p className="eyebrow text-[9.5px]">Atrasadas</p>
            <p className="text-xl font-medium tracking-[-0.03em]">{String(overdue).padStart(2, "0")}</p>
          </Link>
          <Link href="/deals" className="glass-pill animate-float absolute -bottom-10 right-28 hidden rounded-[10px] px-3 py-2 shadow-card [animation-delay:1.2s] sm:block">
            <p className="eyebrow text-[9.5px]">Pipeline aberto</p>
            <p className="text-xl font-medium tracking-[-0.03em]">{fmt(openValue, true)}</p>
          </Link>
        </div>
      </section>

      <div className="-mx-4 mt-14 lg:-mx-8">
        <Marquee items={ticker} />
      </div>

      {/* ======== Seu dia ======== */}
      <SectionTitle index={1} description="Seu dia" title="O que precisa de atenção agora" highlight="agora" />
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
                <li key={a.id} className={`flex items-center gap-3 rounded-[10px] border p-3 transition duration-300 hover:-translate-y-px ${late ? "border-[color-mix(in_oklab,var(--err)_30%,transparent)] bg-[color-mix(in_oklab,var(--err)_5%,transparent)]" : "border-line bg-well"}`}>
                  <IconTile color={late ? "var(--err)" : t.color} size={36} className="[&>svg]:size-4">
                    <ActivityIcon type={a.type} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className={`truncate font-mono text-[11px] ${late ? "text-err" : "text-muted"}`}>{a.dueAt ? dateTime(a.dueAt) : "Sem data"}</p>
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
          {!upcoming.length && <EmptyState icon={<CalendarClock />} title="Agenda livre" description="Nenhuma atividade pendente para você." />}
        </Card>

        <Card className="p-5">
          <CardHeader
            icon={<AlertTriangle />}
            title={`${L.deal.plural} parados`}
            description="Precisam de um empurrão"
            action={rottingAll.length > 0 ? <Badge color="var(--warn)" dot>{rottingAll.length}</Badge> : undefined}
          />
          <ul className="space-y-1">
            {rotting.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="-mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2 transition hover:bg-surface-2">
                  <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)] border border-[color-mix(in_oklab,var(--warn)_40%,transparent)] bg-[color-mix(in_oklab,var(--warn)_8%,transparent)] text-warn">
                    <span className="text-sm font-medium leading-none">{daysSince(d.stageChangedAt)}</span>
                    <span className="font-mono text-[8px] uppercase tracking-[0.1em]">dias</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{d.title}</span>
                    <span className="text-xs text-muted">{d.stage.name}</span>
                  </span>
                  <span className="text-sm font-medium tracking-[-0.02em]">{fmt(Number(d.value), true)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {!rotting.length && <EmptyState icon={<Trophy />} title="Tudo em movimento" description="Nenhum negócio parado. Ótimo trabalho!" />}
        </Card>
      </div>

      {/* ======== Resultados ======== */}
      <SectionTitle index={2} description={`Resultados · ${PERIODS[period]}`} title="Desempenho do período" highlight="período" action={<PeriodSelect value={period} options={PERIODS} />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard className="animate-rise" label="Receita ganha" index={1} value={big(wonValue)} delta={delta(wonValue, prevWonValue)} sub="vs. anterior" icon={<Trophy />} color="var(--ok)" spark={<Sparkline id="won" values={series.map((s) => s.won)} color="var(--ok)" width={70} />} />
        <StatCard className="animate-rise [animation-delay:50ms]" label="Taxa de conversão" index={2} value={`${winRate}%`} delta={prevWinRate || winRate ? winRate - prevWinRate : null} sub={`${won.length}G · ${lost}P`} icon={<Percent />} color="var(--accent-2)" spark={<Sparkline id="rate" values={series.map((s) => s.rate)} color="var(--accent-2)" width={70} />} />
        <StatCard className="animate-rise [animation-delay:100ms]" label="Ticket médio" index={3} value={big(avgTicket)} delta={delta(avgTicket, prevTicket)} sub="vs. anterior" icon={<Target />} color="var(--accent)" spark={<Sparkline id="ticket" values={series.map((s) => s.ticket)} color="var(--accent)" width={70} />} />
        <StatCard className="animate-rise [animation-delay:150ms]" label={`Novos ${L.deal.plural.toLowerCase()}`} index={4} value={String(created)} delta={delta(created, prevCreated)} sub={`ciclo ${cycle}d`} icon={<Plus />} color="var(--accent-2-text)" spark={<Sparkline id="created" values={series.map((s) => s.created)} color="var(--accent-2-text)" width={70} />} />
        <StatCard className="animate-rise [animation-delay:200ms]" label="Pipeline aberto" index={5} value={big(openValue)} sub={`${openDeals.length} em andamento`} icon={<CircleDollarSign />} color="var(--accent-text)" />
        <StatCard className="animate-rise [animation-delay:250ms]" label="Previsão ponderada" index={6} value={big(weighted)} sub="valor × probabilidade" icon={<TrendingUp />} color="var(--accent-2)" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardHeader
            icon={<TrendingUp />}
            title="Evolução da receita"
            description="Negócios ganhos nos últimos 6 meses"
            action={
              <div className="text-right">
                <p className="text-grad text-2xl font-medium tracking-[-0.03em]">{fmt(monthly.reduce((s, m) => s + m.value, 0), true)}</p>
                <p className="text-[11px] text-muted">{monthly.reduce((s, m) => s + (m.count ?? 0), 0)} fechados</p>
              </div>
            }
          />
          <TrendChart data={monthly} />
        </Card>

        <Card grid className="flex flex-col p-5">
          <CardHeader icon={<Target />} title="Meta do mês" description={dateFmt(now, "pt-BR", { month: "long", year: "numeric" })} />
          {goal ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <Ring value={goalPct ?? 0} size={156} stroke={14}>
                <span className="text-[40px] font-medium leading-none tracking-[-0.045em]">{goalPct}%</span>
                <span className="eyebrow mt-1 text-[9.5px]">{(goalPct ?? 0) >= 100 ? "meta batida" : "atingido"}</span>
              </Ring>
              <div className="grid w-full grid-cols-2 gap-2 text-center">
                <div className="rounded-[10px] border border-line bg-well p-2.5">
                  <p className="eyebrow text-[9.5px] text-ok">Realizado</p>
                  <p className="text-sm font-medium tracking-[-0.02em]">{fmt(monthWon, true)}</p>
                </div>
                <div className="rounded-[10px] border border-line bg-well p-2.5">
                  <p className="eyebrow text-[9.5px] text-accent-text">Faltam</p>
                  <p className="text-sm font-medium tracking-[-0.02em]">{fmt(Math.max(0, Number(goal.target) - monthWon), true)}</p>
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
                  <Link href="/settings/goals" className="text-sm font-medium text-brand hover:underline">Definir meta →</Link>
                ) : undefined
              }
            />
          )}
        </Card>
      </div>

      {/* ======== Pipeline & equipe ======== */}
      <SectionTitle
        index={3}
        title="Pipeline e equipe"
        highlight="equipe"
        description={pipeline ? `Pipeline · ${pipeline.name}` : "Pipeline"}
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
                <Link href={`/deals/${d.id}`} className="-mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2 transition hover:bg-surface-2">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-line bg-well font-mono text-xs text-accent-text"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{d.title}</span>
                    <span className="block truncate text-xs text-muted">{d.company?.name ?? d.contact?.name ?? "—"} · {d.stage.name}</span>
                  </span>
                  <span className="text-sm font-medium tracking-[-0.02em]">{fmt(Number(d.value), true)}</span>
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
                  <span className={`w-6 shrink-0 font-mono text-xs ${i === 0 ? "text-accent-text" : "text-muted"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <Avatar name={r.name} color={r.color} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="text-sm font-medium tracking-[-0.02em]">{fmt(r.value, true)}</p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: `${(r.value / topValue) * 100}%`, background: "var(--grad)" }} />
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
