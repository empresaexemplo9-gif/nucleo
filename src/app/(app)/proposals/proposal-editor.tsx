"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, FileSignature, Package, Plus, Repeat, Search, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHeader, cn, Eyebrow, Field, Input, Select, Textarea } from "@/components/ui";
import { EntityPicker, type Option } from "@/components/pickers";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { saveProposal, type ProposalItemInput } from "@/actions/commerce";
import { billingLabel, INTERVALS, lineTotal, totals } from "@/lib/commerce";
import type { CatalogItem } from "@/lib/proposal-data";

export type ProposalInitial = {
  id: string;
  title: string;
  deal: Option | null;
  contact: Option | null;
  company: Option | null;
  validUntil: string | null;
  intro: string | null;
  terms: string | null;
  discount: number;
  contractTemplateId: string | null;
  items: ProposalItemInput[];
};

const DEFAULT_TERMS = "Pagamento: conforme condições acima.\nValidade da proposta: até a data indicada.\nPlanos recorrentes são cobrados no início de cada ciclo e podem ser cancelados conforme contrato.";

type Line = ProposalItemInput & { key: string; open?: boolean };
let seq = 0;
const k = () => `l${++seq}`;

export function ProposalEditor({
  catalog,
  templates,
  initial,
  defaults,
}: {
  catalog: CatalogItem[];
  templates: { id: string; name: string; kind: string }[];
  initial?: ProposalInitial;
  defaults?: { deal?: Option | null; contact?: Option | null; company?: Option | null; title?: string; validUntil?: string };
}) {
  const { fmt } = useOrg();
  const router = useRouter();
  const { run, pending } = useAction();
  const [lines, setLines] = useState<Line[]>(() => (initial?.items ?? []).map((i) => ({ ...i, key: k() })));
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [q, setQ] = useState("");
  const [deal, setDeal] = useState<Option | null>(initial?.deal ?? defaults?.deal ?? null);
  const [contact, setContact] = useState<Option | null>(initial?.contact ?? defaults?.contact ?? null);
  const [company, setCompany] = useState<Option | null>(initial?.company ?? defaults?.company ?? null);
  const t = totals(lines, discount);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return catalog.filter((p) => !s || p.name.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s));
  }, [q, catalog]);

  const add = (p: CatalogItem) =>
    setLines((ls) => [
      ...ls,
      { key: k(), productId: p.id, name: p.name, description: p.description, details: p.details, billing: p.billing, interval: p.interval, quantity: 1, price: p.price, discount: 0, setupFee: p.setupFee },
    ]);
  const upd = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const n = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;
  const per = (l: { billing: string; interval?: string | null }) => (l.billing === "RECURRING" ? `/${INTERVALS[l.interval ?? "MONTHLY"]?.short}` : "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(
          () =>
            saveProposal(initial?.id ?? null, {
              title: String(fd.get("title") ?? ""),
              dealId: deal?.id ?? null,
              contactId: contact?.id ?? null,
              companyId: company?.id ?? null,
              validUntil: String(fd.get("validUntil") ?? "") || null,
              intro: String(fd.get("intro") ?? ""),
              terms: String(fd.get("terms") ?? ""),
              discount,
              contractTemplateId: String(fd.get("contractTemplateId") ?? "") || null,
              items: lines.map((l) => ({ productId: l.productId, name: l.name, description: l.description, details: l.details, billing: l.billing, interval: l.interval, quantity: l.quantity, price: l.price, discount: l.discount, setupFee: l.setupFee })),
            }),
          { onSuccess: (r) => r.id && router.push(`/proposals/${r.id}`) },
        );
      }}
      className="w-full px-4 pb-16 pt-8 lg:px-8"
    >
      <Link href={initial ? `/proposals/${initial.id}` : "/proposals"} className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface hover:text-fg">
        <ArrowLeft className="size-4" /> {initial ? "Voltar à proposta" : "Propostas"}
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow className="mb-2">Comercial · Proposta</Eyebrow>
          <h1 className="text-[clamp(30px,3.6vw,48px)] font-medium leading-[1.04] tracking-[-0.04em]">{initial ? "Editar proposta" : "Nova proposta"}</h1>
        </div>
        <Button trail loading={pending}>Salvar proposta</Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-4">
          <Card className="p-5">
            <CardHeader title="Cliente e condições" />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Título *" className="md:col-span-2"><Input name="title" required defaultValue={initial?.title ?? defaults?.title} placeholder="Ex.: Implantação + assinatura anual" /></Field>
              <Field label="Contato"><EntityPicker type="contact" name="_contact" defaultValue={contact} onChange={setContact} placeholder="Buscar contato…" /></Field>
              <Field label="Empresa"><EntityPicker type="company" name="_company" defaultValue={company} onChange={setCompany} placeholder="Buscar empresa…" /></Field>
              <Field label="Negócio vinculado" hint="Ao aceitar, o negócio é marcado como ganho"><EntityPicker type="deal" name="_deal" defaultValue={deal} onChange={setDeal} placeholder="Buscar negócio…" /></Field>
              <Field label="Válida até"><Input type="date" name="validUntil" defaultValue={initial?.validUntil ?? defaults?.validUntil ?? ""} /></Field>
              <Field label="Apresentação" className="md:col-span-2"><Textarea name="intro" rows={3} defaultValue={initial?.intro ?? ""} placeholder="Mensagem de abertura para o cliente" /></Field>
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader icon={<Package />} title={`Itens da proposta · ${String(lines.length).padStart(2, "0")}`} description="Somente estes itens aparecem para o cliente" />
            {lines.length ? (
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={l.key} className="rounded-[10px] border border-line p-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="pt-2 font-mono text-[10.5px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                      <div className="min-w-48 flex-1">
                        <Input value={l.name} onChange={(e) => upd(l.key, { name: e.target.value })} className="font-medium" />
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <Select value={l.billing === "RECURRING" ? l.interval ?? "MONTHLY" : "ONE_TIME"} onChange={(e) => upd(l.key, e.target.value === "ONE_TIME" ? { billing: "ONE_TIME", interval: null } : { billing: "RECURRING", interval: e.target.value })} className="h-8 w-auto text-xs">
                            <option value="ONE_TIME">Pagamento único</option>
                            {Object.entries(INTERVALS).map(([k2, v]) => <option key={k2} value={k2}>Recorrente {v.label.toLowerCase()}</option>)}
                          </Select>
                          <button type="button" onClick={() => upd(l.key, { open: !l.open })} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
                            Descrição {l.open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          </button>
                        </div>
                      </div>
                      <Field label="Qtd." className="w-20"><Input inputMode="decimal" value={String(l.quantity)} onChange={(e) => upd(l.key, { quantity: n(e.target.value) })} /></Field>
                      <Field label={`Preço${per(l)}`} className="w-32"><Input inputMode="decimal" value={String(l.price)} onChange={(e) => upd(l.key, { price: n(e.target.value) })} /></Field>
                      <Field label="Desc. %" className="w-20"><Input inputMode="decimal" value={String(l.discount)} onChange={(e) => upd(l.key, { discount: n(e.target.value) })} /></Field>
                      <Field label="Adesão" className="w-28"><Input inputMode="decimal" value={String(l.setupFee)} onChange={(e) => upd(l.key, { setupFee: n(e.target.value) })} /></Field>
                      <div className="w-32 pt-6 text-right">
                        <p className="font-medium">{fmt(lineTotal(l))}<span className="text-xs text-muted">{per(l)}</span></p>
                        {l.setupFee > 0 && <p className="text-[11px] text-muted">+ {fmt(l.setupFee * l.quantity)} adesão</p>}
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="mt-5" aria-label="Remover" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Trash2 className="size-3.5" /></Button>
                    </div>
                    {l.open && (
                      <div className="mt-3 grid gap-2 pl-7">
                        <Input value={l.description ?? ""} onChange={(e) => upd(l.key, { description: e.target.value })} placeholder="Descrição curta" />
                        <Textarea rows={4} value={l.details ?? ""} onChange={(e) => upd(l.key, { details: e.target.value })} placeholder="Descrição completa (o que está incluso, benefícios…)" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-[10px] border border-dashed border-line p-6 text-center text-sm text-muted">Escolha itens do catálogo ao lado ou adicione um item avulso.</p>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => setLines((ls) => [...ls, { key: k(), productId: null, name: "Item avulso", billing: "ONE_TIME", interval: null, quantity: 1, price: 0, discount: 0, setupFee: 0, open: true }])}
            >
              <Plus className="size-4" /> Item avulso
            </Button>
          </Card>

          <Card className="p-5">
            <CardHeader icon={<FileSignature />} title="Termos e contrato" />
            <div className="grid gap-3">
              <Field label="Condições comerciais"><Textarea name="terms" rows={4} defaultValue={initial?.terms ?? DEFAULT_TERMS} /></Field>
              <Field label="Contrato para assinatura após o aceite" hint="O cliente é levado direto para assinar (selfie + assinatura na tela)">
                <Select name="contractTemplateId" defaultValue={initial?.contractTemplateId ?? ""}>
                  <option value="">Não gerar contrato automaticamente</option>
                  {templates.map((t2) => <option key={t2.id} value={t2.id}>{t2.name} {t2.kind === "PDF" ? "(PDF)" : ""}</option>)}
                </Select>
              </Field>
              {!templates.length && <p className="text-xs text-muted">Cadastre modelos em Configurações → Contratos.</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 xl:h-fit">
          <Card className="p-5">
            <CardHeader title="Resumo" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Pagamento único (com adesões)</span><b>{fmt(t.once + discount)}</b></div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Desconto no pagamento único</span>
                <Input inputMode="decimal" value={String(discount)} onChange={(e) => setDiscount(n(e.target.value))} className="h-8 w-28 text-right" />
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base"><span>Total único</span><b>{fmt(t.once)}</b></div>
              {Object.entries(t.byInterval).map(([iv, v]) => (
                <div key={iv} className="flex justify-between"><span className="text-muted">Recorrente {INTERVALS[iv]!.label.toLowerCase()}</span><b>{fmt(v)}/{INTERVALS[iv]!.short}</b></div>
              ))}
              {t.monthly > 0 && <div className="flex justify-between text-base"><span>Equivalente mensal</span><b className="text-accent-text">{fmt(t.monthly)}/mês</b></div>}
            </div>
          </Card>
          <Card className="p-5">
            <CardHeader icon={<Package />} title={`Catálogo · ${catalog.length}`} description="Todo o catálogo e a tabela de preços da empresa" />
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto ou SKU" className="pl-8" />
            </div>
            <div className="scroll-thin max-h-[52vh] space-y-1 overflow-y-auto">
              {filtered.map((p) => {
                const inUse = lines.some((l) => l.productId === p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => add(p)}
                    className={cn("flex w-full items-start gap-2 rounded-[8px] border px-2.5 py-2 text-left transition hover:border-line-strong hover:bg-tint", inUse ? "border-[var(--accent)]" : "border-transparent")}
                  >
                    <span className="mt-0.5 text-muted">{p.billing === "RECURRING" ? <Repeat className="size-3.5" /> : <Package className="size-3.5" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block truncate text-[11px] text-muted">{billingLabel(p.billing, p.interval)}{p.stock != null ? ` · estoque ${p.stock}` : ""}</span>
                    </span>
                    <span className="whitespace-nowrap text-right text-sm font-medium">
                      {fmt(p.price)}<span className="text-[11px] font-normal text-muted">{per(p)}</span>
                      {p.setupFee > 0 && <span className="block text-[10.5px] font-normal text-muted">+ {fmt(p.setupFee)} adesão</span>}
                    </span>
                    {inUse && <Badge color="var(--accent)">na proposta</Badge>}
                  </button>
                );
              })}
              {!filtered.length && <p className="py-4 text-center text-sm text-muted">Nenhum produto encontrado.</p>}
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
