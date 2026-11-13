"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, Eye, FileSignature, Package, Pencil, Send, ShoppingCart, Trash2, XCircle } from "lucide-react";
import { Badge, Button, Card, CardHeader, Eyebrow, Field, Modal, Select } from "@/components/ui";
import { InfoRow } from "@/components/custom-fields";
import { ShareLink } from "@/components/share-link";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { createContract, deleteProposal, duplicateProposal, sendProposal } from "@/actions/commerce";
import { billingLabel, code, CONTRACT_STATUS, INTERVALS, lineTotal, ORDER_STATUS, PROPOSAL_STATUS } from "@/lib/commerce";
import { date, dateTime } from "@/lib/format";

type Item = { id: string; name: string; description: string | null; details: string | null; billing: string; interval: string | null; quantity: number; price: number; discount: number; setupFee: number };
type P = {
  id: string;
  number: number;
  token: string;
  title: string;
  status: string;
  intro: string | null;
  terms: string | null;
  validUntil: string | null;
  discount: number;
  totalOnce: number;
  totalMonthly: number;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  acceptedName: string | null;
  acceptedEmail: string | null;
  acceptedDoc: string | null;
  acceptedIp: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  owner: string | null;
  contact: { id: string; label: string; phone: string | null; email: string | null } | null;
  company: { id: string; label: string } | null;
  deal: { id: string; label: string } | null;
  orders: { id: string; number: number; status: string }[];
  contracts: { id: string; number: number; status: string; title: string }[];
  items: Item[];
};

export function ProposalDetail({ p, templates }: { p: P; templates: { id: string; name: string; kind: string }[] }) {
  const { fmt, org, can } = useOrg();
  const router = useRouter();
  const { run, pending } = useAction();
  const [contractOpen, setContractOpen] = useState(false);
  const st = PROPOSAL_STATUS[p.status]!;
  const per = (i: { billing: string; interval: string | null }) => (i.billing === "RECURRING" ? `/${INTERVALS[i.interval ?? "MONTHLY"]?.short}` : "");
  const steps = [
    { label: "Criada", at: p.createdAt, done: true },
    { label: "Enviada", at: p.sentAt, done: !!p.sentAt },
    { label: "Visualizada", at: p.viewedAt, done: !!p.viewedAt },
    p.status === "REJECTED" ? { label: "Recusada", at: p.rejectedAt, done: true, bad: true } : { label: "Aceita", at: p.acceptedAt, done: !!p.acceptedAt },
  ];

  return (
    <div className="w-full px-4 pb-16 pt-8 lg:px-8">
      <Link href="/proposals" className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface hover:text-fg">
        <ArrowLeft className="size-4" /> Propostas
      </Link>
      <Card grid className="relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: st.color }} />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <Eyebrow className="mb-1.5">Proposta · {code("PROP", p.number)}</Eyebrow>
            <h1 className="text-[clamp(26px,3vw,40px)] font-medium leading-[1.05] tracking-[-0.04em]">{p.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-2">
              <Badge color={st.color} dot>{st.label}</Badge>
              {p.company?.label ?? p.contact?.label}
              {p.validUntil && <span className="text-muted">· válida até {date(p.validUntil)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/p/${p.token}`} target="_blank" rel="noreferrer"><Button variant="secondary"><Eye className="size-4" /> Ver como cliente</Button></a>
            {p.status !== "ACCEPTED" && <Link href={`/proposals/${p.id}/edit`}><Button variant="secondary"><Pencil className="size-4" /> Editar</Button></Link>}
            <Button variant="secondary" onClick={() => run(() => duplicateProposal(p.id), { onSuccess: (r) => r.id && router.push(`/proposals/${r.id}`) })}><Copy className="size-4" /> Duplicar</Button>
            {can("MANAGER") && (
              <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => confirm("Excluir esta proposta?") && run(() => deleteProposal(p.id), { onSuccess: () => router.push("/proposals") })}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
        <ol className="relative mt-6 grid gap-2 sm:grid-cols-4">
          {steps.map((s) => (
            <li key={s.label} className={`rounded-[8px] border px-3 py-2 ${s.done ? "border-line bg-surface-2" : "border-dashed border-line text-muted"}`}>
              <p className="flex items-center gap-1.5 text-[13px] font-medium">
                {s.done ? ("bad" in s && s.bad ? <XCircle className="size-3.5 text-err" /> : <CheckCircle2 className="size-3.5 text-ok" />) : <span className="size-3.5 rounded-full border border-line" />}
                {s.label}
              </p>
              <p className="mt-0.5 font-mono text-[10.5px] text-muted">{s.at ? dateTime(s.at) : "—"}</p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <div className="p-5 pb-0"><CardHeader icon={<Package />} title="Itens propostos" /></div>
            <div className="divide-y divide-line">
              {p.items.map((i) => (
                <div key={i.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted">{billingLabel(i.billing, i.interval)} · {i.quantity} × {fmt(i.price)}{per(i)}{i.discount ? ` · ${i.discount}% desc.` : ""}</p>
                    {i.description && <p className="mt-1 text-sm text-fg-2">{i.description}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{fmt(lineTotal(i))}<span className="text-xs text-muted">{per(i)}</span></p>
                    {i.setupFee > 0 && <p className="text-xs text-muted">+ {fmt(i.setupFee * i.quantity)} adesão</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-1 border-t border-line bg-surface-2 px-5 py-4 text-sm">
              {p.discount > 0 && <div className="flex justify-between"><span className="text-muted">Desconto</span><span>− {fmt(p.discount)}</span></div>}
              <div className="flex justify-between text-base"><span>Total único</span><b>{fmt(p.totalOnce)}</b></div>
              {p.totalMonthly > 0 && <div className="flex justify-between text-base"><span>Recorrente (equivalente mensal)</span><b className="text-accent-text">{fmt(p.totalMonthly)}/mês</b></div>}
            </div>
          </Card>
          {p.status === "ACCEPTED" && (
            <Card className="p-5">
              <CardHeader icon={<CheckCircle2 />} title="Aceite do cliente" description="Registro com data, hora e origem" />
              <InfoRow label="Aceito por" value={p.acceptedName} />
              <InfoRow label="Documento" value={p.acceptedDoc} />
              <InfoRow label="E-mail" value={p.acceptedEmail} />
              <InfoRow label="Data e hora" value={p.acceptedAt && dateTime(p.acceptedAt)} />
              <InfoRow label="IP" value={p.acceptedIp} />
            </Card>
          )}
          {p.status === "REJECTED" && (
            <Card className="p-5">
              <CardHeader icon={<XCircle />} title="Proposta recusada" />
              <p className="text-sm text-fg-2">{p.rejectedReason || "O cliente não informou o motivo."}</p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader icon={<Send />} title="Enviar ao cliente" description="Link público com a marca, as cores e o logotipo da sua empresa" />
            {p.status === "DRAFT" ? (
              <Button className="w-full justify-between" trail loading={pending} onClick={() => run(() => sendProposal(p.id))}>Gerar link de envio</Button>
            ) : (
              <ShareLink
                path={`/p/${p.token}`}
                phone={p.contact?.phone}
                email={p.contact?.email}
                subject={`Proposta ${code("PROP", p.number)} — ${org.name}`}
                message={`Olá${p.contact ? `, ${p.contact.label.split(" ")[0]}` : ""}! Segue a proposta "${p.title}" da ${org.name}. Você pode aceitar direto pelo link:`}
              />
            )}
          </Card>
          <Card className="p-5">
            <CardHeader icon={<ShoppingCart />} title="Pedido e contrato" />
            {p.orders.map((o) => (
              <Link key={o.id} href="/orders" className="-mx-2 flex items-center justify-between rounded-[8px] px-2 py-2 text-sm hover:bg-tint">
                <span className="font-medium">Pedido {code("PED", o.number)}</span>
                <Badge color={ORDER_STATUS[o.status]?.color} dot>{ORDER_STATUS[o.status]?.label}</Badge>
              </Link>
            ))}
            {p.contracts.map((c) => (
              <Link key={c.id} href={`/contracts/${c.id}`} className="-mx-2 flex items-center justify-between gap-2 rounded-[8px] px-2 py-2 text-sm hover:bg-tint">
                <span className="truncate font-medium">{code("CTR", c.number)} · {c.title}</span>
                <Badge color={CONTRACT_STATUS[c.status]?.color} dot>{CONTRACT_STATUS[c.status]?.label}</Badge>
              </Link>
            ))}
            {!p.orders.length && <p className="text-sm text-muted">O pedido é gerado automaticamente quando o cliente aceita.</p>}
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => setContractOpen(true)}><FileSignature className="size-4" /> Gerar contrato desta proposta</Button>
          </Card>
          <Card className="p-5">
            <CardHeader title="Detalhes" />
            <InfoRow label="Responsável" value={p.owner} />
            <InfoRow label="Contato" value={p.contact && <Link className="text-accent-text hover:underline" href={`/contacts/${p.contact.id}`}>{p.contact.label}</Link>} />
            <InfoRow label="Empresa" value={p.company && <Link className="text-accent-text hover:underline" href={`/companies/${p.company.id}`}>{p.company.label}</Link>} />
            <InfoRow label="Negócio" value={p.deal && <Link className="text-accent-text hover:underline" href={`/deals/${p.deal.id}`}>{p.deal.label}</Link>} />
          </Card>
        </div>
      </div>

      <Modal open={contractOpen} onClose={() => setContractOpen(false)} title="Gerar contrato desta proposta">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("source", "TEMPLATE");
            fd.set("proposalId", p.id);
            fd.set("send", "1");
            fd.set("requireSelfie", "1");
            fd.set("signers", JSON.stringify([{ name: p.acceptedName ?? p.contact?.label ?? p.company?.label ?? "Contratante", email: p.acceptedEmail ?? p.contact?.email, document: p.acceptedDoc, role: "Contratante" }]));
            run(() => createContract(fd), { onSuccess: (r) => r.id && router.push(`/contracts/${r.id}`) });
          }}
          className="space-y-3"
        >
          <Field label="Modelo de contrato">
            <Select name="templateId" required>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          {!templates.length && <p className="text-sm text-muted">Nenhum modelo cadastrado. Crie em Configurações → Contratos ou use Contratos → Novo para enviar um PDF.</p>}
          <p className="text-xs text-muted">Os dados do cliente e dos itens são preenchidos automaticamente. Você pode adicionar outros signatários na tela do contrato.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setContractOpen(false)}>Cancelar</Button>
            <Button loading={pending} disabled={!templates.length}>Gerar e liberar para assinatura</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
