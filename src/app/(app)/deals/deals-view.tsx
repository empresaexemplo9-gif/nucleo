"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Building2, CalendarClock, KanbanSquare, List, Plus, Search, ThumbsDown, ThumbsUp, Trash2, User } from "lucide-react";
import { Avatar, Badge, Button, Card, cn, EmptyState, Input, Select, Tabs } from "@/components/ui";
import { TagList } from "@/components/pickers";
import { useOrg } from "@/components/org-context";
import { useQuickCreate } from "@/components/quick-create";
import { useAction } from "@/components/use-action";
import { bulkDeals, moveDeal, setDealStatus } from "@/actions/deals";
import { daysSince, date } from "@/lib/format";
import { LostReasonModal } from "./lost-reason-modal";
import { ActivityIcon } from "@/components/activity-icon";

export type BoardDeal = {
  id: string;
  title: string;
  value: number;
  stageId: string;
  status: string;
  position: number;
  ownerId: string | null;
  tags: string[];
  probability: number | null;
  expectedClose: string | null;
  stageChangedAt: string;
  createdAt: string;
  contact: { id: string; name: string } | null;
  company: { id: string; name: string } | null;
  nextActivity: { title: string; type: string; dueAt: string | null } | null;
};
type StageDef = { id: string; name: string; color: string; probability: number; type: string; rottingDays: number | null };

export function DealsView({
  pipelineId,
  view,
  status,
  stages,
  deals,
  filters,
}: {
  pipelineId: string;
  view: "board" | "list";
  status: string;
  stages: StageDef[];
  deals: BoardDeal[];
  filters: { owner: string; q: string; tag: string };
}) {
  const { pipelines, labels, members, tags, fmt } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const quick = useQuickCreate();
  const [q, setQ] = useState(filters.q);

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    router.push(`${pathname}?${p.toString()}`);
  };
  useEffect(() => {
    if (q === filters.q) return;
    const t = setTimeout(() => setParam("q", q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const openStages = stages.filter((s) => s.type === "OPEN");
  const total = deals.reduce((s, d) => s + d.value, 0);
  const weighted = deals.reduce((s, d) => s + d.value * ((d.probability ?? stages.find((x) => x.id === d.stageId)?.probability ?? 0) / 100), 0);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-3">
        <Select value={pipelineId} onChange={(e) => setParam("pipeline", e.target.value)} className="w-auto min-w-40 font-medium">
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Tabs
          value={view}
          onChange={(v) => setParam("view", v === "board" ? "" : v)}
          items={[
            { value: "board", label: <span className="flex items-center gap-1"><KanbanSquare className="size-3.5" /> Funil</span> },
            { value: "list", label: <span className="flex items-center gap-1"><List className="size-3.5" /> Lista</span> },
          ]}
        />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar…" className="w-44 pl-8" />
        </div>
        <Select value={filters.owner} onChange={(e) => setParam("owner", e.target.value)} className="w-auto">
          <option value="">Todos os responsáveis</option>
          <option value="me">Meus {labels.deal.plural.toLowerCase()}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setParam("status", e.target.value === "OPEN" ? "" : e.target.value)} className="w-auto">
          <option value="OPEN">Em aberto</option>
          <option value="WON">Ganhos</option>
          <option value="LOST">Perdidos</option>
          <option value="ALL">Todos</option>
        </Select>
        {tags.length > 0 && (
          <Select value={filters.tag} onChange={(e) => setParam("tag", e.target.value)} className="w-auto">
            <option value="">Etiqueta</option>
            {tags.map((t) => (
              <option key={t.name}>{t.name}</option>
            ))}
          </Select>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right text-xs text-muted md:block">
            <div>
              <b className="text-fg">{fmt(total)}</b> · {deals.length} {deals.length === 1 ? labels.deal.singular.toLowerCase() : labels.deal.plural.toLowerCase()}
            </div>
            <div>Ponderado: {fmt(weighted)}</div>
          </div>
          <Button onClick={() => quick("deal", { pipelineId })}>
            <Plus className="size-4" /> {labels.deal.singular}
          </Button>
        </div>
      </div>
      {view === "board" && status === "OPEN" ? (
        <Board stages={openStages} allStages={stages} deals={deals} pipelineId={pipelineId} />
      ) : (
        <DealList deals={deals} stages={stages} />
      )}
    </div>
  );
}

/* ------------------------------ KANBAN ------------------------------ */

function Board({ stages, allStages, deals: initial, pipelineId }: { stages: StageDef[]; allStages: StageDef[]; deals: BoardDeal[]; pipelineId: string }) {
  const [deals, setDeals] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setDeals(initial);
  }
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [lostFor, setLostFor] = useState<string | null>(null);
  const { run } = useAction();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const byStage = useMemo(() => {
    const m = new Map<string, BoardDeal[]>();
    for (const s of stages) m.set(s.id, []);
    for (const d of [...deals].sort((a, b) => a.position - b.position)) m.get(d.stageId)?.push(d);
    return m;
  }, [deals, stages]);

  const active = deals.find((d) => d.id === activeId);
  const colOf = (id: string) => (byStage.has(id) || id === "WON" || id === "LOST" ? id : deals.find((d) => d.id === id)?.stageId ?? null);

  const onStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onOver = (e: DragOverEvent) => setOverCol(e.over ? colOf(String(e.over.id)) : null);
  const onEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setOverCol(null);
    const id = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over) return;
    const deal = deals.find((d) => d.id === id)!;
    if (over === "WON") {
      setDeals((ds) => ds.filter((d) => d.id !== id));
      run(() => setDealStatus(id, "WON"));
      return;
    }
    if (over === "LOST") {
      setLostFor(id);
      return;
    }
    const target = colOf(over);
    if (!target) return;
    const list = (byStage.get(target) ?? []).filter((d) => d.id !== id);
    let index = list.findIndex((d) => d.id === over);
    if (index === -1) index = list.length;
    else {
      // se arrastou para baixo dentro da mesma coluna, insere após o item
      const original = byStage.get(target) ?? [];
      if (deal.stageId === target && original.findIndex((d) => d.id === id) < original.findIndex((d) => d.id === over)) index += 1;
    }
    const prev = list[index - 1]?.position;
    const next = list[index]?.position;
    const position = prev == null && next == null ? 1000 : prev == null ? next! - 1000 : next == null ? prev + 1000 : (prev + next) / 2;
    if (deal.stageId === target && deal.position === position) return;
    setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, stageId: target, position, stageChangedAt: d.stageId !== target ? new Date().toISOString() : d.stageChangedAt } : d)));
    run(() => moveDeal(id, target, position));
  };

  return (
    <DndContext id="deals-board" sensors={sensors} collisionDetection={closestCorners} onDragStart={onStart} onDragOver={onOver} onDragEnd={onEnd} onDragCancel={() => setActiveId(null)}>
      <div className="scroll-thin flex flex-1 gap-3 overflow-x-auto p-4">
        {stages.map((s) => (
          <Column key={s.id} stage={s} deals={byStage.get(s.id) ?? []} highlight={overCol === s.id && !!activeId} pipelineId={pipelineId} />
        ))}
        {!stages.length && <EmptyState title="Nenhuma etapa" description="Configure as etapas do funil em Configurações." />}
      </div>
      {activeId && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center gap-4 p-4">
          <DropZone id="WON" label="Ganho" className="bg-emerald-600" icon={<ThumbsUp className="size-5" />} />
          <DropZone id="LOST" label="Perdido" className="bg-red-600" icon={<ThumbsDown className="size-5" />} />
        </div>
      )}
      <DragOverlay>{active && <DealCard deal={active} stage={allStages.find((s) => s.id === active.stageId)} dragging />}</DragOverlay>
      <LostReasonModal
        dealId={lostFor}
        onClose={() => setLostFor(null)}
        onDone={() => {
          setDeals((ds) => ds.filter((d) => d.id !== lostFor));
          setLostFor(null);
        }}
      />
    </DndContext>
  );
}

function DropZone({ id, label, className, icon }: { id: string; label: string; className: string; icon: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "pointer-events-auto flex h-20 w-64 items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white shadow-2xl transition",
        className,
        isOver ? "scale-105 opacity-100" : "opacity-80",
      )}
    >
      {icon} {label}
    </div>
  );
}

function Column({ stage, deals, highlight, pipelineId }: { stage: StageDef; deals: BoardDeal[]; highlight: boolean; pipelineId: string }) {
  const { setNodeRef } = useDroppable({ id: stage.id });
  const { fmt, labels } = useOrg();
  const quick = useQuickCreate();
  const total = deals.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 rounded-xl border border-line bg-surface px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: stage.color }} />
          <h3 className="flex-1 truncate text-sm font-semibold">{stage.name}</h3>
          <span className="text-xs text-muted">{stage.probability}%</span>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {fmt(total)} · {deals.length}
        </p>
        <div className="mt-2 h-1 rounded-full" style={{ background: stage.color, opacity: 0.6 }} />
      </div>
      <div
        ref={setNodeRef}
        className={cn("scroll-thin flex-1 space-y-2 overflow-y-auto rounded-xl p-1 transition", highlight && "bg-brand/5 ring-2 ring-brand/30")}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((d) => (
            <SortableCard key={d.id} deal={d} stage={stage} />
          ))}
        </SortableContext>
        <button
          onClick={() => quick("deal", { pipelineId, stageId: stage.id })}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-line py-2 text-xs text-muted hover:border-brand hover:text-brand"
        >
          <Plus className="size-3.5" /> {labels.deal.singular}
        </button>
      </div>
    </div>
  );
}

function SortableCard({ deal, stage }: { deal: BoardDeal; stage: StageDef }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners} className={cn(isDragging && "opacity-30")}>
      <DealCard deal={deal} stage={stage} />
    </div>
  );
}

function DealCard({ deal, stage, dragging }: { deal: BoardDeal; stage?: StageDef; dragging?: boolean }) {
  const { fmt, member } = useOrg();
  const owner = member(deal.ownerId);
  const days = daysSince(deal.stageChangedAt);
  const rotting = stage?.rottingDays != null && days > stage.rottingDays;
  const due = deal.nextActivity?.dueAt ? new Date(deal.nextActivity.dueAt) : null;
  const overdue = due && due < new Date();
  return (
    <Link href={`/deals/${deal.id}`} draggable={false} onClick={(e) => dragging && e.preventDefault()}>
      <Card
        className={cn(
          "group cursor-grab p-3 transition hover:border-brand/40 hover:shadow-md active:cursor-grabbing",
          dragging && "rotate-2 shadow-2xl",
          rotting && "border-l-4 border-l-red-400",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{deal.title}</p>
          {owner && <Avatar name={owner.name} color={owner.avatarColor} size={22} />}
        </div>
        {(deal.company || deal.contact) && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
            {deal.company ? <Building2 className="size-3" /> : <User className="size-3" />}
            {deal.company?.name ?? deal.contact?.name}
          </p>
        )}
        <div className="mt-2">
          <TagList tags={deal.tags} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{fmt(deal.value)}</span>
          <span className="flex items-center gap-1.5">
            {rotting && (
              <span title={`Parado há ${days} dias`} className="text-red-500">
                <AlertTriangle className="size-3.5" />
              </span>
            )}
            {deal.nextActivity ? (
              <span
                title={`${deal.nextActivity.title}${due ? " — " + date(due) : ""}`}
                className={cn("flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium", overdue ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600")}
              >
                <ActivityIcon type={deal.nextActivity.type} className="size-3" />
                {due ? date(due, "pt-BR", { day: "2-digit", month: "2-digit" }) : ""}
              </span>
            ) : (
              <span title="Nenhuma atividade agendada" className="flex items-center rounded bg-amber-500/10 px-1 py-0.5 text-amber-600">
                <CalendarClock className="size-3" />
              </span>
            )}
          </span>
        </div>
      </Card>
    </Link>
  );
}

/* ------------------------------ LISTA ------------------------------ */

type SortKey = "title" | "value" | "stage" | "owner" | "expectedClose" | "createdAt";

function DealList({ deals, stages }: { deals: BoardDeal[]; stages: StageDef[] }) {
  const { fmt, member, labels, members, can } = useOrg();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "createdAt", dir: -1 });
  const { run, pending } = useAction();
  const stageOf = (id: string) => stages.find((s) => s.id === id);
  const sorted = useMemo(() => {
    const val = (d: BoardDeal): string | number => {
      switch (sort.k) {
        case "value": return d.value;
        case "stage": return stageOf(d.stageId)?.name ?? "";
        case "owner": return member(d.ownerId)?.name ?? "";
        case "expectedClose": return d.expectedClose ?? "";
        case "createdAt": return d.createdAt;
        default: return d.title.toLowerCase();
      }
    };
    return [...deals].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, sort]);
  const th = (k: SortKey, label: string, cls = "") => (
    <th className={cn("cursor-pointer select-none px-3 py-2.5 font-medium hover:text-fg", cls)} onClick={() => setSort((s) => ({ k, dir: s.k === k ? (-s.dir as 1 | -1) : 1 }))}>
      {label} {sort.k === k ? (sort.dir === 1 ? "↑" : "↓") : ""}
    </th>
  );
  const ids = Array.from(sel);
  if (!deals.length) return <EmptyState icon={<KanbanSquare className="size-6" />} title={`Nenhum ${labels.deal.singular.toLowerCase()} encontrado`} description="Ajuste os filtros ou crie um novo." />;
  return (
    <div className="flex-1 overflow-auto p-4">
      {ids.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2 text-sm">
          <b>{ids.length} selecionado(s)</b>
          <Select className="h-8 w-auto" defaultValue="" onChange={(e) => e.target.value && run(() => bulkDeals(ids, "owner", e.target.value), { onSuccess: () => setSel(new Set()) })}>
            <option value="">Alterar responsável…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
          <Select className="h-8 w-auto" defaultValue="" onChange={(e) => e.target.value && run(() => bulkDeals(ids, "stage", e.target.value), { onSuccess: () => setSel(new Set()) })}>
            <option value="">Mover para etapa…</option>
            {stages.filter((s) => s.type === "OPEN").map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          {can("MANAGER") && (
            <Button size="sm" variant="danger" loading={pending} onClick={() => confirm(`Excluir ${ids.length} registro(s)?`) && run(() => bulkDeals(ids, "delete"), { onSuccess: () => setSel(new Set()) })}>
              <Trash2 className="size-3.5" /> Excluir
            </Button>
          )}
        </div>
      )}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="w-10 px-3">
                <input type="checkbox" className="accent-brand" checked={sel.size === deals.length} onChange={(e) => setSel(e.target.checked ? new Set(deals.map((d) => d.id)) : new Set())} />
              </th>
              {th("title", "Título")}
              {th("value", "Valor", "text-right")}
              {th("stage", "Etapa")}
              <th className="px-3 py-2.5 font-medium">{labels.company.singular} / {labels.contact.singular}</th>
              {th("owner", "Responsável")}
              {th("expectedClose", "Previsão")}
              {th("createdAt", "Criado em")}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((d) => {
              const st = stageOf(d.stageId);
              const owner = member(d.ownerId);
              return (
                <tr key={d.id} className="hover:bg-surface-2/60">
                  <td className="px-3">
                    <input
                      type="checkbox"
                      className="accent-brand"
                      checked={sel.has(d.id)}
                      onChange={(e) => {
                        const n = new Set(sel);
                        if (e.target.checked) n.add(d.id);
                        else n.delete(d.id);
                        setSel(n);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/deals/${d.id}`} className="font-medium hover:text-brand">{d.title}</Link>
                    <TagList tags={d.tags} />
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium">{fmt(d.value)}</td>
                  <td className="px-3 py-2.5">
                    {st && <Badge color={st.color}>{st.name}</Badge>}
                    {d.status !== "OPEN" && <Badge color={d.status === "WON" ? "#16a34a" : "#dc2626"} className="ml-1">{d.status === "WON" ? "Ganho" : "Perdido"}</Badge>}
                  </td>
                  <td className="px-3 py-2.5 text-muted">{d.company?.name ?? d.contact?.name ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    {owner ? <span className="flex items-center gap-1.5"><Avatar name={owner.name} color={owner.avatarColor} size={20} /> {owner.name}</span> : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-muted">{date(d.expectedClose)}</td>
                  <td className="px-3 py-2.5 text-muted">{date(d.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
