"use client";
import { Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { deleteGoal, saveGoal } from "@/actions/settings";

const METRICS: Record<string, string> = { REVENUE: "Receita ganha", DEALS_WON: "Negócios ganhos", ACTIVITIES: "Atividades concluídas" };

export function GoalsManager({ goals }: { goals: { id: string; period: string; metric: string; user: string | null; target: number; actual: number }[] }) {
  const { members, fmt } = useOrg();
  const { run, pending } = useAction();
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold">Definir meta</h2>
        <p className="mb-4 text-sm text-muted">Metas mensais da empresa ou por vendedor. A meta de receita da empresa aparece no painel.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveGoal(new FormData(e.currentTarget)));
          }}
          className="grid items-end gap-3 sm:grid-cols-5"
        >
          <Field label="Mês"><Input type="month" name="period" defaultValue={ym} required /></Field>
          <Field label="Indicador">
            <Select name="metric">{Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          </Field>
          <Field label="Quem">
            <Select name="userId">
              <option value="">Empresa toda</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Meta"><Input name="target" inputMode="decimal" required placeholder="100000" /></Field>
          <Button loading={pending}>Salvar meta</Button>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Acompanhamento</h2>
        <div className="space-y-3">
          {goals.map((g) => {
            const pct = g.target ? Math.round((g.actual / g.target) * 100) : 0;
            const f = (v: number) => (g.metric === "REVENUE" ? fmt(v) : String(v));
            return (
              <div key={g.id} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{METRICS[g.metric]}</span>
                  <span className="text-muted">· {g.user ?? "Empresa"} · {new Date(g.period + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
                  <span className="ml-auto font-semibold">{pct}%</span>
                  <Button size="icon" variant="ghost" onClick={() => run(() => deleteGoal(g.id))} aria-label="Excluir"><Trash2 className="size-3.5" /></Button>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-brand"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">{f(g.actual)} de {f(g.target)}</p>
              </div>
            );
          })}
          {!goals.length && <p className="text-sm text-muted">Nenhuma meta cadastrada.</p>}
        </div>
      </Card>
    </div>
  );
}
