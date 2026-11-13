"use client";
import { useState } from "react";
import { AlertTriangle, ArrowDownToLine, BarChart3, Boxes, Package, Pencil, Plus, Repeat, SlidersHorizontal, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Badge, Button, Card, CardHeader, cn, EmptyState, Field, IconTile, Input, Modal, PageHeader, Select, StatCard, Tabs, Textarea } from "@/components/ui";
import { useParamSetter } from "@/components/list-toolbar";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { deleteProduct, saveProduct } from "@/actions/crm";
import { moveStock } from "@/actions/commerce";
import { billingLabel, INTERVALS } from "@/lib/commerce";
import type { ProductStat, StockRow } from "@/lib/sales-analytics";

type P = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  details: string | null;
  unit: string | null;
  price: number;
  setupFee: number;
  billing: string;
  interval: string | null;
  trackStock: boolean;
  stock: number;
  minStock: number;
  leadTimeDays: number;
  active: boolean;
  uses: number;
};

const num = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);

export function ProductsView({ products, tab, period, ranking, stock }: { products: P[]; tab: string; period: string; ranking: ProductStat[]; stock: StockRow[] }) {
  const { labels, can } = useOrg();
  const set = useParamSetter();
  const [edit, setEdit] = useState<P | "new" | null>(null);
  return (
    <div className="w-full px-4 pb-16 pt-8 lg:px-8">
      <PageHeader
        eyebrow="05 / Catálogo"
        icon={<Package />}
        title={labels.product.plural}
        description="Catálogo com preços, cobrança única ou recorrente, estoque, demanda e ranking de vendas para a gestão comercial."
        actions={can("MANAGER") && <Button onClick={() => setEdit("new")}><Plus className="size-4" /> {labels.product.singular}</Button>}
      />
      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={(v) => set("tab", v === "catalog" ? "" : v)}
          items={[
            { value: "catalog", label: <span className="flex items-center gap-1.5"><Package className="size-3.5" /> Catálogo</span> },
            { value: "stock", label: <span className="flex items-center gap-1.5"><Boxes className="size-3.5" /> Estoque e demanda</span> },
            { value: "ranking", label: <span className="flex items-center gap-1.5"><BarChart3 className="size-3.5" /> Ranking de vendas</span> },
          ]}
        />
      </div>
      {tab === "catalog" && <Catalog products={products} onEdit={setEdit} />}
      {tab === "stock" && <StockPlan rows={stock} products={products} />}
      {tab === "ranking" && <Ranking rows={ranking} period={period} />}
      <ProductModal edit={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function Catalog({ products, onEdit }: { products: P[]; onEdit: (p: P) => void }) {
  const { fmt, can } = useOrg();
  const { run } = useAction();
  return (
    <Card className="overflow-x-auto">
      {products.length ? (
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-2 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="px-4 py-3 font-normal">Produto</th>
              <th className="px-4 py-3 font-normal">Cobrança</th>
              <th className="px-4 py-3 text-right font-normal">Preço</th>
              <th className="px-4 py-3 text-right font-normal">Adesão</th>
              <th className="px-4 py-3 text-right font-normal">Estoque</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p.id} className="transition hover:bg-tint">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <IconTile size={34} className="[&>svg]:size-4">{p.billing === "RECURRING" ? <Repeat /> : <Package />}</IconTile>
                    <div className="min-w-0">
                      <p className="font-medium">{p.name} {p.sku && <span className="ml-1 font-mono text-[10.5px] text-muted">{p.sku}</span>}</p>
                      {p.description && <p className="line-clamp-1 max-w-xl text-xs text-muted">{p.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge color={p.billing === "RECURRING" ? "var(--accent-2)" : "var(--text-mute)"} dot>{billingLabel(p.billing, p.interval)}</Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                  {fmt(p.price)}
                  <span className="text-xs font-normal text-muted"> /{p.billing === "RECURRING" ? INTERVALS[p.interval ?? "MONTHLY"]?.short : p.unit || "un"}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-fg-2">{p.setupFee ? fmt(p.setupFee) : "—"}</td>
                <td className={cn("whitespace-nowrap px-4 py-3 text-right", p.trackStock && p.stock <= p.minStock && "font-medium text-err")}>{p.trackStock ? num(p.stock) : <span className="text-muted">não controla</span>}</td>
                <td className="px-4 py-3">{p.active ? <Badge color="var(--ok)" dot>Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                <td className="px-4 py-3 text-right">
                  {can("MANAGER") && (
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onEdit(p)} aria-label="Editar"><Pencil className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm("Excluir produto?") && run(() => deleteProduct(p.id))} aria-label="Excluir"><Trash2 className="size-3.5" /></Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState icon={<Package className="size-6" />} title="Nenhum item cadastrado" description="Cadastre seus produtos ou serviços com preço, forma de cobrança e descrição para as propostas." />
      )}
    </Card>
  );
}

function ProductModal({ edit, onClose }: { edit: P | "new" | null; onClose: () => void }) {
  const cur = edit === "new" ? null : edit;
  const { run, pending } = useAction();
  const [billing, setBilling] = useState(cur?.billing ?? "ONE_TIME");
  const [track, setTrack] = useState(cur?.trackStock ?? false);
  const [prev, setPrev] = useState(edit);
  if (prev !== edit) {
    setPrev(edit);
    setBilling(cur?.billing ?? "ONE_TIME");
    setTrack(cur?.trackStock ?? false);
  }
  return (
    <Modal open={!!edit} onClose={onClose} title={cur ? "Editar produto" : "Novo produto"} wide>
      <form
        key={cur?.id ?? "new"}
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveProduct(cur?.id ?? null, new FormData(e.currentTarget)), { onSuccess: onClose });
        }}
        className="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <Field label="Nome *"><Input name="name" required defaultValue={cur?.name} autoFocus /></Field>
          <Field label="Código / SKU"><Input name="sku" defaultValue={cur?.sku ?? ""} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Cobrança">
            <Select name="billing" value={billing} onChange={(e) => setBilling(e.target.value)}>
              <option value="ONE_TIME">Pagamento único</option>
              <option value="RECURRING">Recorrente (assinatura)</option>
            </Select>
          </Field>
          {billing === "RECURRING" ? (
            <Field label="Periodicidade">
              <Select name="interval" defaultValue={cur?.interval ?? "MONTHLY"}>
                {Object.entries(INTERVALS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Unidade"><Input name="unit" defaultValue={cur?.unit ?? ""} placeholder="un, h, kg, projeto" /></Field>
          )}
          <Field label={billing === "RECURRING" ? "Preço por ciclo" : "Preço"}><Input name="price" inputMode="decimal" defaultValue={cur?.price ?? ""} /></Field>
          <Field label="Taxa de adesão / implantação" hint="Cobrada uma única vez"><Input name="setupFee" inputMode="decimal" defaultValue={cur?.setupFee || ""} /></Field>
        </div>
        {billing === "RECURRING" && <input type="hidden" name="unit" value={cur?.unit ?? ""} />}
        <Field label="Descrição curta" hint="Aparece no catálogo e no resumo da proposta"><Input name="description" defaultValue={cur?.description ?? ""} /></Field>
        <Field label="Descrição completa para a proposta" hint="O que está incluso, benefícios, escopo, SLA… (uma linha por tópico)">
          <Textarea name="details" rows={5} defaultValue={cur?.details ?? ""} />
        </Field>
        <div className="rounded-[10px] border border-line p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="trackStock" checked={track} onChange={(e) => setTrack(e.target.checked)} className="accent-[var(--accent)]" /> Controlar estoque deste produto
          </label>
          {track && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Estoque atual"><Input value={cur ? num(cur.stock) : "0"} disabled /></Field>
              <Field label="Estoque mínimo"><Input name="minStock" inputMode="decimal" defaultValue={cur?.minStock ?? 0} /></Field>
              <Field label="Prazo de reposição (dias)"><Input name="leadTimeDays" inputMode="numeric" defaultValue={cur?.leadTimeDays ?? 7} /></Field>
            </div>
          )}
          {track && <p className="mt-2 text-xs text-muted">Entradas e ajustes são feitos na aba Estoque e demanda; os pedidos dão baixa automaticamente.</p>}
        </div>
        <Field label="Status">
          <Select name="active" defaultValue={cur?.active === false ? "false" : "true"}>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button trail loading={pending}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

const STOCK_STATUS: Record<StockRow["status"], { label: string; color: string }> = {
  repor: { label: "Repor agora", color: "var(--err)" },
  atencao: { label: "Atenção", color: "var(--warn)" },
  ok: { label: "Saudável", color: "var(--ok)" },
  "sem-giro": { label: "Sem giro", color: "var(--text-mute)" },
};

function StockPlan({ rows, products }: { rows: StockRow[]; products: P[] }) {
  const { can } = useOrg();
  const { run, pending } = useAction();
  const [move, setMove] = useState<{ row: StockRow; kind: "PURCHASE" | "ADJUST" } | null>(null);
  const [enable, setEnable] = useState("");
  const untracked = products.filter((p) => !p.trackStock && p.billing !== "RECURRING");
  const toRestock = rows.filter((r) => r.status === "repor");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={1} label="Itens controlados" value={String(rows.length).padStart(2, "0")} sub="com estoque ativo" color="var(--accent-2)" />
        <StatCard index={2} label="Repor agora" value={String(toRestock.length).padStart(2, "0")} sub="abaixo do ponto de pedido" color="var(--err)" />
        <StatCard index={3} label="Atenção" value={String(rows.filter((r) => r.status === "atencao").length).padStart(2, "0")} sub="cobertura curta" color="var(--warn)" />
        <StatCard index={4} label="Unidades sugeridas" value={num(rows.reduce((s, r) => s + r.suggested, 0))} sub="para 30 dias + prazo de entrega" color="var(--ok)" />
      </div>
      <Card className="overflow-x-auto">
        {rows.length ? (
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Produto</th>
                <th className="px-4 py-3 text-right font-normal">Estoque</th>
                <th className="px-4 py-3 text-right font-normal">Saída média/dia</th>
                <th className="px-4 py-3 text-right font-normal">Cobertura</th>
                <th className="px-4 py-3 text-right font-normal">Ponto de pedido</th>
                <th className="px-4 py-3 text-right font-normal">Sugestão de compra</th>
                <th className="px-4 py-3 font-normal">Situação</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="transition hover:bg-tint">
                  <td className="px-4 py-3 font-medium">{r.name} {r.sku && <span className="ml-1 font-mono text-[10.5px] text-muted">{r.sku}</span>}</td>
                  <td className="px-4 py-3 text-right">{num(r.stock)} <span className="text-xs text-muted">{r.unit ?? "un"}</span></td>
                  <td className="px-4 py-3 text-right text-fg-2">{num(r.dailyAvg)}</td>
                  <td className="px-4 py-3 text-right text-fg-2">{r.coverageDays == null ? "—" : `${r.coverageDays} dias`}</td>
                  <td className="px-4 py-3 text-right text-fg-2">{num(r.reorderPoint)}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.suggested ? num(r.suggested) : "—"}</td>
                  <td className="px-4 py-3"><Badge color={STOCK_STATUS[r.status].color} dot>{STOCK_STATUS[r.status].label}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {can("MANAGER") && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant={r.status === "repor" ? "primary" : "secondary"} onClick={() => setMove({ row: r, kind: "PURCHASE" })}><ArrowDownToLine className="size-3.5" /> Entrada</Button>
                        <Button size="icon" variant="ghost" aria-label="Ajustar" onClick={() => setMove({ row: r, kind: "ADJUST" })}><SlidersHorizontal className="size-3.5" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={<Boxes />} title="Nenhum produto com estoque controlado" description="Ative o controle de estoque em produtos físicos. Assinaturas e serviços não precisam de estoque." />
        )}
      </Card>
      {can("MANAGER") && untracked.length > 0 && (
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <Field label="Começar a controlar o estoque de" className="min-w-64 flex-1">
            <Select value={enable} onChange={(e) => setEnable(e.target.value)}>
              <option value="">Selecione um produto…</option>
              {untracked.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Button
            variant="secondary"
            disabled={!enable}
            onClick={() => {
              const p = untracked.find((x) => x.id === enable);
              if (p) setMove({ row: { id: p.id, name: p.name, sku: p.sku, unit: p.unit, stock: 0, minStock: p.minStock, leadTimeDays: p.leadTimeDays, dailyAvg: 0, coverageDays: null, reorderPoint: 0, suggested: 0, status: "sem-giro" }, kind: "PURCHASE" });
            }}
          >
            <Plus className="size-4" /> Registrar estoque inicial
          </Button>
        </Card>
      )}
      <p className="text-xs text-muted">
        Demanda calculada pela saída média dos últimos 90 dias (pedidos). Ponto de pedido = saída diária × prazo de reposição + estoque mínimo. Sugestão = consumo de 30 dias + prazo de reposição + mínimo − estoque atual.
      </p>
      <Modal open={!!move} onClose={() => setMove(null)} title={move?.kind === "PURCHASE" ? `Entrada de estoque · ${move.row.name}` : `Ajuste de estoque · ${move?.row.name}`}>
        {move && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = Number(String(fd.get("qty")).replace(",", "."));
              const sign = move.kind === "ADJUST" && fd.get("dir") === "out" ? -1 : 1;
              run(() => moveStock(move.row.id, q * sign, move.kind, String(fd.get("note") ?? "")), { onSuccess: () => setMove(null) });
            }}
            className="space-y-3"
          >
            {move.kind === "ADJUST" && (
              <Field label="Tipo">
                <Select name="dir" defaultValue="out">
                  <option value="out">Saída (perda, avaria, consumo interno)</option>
                  <option value="in">Entrada (correção de inventário)</option>
                </Select>
              </Field>
            )}
            <Field label="Quantidade" hint={move.kind === "PURCHASE" && move.row.suggested ? `Sugestão pela demanda: ${num(move.row.suggested)}` : undefined}>
              <Input name="qty" inputMode="decimal" required autoFocus defaultValue={move.kind === "PURCHASE" && move.row.suggested ? String(move.row.suggested) : ""} />
            </Field>
            <Field label="Observação"><Input name="note" placeholder={move.kind === "PURCHASE" ? "Nota fiscal / fornecedor" : "Motivo do ajuste"} /></Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setMove(null)}>Cancelar</Button>
              <Button loading={pending}>Registrar</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

const CURVE: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  A: { label: "Mais vendidos", color: "var(--ok)", icon: <TrendingUp /> },
  B: { label: "Intermediários", color: "var(--warn)", icon: <BarChart3 /> },
  C: { label: "Menos vendidos", color: "var(--err)", icon: <TrendingDown /> },
  "-": { label: "Sem vendas no período", color: "var(--text-mute)", icon: <AlertTriangle /> },
};

function Ranking({ rows, period }: { rows: ProductStat[]; period: string }) {
  const { fmt } = useOrg();
  const set = useParamSetter();
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const mrr = rows.reduce((s, r) => s + r.mrr, 0);
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onChange={(e) => set("period", e.target.value === "90" ? "" : e.target.value)} className="w-auto">
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="365">Últimos 12 meses</option>
        </Select>
        <p className="text-xs text-muted">Pedidos gerados pelas propostas aceitas e negócios ganhos com produtos (curva ABC por faturamento).</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={1} label="Faturamento no período" value={fmt(revenue, revenue >= 1e6)} sub={`${rows.filter((r) => r.revenue).length} produtos vendidos`} color="var(--accent-2)" />
        <StatCard index={2} label="Receita recorrente (MRR)" value={fmt(mrr, mrr >= 1e6)} sub="assinaturas ativas / mês" color="var(--ok)" />
        <StatCard index={3} label="Curva A" value={String(rows.filter((r) => r.curve === "A").length).padStart(2, "0")} sub="≈ 80% do faturamento" color="var(--warn)" />
        <StatCard index={4} label="Sem vendas" value={String(rows.filter((r) => r.curve === "-").length).padStart(2, "0")} sub="avaliar preço ou divulgação" color="var(--err)" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {(["A", "B", "C"] as const).map((k) => {
          const list = rows.filter((r) => r.curve === k);
          return (
            <Card key={k} className="p-5">
              <CardHeader icon={CURVE[k]!.icon} title={`${CURVE[k]!.label} · ${String(list.length).padStart(2, "0")}`} description={k === "A" ? "Curva A — sustentam o faturamento" : k === "B" ? "Curva B — giro moderado" : "Curva C — baixa participação"} />
              <ul className="space-y-2">
                {list.map((r) => (
                  <li key={r.id} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium"><span className="mr-2 font-mono text-[10.5px] text-muted">{String(r.rank).padStart(2, "0")}</span>{r.name}</span>
                      <span className="whitespace-nowrap font-medium">{fmt(r.revenue, r.revenue >= 1e6)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: `${(r.revenue / max) * 100}%`, background: CURVE[k]!.color }} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">{num(r.qty)} un · {r.orders} venda(s) · {(r.share * 100).toFixed(1)}%{r.mrr ? ` · MRR ${fmt(r.mrr)}` : ""}</p>
                  </li>
                ))}
                {!list.length && <p className="text-sm text-muted">Nenhum produto nesta faixa.</p>}
              </ul>
            </Card>
          );
        })}
      </div>
      {rows.some((r) => r.curve === "-") && (
        <Card className="p-5">
          <CardHeader icon={<AlertTriangle />} title="Sem vendas no período" />
          <div className="flex flex-wrap gap-2">
            {rows.filter((r) => r.curve === "-").map((r) => <Badge key={r.id}>{r.name}</Badge>)}
          </div>
        </Card>
      )}
    </div>
  );
}
