"use client";
import { useState } from "react";
import { ListChecks, Lock, Plus, X } from "lucide-react";
import { Badge, Button, Card, CardHeader, cn, Input, Progress } from "@/components/ui";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/actions/checklist";
import { dateTime } from "@/lib/format";

export type ChecklistItem = { id: string; title: string; done: boolean; doneAt: string | null; doneById: string | null; stageId: string | null; createdById: string | null };

/**
 * Checklist do negócio: itens da etapa atual primeiro (com aviso quando são obrigatórios para avançar),
 * depois os de etapas anteriores e os avulsos.
 */
export function DealChecklist({
  dealId,
  items,
  stages,
  currentStageId,
  required,
}: {
  dealId: string;
  items: ChecklistItem[];
  stages: { id: string; name: string }[];
  currentStageId: string;
  required: boolean;
}) {
  const { can, member, user } = useOrg();
  const { run, pending } = useAction();
  const [text, setText] = useState("");
  // marcação otimista: o item muda na hora e volta se o servidor recusar
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [seen, setSeen] = useState(items);
  if (seen !== items) {
    setSeen(items);
    setOptimistic({});
  }
  const isDone = (i: ChecklistItem) => optimistic[i.id] ?? i.done;
  const toggle = (i: ChecklistItem) => {
    const next = !isDone(i);
    setOptimistic((o) => ({ ...o, [i.id]: next }));
    run(() => toggleChecklistItem(i.id), { onError: () => setOptimistic((o) => ({ ...o, [i.id]: !next })) });
  };
  const editable = can("SALES");
  const done = items.filter(isDone).length;
  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name;
  const current = items.filter((i) => i.stageId === currentStageId);
  const pendingNow = current.filter((i) => !isDone(i)).length;
  const groups = [
    { key: "current", title: stageName(currentStageId) ? `Etapa atual · ${stageName(currentStageId)}` : "Etapa atual", list: current },
    ...stages
      .filter((s) => s.id !== currentStageId && items.some((i) => i.stageId === s.id))
      .map((s) => ({ key: s.id, title: `Etapa · ${s.name}`, list: items.filter((i) => i.stageId === s.id) })),
    { key: "extra", title: "Outros itens", list: items.filter((i) => !i.stageId || !stages.some((s) => s.id === i.stageId)) },
  ].filter((g) => g.list.length);
  const canRemove = (i: ChecklistItem) => can("MANAGER") || (!i.stageId && i.createdById === user.id);

  return (
    <Card className="p-5">
      <CardHeader
        icon={<ListChecks />}
        title="Checklist"
        description={items.length ? `${done} de ${items.length} concluídos` : "Passos deste atendimento"}
        action={required && pendingNow > 0 ? <Badge color="var(--warn)" dot>Obrigatório</Badge> : undefined}
      />
      {items.length > 0 && <Progress value={(done / items.length) * 100} color={done === items.length ? "var(--ok)" : undefined} className="mb-4" />}
      {required && pendingNow > 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[color-mix(in_oklab,var(--warn)_35%,transparent)] bg-[color-mix(in_oklab,var(--warn)_8%,transparent)] px-3 py-2 text-xs text-warn">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          Conclua {pendingNow === 1 ? "o item pendente" : `os ${pendingNow} itens pendentes`} desta etapa para avançar o negócio.
        </p>
      )}
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.key}>
            {groups.length > 1 && <p className="mono-label mb-1.5 text-[10px] text-muted">{g.title}</p>}
            <ul className="space-y-1">
              {g.list.map((i) => {
                const by = member(i.doneById);
                return (
                  <li key={i.id} className="group -mx-1.5 flex items-start gap-2.5 rounded-[var(--radius-sm)] px-1.5 py-1.5 hover:bg-tint">
                    <input
                      type="checkbox"
                      checked={isDone(i)}
                      disabled={!editable}
                      onChange={() => toggle(i)}
                      className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                      aria-label={i.title}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm", isDone(i) && "text-muted line-through")}>{i.title}</span>
                      {isDone(i) && i.done && i.doneAt && (
                        <span className="block text-[11px] text-muted">
                          {by ? `${by.name.split(" ")[0]} · ` : ""}
                          {dateTime(i.doneAt)}
                        </span>
                      )}
                    </span>
                    {editable && canRemove(i) && (
                      <button
                        type="button"
                        onClick={() => run(() => deleteChecklistItem(i.id))}
                        className="rounded p-0.5 text-muted opacity-0 transition hover:text-err group-hover:opacity-100"
                        aria-label="Remover item"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {!items.length && <p className="text-sm text-muted">Nenhum item ainda. Os itens da etapa entram sozinhos quando o negócio chega a ela; você também pode adicionar os seus.</p>}
      {editable && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            run(() => addChecklistItem(dealId, text), { onSuccess: () => setText("") });
          }}
        >
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Novo item do checklist…" maxLength={160} className="h-9" />
          <Button size="sm" variant="secondary" disabled={!text.trim()} loading={pending} aria-label="Adicionar item">
            <Plus className="size-3.5" />
          </Button>
        </form>
      )}
    </Card>
  );
}
