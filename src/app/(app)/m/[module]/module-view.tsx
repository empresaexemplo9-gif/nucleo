"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, CalendarClock, CalendarDays, LayoutGrid, ChevronLeft, ChevronRight, Copy, Download, KanbanSquare, List, Plus, Rss, Settings2, Share2, Trash2 } from "lucide-react";
import { Avatar, Badge, Button, Card, cn, EmptyState, Eyebrow, Field, FilterChip, Input, Modal, Select, StatCard, Tabs, Textarea } from "@/components/ui";
import { Pagination, SearchBox, useParamSetter } from "@/components/list-toolbar";
import { ModuleIcon } from "@/components/module-icon";
import { RecordFieldValue, type MField, type Refs } from "@/components/record-fields";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { deleteRecords, saveModuleForm, setRecordStatus, toggleModuleFeed } from "@/actions/modules";
import { date, dayKey } from "@/lib/format";
import { useToast } from "@/components/toast";
import { PUBLIC_TYPES, type FormSettings } from "@/lib/module-public";
import { RecordForm } from "./record-form";
import { Gallery, KpiRow, ModaHero, type Kpi } from "./moda";

export type ModStatus = { id: string; name: string; color: string; isFinal: boolean };
export type ModInfo = {
  id: string;
  key: string;
  name: string;
  singular: string;
  description: string | null;
  icon: string;
  color: string;
  prefix: string;
  dueFieldKey: string | null;
  amountFieldKey: string | null;
  recurrenceFieldKey?: string | null;
  canEdit: boolean;
  fields: MField[];
  statuses: ModStatus[];
};
export type RecordRow = { id: string; number: number; title: string; statusId: string | null; assigneeId: string | null; data: Record<string, unknown>; dueAt: string | null; isFinal: boolean; updatedAt: string };

export const code = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, "0")}`;

export function DueBadge({ dueAt, isFinal }: { dueAt: string | null; isFinal: boolean }) {
  if (!dueAt) return null;
  const now = new Date();
  const today = dayKey(now);
  const week = dayKey(new Date(now.getTime() + 7 * 86400000));
  const k = dayKey(dueAt);
  const late = !isFinal && k < today;
  const soon = !isFinal && !late && k <= week;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-[5px] border px-1.5 py-0.5 font-mono text-[10px]", late ? "border-err/35 text-err" : soon ? "border-warn/35 text-warn" : "border-line text-muted")}>
      {late ? <AlertTriangle className="size-3" /> : <CalendarClock className="size-3" />}
      {date(dueAt, "pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
    </span>
  );
}

export function ModuleView({
  mod,
  rows,
  refs,
  view,
  total,
  page,
  pageSize,
  stats,
  filters,
  openNew,
  prefill,
  month,
  share,
  look,
  kpis,
  covers,
  lookbook,
  palette,
}: {
  look: "moda" | null;
  kpis: Kpi[] | null;
  covers: Record<string, string>;
  lookbook: string[];
  palette: string[];
  prefill: Record<string, unknown>;
  month: string;
  share: { formUrl: string | null; feedUrl: string | null; feedAvailable: boolean; form: FormSettings } | null;
  mod: ModInfo;
  rows: RecordRow[];
  refs: Refs;
  view: "list" | "board" | "calendar" | "gallery";
  total: number;
  page: number;
  pageSize: number;
  stats: { open: number; overdue: number; dueSoon: number; openSum: number; all: number };
  filters: { q: string; status: string; who: string; scope: string };
  openNew: boolean;
}) {
  const { fmt, members, member, superadmin } = useOrg();
  const set = useParamSetter();
  const router = useRouter();
  const pathname = usePathname();
  const [creating, setCreating] = useState(openNew);
  const [sharing, setSharing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>(prefill);
  const dueField = mod.fields.find((f) => f.key === mod.dueFieldKey);
  const newOn = (day: string) => {
    if (!dueField) return;
    setDraft({ ...prefill, [dueField.key]: dueField.type === "DATETIME" ? `${day}T09:00` : day });
    setCreating(true);
  };
  const [sel, setSel] = useState<Set<string>>(new Set());
  const { run, pending } = useAction();
  const listFields = mod.fields.filter((f) => f.showInList).slice(0, 5);
  const amountField = mod.fields.find((f) => f.key === mod.amountFieldKey);
  const statusOf = (id: string | null) => mod.statuses.find((s) => s.id === id);
  const ids = [...sel];
  const closeNew = () => {
    setCreating(false);
    setDraft(prefill);
    if (openNew) router.replace(pathname);
  };

  return (
    <div className="w-full px-4 pb-16 pt-8 lg:px-8">
      {look === "moda" ? (
        <ModaHero mod={mod} palette={palette} lookbook={lookbook} total={stats.all} actions={<>
          <a href={`/api/export/module/${mod.key}`} download>
            <Button variant="secondary" trail={<Download className="size-3.5" />}>Exportar</Button>
          </a>
          {share && (
            <Button variant="secondary" trail={<Share2 className="size-3.5" />} onClick={() => setSharing(true)}>Compartilhar</Button>
          )}
          {superadmin && (
            <Link href={`/settings/modules/${mod.id}`}>
              <Button variant="secondary" trail={<Settings2 className="size-3.5" />}>Configurar</Button>
            </Link>
          )}
          {mod.canEdit && (
            <Button trail={<Plus className="size-3.5" />} onClick={() => setCreating(true)}>
              {mod.singular}
            </Button>
          )}
        </>} />
      ) : (
      <div className="animate-rise mb-8 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 max-w-3xl">
          <Eyebrow className="mb-3 flex items-center gap-2">
            <span className="inline-flex size-5 items-center justify-center rounded-[5px] border border-line" style={{ color: mod.color }}>
              <ModuleIcon name={mod.icon} className="size-3" />
            </span>
            Controle interno · {mod.prefix}
          </Eyebrow>
          <h1 className="text-[clamp(34px,4.2vw,56px)] font-medium leading-[1.02] tracking-[-0.04em]">{mod.name}</h1>
          {mod.description && <p className="mt-3 text-[17px] font-light leading-relaxed text-fg-2">{mod.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/export/module/${mod.key}`} download>
            <Button variant="secondary" trail={<Download className="size-3.5" />}>Exportar</Button>
          </a>
          {share && (
            <Button variant="secondary" trail={<Share2 className="size-3.5" />} onClick={() => setSharing(true)}>Compartilhar</Button>
          )}
          {superadmin && (
            <Link href={`/settings/modules/${mod.id}`}>
              <Button variant="secondary" trail={<Settings2 className="size-3.5" />}>Configurar</Button>
            </Link>
          )}
          {mod.canEdit && (
            <Button trail={<Plus className="size-3.5" />} onClick={() => setCreating(true)}>
              {mod.singular}
            </Button>
          )}
        </div>
      </div>
      )}
      {kpis ? (
        <KpiRow kpis={kpis} />
      ) : (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={1} label="Em aberto" value={String(stats.open).padStart(2, "0")} sub={`${stats.all} no total`} color="var(--accent-2)" />
        <StatCard index={2} label="Vencidos" value={String(stats.overdue).padStart(2, "0")} sub={mod.dueFieldKey ? "prazo expirado" : "defina um campo de prazo"} color="var(--err)" />
        <StatCard index={3} label="Próximos 7 dias" value={String(stats.dueSoon).padStart(2, "0")} sub="a vencer" color="var(--warn)" />
        <StatCard index={4} label={amountField ? `${amountField.label} em aberto` : "Valor em aberto"} value={fmt(stats.openSum, stats.openSum >= 1e6)} sub={amountField ? "soma dos registros abertos" : "defina um campo de valor"} color="var(--ok)" />
      </div>
      )}

      <div className="mb-4 mt-8 flex flex-wrap items-center gap-2">
        <Tabs
          value={view}
          onChange={(v) => set("view", v)}
          items={[
            ...(look === "moda" || Object.keys(covers).length ? [{ value: "gallery" as const, label: <span className="flex items-center gap-1.5"><LayoutGrid className="size-3.5" /> Vitrine</span> }] : []),
            { value: "list", label: <span className="flex items-center gap-1.5"><List className="size-3.5" /> Lista</span> },
            { value: "board", label: <span className="flex items-center gap-1.5"><KanbanSquare className="size-3.5" /> Quadro</span> },
            ...(mod.dueFieldKey ? [{ value: "calendar" as const, label: <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> Agenda</span> }] : []),
          ]}
        />
        <SearchBox initial={filters.q} placeholder={`Buscar por título ou ${mod.prefix}-0001`} />
        <Select value={filters.who} onChange={(e) => set("who", e.target.value)} className="w-auto">
          <option value="">Todos os responsáveis</option>
          <option value="me">Meus</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </Select>
      </div>
      {(view === "list" || view === "gallery") && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={!filters.status && filters.scope !== "all"} onClick={() => router.push(`${pathname}`)}>Em aberto</FilterChip>
          <FilterChip active={!filters.status && filters.scope === "all"} onClick={() => set("scope", "all")}>Todos</FilterChip>
          {mod.statuses.map((s) => (
            <FilterChip key={s.id} active={filters.status === s.id} dot={s.color} onClick={() => set("status", s.id)}>
              {s.name}
            </FilterChip>
          ))}
        </div>
      )}

      {ids.length > 0 && (
        <div className="card-drap mb-3 flex items-center gap-3 px-3 py-2 text-sm">
          <b>{ids.length} selecionado(s)</b>
          <Button size="sm" variant="danger" loading={pending} onClick={() => confirm("Excluir os registros selecionados?") && run(() => deleteRecords(ids), { onSuccess: () => setSel(new Set()) })}>
            <Trash2 className="size-3.5" /> Excluir
          </Button>
        </div>
      )}

      {view === "gallery" ? (
        rows.length ? (
          <Gallery mod={mod} rows={rows} refs={refs} covers={covers} />
        ) : (
          <Card>
            <EmptyState icon={<ModuleIcon name={mod.icon} />} title={`Nenhum registro em ${mod.name.toLowerCase()}`} description="Ajuste os filtros ou cadastre o primeiro — fotos anexadas viram a capa na vitrine." action={mod.canEdit && <Button trail={<Plus className="size-3.5" />} onClick={() => setCreating(true)}>Novo(a) {mod.singular.toLowerCase()}</Button>} />
          </Card>
        )
      ) : view === "calendar" ? (
        <Calendar mod={mod} rows={rows} month={month} onNew={mod.canEdit ? newOn : undefined} />
      ) : view === "board" ? (
        <Board mod={mod} rows={rows} refs={refs} covers={covers} />
      ) : (
        <Card className="overflow-x-auto">
          {rows.length ? (
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input type="checkbox" className="accent-[var(--accent)]" checked={sel.size === rows.length} onChange={(e) => setSel(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
                  </th>
                  <th className="px-3 py-3 font-normal">Código</th>
                  <th className="px-3 py-3 font-normal">Título</th>
                  <th className="px-3 py-3 font-normal">Status</th>
                  {listFields.map((f) => (
                    <th key={f.id} className={cn("px-3 py-3 font-normal", (f.type === "CURRENCY" || f.type === "NUMBER") && "text-right")}>{f.label}</th>
                  ))}
                  <th className="px-3 py-3 font-normal">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const st = statusOf(r.statusId);
                  const owner = member(r.assigneeId);
                  return (
                    <tr key={r.id} className="transition hover:bg-tint">
                      <td className="px-3">
                        <input
                          type="checkbox"
                          className="accent-[var(--accent)]"
                          checked={sel.has(r.id)}
                          onChange={(e) => {
                            const n = new Set(sel);
                            if (e.target.checked) n.add(r.id);
                            else n.delete(r.id);
                            setSel(n);
                          }}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-muted">{code(mod.prefix, r.number)}</td>
                      <td className="px-3 py-3">
                        <Link href={`/m/${mod.key}/${r.id}`} className="font-medium hover:text-accent-text">{r.title}</Link>
                        {r.dueAt && <div className="mt-1"><DueBadge dueAt={r.dueAt} isFinal={r.isFinal} /></div>}
                      </td>
                      <td className="px-3 py-3">{st ? <Badge color={st.color} dot>{st.name}</Badge> : <span className="text-muted">—</span>}</td>
                      {listFields.map((f) => (
                        <td key={f.id} className={cn("px-3 py-3", (f.type === "CURRENCY" || f.type === "NUMBER") && "text-right")}>
                          <RecordFieldValue f={f} value={r.data[f.key]} refs={refs} />
                        </td>
                      ))}
                      <td className="px-3 py-3">{owner ? <span className="flex items-center gap-1.5 whitespace-nowrap"><Avatar name={owner.name} color={owner.avatarColor} size={22} /> {owner.name}</span> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={<ModuleIcon name={mod.icon} />}
              title={`Nenhum registro em ${mod.name.toLowerCase()}`}
              description="Ajuste os filtros ou crie o primeiro registro."
              action={mod.canEdit && <Button trail={<Plus className="size-3.5" />} onClick={() => setCreating(true)}>Novo(a) {mod.singular.toLowerCase()}</Button>}
            />
          )}
        </Card>
      )}
      {(view === "list" || view === "gallery") && (
        <div className="mt-3 flex justify-end">
          <Pagination page={page} total={total} pageSize={pageSize} />
        </div>
      )}

      <Modal open={creating} onClose={closeNew} title={`Novo(a) ${mod.singular.toLowerCase()}`} wide>
        <RecordForm key={JSON.stringify(draft)} mod={mod} refs={refs} prefill={draft} onDone={(id) => (id ? router.push(`/m/${mod.key}/${id}`) : closeNew())} />
      </Modal>
      {share && <ShareModal open={sharing} onClose={() => setSharing(false)} mod={mod} share={share} />}
    </div>
  );
}

/** Quadro por status (arrastar e soltar). */
function Board({ mod, rows: initial, refs, covers }: { mod: ModInfo; rows: RecordRow[]; refs: Refs; covers: Record<string, string> }) {
  const { member } = useOrg();
  const [rows, setRows] = useState(initial);
  const [prev, setPrev] = useState(initial);
  if (prev !== initial) {
    setPrev(initial);
    setRows(initial);
  }
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const { run } = useAction();
  const cardFields = mod.fields.filter((f) => f.showInList && f.type !== "TEXTAREA").slice(0, 2);

  return (
    <div className="scroll-thin flex gap-4 overflow-x-auto pb-4">
      {mod.statuses.map((s) => {
        const list = rows.filter((r) => r.statusId === s.id);
        return (
          <div
            key={s.id}
            onDragOver={(e) => {
              if (!mod.canEdit) return;
              e.preventDefault();
              setOver(s.id);
            }}
            onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = dragId;
              setDragId(null);
              if (!id) return;
              const r = rows.find((x) => x.id === id);
              if (!r || r.statusId === s.id) return;
              setRows((rs) => rs.map((x) => (x.id === id ? { ...x, statusId: s.id, isFinal: s.isFinal } : x)));
              run(() => setRecordStatus(id, s.id, Date.now()));
            }}
            className={cn("card-drap flex w-[290px] shrink-0 flex-col overflow-hidden", over === s.id && "ring-2 ring-[var(--accent)]")}
          >
            <div className="relative border-b border-line px-4 pb-3 pt-4">
              <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: s.color }} />
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                <h3 className="mono-label flex-1 truncate text-[11px] text-fg">{s.name}</h3>
                <span className="font-mono text-[11px] text-muted">{String(list.length).padStart(2, "0")}</span>
              </div>
            </div>
            <div className="scroll-thin min-h-40 flex-1 space-y-2 overflow-y-auto bg-well p-2.5">
              {list.map((r) => {
                const owner = member(r.assigneeId);
                return (
                  <Link
                    key={r.id}
                    href={`/m/${mod.key}/${r.id}`}
                    draggable={mod.canEdit}
                    onDragStart={() => setDragId(r.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn("block rounded-[10px] border border-line bg-[var(--card-bg)] p-3 shadow-[0_10px_30px_-24px_var(--shadow)] transition hover:-translate-y-0.5 hover:border-line-strong", dragId === r.id && "opacity-40")}
                  >
                    {covers[r.id] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/files/${covers[r.id]}`} alt="" loading="lazy" draggable={false} className="-mx-3 -mt-3 mb-2.5 aspect-[16/10] w-[calc(100%+1.5rem)] max-w-none rounded-t-[10px] object-cover" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] text-muted">{code(mod.prefix, r.number)}</span>
                      {owner && <Avatar name={owner.name} color={owner.avatarColor} size={20} />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13.5px] font-medium leading-snug">{r.title}</p>
                    {cardFields.length > 0 && (
                      <div className="mt-2 space-y-0.5 text-xs text-fg-2">
                        {cardFields.map((f) => (
                          <p key={f.id} className="flex justify-between gap-2 truncate">
                            <span className="text-muted">{f.label}</span>
                            <span className="truncate"><RecordFieldValue f={f} value={r.data[f.key]} refs={refs} plain /></span>
                          </p>
                        ))}
                      </div>
                    )}
                    {r.dueAt && <div className="mt-2"><DueBadge dueAt={r.dueAt} isFinal={r.isFinal} /></div>}
                  </Link>
                );
              })}
              {!list.length && <p className="mono-label py-6 text-center text-[10px] text-muted">Arraste um cartão para cá</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const WEEK = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Agenda mensal pelo campo de prazo (consultas, visitas, aulas, audiências, entregas…). */
function Calendar({ mod, rows, month, onNew }: { mod: ModInfo; rows: RecordRow[]; month: string; onNew?: (day: string) => void }) {
  const { settings, member } = useOrg();
  const set = useParamSetter();
  const dueField = mod.fields.find((f) => f.key === mod.dueFieldKey);
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = (first.getUTCDay() - settings.weekStartsOn + 7) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Math.ceil((start + days) / 7) * 7;
  const today = dayKey(new Date());
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    set("month", d.toISOString().slice(0, 7));
  };
  const byDay = new Map<string, RecordRow[]>();
  for (const r of rows) {
    const raw = dueField ? r.data[dueField.key] : null;
    const k = typeof raw === "string" ? raw.slice(0, 10) : r.dueAt ? dayKey(r.dueAt) : null;
    if (k) byDay.set(k, [...(byDay.get(k) ?? []), r]);
  }
  const timeOf = (r: RecordRow) => {
    const raw = dueField?.type === "DATETIME" ? r.data[dueField.key] : null;
    return typeof raw === "string" ? raw.slice(11, 16) : "";
  };
  const statusOf = (id: string | null) => mod.statuses.find((s) => s.id === id);
  const raw = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const label = raw.charAt(0).toUpperCase() + raw.slice(1);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Button size="icon" variant="ghost" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft className="size-4" /></Button>
        <h2 className="min-w-40 text-center text-sm font-semibold">{label}</h2>
        <Button size="icon" variant="ghost" onClick={() => shift(1)} aria-label="Próximo mês"><ChevronRight className="size-4" /></Button>
        <Button size="sm" variant="ghost" onClick={() => set("month", "")}>Hoje</Button>
        <span className="ml-auto text-xs text-muted">{rows.length} no período · por “{dueField?.label}”</span>
      </div>
      <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        {Array.from({ length: 7 }, (_, i) => <div key={i} className="py-2">{WEEK[(i + settings.weekStartsOn) % 7]}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: cells }, (_, i) => {
          const d = i - start + 1;
          const inMonth = d >= 1 && d <= days;
          const key = new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
          const list = (byDay.get(key) ?? []).sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
          return (
            <div key={i} className={cn("group min-h-28 border-b border-r border-line p-1.5 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-surface-2/60")}>
              <div className="mb-1 flex items-center justify-between">
                <span className={cn("inline-flex size-6 items-center justify-center rounded-full font-mono text-[11px]", key === today ? "bg-[var(--accent)] text-white" : inMonth ? "text-fg-2" : "text-muted")}>{Number(key.slice(8))}</span>
                {onNew && inMonth && (
                  <button type="button" onClick={() => onNew(key)} className="hidden rounded p-0.5 text-muted hover:bg-tint hover:text-fg group-hover:block" aria-label={`Novo em ${key}`}>
                    <Plus className="size-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {list.slice(0, 4).map((r) => {
                  const st = statusOf(r.statusId);
                  const who = member(r.assigneeId);
                  return (
                    <Link
                      key={r.id}
                      href={`/m/${mod.key}/${r.id}`}
                      title={`${r.title}${who ? ` · ${who.name}` : ""}${st ? ` · ${st.name}` : ""}`}
                      className={cn("block truncate rounded-[5px] border-l-2 bg-tint px-1.5 py-0.5 text-[11.5px] leading-snug hover:bg-[var(--surface-1)]", r.isFinal && "opacity-55 line-through")}
                      style={{ borderLeftColor: st?.color ?? mod.color }}
                    >
                      {timeOf(r) && <b className="mr-1 font-mono text-[10.5px]">{timeOf(r)}</b>}
                      {r.title}
                    </Link>
                  );
                })}
                {list.length > 4 && <p className="px-1 text-[10.5px] text-muted">+{list.length - 4} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CopyLine({ value }: { value: string }) {
  const toast = useToast();
  return (
    <div className="flex gap-2">
      <Input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
      <Button type="button" variant="secondary" size="icon" className="size-10 shrink-0" aria-label="Copiar" onClick={() => navigator.clipboard.writeText(value).then(() => toast("Link copiado"))}>
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

/** Formulário público (pedidos, agendamentos, pré-matrículas, solicitações) e feed para portais. */
function ShareModal({ open, onClose, mod, share }: { open: boolean; onClose: () => void; mod: ModInfo; share: { formUrl: string | null; feedUrl: string | null; feedAvailable: boolean; form: FormSettings } }) {
  const { run, pending } = useAction();
  const eligible = mod.fields.filter((f) => PUBLIC_TYPES.includes(f.type));
  const chosen = share.form.fields.length ? share.form.fields : eligible.filter((f) => f.showInList || f.required).map((f) => f.key);
  return (
    <Modal open={open} onClose={onClose} title={`Compartilhar ${mod.name.toLowerCase()}`} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveModuleForm(mod.id, new FormData(e.currentTarget)));
        }}
        className="space-y-3"
      >
        <label className="flex items-start gap-2 text-sm font-medium">
          <input type="checkbox" name="formEnabled" defaultChecked={!!share.formUrl} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span>
            Formulário público
            <span className="block text-xs font-normal text-muted">Link para o cliente preencher (no site, Instagram ou WhatsApp). Cada envio cria um(a) {mod.singular.toLowerCase()}, cadastra o contato e avisa a equipe.</span>
          </span>
        </label>
        {share.formUrl && <CopyLine value={share.formUrl} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título do formulário"><Input name="formTitle" defaultValue={share.form.title} placeholder={`Solicitar ${mod.singular.toLowerCase()}`} /></Field>
          <Field label="Mensagem de confirmação"><Input name="formSuccess" defaultValue={share.form.success} placeholder="Recebemos! Em breve entraremos em contato." /></Field>
        </div>
        <Field label="Texto de apresentação"><Textarea name="formIntro" rows={2} defaultValue={share.form.intro} /></Field>
        <div>
          <p className="mb-1.5 text-xs font-medium text-fg-2">Campos que o cliente preenche (além de nome, WhatsApp e e-mail)</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {eligible.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="formFields" value={f.key} defaultChecked={chosen.includes(f.key)} className="accent-[var(--accent)]" /> {f.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end"><Button loading={pending}>Salvar formulário</Button></div>
      </form>
      {share.feedAvailable && (
        <div className="mt-5 space-y-2 border-t border-line pt-4">
          <p className="flex items-center gap-2 text-sm font-medium"><Rss className="size-4" /> Feed para portais (ZAP Imóveis, VivaReal, OLX)</p>
          <p className="text-xs text-muted">Arquivo XML no padrão VRSync com os imóveis em “Disponível” e marcados para publicar. Cadastre este link na área de integração do portal; fotos anexadas vão junto, a primeira como capa.</p>
          {share.feedUrl && <CopyLine value={share.feedUrl} />}
          <Button variant={share.feedUrl ? "danger" : "secondary"} size="sm" loading={pending} onClick={() => run(() => toggleModuleFeed(mod.id, !share.feedUrl))}>
            {share.feedUrl ? "Desativar feed" : "Ativar feed"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
