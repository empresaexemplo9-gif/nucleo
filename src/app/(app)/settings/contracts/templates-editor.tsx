"use client";
import { useState } from "react";
import { FileSignature, FileText, FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, cn, EmptyState, Field, Input, Modal, Textarea } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { deleteContractTemplate, saveContractTemplate } from "@/actions/commerce";
import { CONTRACT_VARS } from "@/lib/commerce";
import { date } from "@/lib/format";

type T = { id: string; name: string; kind: string; body: string | null; file: { id: string; name: string; size: number } | null; uses: number; updatedAt: string };

const SAMPLE = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS Nº {{contrato.numero}}

CONTRATADA: {{empresa.nome}}.
CONTRATANTE: {{cliente.nome}}, inscrito(a) sob o CPF/CNPJ {{cliente.documento}}, e-mail {{cliente.email}}.

CLÁUSULA 1ª — DO OBJETO
O presente contrato tem por objeto o fornecimento dos itens descritos na proposta {{proposta.numero}}:
{{proposta.itens}}

CLÁUSULA 2ª — DO PREÇO
Pagamento único de {{proposta.valor_unico}} e mensalidade de {{proposta.valor_mensal}}, quando houver itens recorrentes.

CLÁUSULA 3ª — DA VIGÊNCIA
Vigência de 12 (doze) meses a partir da assinatura, renovável automaticamente por iguais períodos.

CLÁUSULA 4ª — DA ASSINATURA ELETRÔNICA
As partes reconhecem a validade da assinatura eletrônica deste instrumento, com registro de evidências.

{{data}}.`;

export function TemplatesEditor({ templates }: { templates: T[] }) {
  const { run, pending } = useAction();
  const [edit, setEdit] = useState<T | "new" | null>(null);
  const cur = edit === "new" ? null : edit;
  const [kind, setKind] = useState("TEXT");
  const [fileName, setFileName] = useState("");

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Modelos de contrato</h2>
          <p className="text-sm text-muted">Os contratos da sua empresa, guardados no seu ambiente. Use texto com variáveis ou envie o PDF pronto.</p>
        </div>
        <Button onClick={() => { setKind("TEXT"); setFileName(""); setEdit("new"); }}><Plus className="size-4" /> Novo modelo</Button>
      </div>
      <div className="divide-y divide-line rounded-[10px] border border-line">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-[8px] border border-line bg-surface-2 text-accent-text">{t.kind === "PDF" ? <FileUp className="size-4" /> : <FileText className="size-4" />}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="truncate text-xs text-muted">
                {t.kind === "PDF" ? `PDF · ${t.file?.name ?? ""} · ${((t.file?.size ?? 0) / 1024 / 1024).toFixed(1)} MB` : "Texto com variáveis"} · atualizado em {date(t.updatedAt)}
              </p>
            </div>
            <Badge>{t.uses} contrato(s)</Badge>
            <div className="flex">
              {t.file && <a href={`/api/files/${t.file.id}`} target="_blank" rel="noreferrer"><Button size="icon" variant="ghost" aria-label="Abrir PDF"><FileSignature className="size-3.5" /></Button></a>}
              <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => { setKind(t.kind); setFileName(""); setEdit(t); }}><Pencil className="size-3.5" /></Button>
              <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => confirm("Excluir modelo? Contratos já gerados não são afetados.") && run(() => deleteContractTemplate(t.id))}><Trash2 className="size-3.5" /></Button>
            </div>
          </div>
        ))}
        {!templates.length && <EmptyState icon={<FileSignature />} title="Nenhum modelo" description="Cadastre o contrato padrão da empresa para gerar contratos a partir das propostas aceitas." />}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={cur ? "Editar modelo" : "Novo modelo de contrato"} wide>
        <form
          key={cur?.id ?? "new"}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("kind", kind);
            run(() => saveContractTemplate(cur?.id ?? null, fd), { onSuccess: () => setEdit(null) });
          }}
          className="space-y-4"
        >
          <Field label="Nome do modelo *"><Input name="name" required defaultValue={cur?.name} placeholder="Ex.: Contrato de assinatura SaaS" /></Field>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["TEXT", FileText, "Texto com variáveis", "Dados do cliente e da proposta preenchidos automaticamente"],
                ["PDF", FileUp, "PDF pronto", "Envie o contrato da empresa; é assinado como está"],
              ] as const
            ).map(([k, I, t, d]) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={cn("rounded-[10px] border p-3 text-left transition", kind === k ? "border-[var(--accent)] bg-tint" : "border-line hover:border-line-strong")}>
                <I className="mb-1.5 size-4 text-accent-text" />
                <p className="text-sm font-medium">{t}</p>
                <p className="text-xs text-muted">{d}</p>
              </button>
            ))}
          </div>
          {kind === "TEXT" ? (
            <>
              <Field label="Texto do contrato"><Textarea name="body" rows={16} defaultValue={cur?.body ?? SAMPLE} className="font-mono text-[12.5px]" /></Field>
              <div className="rounded-[10px] border border-line p-3">
                <p className="mb-1.5 text-xs font-medium">Variáveis disponíveis</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {CONTRACT_VARS.map(([v, l]) => (
                    <p key={v} className="text-[11px] text-muted"><code className="text-accent-text">{v}</code> — {l}</p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-line p-8 text-center transition hover:border-line-strong hover:bg-tint">
              <FileUp className="size-6 text-accent-text" />
              <span className="text-sm font-medium">{fileName || (cur?.file ? `Atual: ${cur.file.name} — clique para substituir` : "Selecionar PDF do contrato")}</span>
              <span className="text-xs text-muted">Até 15 MB · fica guardado no ambiente da sua empresa</span>
              <input type="file" name="file" accept="application/pdf" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
            </label>
          )}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button trail loading={pending}>Salvar modelo</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
