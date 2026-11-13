"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, FileSignature, Printer, XCircle } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/toast";
import { acceptProposal, rejectProposal } from "@/actions/public";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-fg print:hidden">
      <Printer className="size-3.5" /> Salvar em PDF
    </button>
  );
}

export function AcceptPanel({
  token,
  status,
  expired,
  internal,
  acceptedName,
  acceptedAt,
  defaults,
  contractToken: initialContract,
}: {
  token: string;
  status: string;
  expired: boolean;
  internal: boolean;
  acceptedName: string | null;
  acceptedAt: string | null;
  defaults: { name: string; email: string; document: string };
  contractToken: string | null;
}) {
  const [mode, setMode] = useState<"idle" | "accept" | "reject">("idle");
  const [state, setState] = useState(status);
  const [contract, setContract] = useState(initialContract);
  const [pending, start] = useTransition();
  const toast = useToast();

  if (state === "ACCEPTED")
    return (
      <div className="space-y-3 border-t border-line pt-4 print:hidden">
        <p className="flex items-center gap-2 font-medium text-ok"><CheckCircle2 className="size-5" /> Proposta aceita</p>
        {acceptedName && <p className="text-sm text-fg-2">Por {acceptedName}{acceptedAt ? ` em ${acceptedAt}` : ""}.</p>}
        {contract && (
          <a href={`/c/${contract}`}>
            <Button className="w-full justify-between" trail={<FileSignature className="size-3.5" />}>Assinar o contrato agora</Button>
          </a>
        )}
      </div>
    );
  if (state === "REJECTED") return <p className="flex items-center gap-2 border-t border-line pt-4 text-sm text-err"><XCircle className="size-4" /> Proposta recusada.</p>;
  if (expired) return <p className="border-t border-line pt-4 text-sm text-warn">Esta proposta expirou. Fale com o consultor para receber uma versão atualizada.</p>;

  return (
    <div className="border-t border-line pt-4 print:hidden">
      {internal && <p className="mb-3 rounded-[8px] bg-surface-2 p-2 text-xs text-muted">Pré-visualização interna: o aceite deve ser feito pelo cliente.</p>}
      {mode === "idle" && (
        <div className="space-y-2">
          <Button className="w-full justify-between" trail onClick={() => setMode("accept")} disabled={internal}>Aceitar proposta</Button>
          <Button variant="ghost" className="w-full" onClick={() => setMode("reject")} disabled={internal}>Recusar</Button>
        </div>
      )}
      {mode === "accept" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await acceptProposal(token, fd);
              if (!r.ok) return toast(r.error, "error");
              toast(r.message ?? "Proposta aceita");
              setContract(r.contractToken ?? null);
              setState("ACCEPTED");
            });
          }}
          className="space-y-3"
        >
          <Field label="Nome completo *"><Input name="name" required defaultValue={defaults.name} autoComplete="name" /></Field>
          <Field label="CPF ou CNPJ"><Input name="document" defaultValue={defaults.document} inputMode="numeric" /></Field>
          <Field label="E-mail"><Input name="email" type="email" defaultValue={defaults.email} autoComplete="email" /></Field>
          <label className="flex items-start gap-2 text-xs text-fg-2">
            <input type="checkbox" name="agree" required className="mt-0.5 accent-[var(--accent)]" />
            Li e aceito os itens, valores, forma de cobrança (única e recorrente) e as condições desta proposta.
          </label>
          <Button className="w-full justify-between" trail loading={pending}>Confirmar aceite</Button>
          <button type="button" onClick={() => setMode("idle")} className="w-full text-xs text-muted hover:text-fg">Voltar</button>
        </form>
      )}
      {mode === "reject" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
            start(async () => {
              const r = await rejectProposal(token, reason);
              if (!r.ok) return toast(r.error, "error");
              toast(r.message ?? "Resposta registrada");
              setState("REJECTED");
            });
          }}
          className="space-y-3"
        >
          <Field label="Pode nos contar o motivo?"><Textarea name="reason" rows={3} placeholder="Preço, prazo, escopo…" /></Field>
          <Button variant="danger" className="w-full" loading={pending}>Recusar proposta</Button>
          <button type="button" onClick={() => setMode("idle")} className="w-full text-xs text-muted hover:text-fg">Voltar</button>
        </form>
      )}
    </div>
  );
}
