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
import { Avatar, Badge, Button, Card, cn, EditorialTitle, EmptyState, Input, Select, Tabs } from "@/components/ui";
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
    <div className="flex h-[calc(100vh-4rem-2.75rem)] flex-col">
      <div className="border-b border-line px-4 pb-4 pt-7 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="eyebrow mb-2">01 / Pipeline · {pipelines.find((p) => p.id === pipelineId)?.name}</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[clamp(32px,3.6vw,48px)] font-medium leading-none tracking-[-0.04em]">
                <EditorialTitle text={labels.deal.plural} />
              </h1>
              <Select value={pipelineId} onChange={(e) => setParam("pipeline", e.target.value)} className="h-9 w-auto min-w-36 font-mono text-[11px] uppercase tracking-[0.08em]">
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="card-drap hidden items-stretch divide-x divide-line sm:flex">
              {[
                ["Total", fmt(total, total >= 1e6), false],
                ["Ponderado", fmt(weighted, weighted >= 1e6), true],
                ["Qtd.", String(deals.length).padStart(2, "0"), false],
              ].map(([l, v, hl]) => (
                <div key={l as string} className="px-4 py-2">
                  <p className="eyebrow text-[9.5px]">{l}</p>
                  <p className={`text-[15px] font-medium tracking-[-0.02em] ${hl ? "text-accent-text" : ""}`}>{v}</p>
                </div>
              ))}
            </div>
            <Button trail={<Plus className="size-3.5" />} onClick={() => quick("deal", { pipelineId })}>
              {labels.deal.singular}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Tabs
            value={view}
            onChange={(v) => setParam("view", v === "board" ? "" : v)}
            items={[
              { value: "board", label: <span className="flex items-center gap-1.5"><KanbanSquare className="size-3.5" /> Funil</span> },
              { value: "list", label: <span className="flex items-center gap-1.5"><List className="size-3.5" /> Lista</span> },
            ]}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por título, contato…" className="w-60 pl-8" />
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
              <option value="">Todas as etiquetas</option>
              {tags.map((t) => (
                <option key={t.name}>{t.name}</option>
              ))}
            </Select>
          )}
          {(filters.owner || filters.tag || filters.q || status !== "OPEN") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                router.push(`${pathname}?pipeline=${pipelineId}${view === "list" ? "&view=list" : ""}`);
              }}
            >
              Limpar filtros
            </Button>
          )}
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
      <div className="scroll-thin flex flex-1 gap-4 overflow-x-auto px-4 py-5 lg:px-8">
        {stages.map((s) => (
          <Column key={s.id} stage={s} deals={byStage.get(s.id) ?? []} highlight={overCol === s.id && !!activeId} pipelineId={pipelineId} />
        ))}
        {!stages.length && <EmptyState title="Nenhuma etapa" description="Configure as etapas do funil em Configurações." />}
      </div>
      {activeId && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center gap-4 p-4">
          <DropZone id="WON" label="Ganho" className="bg-ok" icon={<ThumbsUp className="size-5" />} />
          <DropZone id="LOST" label="Perdido" className="bg-err" icon={<ThumbsDown className="size-5" />} />
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
        "animate-in pointer-events-auto flex h-20 w-64 items-center justify-center gap-2.5 rounded-[var(--radius)] border-2 border-dashed border-[var(--on-accent)]/40 font-mono text-sm uppercase tracking-[0.12em] text-[var(--surface-1)] shadow-pop transition",
        className,
        isOver ? "scale-105 border-white opacity-100" : "opacity-85",
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
  const weighted = total * (stage.probability / 100);
  return (
    <div className="card-drap flex w-[300px] shrink-0 flex-col overflow-hidden">
      <div className="relative border-b border-line px-4 pb-3 pt-4">
        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: stage.color }} />
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: stage.color }} />
          <h3 className="mono-label flex-1 truncate text-[11px] text-fg">{stage.name}</h3>
          <span className="font-mono text-[11px] text-muted">{String(deals.length).padStart(2, "0")}</span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-xl font-medium tracking-[-0.03em]">{fmt(total, total >= 1e6)}</span>
          <span className="font-mono text-[10.5px] text-muted" title="Valor ponderado pela probabilidade da etapa">
            {stage.probability}% · {fmt(weighted, true)}
          </span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn("scroll-thin flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-2.5 transition", highlight && "rounded-b-2xl bg-brand/6 ring-2 ring-inset ring-brand/30")}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((d) => (
            <SortableCard key={d.id} deal={d} stage={stage} />
          ))}
        </SortableContext>
        {!deals.length && (
          <div className="mono-label flex flex-col items-center justify-center rounded-[10px] border border-dashed border-line-strong px-3 py-6 text-center text-[10px] text-muted">
            <KanbanSquare className="mb-1.5 size-5 opacity-50" />
            Arraste um cartão para cá
          </div>
        )}
        <button
          onClick={() => quick("deal", { pipelineId, stageId: stage.id })}
          className="mono-label flex w-full items-center justify-center gap-1 rounded-[10px] border border-dashed border-transparent py-2 text-[10px] text-muted transition hover:border-line-strong hover:bg-surface hover:text-fg"
        >
          <Plus className="size-3.5" /> Adicionar {labels.deal.singular.toLowerCase()}
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
    <Link href={`/deals/${deal.id}`} draggable={false} onClick={(e) => dragging && e.preventDefault()} className="block">
      <div
        className={cn(
          "group relative cursor-grab overflow-hidden rounded-[10px] border border-line bg-[var(--card-bg)] p-3.5 pl-4 shadow-[0_10px_30px_-24px_var(--shadow)] transition duration-300 ease-[var(--ease)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card active:cursor-grabbing",
          dragging && "rotate-[2.5deg] scale-[1.02] shadow-pop ring-1 ring-[var(--accent)]",
        )}
      >
        <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: rotting ? "var(--warn)" : stage?.color ?? "var(--accent)" }} />
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-[13.5px] font-medium leading-snug tracking-[-0.01em] text-fg">{deal.title}</p>
          {owner && <Avatar name={owner.name} color={owner.avatarColor} size={24} ring />}
        </div>
        {(deal.company || deal.contact) && (
          <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted">
            {deal.company ? <Building2 className="size-3.5 shrink-0" /> : <User className="size-3.5 shrink-0" />}
            <span className="truncate">{deal.company?.name ?? deal.contact?.name}</span>
          </p>
        )}
        {deal.tags.length > 0 && (
          <div className="mt-2">
            <TagList tags={deal.tags} />
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-line pt-2.5">
          <span className="text-[15px] font-medium tracking-[-0.02em]">{fmt(deal.value)}</span>
          <span className="flex items-center gap-1">
            {rotting && (
              <span title={`Parado há ${days} dias nesta etapa`} className="flex items-center gap-0.5 rounded-[5px] border border-warn/35 px-1.5 py-0.5 font-mono text-[10px] text-warn">
                <AlertTriangle className="size-3" /> {days}d
              </span>
            )}
            {deal.nextActivity ? (
              <span
                title={`${deal.nextActivity.title}${due ? " — " + date(due) : ""}`}
                className={cn(
                  "flex items-center gap-1 rounded-[5px] border px-1.5 py-0.5 font-mono text-[10px]",
                  overdue ? "border-err/35 text-err" : "border-ok/35 text-ok",
                )}
              >
                <ActivityIcon type={deal.nextActivity.type} className="size-3" />
                {due ? date(due, "pt-BR", { day: "2-digit", month: "2-digit" }) : ""}
              </span>
            ) : (
              <span title="Nenhuma atividade agendada" className="flex items-center gap-1 rounded-[5px] border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                <CalendarClock className="size-3" /> agendar
              </span>
            )}
          </span>
        </div>
              </div>
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
    <div className="flex-1 overflow-auto px-4 py-5 lg:px-8">
      {ids.length > 0 && (
        <div className="card-drap mb-3 flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
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
          <thead className="sticky top-0 z-10 border-b border-line bg-surface-2 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
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
                <tr key={d.id} className="transition hover:bg-brand/[0.03]">
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
                  <td className="px-3 py-3 text-right font-medium tracking-[-0.02em]">{fmt(d.value)}</td>
                  <td className="px-3 py-2.5">
                    {st && <Badge color={st.color} dot>{st.name}</Badge>}
                    {d.status !== "OPEN" && <Badge color={d.status === "WON" ? "var(--ok)" : "var(--err)"} className="ml-1">{d.status === "WON" ? "Ganho" : "Perdido"}</Badge>}
                  </td>
                  <td className="px-3 py-2.5 text-muted">{d.company?.name ?? d.contact?.name ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    {owner ? <span className="flex items-center gap-1.5"><Avatar name={owner.name} color={owner.avatarColor} size={20} /> {owner.name}</span> : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">{date(d.expectedClose)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">{date(d.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
