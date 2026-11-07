"use client";
import { useState } from "react";
import { Check, History, MessageSquare, Pencil, Pin, PinOff, Plus, StickyNote, Trash2 } from "lucide-react";
import { Avatar, Button, Card, cn, Modal, Tabs, Textarea } from "./ui";
import { useOrg } from "./org-context";
import { useAction } from "./use-action";
import { addNote, deleteActivity, deleteNote, toggleActivity, togglePinNote } from "@/actions/crm";
import { ActivityForm, type ActivityFormValues } from "./forms/activity-form";
import { ActivityIcon } from "./activity-icon";
import { ACTIVITY_TYPES } from "@/lib/defaults";
import { dateTime, relative } from "@/lib/format";
import { EVENT_LABELS } from "@/lib/event-labels";
import type { Option } from "./pickers";

export type FeedActivity = ActivityFormValues & { done: boolean; doneAt: string | null };
export type FeedNote = { id: string; content: string; pinned: boolean; createdAt: string; authorId: string | null };
export type FeedEvent = { id: string; type: string; data: Record<string, string>; createdAt: string; userId: string | null };

export function Feed({
  activities,
  notes,
  events,
  link,
}: {
  activities: FeedActivity[];
  notes: FeedNote[];
  events: FeedEvent[];
  link: { deal?: Option | null; contact?: Option | null; company?: Option | null };
}) {
  const { member, can } = useOrg();
  const [tab, setTab] = useState<"note" | "activity">("note");
  const [filter, setFilter] = useState<"all" | "activities" | "notes" | "history">("all");
  const [text, setText] = useState("");
  const [edit, setEdit] = useState<FeedActivity | null>(null);
  const { pending, run } = useAction();

  const pending_ = activities.filter((a) => !a.done).sort((a, b) => +new Date(a.dueAt ?? 0) - +new Date(b.dueAt ?? 0));
  type Item = { kind: "activity"; at: string; a: FeedActivity } | { kind: "note"; at: string; n: FeedNote } | { kind: "event"; at: string; e: FeedEvent };
  const items: Item[] = [
    ...(filter === "all" || filter === "activities" ? activities.filter((a) => a.done).map((a) => ({ kind: "activity" as const, at: a.doneAt ?? String(a.dueAt), a })) : []),
    ...(filter === "all" || filter === "notes" ? notes.map((n) => ({ kind: "note" as const, at: n.createdAt, n })) : []),
    ...(filter === "all" || filter === "history" ? events.map((e) => ({ kind: "event" as const, at: e.createdAt, e })) : []),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const pinned = notes.filter((n) => n.pinned);

  return (
    <div className="space-y-4">
      {can("SALES") && (
        <Card>
          <div className="flex gap-1 border-b border-line px-3 pt-2">
            {(
              [
                ["note", "Nota", StickyNote],
                ["activity", "Atividade", Plus],
              ] as const
            ).map(([k, l, I]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn("flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium", tab === k ? "border-brand text-brand" : "border-transparent text-muted hover:text-fg")}
              >
                <I className="size-4" /> {l}
              </button>
            ))}
          </div>
          <div className="p-3">
            {tab === "note" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData();
                  fd.set("content", text);
                  if (link.deal) fd.set("dealId", link.deal.id);
                  if (link.contact) fd.set("contactId", link.contact.id);
                  if (link.company) fd.set("companyId", link.company.id);
                  run(() => addNote(fd), { onSuccess: () => setText("") });
                }}
              >
                <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma nota, resumo de reunião, próximos passos…" className="min-h-24" />
                <div className="mt-2 flex justify-end">
                  <Button loading={pending} disabled={!text.trim()}>Salvar nota</Button>
                </div>
              </form>
            ) : (
              <ActivityForm key={activities.length} defaults={link} onDone={() => setTab("note")} />
            )}
          </div>
        </Card>
      )}

      {pending_.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Planejado</h3>
          <div className="space-y-2">
            {pending_.map((a) => (
              <ActivityRow key={a.id} a={a} onEdit={() => setEdit(a)} />
            ))}
          </div>
        </div>
      )}

      {pinned.length > 0 && (
        <div className="space-y-2">
          {pinned.map((n) => (
            <NoteRow key={n.id} n={n} />
          ))}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Histórico</h3>
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { value: "all", label: "Tudo" },
              { value: "activities", label: "Atividades" },
              { value: "notes", label: "Notas" },
              { value: "history", label: "Alterações" },
            ]}
          />
        </div>
        <div className="relative space-y-2 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-line">
          {items.map((it) =>
            it.kind === "activity" ? (
              <ActivityRow key={"a" + it.a.id} a={it.a} onEdit={() => setEdit(it.a)} />
            ) : it.kind === "note" ? (
              it.n.pinned ? null : <NoteRow key={"n" + it.n.id} n={it.n} />
            ) : (
              <div key={"e" + it.e.id} className="relative flex items-center gap-3 pl-0 text-xs text-muted">
                <span className="z-10 flex size-8 items-center justify-center rounded-full border border-line bg-surface">
                  <History className="size-3.5" />
                </span>
                <span>
                  <b className="text-fg">{member(it.e.userId)?.name ?? "Sistema"}</b> {EVENT_LABELS[it.e.type] ?? it.e.type}
                  {it.e.data?.from && (
                    <>
                      : {it.e.data.from} → <b className="text-fg">{it.e.data.to}</b>
                    </>
                  )}
                  {it.e.data?.reason && <> — {it.e.data.reason}</>}
                  {it.e.data?.name && <> — {it.e.data.name}</>}
                  {it.e.data?.title && <> — {it.e.data.title}</>}
                  <span className="ml-1.5" title={dateTime(it.e.createdAt)}>· {relative(it.e.createdAt)}</span>
                </span>
              </div>
            ),
          )}
          {!items.length && <p className="py-6 text-center text-sm text-muted">Nada por aqui ainda.</p>}
        </div>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Editar atividade">
        {edit && <ActivityForm activity={edit} onDone={() => setEdit(null)} />}
      </Modal>
    </div>
  );
}

export function ActivityRow({ a, onEdit, showLinks }: { a: FeedActivity; onEdit?: () => void; showLinks?: boolean }) {
  const { member } = useOrg();
  const { run } = useAction();
  const overdue = !a.done && a.dueAt && new Date(a.dueAt) < new Date();
  const t = ACTIVITY_TYPES[a.type as keyof typeof ACTIVITY_TYPES];
  const who = member(a.assigneeId);
  return (
    <Card className={cn("group relative flex items-start gap-3 p-3", a.done && "opacity-75")}>
      <button
        onClick={() => run(() => toggleActivity(a.id, !a.done))}
        className={cn(
          "z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition",
          a.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line hover:border-emerald-500",
        )}
        aria-label={a.done ? "Reabrir" : "Concluir"}
      >
        {a.done && <Check className="size-3" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span style={{ color: t?.color }}>
            <ActivityIcon type={a.type} className="size-3.5" />
          </span>
          <p className={cn("truncate text-sm font-medium", a.done && "line-through")}>{a.title}</p>
        </div>
        <p className={cn("mt-0.5 text-xs", overdue ? "font-medium text-red-600" : "text-muted")}>
          {a.dueAt ? dateTime(a.dueAt) : "Sem data"}
          {overdue && " · atrasada"}
          {who && ` · ${who.name}`}
          {a.duration ? ` · ${a.duration} min` : ""}
        </p>
        {showLinks && (a.deal || a.contact || a.company) && (
          <p className="mt-0.5 truncate text-xs text-muted">{[a.deal?.label, a.contact?.label, a.company?.label].filter(Boolean).join(" · ")}</p>
        )}
        {a.description && <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted">{a.description}</p>}
      </div>
      <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
        {onEdit && (
          <button onClick={onEdit} className="rounded p-1 text-muted hover:bg-surface-2" aria-label="Editar">
            <Pencil className="size-3.5" />
          </button>
        )}
        <button onClick={() => confirm("Excluir atividade?") && run(() => deleteActivity(a.id))} className="rounded p-1 text-muted hover:bg-surface-2 hover:text-red-600" aria-label="Excluir">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </Card>
  );
}

function NoteRow({ n }: { n: FeedNote }) {
  const { member } = useOrg();
  const { run } = useAction();
  const author = member(n.authorId);
  return (
    <Card className={cn("group relative flex gap-3 p-3", n.pinned ? "border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/20" : "")}>
      <span className="z-10">{author ? <Avatar name={author.name} color={author.avatarColor} size={24} /> : <MessageSquare className="size-5 text-muted" />}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">
          <b className="text-fg">{author?.name ?? "Sistema"}</b> · {relative(n.createdAt)}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{n.content}</p>
      </div>
      <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button onClick={() => run(() => togglePinNote(n.id))} className="rounded p-1 text-muted hover:bg-surface-2" aria-label="Fixar">
          {n.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
        </button>
        <button onClick={() => confirm("Excluir nota?") && run(() => deleteNote(n.id))} className="rounded p-1 text-muted hover:bg-surface-2 hover:text-red-600" aria-label="Excluir">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </Card>
  );
}
