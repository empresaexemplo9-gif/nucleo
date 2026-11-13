"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, Clock, Download, Eye, FileText, Plus, Send, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Badge, Button, Card, CardHeader, Eyebrow, Field, Input, Modal, Select } from "@/components/ui";
import { ShareLink } from "@/components/share-link";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { addSigner, cancelContract, deleteContract, removeSigner, sendContract } from "@/actions/commerce";
import { code, CONTRACT_STATUS } from "@/lib/commerce";
import { dateTime } from "@/lib/format";

type Signer = {
  id: string;
  token: string;
  name: string;
  email: string | null;
  document: string | null;
  role: string;
  status: string;
  viewedAt: string | null;
  signedAt: string | null;
  signature: string | null;
  selfie: string | null;
  faceCheck: string | null;
  ip: string | null;
  geo: string | null;
  userAgent: string | null;
};
type C = {
  id: string;
  number: number;
  title: string;
  status: string;
  kind: string;
  body: string | null;
  hash: string | null;
  requireSelfie: boolean;
  file: { id: string; name: string; size: number } | null;
  template: string | null;
  proposal: { id: string; number: number } | null;
  client: string | null;
  contact: { phone: string | null; email: string | null } | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  signers: Signer[];
};

export function ContractDetail({ c }: { c: C }) {
  const { org, can } = useOrg();
  const router = useRouter();
  const { run, pending } = useAction();
  const [adding, setAdding] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const st = CONTRACT_STATUS[c.status]!;
  const open = c.status === "DRAFT" || c.status === "SENT";
  const signed = c.signers.filter((s) => s.status === "SIGNED").length;

  return (
    <div className="w-full px-4 pb-16 pt-8 lg:px-8">
      <Link href="/contracts" className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface hover:text-fg">
        <ArrowLeft className="size-4" /> Contratos
      </Link>
      <Card grid className="relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: st.color }} />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <Eyebrow className="mb-1.5">Contrato · {code("CTR", c.number)}</Eyebrow>
            <h1 className="text-[clamp(26px,3vw,40px)] font-medium leading-[1.05] tracking-[-0.04em]">{c.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-2">
              <Badge color={st.color} dot>{st.label}</Badge>
              <span>{signed}/{c.signers.length} assinaturas</span>
              {c.client && <span>· {c.client}</span>}
              {c.proposal && <Link href={`/proposals/${c.proposal.id}`} className="text-accent-text hover:underline">· {code("PROP", c.proposal.number)}</Link>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.status === "DRAFT" && <Button loading={pending} onClick={() => run(() => sendContract(c.id))}><Send className="size-4" /> Liberar para assinatura</Button>}
            <a href={`/api/contracts/${c.id}/pdf`} target="_blank" rel="noreferrer">
              <Button variant="secondary"><Download className="size-4" /> {c.status === "SIGNED" ? "PDF assinado + certificado" : "PDF com certificado parcial"}</Button>
            </a>
            {open && can("MANAGER") && <Button variant="ghost" onClick={() => confirm("Cancelar este contrato? Os links deixam de funcionar.") && run(() => cancelContract(c.id))}><Ban className="size-4" /> Cancelar</Button>}
            {c.status !== "SIGNED" && can("MANAGER") && (
              <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => confirm("Excluir este contrato?") && run(() => deleteContract(c.id), { onSuccess: () => router.push("/contracts") })}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_480px]">
        <Card className="min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
            <span className="flex items-center gap-2 text-sm font-medium"><FileText className="size-4 text-accent-text" /> {c.kind === "PDF" ? c.file?.name ?? "Documento PDF" : `Texto${c.template ? ` · modelo ${c.template}` : ""}`}</span>
            {c.file && <a href={`/api/files/${c.file.id}`} target="_blank" rel="noreferrer" className="text-xs text-accent-text hover:underline">Abrir original</a>}
          </div>
          {c.kind === "PDF" && c.file ? (
            <iframe src={`/api/files/${c.file.id}#view=FitH`} title="Contrato" className="h-[72vh] w-full bg-white" />
          ) : (
            <div className="scroll-thin max-h-[72vh] overflow-y-auto whitespace-pre-line px-6 py-5 text-[15px] leading-relaxed">{c.body}</div>
          )}
          <p className="flex items-start gap-2 border-t border-line bg-surface-2 px-5 py-3 text-[11px] text-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ok" /> <span className="break-all">SHA-256 {c.hash}</span>
          </p>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader
              icon={<UserPlus />}
              title="Signatários"
              description={c.requireSelfie ? "Selfie + assinatura na tela" : "Assinatura na tela"}
              action={open && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="size-3.5" /> Adicionar</Button>}
            />
            <div className="space-y-4">
              {c.signers.map((s) => (
                <div key={s.id} className="rounded-[12px] border border-line p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted">{s.role}{s.document ? ` · ${s.document}` : ""}{s.email ? ` · ${s.email}` : ""}</p>
                    </div>
                    {s.status === "SIGNED" ? (
                      <Badge color="var(--ok)" dot>Assinou</Badge>
                    ) : s.viewedAt ? (
                      <Badge color="var(--warn)" dot>Visualizou</Badge>
                    ) : (
                      <Badge dot>Pendente</Badge>
                    )}
                  </div>
                  {s.status === "SIGNED" ? (
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      {s.selfie && (
                        <button type="button" onClick={() => setZoom(s.selfie)} className="overflow-hidden rounded-[10px] border border-line">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.selfie} alt={`Selfie de ${s.name}`} className="size-20 object-cover" />
                        </button>
                      )}
                      {s.signature && (
                        <button type="button" onClick={() => setZoom(s.signature)} className="rounded-[10px] border border-line bg-white px-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.signature} alt={`Assinatura de ${s.name}`} className="h-20 w-auto max-w-[220px] object-contain" />
                        </button>
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5 text-[11px] text-muted">
                        <p className="flex items-center gap-1 text-fg-2"><CheckCircle2 className="size-3 text-ok" /> {s.signedAt && dateTime(s.signedAt)}</p>
                        {s.faceCheck && <p>{s.faceCheck}</p>}
                        {s.ip && <p>IP {s.ip}</p>}
                        {s.geo && <p>{s.geo}</p>}
                      </div>
                    </div>
                  ) : (
                    open && (
                      <div className="mt-3 space-y-2">
                        {c.status === "SENT" ? (
                          <ShareLink
                            path={`/c/${s.token}`}
                            email={s.email}
                            phone={s.role === "Contratante" ? c.contact?.phone : null}
                            subject={`Assinatura do contrato ${code("CTR", c.number)} — ${org.name}`}
                            message={`Olá, ${s.name.split(" ")[0]}! ${org.name} enviou o contrato "${c.title}" para sua assinatura eletrônica:`}
                          />
                        ) : (
                          <p className="text-xs text-muted">Libere o contrato para gerar o link de assinatura.</p>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-muted">
                          <span className="flex items-center gap-1"><Clock className="size-3" /> {s.viewedAt ? `Visualizado em ${dateTime(s.viewedAt)}` : "Ainda não abriu o link"}</span>
                          <button type="button" className="hover:text-err" onClick={() => confirm(`Remover ${s.name}?`) && run(() => removeSigner(c.id, s.id))}>remover</button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <CardHeader icon={<Eye />} title="Linha do tempo" />
            <ul className="space-y-1.5 text-sm">
              <li className="flex justify-between gap-2"><span className="text-muted">Criado</span><span>{dateTime(c.createdAt)}</span></li>
              <li className="flex justify-between gap-2"><span className="text-muted">Liberado</span><span>{c.sentAt ? dateTime(c.sentAt) : "—"}</span></li>
              {c.signers.filter((s) => s.signedAt).map((s) => (
                <li key={s.id} className="flex justify-between gap-2"><span className="truncate text-muted">Assinado · {s.name}</span><span>{dateTime(s.signedAt!)}</span></li>
              ))}
              <li className="flex justify-between gap-2"><span className="text-muted">Concluído</span><span>{c.completedAt ? dateTime(c.completedAt) : "—"}</span></li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Adicionar signatário">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => addSigner(c.id, { name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? ""), document: String(fd.get("document") ?? ""), role: String(fd.get("role") ?? "Contratante") }), {
              onSuccess: () => setAdding(false),
            });
          }}
          className="space-y-3"
        >
          <Field label="Nome completo *"><Input name="name" required autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail"><Input name="email" type="email" /></Field>
            <Field label="CPF/CNPJ"><Input name="document" /></Field>
          </div>
          <Field label="Papel">
            <Select name="role" defaultValue="Contratada">{["Contratante", "Contratada", "Testemunha", "Avalista", "Representante legal"].map((r) => <option key={r}>{r}</option>)}</Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button loading={pending}>Adicionar</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!zoom} onClose={() => setZoom(null)} title="Evidência">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {zoom && <img src={zoom} alt="Evidência ampliada" className="mx-auto max-h-[70vh] w-auto rounded-[10px] bg-white" />}
      </Modal>
    </div>
  );
}
