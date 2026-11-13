import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";
import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { code, CONTRACT_STATUS } from "@/lib/commerce";
import { date } from "@/lib/format";
import { Badge, Button, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { StatusChips } from "../proposals/status-chips";

export const metadata = { title: "Contratos" };

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const base = { orgId: ctx.org.id };
  const [list, counts] = await Promise.all([
    db.contract.findMany({ where: { ...base, ...(sp.status ? { status: sp.status } : {}) }, orderBy: { updatedAt: "desc" }, take: 300, include: { signers: { select: { status: true } }, company: true, contact: true } }),
    db.contract.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count._all ?? 0;
  return (
    <div className="w-full px-4 pb-16 pt-8 lg:px-8">
      <PageHeader
        eyebrow="Comercial"
        icon={<FileSignature />}
        title="Contratos"
        description="Contratos da sua empresa assinados com captura facial e assinatura na tela, com certificado de evidências."
        actions={ctx.role !== "VIEWER" && <Link href="/contracts/new"><Button trail={<Plus className="size-3.5" />}>Novo contrato</Button></Link>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={1} label="Aguardando assinaturas" value={String(c("SENT")).padStart(2, "0")} sub="links ativos" color="var(--warn)" />
        <StatCard index={2} label="Assinados" value={String(c("SIGNED")).padStart(2, "0")} sub="com certificado" color="var(--ok)" />
        <StatCard index={3} label="Rascunhos" value={String(c("DRAFT")).padStart(2, "0")} sub="não liberados" color="var(--text-mute)" />
        <StatCard index={4} label="Cancelados" value={String(c("CANCELED")).padStart(2, "0")} sub="sem validade" color="var(--err)" />
      </div>
      <StatusChips current={sp.status ?? ""} counts={Object.fromEntries(counts.map((x) => [x.status, x._count._all]))} map={CONTRACT_STATUS} />
      <Card className="overflow-x-auto">
        {list.length ? (
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Contrato</th>
                <th className="px-4 py-3 font-normal">Cliente</th>
                <th className="px-4 py-3 font-normal">Formato</th>
                <th className="px-4 py-3 font-normal">Assinaturas</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((x) => {
                const signed = x.signers.filter((s) => s.status === "SIGNED").length;
                return (
                  <tr key={x.id} className="transition hover:bg-tint">
                    <td className="px-4 py-3">
                      <Link href={`/contracts/${x.id}`} className="font-medium hover:text-accent-text">{x.title}</Link>
                      <p className="font-mono text-[10.5px] text-muted">{code("CTR", x.number)}</p>
                    </td>
                    <td className="px-4 py-3 text-fg-2">{x.company?.name ?? x.contact?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-fg-2">{x.kind === "PDF" ? "PDF enviado" : "Texto do modelo"}</td>
                    <td className="px-4 py-3">{signed}/{x.signers.length}</td>
                    <td className="px-4 py-3"><Badge color={CONTRACT_STATUS[x.status]?.color} dot>{CONTRACT_STATUS[x.status]?.label}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-2">{date(x.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={<FileSignature />} title="Nenhum contrato" description="Envie o PDF do seu contrato ou use um modelo com os dados do cliente preenchidos automaticamente." />
        )}
      </Card>
    </div>
  );
}
