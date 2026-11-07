"use client";
import { useState } from "react";
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import { Button, Card, cn, EmptyState, Modal, Select, Tabs } from "@/components/ui";
import { ActivityRow, type FeedActivity } from "@/components/feed";
import { ActivityForm } from "@/components/forms/activity-form";
import { ActivityIcon } from "@/components/activity-icon";
import { useParamSetter } from "@/components/list-toolbar";
import { useOrg } from "@/components/org-context";
import { useQuickCreate } from "@/components/quick-create";
import { ACTIVITY_TYPES } from "@/lib/defaults";
import { date, dayKey } from "@/lib/format";

export function ActivitiesView({
  activities,
  when,
  who,
  type,
  view,
  month,
  counts,
}: {
  activities: FeedActivity[];
  when: string;
  who: string;
  type: string;
  view: "list" | "calendar";
  month: string | null;
  counts: { overdue: number; today: number };
}) {
  const { labels, members } = useOrg();
  const set = useParamSetter();
  const quick = useQuickCreate();
  const [edit, setEdit] = useState<FeedActivity | null>(null);

  // agrupa por dia
  const groups = new Map<string, FeedActivity[]>();
  for (const a of activities) {
    const k = a.dueAt ? dayKey(a.dueAt) : "sem-data";
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  const today = dayKey(new Date());
  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 1);
  const tomorrow = dayKey(tmr);
  const groupLabel = (k: string) => (k === "sem-data" ? "Sem data" : k === today ? "Hoje" : k === tomorrow ? "Amanhã" : date(new Date(k + "T12:00:00Z"), "pt-BR", { weekday: "long", day: "2-digit", month: "long" }));

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-semibold">{labels.activity.plural}</h1>
        <Tabs
          value={view}
          onChange={(v) => set("view", v === "list" ? "" : v)}
          items={[
            { value: "list", label: <span className="flex items-center gap-1"><List className="size-3.5" /> Lista</span> },
            { value: "calendar", label: <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> Calendário</span> },
          ]}
        />
        <Select value={who} onChange={(e) => set("who", e.target.value)} className="w-auto">
          <option value="">Toda a equipe</option>
          <option value="me">Minhas</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => set("type", e.target.value)} className="w-auto">
          <option value="">Todos os tipos</option>
          {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
        <Button className="ml-auto" onClick={() => quick("activity")}>
          <Plus className="size-4" /> {labels.activity.singular}
        </Button>
      </div>

      {view === "list" ? (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {[
              ["pending", "Pendentes"],
              ["overdue", `Atrasadas${counts.overdue ? ` (${counts.overdue})` : ""}`],
              ["today", `Hoje${counts.today ? ` (${counts.today})` : ""}`],
              ["week", "Próximos 7 dias"],
              ["done", "Concluídas"],
              ["all", "Todas"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => set("when", k === "pending" ? "" : k!)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  when === k ? "border-brand bg-brand text-white" : "border-line bg-surface text-muted hover:text-fg",
                  k === "overdue" && counts.overdue > 0 && when !== k && "border-red-300 text-red-600",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          {activities.length ? (
            <div className="space-y-5">
              {Array.from(groups.entries()).map(([k, list]) => (
                <div key={k}>
                  <h3 className={cn("mb-2 text-xs font-semibold uppercase tracking-wide", k !== "sem-data" && k < today && when !== "done" ? "text-red-600" : "text-muted")}>
                    {groupLabel(k)} <span className="font-normal">· {list.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {list.map((a) => (
                      <ActivityRow key={a.id} a={a} onEdit={() => setEdit(a)} showLinks />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState icon={<CalendarCheck className="size-6" />} title="Tudo em dia! 🎉" description="Nenhuma atividade neste filtro." />
            </Card>
          )}
        </>
      ) : (
        <MonthCalendar activities={activities} month={month!} onEdit={setEdit} />
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Editar atividade">
        {edit && <ActivityForm activity={edit} onDone={() => setEdit(null)} />}
      </Modal>
    </div>
  );
}

function MonthCalendar({ activities, month, onEdit }: { activities: FeedActivity[]; month: string; onEdit: (a: FeedActivity) => void }) {
  const { settings } = useOrg();
  const set = useParamSetter();
  const m = new Date(month);
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const offset = (first.getDay() - settings.weekStartsOn + 7) % 7;
  const start = new Date(first);
  start.setDate(start.getDate() - offset);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekdays = Array.from({ length: 7 }, (_, i) => date(days[i]!, "pt-BR", { weekday: "short" }));
  const go = (delta: number) => {
    const t = new Date(m.getFullYear(), m.getMonth() + delta, 1);
    set("month", `${t.getFullYear()}-${t.getMonth() + 1}`);
  };
  const today = dayKey(new Date());
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <Button size="icon" variant="ghost" onClick={() => go(-1)} aria-label="Mês anterior"><ChevronLeft className="size-4" /></Button>
        <h2 className="font-semibold capitalize">{date(m, "pt-BR", { month: "long", year: "numeric" })}</h2>
        <Button size="icon" variant="ghost" onClick={() => go(1)} aria-label="Próximo mês"><ChevronRight className="size-4" /></Button>
      </div>
      <div className="grid grid-cols-7 border-b border-line text-center text-xs font-medium uppercase text-muted">
        {weekdays.map((w) => (
          <div key={w} className="py-2">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const list = activities.filter((a) => a.dueAt && dayKey(a.dueAt) === dayKey(d));
          const out = d.getMonth() !== m.getMonth();
          return (
            <div key={d.toISOString()} className={cn("min-h-24 border-b border-r border-line p-1.5", out && "bg-surface-2/50")}>
              <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs", dayKey(d) === today ? "bg-brand font-semibold text-white" : out ? "text-muted/60" : "text-muted")}>
                {d.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {list.slice(0, 4).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onEdit(a)}
                    className={cn("flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px]", a.done ? "text-muted line-through" : "bg-brand/10 text-brand")}
                  >
                    <ActivityIcon type={a.type} className="size-3 shrink-0" />
                    <span className="truncate">{date(a.dueAt, "pt-BR", { hour: "2-digit", minute: "2-digit" })} {a.title}</span>
                  </button>
                ))}
                {list.length > 4 && <p className="px-1 text-[10px] text-muted">+{list.length - 4} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
