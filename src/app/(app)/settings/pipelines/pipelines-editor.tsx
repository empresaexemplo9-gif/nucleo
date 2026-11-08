"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from "lucide-react";
import { Badge, Button, Card, cn, Input } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { createPipeline, deletePipeline, saveStages, updatePipeline, type StageInput } from "@/actions/settings";

type Stage = StageInput & { deals?: number; key: string };
type P = { id: string; name: string; isDefault: boolean; deals: number; stages: (StageInput & { id: string; deals: number })[] };

/** Cores sugeridas para novas etapas (dado salvo na etapa), na paleta DRAP. */
const COLORS = ["#7d828c", "#3c78c0", "#2d63a3", "#b48a4f", "#8a672f", "#17905f", "#4b505a", "#c39b5f"];

export function PipelinesEditor({ pipelines }: { pipelines: P[] }) {
  const [sel, setSel] = useState(pipelines.find((p) => p.isDefault)?.id ?? pipelines[0]?.id);
  const p = pipelines.find((x) => x.id === sel) ?? pipelines[0]!;
  const { run, pending } = useAction();
  const [newName, setNewName] = useState("");

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-base font-semibold">Funis de vendas</h2>
        <p className="mb-4 text-sm text-muted">Crie quantos funis precisar — ex.: Vendas novas, Renovação, Pós-venda, Parcerias.</p>
        <div className="flex flex-wrap gap-2">
          {pipelines.map((x) => (
            <button
              key={x.id}
              onClick={() => setSel(x.id)}
              className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium", x.id === p.id ? "border-brand bg-brand/10 text-brand" : "border-line hover:bg-surface-2")}
            >
              {x.isDefault && <Star className="size-3.5 fill-current" />} {x.name} <span className="text-xs text-muted">({x.deals})</span>
            </button>
          ))}
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createPipeline(newName), { onSuccess: (r) => { setNewName(""); if (r.id) setSel(r.id); } });
          }}
        >
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do novo funil" className="max-w-xs" />
          <Button variant="secondary" loading={pending} disabled={!newName.trim()}><Plus className="size-4" /> Criar funil</Button>
        </form>
      </Card>
      {p && <StagesEditor key={p.id + p.name + JSON.stringify(p.stages)} pipeline={p} />}
    </div>
  );
}

function StagesEditor({ pipeline }: { pipeline: P }) {
  const { run, pending } = useAction();
  const [name, setName] = useState(pipeline.name);
  const [stages, setStages] = useState<Stage[]>(pipeline.stages.map((s) => ({ ...s, key: s.id })));
  const open = stages.filter((s) => s.type === "OPEN");
  const closed = stages.filter((s) => s.type !== "OPEN");
  const update = (key: string, patch: Partial<Stage>) => setStages((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const move = (key: string, dir: -1 | 1) => {
    const list = [...open];
    const i = list.findIndex((s) => s.key === key);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j]!, list[i]!];
    setStages([...list, ...closed]);
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs font-medium" />
        <Button variant="secondary" size="sm" disabled={name === pipeline.name} onClick={() => run(() => updatePipeline(pipeline.id, { name }))}>Renomear</Button>
        {!pipeline.isDefault && (
          <Button variant="ghost" size="sm" onClick={() => run(() => updatePipeline(pipeline.id, { isDefault: true }))}><Star className="size-3.5" /> Tornar padrão</Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-err"
          onClick={() => confirm(`Excluir o funil "${pipeline.name}" e TODOS os seus ${pipeline.deals} negócios?`) && run(() => deletePipeline(pipeline.id))}
        >
          <Trash2 className="size-3.5" /> Excluir funil
        </Button>
      </div>

      <div className="hidden grid-cols-[28px_1fr_70px_90px_110px_64px] gap-2 px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted sm:grid">
        <span />
        <span>Etapa</span>
        <span>Cor</span>
        <span>Probab. %</span>
        <span title="Após quantos dias sem movimentação o negócio fica marcado como parado">Alerta parado (dias)</span>
        <span />
      </div>
      <div className="space-y-2">
        {open.map((s, i) => (
          <div key={s.key} className="grid grid-cols-[28px_1fr_70px_90px_110px_64px] items-center gap-2 rounded-lg border border-line p-1.5">
            <span className="text-center text-xs font-semibold text-muted">{i + 1}</span>
            <Input value={s.name} onChange={(e) => update(s.key, { name: e.target.value })} />
            <input type="color" value={s.color} onChange={(e) => update(s.key, { color: e.target.value })} className="h-9 w-full cursor-pointer" />
            <Input type="number" min={0} max={100} value={s.probability} onChange={(e) => update(s.key, { probability: Number(e.target.value) })} />
            <Input type="number" min={0} value={s.rottingDays ?? ""} placeholder="—" onChange={(e) => update(s.key, { rottingDays: e.target.value ? Number(e.target.value) : null })} />
            <div className="flex">
              <button type="button" onClick={() => move(s.key, -1)} className="rounded p-1 text-muted hover:bg-surface-2" aria-label="Subir"><ArrowUp className="size-3.5" /></button>
              <button type="button" onClick={() => move(s.key, 1)} className="rounded p-1 text-muted hover:bg-surface-2" aria-label="Descer"><ArrowDown className="size-3.5" /></button>
              <button
                type="button"
                onClick={() => {
                  if (s.deals && !confirm(`Esta etapa tem ${s.deals} negócio(s). Eles serão movidos para a primeira etapa. Continuar?`)) return;
                  setStages((ss) => ss.filter((x) => x.key !== s.key));
                }}
                className="rounded p-1 text-muted hover:bg-surface-2 hover:text-err"
                aria-label="Remover"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={() =>
          setStages([...open, { key: Math.random().toString(36), name: "Nova etapa", color: COLORS[open.length % COLORS.length]!, probability: 50, rottingDays: null, type: "OPEN" }, ...closed])
        }
      >
        <Plus className="size-3.5" /> Adicionar etapa
      </Button>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Etapas de fechamento</p>
        <div className="flex flex-wrap gap-2">
          {closed.map((s) => (
            <div key={s.key} className="flex items-center gap-2 rounded-lg border border-line p-1.5 pr-3">
              <Input value={s.name} onChange={(e) => update(s.key, { name: e.target.value })} className="w-40" />
              <Badge color={s.type === "WON" ? "var(--ok)" : "var(--err)"}>{s.type === "WON" ? "Ganho" : "Perdido"}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button loading={pending} onClick={() => run(() => saveStages(pipeline.id, [...open, ...closed].map(({ key, deals, ...s }) => (void key, void deals, s))))}>
          Salvar etapas
        </Button>
      </div>
    </Card>
  );
}
