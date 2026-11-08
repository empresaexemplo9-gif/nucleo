"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Info, ArrowLeft, Building2, Mail, MessageCircle, Pencil, Phone, RotateCcw, ThumbsDown, ThumbsUp, Trash2, User, Package, X } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, cn, Field, Input, Modal } from "@/components/ui";
import { CustomFieldValues, InfoRow } from "@/components/custom-fields";
import { EntityPicker, TagList } from "@/components/pickers";
import { Feed, type FeedActivity, type FeedEvent, type FeedNote } from "@/components/feed";
import { DealForm } from "@/components/forms/deal-form";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { addDealProduct, deleteDeal, moveDeal, removeDealProduct, setDealStatus } from "@/actions/deals";
import { date, daysSince } from "@/lib/format";
import { LostReasonModal } from "../lost-reason-modal";

type Deal = {
  id: string;
  title: string;
  value: number;
  status: string;
  pipelineId: string;
  stageId: string;
  ownerId: string | null;
  expectedClose: string | null;
  source: string | null;
  probability: number | null;
  lostReason: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  closedAt: string | null;
  stageChangedAt: string;
  contact: { id: string; label: string; email: string | null; phone: string | null; whatsapp: string | null; position: string | null } | null;
  company: { id: string; label: string; city: string | null; website: string | null } | null;
  products: { id: string; name: string; quantity: number; price: number; discount: number }[];
};

export function DealDetail({
  deal,
  stages,
  pipelineName,
  feed,
}: {
  deal: Deal;
  stages: { id: string; name: string; color: string; type: string; probability: number }[];
  pipelineName: string;
  feed: { activities: FeedActivity[]; notes: FeedNote[]; events: FeedEvent[] };
}) {
  const { fmt, member, labels, can, settings } = useOrg();
  const router = useRouter();
  const { run, pending } = useAction();
  const [editing, setEditing] = useState(false);
  const [lost, setLost] = useState(false);
  const [addProduct, setAddProduct] = useState(false);
  const owner = member(deal.ownerId);
  const open = stages.filter((s) => s.type === "OPEN");
  const current = stages.find((s) => s.id === deal.stageId);
  const currentIdx = open.findIndex((s) => s.id === deal.stageId);
  const prob = deal.probability ?? current?.probability ?? 0;
  const editable = can("SALES");

  return (
    <div className="mx-auto max-w-[1400px] p-4 lg:p-8">
      <Link href={`/deals?pipeline=${deal.pipelineId}`} className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface hover:text-fg">
        <ArrowLeft className="size-4" /> Voltar para {pipelineName}
      </Link>
      <Card className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              deal.status === "WON"
                ? "linear-gradient(160deg, color-mix(in oklab, #16a34a 14%, transparent), transparent 55%)"
                : deal.status === "LOST"
                  ? "linear-gradient(160deg, color-mix(in oklab, #e11d48 12%, transparent), transparent 55%)"
                  : "linear-gradient(160deg, color-mix(in oklab, var(--brand) 12%, transparent), color-mix(in oklab, var(--accent) 5%, transparent) 40%, transparent 65%)",
          }}
        />
        <div className="relative p-5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {current && deal.status === "OPEN" && <Badge color={current.color} dot>{current.name}</Badge>}
                {deal.status === "WON" && <Badge color="#16a34a" dot>Ganho</Badge>}
                {deal.status === "LOST" && <Badge color="#e11d48" dot>Perdido</Badge>}
                <TagList tags={deal.tags} />
              </div>
              <h1 className="mt-2 text-2xl font-bold leading-tight">{deal.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Valor</p>
                  <p className="font-display text-xl font-bold">{fmt(deal.value)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Ponderado</p>
                  <p className="font-display text-xl font-bold text-brand">{fmt((deal.value * prob) / 100)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Probabilidade</p>
                  <p className="font-display text-xl font-bold">{prob}%</p>
                </div>
                {owner && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Responsável</p>
                    <p className="mt-0.5 flex items-center gap-1.5 font-medium">
                      <Avatar name={owner.name} color={owner.avatarColor} size={22} /> {owner.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {editable && (
              <div className="flex flex-wrap gap-2">
                {deal.status === "OPEN" ? (
                  <>
                    <Button variant="success" loading={pending} onClick={() => run(() => setDealStatus(deal.id, "WON"))}>
                      <ThumbsUp className="size-4" /> Ganho
                    </Button>
                    <Button variant="danger" onClick={() => setLost(true)}>
                      <ThumbsDown className="size-4" /> Perdido
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" loading={pending} onClick={() => run(() => setDealStatus(deal.id, "OPEN"))}>
                    <RotateCcw className="size-4" /> Reabrir
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" /> Editar
                </Button>
                {can("MANAGER") && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-9 text-muted hover:text-rose-600"
                    aria-label="Excluir"
                    onClick={() => confirm("Excluir este registro definitivamente?") && run(() => deleteDeal(deal.id), { onSuccess: () => router.push("/deals") })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* barra de etapas em setas */}
          <div className="scroll-thin mt-6 flex overflow-x-auto pb-1">
            {open.map((s, i) => {
              const reached = deal.status === "WON" || i <= currentIdx;
              const isCurrent = s.id === deal.stageId && deal.status === "OPEN";
              return (
                <button
                  key={s.id}
                  disabled={!editable || deal.status !== "OPEN"}
                  onClick={() => run(() => moveDeal(deal.id, s.id))}
                  title={`Mover para ${s.name}`}
                  className={cn(
                    "group relative h-11 min-w-28 flex-1 text-xs font-semibold transition disabled:cursor-default",
                    i === 0 ? "rounded-l-xl" : "-ml-2",
                    i === open.length - 1 && "rounded-r-xl",
                    reached ? "text-white" : "bg-surface-2 text-muted enabled:hover:bg-brand/10 enabled:hover:text-brand",
                  )}
                  style={{
                    clipPath:
                      i === open.length - 1
                        ? i === 0 ? undefined : "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)"
                        : i === 0
                          ? "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)"
                          : "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)",
                    ...(reached ? { background: deal.status === "LOST" ? "#94a3b8" : s.color } : {}),
                  }}
                >
                  <span className="flex flex-col items-center justify-center px-4 leading-tight">
                    <span className="truncate">{s.name}</span>
                    {isCurrent && <span className="text-[10px] font-medium opacity-85">há {daysSince(deal.stageChangedAt)} dia(s)</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {deal.status === "LOST" && deal.lostReason && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
              <ThumbsDown className="size-4" /> Motivo da perda: <b>{deal.lostReason}</b>
            </p>
          )}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader icon={<Info />} title="Detalhes" />
            <InfoRow label="Valor" value={fmt(deal.value)} />
            <InfoRow label="Etapa" value={current?.name} />
            <InfoRow label="Previsão" value={date(deal.expectedClose)} />
            <InfoRow label="Origem" value={deal.source} />
            <InfoRow label="Criado em" value={date(deal.createdAt)} />
            {deal.closedAt && <InfoRow label="Fechado em" value={date(deal.closedAt)} />}
            <CustomFieldValues entity="DEAL" values={deal.customFields} />
          </Card>

          <Card className="p-5">
            <CardHeader icon={<User />} title={labels.contact.singular} />
            {deal.contact ? (
              <div>
                <Link href={`/contacts/${deal.contact.id}`} className="flex items-center gap-2 font-medium hover:text-brand">
                  <Avatar name={deal.contact.label} size={36} /> <span className="leading-tight">{deal.contact.label}{deal.contact.position && <span className="block text-xs font-normal text-muted">{deal.contact.position}</span>}</span>
                </Link>
                                <div className="mt-3 grid gap-1.5 text-sm">
                  {deal.contact.email && (
                    <a href={`mailto:${deal.contact.email}`} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-fg-2 transition hover:bg-brand/10 hover:text-brand">
                      <Mail className="size-3.5" /> {deal.contact.email}
                    </a>
                  )}
                  {deal.contact.phone && (
                    <a href={`tel:${deal.contact.phone}`} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-fg-2 transition hover:bg-brand/10 hover:text-brand">
                      <Phone className="size-3.5" /> {deal.contact.phone}
                    </a>
                  )}
                  {(deal.contact.whatsapp || deal.contact.phone) && (
                    <a
                      href={`https://wa.me/${(deal.contact.whatsapp || deal.contact.phone)!.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 font-medium text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-400"
                    >
                      <MessageCircle className="size-3.5" /> Abrir WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <User className="size-4" /> Nenhum vinculado
              </p>
            )}
            {settings.modules.companies && (
              <>
                <h3 className="mb-2 mt-5 border-t border-line pt-4 text-sm font-semibold">{labels.company.singular}</h3>
                {deal.company ? (
                  <Link href={`/companies/${deal.company.id}`} className="flex items-center gap-2 text-sm font-medium hover:text-brand">
                    <Building2 className="size-4 text-muted" /> {deal.company.label}
                    {deal.company.city && <span className="text-xs font-normal text-muted">· {deal.company.city}</span>}
                  </Link>
                ) : (
                  <p className="text-sm text-muted">Nenhuma vinculada</p>
                )}
              </>
            )}
          </Card>

          {settings.modules.products && (
            <Card className="p-5">
              <CardHeader
                icon={<Package />}
                title={labels.product.plural}
                action={
                  editable && (
                    <Button size="sm" variant="soft" onClick={() => setAddProduct(true)}>
                      + Adicionar
                    </Button>
                  )
                }
              />
              {deal.products.length ? (
                <div className="divide-y divide-line">
                  {deal.products.map((p) => (
                    <div key={p.id} className="group flex items-center gap-2 py-2 text-sm">
                      <Package className="size-4 text-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{p.name}</p>
                        <p className="text-xs text-muted">
                          {p.quantity} × {fmt(p.price)}
                          {p.discount > 0 && ` · -${p.discount}%`}
                        </p>
                      </div>
                      <span className="font-medium">{fmt(p.quantity * p.price * (1 - p.discount / 100))}</span>
                      {editable && (
                        <button onClick={() => run(() => removeDealProduct(p.id))} className="text-muted opacity-0 hover:text-red-600 group-hover:opacity-100" aria-label="Remover">
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Nenhum item. Adicionar itens calcula o valor automaticamente.</p>
              )}
            </Card>
          )}
        </div>

        <Feed {...feed} link={{ deal: { id: deal.id, label: deal.title }, contact: deal.contact, company: deal.company }} />
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={`Editar ${labels.deal.singular.toLowerCase()}`} wide>
        <DealForm
          deal={{
            ...deal,
            contact: deal.contact ? { id: deal.contact.id, label: deal.contact.label } : null,
            company: deal.company ? { id: deal.company.id, label: deal.company.label } : null,
          }}
          onDone={() => setEditing(false)}
        />
      </Modal>
      <LostReasonModal dealId={lost ? deal.id : null} onClose={() => setLost(false)} onDone={() => setLost(false)} />
      <Modal open={addProduct} onClose={() => setAddProduct(false)} title="Adicionar produto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => addDealProduct(deal.id, fd), { onSuccess: () => setAddProduct(false) });
          }}
          className="space-y-3"
        >
          <Field label="Produto">
            <EntityPicker type="product" name="productId" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Quantidade">
              <Input name="quantity" defaultValue="1" inputMode="decimal" />
            </Field>
            <Field label="Preço unit." hint="Vazio = preço de tabela">
              <Input name="price" inputMode="decimal" />
            </Field>
            <Field label="Desconto %">
              <Input name="discount" defaultValue="0" inputMode="decimal" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button loading={pending}>Adicionar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
