"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, FileText, FileUp, LayoutTemplate, Plus, Trash2, Users } from "lucide-react";
import { Button, Card, CardHeader, cn, Eyebrow, Field, Input, Select, Textarea } from "@/components/ui";
import { EntityPicker, type Option } from "@/components/pickers";
import { useAction } from "@/components/use-action";
import { createContract, type SignerInput } from "@/actions/commerce";
import { CONTRACT_VARS } from "@/lib/commerce";

type Prop = { id: string; label: string; signer: { name: string; email: string; document: string } };

export function NewContract({ templates, proposals, initialProposal }: { templates: { id: string; name: string; kind: string }[]; proposals: Prop[]; initialProposal: string }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [source, setSource] = useState<"TEMPLATE" | "UPLOAD" | "TEXT">(templates.length ? "TEMPLATE" : "UPLOAD");
  const [proposalId, setProposalId] = useState(initialProposal);
  const prop = proposals.find((p) => p.id === proposalId);
  const [signers, setSigners] = useState<SignerInput[]>([{ name: prop?.signer.name ?? "", email: prop?.signer.email ?? "", document: prop?.signer.document ?? "", role: "Contratante" }]);
  const [contact, setContact] = useState<Option | null>(null);
  const [company, setCompany] = useState<Option | null>(null);
  const [fileName, setFileName] = useState("");

  const upd = (i: number, patch: Partial<SignerInput>) => setSigners((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("source", source);
        fd.set("signers", JSON.stringify(signers));
        if (proposalId) fd.set("proposalId", proposalId);
        if (contact) fd.set("contactId", contact.id);
        if (company) fd.set("companyId", company.id);
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        fd.set("send", submitter?.value === "send" ? "1" : "0");
        run(() => createContract(fd), { onSuccess: (r) => r.id && router.push(`/contracts/${r.id}`) });
      }}
      className="w-full px-4 pb-16 pt-8 lg:px-8"
    >
      <Link href="/contracts" className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface hover:text-fg">
        <ArrowLeft className="size-4" /> Contratos
      </Link>
      <div className="mb-6">
        <Eyebrow className="mb-2">Comercial · Contrato</Eyebrow>
        <h1 className="text-[clamp(30px,3.6vw,48px)] font-medium leading-[1.04] tracking-[-0.04em]">Novo contrato</h1>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="min-w-0 space-y-4">
          <Card className="p-5">
            <CardHeader title="Documento" description="Use os contratos da sua própria empresa" />
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["TEMPLATE", LayoutTemplate, "Modelo da empresa", "Dados do cliente preenchidos"],
                  ["UPLOAD", FileUp, "Enviar PDF", "Contrato pronto da empresa"],
                  ["TEXT", FileText, "Escrever agora", "Texto livre com variáveis"],
                ] as const
              ).map(([k, I, t, d]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSource(k)}
                  className={cn("rounded-[10px] border p-3 text-left transition", source === k ? "border-[var(--accent)] bg-tint" : "border-line hover:border-line-strong")}
                >
                  <I className="mb-2 size-4 text-accent-text" />
                  <p className="text-sm font-medium">{t}</p>
                  <p className="text-xs text-muted">{d}</p>
                </button>
              ))}
            </div>
            <div className="grid gap-3">
              <Field label="Título" hint="Se vazio, usamos o nome do modelo ou do arquivo"><Input name="title" /></Field>
              {source === "TEMPLATE" &&
                (templates.length ? (
                  <Field label="Modelo">
                    <Select name="templateId">{templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.kind === "PDF" ? " (PDF)" : ""}</option>)}</Select>
                  </Field>
                ) : (
                  <p className="rounded-[10px] border border-dashed border-line p-4 text-sm text-muted">
                    Nenhum modelo cadastrado. <Link href="/settings/contracts" className="text-accent-text hover:underline">Cadastrar modelos</Link> ou escolha “Enviar PDF”.
                  </p>
                ))}
              {source === "UPLOAD" && (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-line p-8 text-center transition hover:border-line-strong hover:bg-tint">
                  <FileUp className="size-6 text-accent-text" />
                  <span className="text-sm font-medium">{fileName || "Selecionar o PDF do contrato"}</span>
                  <span className="text-xs text-muted">Até 15 MB · fica guardado no ambiente da sua empresa</span>
                  <input type="file" name="file" accept="application/pdf" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
                </label>
              )}
              {source === "TEXT" && (
                <>
                  <Field label="Texto do contrato"><Textarea name="body" rows={16} placeholder="CONTRATO DE PRESTAÇÃO DE SERVIÇOS…" /></Field>
                  <p className="text-xs text-muted">Variáveis: {CONTRACT_VARS.map(([v]) => v).join(" · ")}</p>
                </>
              )}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader title="Vínculos" />
            <div className="grid gap-3">
              <Field label="Proposta" hint="Preenche cliente, itens e valores no modelo">
                <Select
                  value={proposalId}
                  onChange={(e) => {
                    setProposalId(e.target.value);
                    const p = proposals.find((x) => x.id === e.target.value);
                    if (p && !signers[0]?.name) upd(0, { name: p.signer.name, email: p.signer.email, document: p.signer.document });
                  }}
                >
                  <option value="">Sem proposta</option>
                  {proposals.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Select>
              </Field>
              {!proposalId && (
                <>
                  <Field label="Contato"><EntityPicker type="contact" name="_c" onChange={setContact} placeholder="Buscar contato…" /></Field>
                  <Field label="Empresa"><EntityPicker type="company" name="_co" onChange={setCompany} placeholder="Buscar empresa…" /></Field>
                </>
              )}
            </div>
          </Card>
          <Card className="p-5">
            <CardHeader icon={<Users />} title="Signatários" description="Cada um recebe um link próprio" />
            <div className="space-y-3">
              {signers.map((s, i) => (
                <div key={i} className="space-y-2 rounded-[10px] border border-line p-3">
                  <div className="flex gap-2">
                    <Input value={s.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Nome completo" required />
                    {signers.length > 1 && <Button type="button" size="icon" variant="ghost" aria-label="Remover" onClick={() => setSigners(signers.filter((_, j) => j !== i))}><Trash2 className="size-3.5" /></Button>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={s.email ?? ""} onChange={(e) => upd(i, { email: e.target.value })} placeholder="E-mail" type="email" />
                    <Input value={s.document ?? ""} onChange={(e) => upd(i, { document: e.target.value })} placeholder="CPF/CNPJ" />
                  </div>
                  <Select value={s.role} onChange={(e) => upd(i, { role: e.target.value })}>
                    {["Contratante", "Contratada", "Testemunha", "Avalista", "Representante legal"].map((r) => <option key={r}>{r}</option>)}
                  </Select>
                </div>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={() => setSigners([...signers, { name: "", email: "", document: "", role: "Contratada" }])}><Plus className="size-4" /> Signatário</Button>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" name="requireSelfie" value="1" defaultChecked className="accent-[var(--accent)]" />
              Exigir captura facial (selfie) de cada signatário
            </label>
          </Card>
          <div className="flex flex-col gap-2">
            <Button name="action" value="send" className="justify-between" trail loading={pending}>Criar e liberar para assinatura</Button>
            <Button name="action" value="draft" variant="secondary" loading={pending}>Salvar como rascunho</Button>
          </div>
        </div>
      </div>
    </form>
  );
}
