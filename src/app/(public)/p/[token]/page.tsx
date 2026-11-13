import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, Package, Repeat } from "lucide-react";
import { getContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { billingLabel, code, INTERVALS, lineTotal } from "@/lib/commerce";
import { money, date, dateTime } from "@/lib/format";
import { managers, notify } from "@/lib/notify";
import { PublicBrandStyles, PublicFooter, PublicLogo } from "@/components/public-brand";
import { AcceptPanel, PrintButton } from "./accept-panel";

async function load(token: string) {
  return db.proposal.findUnique({ where: { token }, include: { org: true, items: { orderBy: { position: "asc" } }, contact: true, company: true, owner: true, contracts: { include: { signers: { orderBy: { position: "asc" }, take: 1 } } } } });
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const p = await load((await params).token);
  if (!p) return { title: "Proposta" };
  return { title: `Proposta ${code("PROP", p.number)} · ${p.org.name}`, robots: { index: false }, ...(p.org.logoUrl ? { icons: { icon: p.org.logoUrl } } : {}) };
}

export default async function PublicProposal({ params }: { params: Promise<{ token: string }> }) {
  const p = await load((await params).token);
  if (!p) notFound();
  const ctx = await getContext();
  const internal = ctx?.org.id === p.orgId;
  // primeira visualização do cliente
  if (!internal && p.status === "SENT") {
    await db.proposal.update({ where: { id: p.id }, data: { status: "VIEWED", viewedAt: new Date() } });
    await notify(p.orgId, [p.ownerId, ...(await managers(p.orgId))], { type: "PROPOSAL_VIEWED", title: `Proposta ${code("PROP", p.number)} aberta pelo cliente`, body: p.title, href: `/proposals/${p.id}` });
  }
  const fmt = (v: unknown) => money(Number(v), p.org.currency, p.org.locale);
  const per = (i: { billing: string; interval: string | null }) => (i.billing === "RECURRING" ? `/${INTERVALS[i.interval ?? "MONTHLY"]?.short}` : "");
  const once = p.items.filter((i) => i.billing !== "RECURRING");
  const rec = p.items.filter((i) => i.billing === "RECURRING");
  const expired = !!p.validUntil && p.validUntil < new Date() && p.status !== "ACCEPTED";
  const client = p.company?.name ?? p.contact?.name;
  const contractToken = p.contracts.find((c) => c.status === "SENT")?.signers[0]?.status === "PENDING" ? p.contracts.find((c) => c.status === "SENT")!.signers[0]!.token : null;

  const section = (title: string, icon: React.ReactNode, items: typeof p.items) =>
    items.length ? (
      <section className="mt-8">
        <h2 className="mono-label mb-3 flex items-center gap-2 text-[11px] text-muted [&>svg]:size-3.5">{icon} {title}</h2>
        <div className="space-y-3">
          {items.map((i) => (
            <article key={i.id} className="card-drap break-inside-avoid p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-medium tracking-[-0.02em]">{i.name}</h3>
                  <span className="mt-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-[11px] text-fg-2">
                    <span className="size-1.5 rounded-full" style={{ background: i.billing === "RECURRING" ? "var(--accent-2)" : "var(--accent)" }} />
                    {billingLabel(i.billing, i.interval)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-medium tracking-[-0.03em]">{fmt(lineTotal({ ...i, quantity: Number(i.quantity), price: Number(i.price), discount: Number(i.discount), setupFee: Number(i.setupFee) }))}<span className="text-sm font-normal text-muted">{per(i)}</span></p>
                  <p className="text-xs text-muted">{Number(i.quantity)} × {fmt(i.price)}{per(i)}{Number(i.discount) ? ` · ${Number(i.discount)}% de desconto` : ""}</p>
                  {Number(i.setupFee) > 0 && <p className="text-xs text-muted">+ {fmt(Number(i.setupFee) * Number(i.quantity))} de adesão (única)</p>}
                </div>
              </div>
              {i.description && <p className="mt-3 text-[15px] text-fg-2">{i.description}</p>}
              {i.details && (
                <ul className="mt-3 space-y-1.5 text-sm text-fg-2">
                  {i.details.split(/\n+/).filter((l) => l.trim()).map((l, k) => (
                    <li key={k} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent-text" /><span>{l.replace(/^[-•*]\s*/, "")}</span></li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <PublicBrandStyles org={p.org} />
      <div className="h-1.5 w-full" style={{ background: "var(--grad)" }} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <PublicLogo org={p.org} height={60} />
          <div className="text-right">
            <p className="mono-label text-[10px] text-muted">Proposta comercial</p>
            <p className="font-mono text-sm">{code("PROP", p.number)}</p>
            <PrintButton />
          </div>
        </header>

        <section className="mt-10">
          {client && <p className="eyebrow mb-2">Para {client}</p>}
          <h1 className="text-[clamp(32px,5vw,58px)] font-medium leading-[1.02] tracking-[-0.045em]">{p.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-2">
            <span>Emitida em {date(p.sentAt ?? p.createdAt)}</span>
            {p.validUntil && <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" /> Válida até {date(p.validUntil)}</span>}
            {p.owner && <span>Consultor: {p.owner.name}</span>}
          </div>
          {p.intro && <p className="mt-6 max-w-3xl whitespace-pre-line text-[17px] font-light leading-relaxed text-fg-2">{p.intro}</p>}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            {section("Pagamento único", <Package />, once)}
            {section("Pagamento recorrente (assinatura)", <Repeat />, rec)}
            {p.terms && (
              <section className="mt-8 break-inside-avoid">
                <h2 className="mono-label mb-3 text-[11px] text-muted">Condições</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-fg-2">{p.terms}</p>
              </section>
            )}
          </div>
          <aside className="lg:pt-8">
            <div className="card-drap space-y-3 p-5 lg:sticky lg:top-6">
              <p className="mono-label text-[10px] text-muted">Investimento</p>
              {Number(p.discount) > 0 && <div className="flex justify-between text-sm"><span className="text-muted">Desconto</span><span>− {fmt(p.discount)}</span></div>}
              <div>
                <p className="text-sm text-muted">Pagamento único</p>
                <p className="text-3xl font-medium tracking-[-0.04em]">{fmt(p.totalOnce)}</p>
              </div>
              {Number(p.totalMonthly) > 0 && (
                <div>
                  <p className="text-sm text-muted">Recorrente</p>
                  <p className="text-3xl font-medium tracking-[-0.04em] text-accent-text">{fmt(p.totalMonthly)}<span className="text-base text-muted">/mês</span></p>
                </div>
              )}
              <AcceptPanel
                token={p.token}
                status={p.status}
                expired={expired}
                internal={internal}
                acceptedName={p.acceptedName}
                acceptedAt={p.acceptedAt ? dateTime(p.acceptedAt) : null}
                defaults={{ name: p.contact?.name ?? "", email: p.contact?.email ?? "", document: p.company?.document ?? "" }}
                contractToken={contractToken}
              />
            </div>
          </aside>
        </div>
        <PublicFooter org={p.org} />
      </main>
    </div>
  );
}
