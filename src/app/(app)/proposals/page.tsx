import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { code, PROPOSAL_STATUS } from "@/lib/commerce";
import { money, date } from "@/lib/format";
import { Badge, Button, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { StatusChips } from "./status-chips";

export const metadata = { title: "Propostas" };

const since30 = () => new Date(new Date().getTime() - 30 * 86400000);

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const scope = ctx.settings.visibility === "OWN" && ctx.role === "SALES" ? { ownerId: ctx.user.id } : {};
  const base = { orgId: ctx.org.id, ...scope };
  const fmt = (v: unknown, c = false) => money(Number(v), ctx.org.currency, ctx.org.locale, c);
  const [list, counts, accepted, open] = await Promise.all([
    db.proposal.findMany({ where: { ...base, ...(sp.status ? { status: sp.status } : {}) }, orderBy: { updatedAt: "desc" }, take: 200, include: { contact: true, company: true, owner: true } }),
    db.proposal.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    db.proposal.aggregate({ where: { ...base, status: "ACCEPTED", acceptedAt: { gte: since30() } }, _sum: { totalOnce: true, totalMonthly: true }, _count: { _all: true } }),
    db.proposal.aggregate({ where: { ...base, status: { in: ["SENT", "VIEWED"] } }, _sum: { totalOnce: true, totalMonthly: true }, _count: { _all: true } }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count._all ?? 0;
  const sent = c("SENT") + c("VIEWED") + c("ACCEPTED") + c("REJECTED");
  return (
    <div className="w-full px-4 pb-16 pt-8 lg:px-8">
      <PageHeader
        eyebrow="Comercial"
        icon={<FileText />}
        title="Propostas"
        description="Monte propostas com o catálogo da empresa, envie o link com a sua marca e receba o aceite do cliente em tempo real."
        actions={
          ctx.role !== "VIEWER" && (
            <Link href="/proposals/new"><Button trail={<Plus className="size-3.5" />}>Nova proposta</Button></Link>
          )
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={1} label="Em negociação" value={String(open._count._all).padStart(2, "0")} sub={`${fmt(open._sum.totalOnce, true)} + ${fmt(open._sum.totalMonthly, true)}/mês`} color="var(--accent-2)" />
        <StatCard index={2} label="Aceitas em 30 dias" value={String(accepted._count._all).padStart(2, "0")} sub={`${fmt(accepted._sum.totalOnce, true)} + ${fmt(accepted._sum.totalMonthly, true)}/mês`} color="var(--ok)" />
        <StatCard index={3} label="Taxa de aceite" value={`${sent ? Math.round((c("ACCEPTED") / sent) * 100) : 0}%`} sub={`${c("ACCEPTED")} de ${sent} enviadas`} color="var(--warn)" />
        <StatCard index={4} label="Rascunhos" value={String(c("DRAFT")).padStart(2, "0")} sub="ainda não enviados" color="var(--text-mute)" />
      </div>
      <StatusChips current={sp.status ?? ""} counts={Object.fromEntries(counts.map((x) => [x.status, x._count._all]))} />
      <Card className="overflow-x-auto">
        {list.length ? (
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Proposta</th>
                <th className="px-4 py-3 font-normal">Cliente</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 text-right font-normal">Único</th>
                <th className="px-4 py-3 text-right font-normal">Recorrente</th>
                <th className="px-4 py-3 font-normal">Validade</th>
                <th className="px-4 py-3 font-normal">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((p) => (
                <tr key={p.id} className="transition hover:bg-tint">
                  <td className="px-4 py-3">
                    <Link href={`/proposals/${p.id}`} className="font-medium hover:text-accent-text">{p.title}</Link>
                    <p className="font-mono text-[10.5px] text-muted">{code("PROP", p.number)}</p>
                  </td>
                  <td className="px-4 py-3 text-fg-2">{p.company?.name ?? p.contact?.name ?? "—"}</td>
                  <td className="px-4 py-3"><Badge color={PROPOSAL_STATUS[p.status]?.color} dot>{PROPOSAL_STATUS[p.status]?.label ?? p.status}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{fmt(p.totalOnce)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{Number(p.totalMonthly) ? `${fmt(p.totalMonthly)}/mês` : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-fg-2">{p.validUntil ? date(p.validUntil) : "—"}</td>
                  <td className="px-4 py-3 text-fg-2">{p.owner?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={<FileText />} title="Nenhuma proposta" description="Crie a primeira proposta escolhendo itens do catálogo." />
        )}
      </Card>
    </div>
  );
}
