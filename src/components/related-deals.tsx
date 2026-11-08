"use client";
import Link from "next/link";
import { KanbanSquare, Plus } from "lucide-react";
import { Badge, Button, Card, CardHeader } from "./ui";
import { useOrg } from "./org-context";
import { useQuickCreate } from "./quick-create";
import type { Option } from "./pickers";

export type RelatedDeal = { id: string; title: string; value: number; status: string; stage: string; color: string };

export function RelatedDeals({ deals, defaults }: { deals: RelatedDeal[]; defaults: { contact?: Option | null; company?: Option | null } }) {
  const { labels, fmt, can } = useOrg();
  const quick = useQuickCreate();
  const open = deals.filter((d) => d.status === "OPEN");
  const won = deals.filter((d) => d.status === "WON");
  return (
    <Card className="p-5">
      <CardHeader
        icon={<KanbanSquare />}
        title={<>{labels.deal.plural} <span className="font-normal text-muted">({deals.length})</span></>}
        action={
          can("SALES") && (
            <Button size="sm" variant="soft" onClick={() => quick("deal", defaults)}>
              <Plus className="size-3.5" /> Novo
            </Button>
          )
        }
      />
      {deals.length > 0 && (
        <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-surface-2 p-2.5">
            <p className="text-muted">Em aberto</p>
            <p className="font-display font-bold">{fmt(open.reduce((s, d) => s + d.value, 0))}</p>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-2.5">
            <p className="text-muted">Ganhos</p>
            <p className="font-display font-bold text-emerald-600">{fmt(won.reduce((s, d) => s + d.value, 0))}</p>
          </div>
        </div>
      )}
      <div className="divide-y divide-line">
        {deals.map((d) => (
          <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-brand">
            <span className="min-w-0">
              <span className="block truncate font-medium">{d.title}</span>
              <span className="text-xs text-muted">{fmt(d.value)}</span>
            </span>
            {d.status === "OPEN" ? <Badge color={d.color} dot>{d.stage}</Badge> : <Badge color={d.status === "WON" ? "#16a34a" : "#dc2626"}>{d.status === "WON" ? "Ganho" : "Perdido"}</Badge>}
          </Link>
        ))}
        {!deals.length && <p className="py-2 text-sm text-muted">Nenhum ainda.</p>}
      </div>
    </Card>
  );
}
