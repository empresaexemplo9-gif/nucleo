"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Building2, Mail, MessageCircle, Pencil, Phone, RotateCcw, ThumbsDown, ThumbsUp, Trash2, User, Package, X } from "lucide-react";
import { Avatar, Badge, Button, Card, cn, Field, Input, Modal } from "@/components/ui";
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
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <Link href={`/deals?pipeline=${deal.pipelineId}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> {pipelineName}
      </Link>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{deal.title}</h1>
              {deal.status === "WON" && <Badge color="#16a34a">Ganho</Badge>}
              {deal.status === "LOST" && <Badge color="#dc2626">Perdido</Badge>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="text-lg font-semibold text-fg">{fmt(deal.value)}</span>
              <span>Probabilidade {prob}% · Ponderado {fmt((deal.value * prob) / 100)}</span>
              {owner && (
                <span className="flex items-center gap-1.5">
                  <Avatar name={owner.name} color={owner.avatarColor} size={20} /> {owner.name}
                </span>
              )}
            </div>
            <div className="mt-2">
              <TagList tags={deal.tags} />
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
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir"
                  onClick={() => confirm("Excluir este registro definitivamente?") && run(() => deleteDeal(deal.id), { onSuccess: () => router.push("/deals") })}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* barra de etapas */}
        <div className="mt-5 flex gap-1 overflow-x-auto">
          {open.map((s, i) => {
            const reached = deal.status === "WON" || i <= currentIdx;
            return (
              <button
                key={s.id}
                disabled={!editable || deal.status !== "OPEN"}
                onClick={() => run(() => moveDeal(deal.id, s.id))}
                title={`Mover para ${s.name}`}
                className={cn(
                  "group relative min-w-24 flex-1 py-2 text-xs font-medium transition first:rounded-l-lg last:rounded-r-lg disabled:cursor-default",
                  reached ? "text-white" : "bg-surface-2 text-muted hover:bg-brand/10 hover:text-brand",
                )}
                style={reached ? { background: deal.status === "LOST" ? "#94a3b8" : s.color } : undefined}
              >
                {s.name}
                {s.id === deal.stageId && deal.status === "OPEN" && <span className="block text-[10px] opacity-80">há {daysSince(deal.stageChangedAt)}d</span>}
              </button>
            );
          })}
        </div>
        {deal.status === "LOST" && deal.lostReason && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">Motivo da perda: {deal.lostReason}</p>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold">Detalhes</h3>
            <InfoRow label="Valor" value={fmt(deal.value)} />
            <InfoRow label="Etapa" value={current?.name} />
            <InfoRow label="Previsão" value={date(deal.expectedClose)} />
            <InfoRow label="Origem" value={deal.source} />
            <InfoRow label="Criado em" value={date(deal.createdAt)} />
            {deal.closedAt && <InfoRow label="Fechado em" value={date(deal.closedAt)} />}
            <CustomFieldValues entity="DEAL" values={deal.customFields} />
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">{labels.contact.singular}</h3>
            {deal.contact ? (
              <div>
                <Link href={`/contacts/${deal.contact.id}`} className="flex items-center gap-2 font-medium hover:text-brand">
                  <Avatar name={deal.contact.label} size={28} /> {deal.contact.label}
                </Link>
                {deal.contact.position && <p className="ml-9 text-xs text-muted">{deal.contact.position}</p>}
                <div className="ml-9 mt-2 space-y-1 text-sm">
                  {deal.contact.email && (
                    <a href={`mailto:${deal.contact.email}`} className="flex items-center gap-1.5 text-muted hover:text-brand">
                      <Mail className="size-3.5" /> {deal.contact.email}
                    </a>
                  )}
                  {deal.contact.phone && (
                    <a href={`tel:${deal.contact.phone}`} className="flex items-center gap-1.5 text-muted hover:text-brand">
                      <Phone className="size-3.5" /> {deal.contact.phone}
                    </a>
                  )}
                  {(deal.contact.whatsapp || deal.contact.phone) && (
                    <a
                      href={`https://wa.me/${(deal.contact.whatsapp || deal.contact.phone)!.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-emerald-600 hover:underline"
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
                <h3 className="mb-2 mt-4 text-sm font-semibold">{labels.company.singular}</h3>
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
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{labels.product.plural}</h3>
                {editable && (
                  <Button size="sm" variant="ghost" onClick={() => setAddProduct(true)}>
                    + Adicionar
                  </Button>
                )}
              </div>
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
