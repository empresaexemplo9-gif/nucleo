"use client";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, Select, StatCard } from "@/components/ui";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { setOrderStatus } from "@/actions/commerce";
import { billingLabel, code, ORDER_STATUS } from "@/lib/commerce";
import { dateTime } from "@/lib/format";
import { StatusChips } from "../proposals/status-chips";

type O = {
  id: string;
  number: number;
  status: string;
  total: number;
  monthly: number;
  createdAt: string;
  client: string | null;
  proposal: { id: string; number: number } | null;
  items: { id: string; name: string; quantity: number; billing: string; interval: string | null; total: number }[];
};

export function OrdersView({ orders, status, counts, totals }: { orders: O[]; status: string; counts: Record<string, number>; totals: { count: number; once: number; monthly: number } }) {
  const { fmt, can } = useOrg();
  const { run, pending } = useAction();
  return (
    <div className="w-full px-4 pb-16 pt-8 lg:px-8">
      <PageHeader eyebrow="Comercial" icon={<ShoppingCart />} title="Pedidos" description="Gerados automaticamente quando o cliente aceita a proposta. O estoque dos itens controlados é baixado na hora." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={1} label="Pedidos ativos" value={String(totals.count).padStart(2, "0")} sub="exceto cancelados" color="var(--accent-2)" />
        <StatCard index={2} label="Faturamento único" value={fmt(totals.once, totals.once >= 1e6)} sub="produtos, serviços e adesões" color="var(--ok)" />
        <StatCard index={3} label="Receita recorrente" value={fmt(totals.monthly, totals.monthly >= 1e6)} sub="por mês (assinaturas)" color="var(--warn)" />
        <StatCard index={4} label="A separar / ativar" value={String((counts.NEW ?? 0) + (counts.PROCESSING ?? 0)).padStart(2, "0")} sub="novos e em separação" color="var(--err)" />
      </div>
      <StatusChips current={status} counts={counts} map={ORDER_STATUS} />
      <Card className="overflow-x-auto">
        {orders.length ? (
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Pedido</th>
                <th className="px-4 py-3 font-normal">Cliente</th>
                <th className="px-4 py-3 font-normal">Itens</th>
                <th className="px-4 py-3 text-right font-normal">Único</th>
                <th className="px-4 py-3 text-right font-normal">Recorrente</th>
                <th className="px-4 py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="align-top transition hover:bg-tint">
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="font-mono text-[12px] font-medium">{code("PED", o.number)}</p>
                    <p className="text-[11px] text-muted">{dateTime(o.createdAt)}</p>
                    {o.proposal && <Link href={`/proposals/${o.proposal.id}`} className="text-[11px] text-accent-text hover:underline">{code("PROP", o.proposal.number)}</Link>}
                  </td>
                  <td className="px-4 py-3 text-fg-2">{o.client ?? "—"}</td>
                  <td className="px-4 py-3">
                    <ul className="space-y-0.5">
                      {o.items.map((i) => (
                        <li key={i.id} className="text-[13px]">{i.quantity} × {i.name} <span className="text-[11px] text-muted">· {billingLabel(i.billing, i.interval)}</span></li>
                      ))}
                    </ul>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{fmt(o.total)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{o.monthly ? `${fmt(o.monthly)}/mês` : "—"}</td>
                  <td className="px-4 py-3">
                    {can("SALES") ? (
                      <Select
                        value={o.status}
                        disabled={pending}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "CANCELED" && !confirm("Cancelar o pedido? O estoque dos itens volta automaticamente.")) return;
                          run(() => setOrderStatus(o.id, v));
                        }}
                        className="h-8 w-auto text-xs"
                      >
                        {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </Select>
                    ) : (
                      <Badge color={ORDER_STATUS[o.status]?.color} dot>{ORDER_STATUS[o.status]?.label}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={<ShoppingCart />} title="Nenhum pedido" description="Os pedidos aparecem aqui assim que um cliente aceita uma proposta." />
        )}
      </Card>
    </div>
  );
}
