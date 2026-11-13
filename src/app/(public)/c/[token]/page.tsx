import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { code } from "@/lib/commerce";
import { dateTime } from "@/lib/format";
import { PublicBrandStyles, PublicFooter, PublicLogo } from "@/components/public-brand";
import { SignFlow } from "./sign-flow";

async function load(token: string) {
  return db.contractSigner.findUnique({ where: { token }, include: { contract: { include: { org: true, signers: { orderBy: { position: "asc" } } } } } });
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const s = await load((await params).token);
  if (!s) return { title: "Assinatura" };
  return { title: `Assinar ${code("CTR", s.contract.number)} · ${s.contract.org.name}`, robots: { index: false }, ...(s.contract.org.logoUrl ? { icons: { icon: s.contract.org.logoUrl } } : {}) };
}

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await load(token);
  if (!s) notFound();
  const c = s.contract;
  if (!s.viewedAt) await db.contractSigner.update({ where: { id: s.id }, data: { viewedAt: new Date() } });
  const blocked = c.status === "CANCELED" ? "Este contrato foi cancelado pela empresa." : c.status === "DRAFT" ? "Este contrato ainda não foi liberado para assinatura." : null;
  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <PublicBrandStyles org={c.org} />
      <div className="h-1.5 w-full" style={{ background: "var(--grad)" }} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <PublicLogo org={c.org} height={52} />
          <div className="text-right">
            <p className="mono-label text-[10px] text-muted">Assinatura eletrônica</p>
            <p className="font-mono text-sm">{code("CTR", c.number)}</p>
          </div>
        </header>
        <section className="mt-8">
          <p className="eyebrow mb-2">Olá, {s.name.split(" ")[0]}</p>
          <h1 className="text-[clamp(28px,4.4vw,50px)] font-medium leading-[1.04] tracking-[-0.045em]">{c.title}</h1>
          <p className="mt-2 text-sm text-fg-2">
            {c.org.name} enviou este documento para sua assinatura como <b>{s.role}</b>.
          </p>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="card-drap min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium"><FileText className="size-4 text-accent-text" /> Documento</span>
              {c.kind === "PDF" && <a href={`/api/public/contract/${token}/file`} target="_blank" rel="noreferrer" className="text-xs text-accent-text hover:underline">Abrir PDF em tela cheia</a>}
            </div>
            {c.kind === "PDF" ? (
              <iframe src={`/api/public/contract/${token}/file#view=FitH`} title="Contrato" className="h-[70vh] w-full bg-white" />
            ) : (
              <div className="scroll-thin max-h-[70vh] overflow-y-auto whitespace-pre-line px-6 py-5 text-[15px] leading-relaxed">{c.body}</div>
            )}
            <div className="flex items-start gap-2 border-t border-line bg-surface-2 px-4 py-3 text-[11px] text-muted">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ok" />
              <span className="break-all">Integridade do documento · SHA-256 {c.hash}</span>
            </div>
          </div>
          <aside>
            <div className="card-drap p-5 lg:sticky lg:top-6">
              {blocked ? (
                <p className="text-sm text-warn">{blocked}</p>
              ) : (
                <SignFlow
                  token={token}
                  signed={s.status === "SIGNED"}
                  signedAt={s.signedAt ? dateTime(s.signedAt) : null}
                  requireSelfie={c.requireSelfie}
                  defaults={{ name: s.name, document: s.document ?? "" }}
                  orgName={c.org.name}
                />
              )}
              <div className="mt-5 border-t border-line pt-4">
                <p className="mono-label mb-2 text-[10px] text-muted">Signatários</p>
                <ul className="space-y-1.5 text-sm">
                  {c.signers.map((x) => (
                    <li key={x.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{x.name} <span className="text-xs text-muted">· {x.role}</span></span>
                      <span className={x.status === "SIGNED" ? "text-xs font-medium text-ok" : "text-xs text-muted"}>{x.status === "SIGNED" ? "assinou" : "pendente"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
        <PublicFooter org={c.org} />
      </main>
    </div>
  );
}
