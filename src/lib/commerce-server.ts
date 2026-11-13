import "server-only";
import { createHash, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { logEvent } from "./events";
import { managers, notify } from "./notify";
import { money } from "./format";
import { billingLabel, code, fillTemplate, INTERVALS } from "./commerce";

type Tx = Prisma.TransactionClient;

export const newToken = () => randomBytes(24).toString("base64url");
export const sha256 = (data: string | Buffer | Uint8Array) => createHash("sha256").update(data).digest("hex");

export async function nextNumber(tx: Tx, kind: "proposal" | "order" | "contract", orgId: string) {
  const agg =
    kind === "proposal"
      ? await tx.proposal.aggregate({ where: { orgId }, _max: { number: true } })
      : kind === "order"
        ? await tx.order.aggregate({ where: { orgId }, _max: { number: true } })
        : await tx.contract.aggregate({ where: { orgId }, _max: { number: true } });
  return (agg._max.number ?? 0) + 1;
}

export const MAX_FILE = 15 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** Guarda um arquivo enviado no ambiente da empresa. */
export async function storeFile(orgId: string, file: File, allowed = ALLOWED) {
  if (!file || !file.size) throw new Error("Selecione um arquivo");
  if (file.size > MAX_FILE) throw new Error("Arquivo acima de 15 MB");
  if (!allowed.includes(file.type)) throw new Error("Formato não suportado");
  const buf = Buffer.from(await file.arrayBuffer());
  if (file.type === "application/pdf" && buf.subarray(0, 5).toString() !== "%PDF-") throw new Error("O arquivo não é um PDF válido");
  return db.storedFile.create({ data: { orgId, name: file.name.slice(0, 180), mime: file.type, size: buf.length, data: buf } });
}

/** Guarda uma imagem enviada como data URL (ex.: logotipo em alta resolução). */
export async function storeDataUrl(orgId: string, name: string, dataUrl: string) {
  const m = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new Error("Imagem inválida");
  const buf = Buffer.from(m[2]!, "base64");
  if (buf.length > 6 * 1024 * 1024) throw new Error("Imagem acima de 6 MB");
  return db.storedFile.create({ data: { orgId, name, mime: m[1]!, size: buf.length, data: buf } });
}

/* ------------------------------ Proposta → pedido ------------------------------ */

export async function createOrderFromProposal(tx: Tx, proposalId: string) {
  const p = await tx.proposal.findUniqueOrThrow({ where: { id: proposalId }, include: { items: { include: { product: true } } } });
  const existing = await tx.order.findFirst({ where: { proposalId } });
  if (existing) return existing;
  const number = await nextNumber(tx, "order", p.orgId);
  const order = await tx.order.create({
    data: {
      orgId: p.orgId,
      number,
      proposalId: p.id,
      dealId: p.dealId,
      contactId: p.contactId,
      companyId: p.companyId,
      total: p.totalOnce,
      monthly: p.totalMonthly,
      items: {
        create: p.items.map((i) => {
          const t = Number(i.quantity) * Number(i.price) * (1 - Number(i.discount) / 100) + Number(i.setupFee) * Number(i.quantity);
          return { productId: i.productId, name: i.name, billing: i.billing, interval: i.interval, quantity: i.quantity, price: i.price, total: Math.round(t * 100) / 100 };
        }),
      },
    },
  });
  // baixa de estoque dos itens controlados
  for (const i of p.items) {
    if (!i.product?.trackStock) continue;
    await tx.stockMove.create({ data: { orgId: p.orgId, productId: i.product.id, quantity: -Number(i.quantity), reason: "ORDER", orderId: order.id, note: `Pedido ${code("PED", number)}` } });
    await tx.product.update({ where: { id: i.product.id }, data: { stock: { decrement: i.quantity } } });
  }
  return order;
}

/** Fluxo completo do aceite: pedido, estoque, negócio ganho, contrato e avisos. */
export async function afterAcceptance(proposalId: string) {
  const p = await db.proposal.findUniqueOrThrow({ where: { id: proposalId }, include: { org: true } });
  const order = await db.$transaction((tx) => createOrderFromProposal(tx, proposalId), { timeout: 30000, maxWait: 10000 });

  if (p.dealId) {
    const deal = await db.deal.findUnique({ where: { id: p.dealId } });
    if (deal && deal.status === "OPEN") {
      const won = await db.stage.findFirst({ where: { pipelineId: deal.pipelineId, type: "WON" } });
      await db.deal.update({ where: { id: deal.id }, data: { status: "WON", stageId: won?.id ?? deal.stageId, closedAt: new Date(), stageChangedAt: new Date() } });
      await logEvent({ orgId: p.orgId, type: "DEAL_WON", dealId: deal.id, data: { via: `Proposta ${code("PROP", p.number)}` } });
    }
    await logEvent({ orgId: p.orgId, type: "PROPOSAL_ACCEPTED", dealId: p.dealId, contactId: p.contactId, companyId: p.companyId, data: { name: code("PROP", p.number), by: p.acceptedName ?? "" } });
  }

  let contractToken: string | null = null;
  if (p.contractTemplateId) {
    const c = await contractFromTemplate(p.orgId, p.contractTemplateId, { proposalId: p.id, createdById: p.ownerId, send: true });
    contractToken = c?.signers[0]?.token ?? null;
  }

  const fmt = (v: unknown) => money(Number(v), p.org.currency, p.org.locale);
  await notify(p.orgId, [p.ownerId, ...(await managers(p.orgId))], {
    type: "PROPOSAL_ACCEPTED",
    title: `Proposta ${code("PROP", p.number)} aceita por ${p.acceptedName}`,
    body: `${p.title} · ${fmt(p.totalOnce)} único${Number(p.totalMonthly) ? ` + ${fmt(p.totalMonthly)}/mês` : ""} · pedido ${code("PED", order.number)} gerado`,
    href: `/proposals/${p.id}`,
  });
  return { order, contractToken };
}

/* ------------------------------ Contratos ------------------------------ */

export async function contractVars(orgId: string, opts: { proposalId?: string | null; contactId?: string | null; companyId?: string | null; number: number }) {
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  const p = opts.proposalId ? await db.proposal.findUnique({ where: { id: opts.proposalId }, include: { items: { orderBy: { position: "asc" } }, contact: true, company: true } }) : null;
  const contact = p?.contact ?? (opts.contactId ? await db.contact.findUnique({ where: { id: opts.contactId } }) : null);
  const company = p?.company ?? (opts.companyId ? await db.company.findUnique({ where: { id: opts.companyId } }) : null);
  const fmt = (v: unknown) => money(Number(v), org.currency, org.locale);
  const itens = p
    ? p.items
        .map((i) => {
          const per = i.billing === "RECURRING" ? `/${INTERVALS[i.interval ?? "MONTHLY"]?.short ?? "mês"}` : "";
          return `• ${Number(i.quantity)} × ${i.name} — ${fmt(i.price)}${per} (${billingLabel(i.billing, i.interval)})${Number(i.setupFee) ? ` + adesão ${fmt(i.setupFee)}` : ""}`;
        })
        .join("\n")
    : "";
  return {
    "empresa.nome": org.name,
    "cliente.nome": company?.name ?? p?.acceptedName ?? contact?.name ?? "",
    "cliente.documento": company?.document ?? p?.acceptedDoc ?? "",
    "cliente.email": p?.acceptedEmail ?? contact?.email ?? company?.email ?? "",
    "contato.nome": contact?.name ?? p?.acceptedName ?? "",
    "proposta.numero": p ? code("PROP", p.number) : "",
    "proposta.itens": itens,
    "proposta.valor_unico": p ? fmt(p.totalOnce) : "",
    "proposta.valor_mensal": p ? fmt(p.totalMonthly) : "",
    "contrato.numero": code("CTR", opts.number),
    data: new Intl.DateTimeFormat(org.locale, { day: "numeric", month: "long", year: "numeric", timeZone: org.timezone }).format(new Date()),
  } as Record<string, string>;
}

/** Cria um contrato a partir de um modelo (texto com variáveis ou PDF enviado pela empresa). */
export async function contractFromTemplate(
  orgId: string,
  templateId: string,
  opts: { proposalId?: string | null; contactId?: string | null; companyId?: string | null; dealId?: string | null; createdById?: string | null; title?: string; send?: boolean },
) {
  const t = await db.contractTemplate.findFirst({ where: { id: templateId, orgId }, include: { file: true } });
  if (!t) return null;
  const p = opts.proposalId ? await db.proposal.findUnique({ where: { id: opts.proposalId }, include: { contact: true, company: true } }) : null;
  const contactId = opts.contactId ?? p?.contactId ?? null;
  const companyId = opts.companyId ?? p?.companyId ?? null;
  return db.$transaction(
    async (tx) => {
      const number = await nextNumber(tx, "contract", orgId);
      const vars = await contractVars(orgId, { proposalId: opts.proposalId, contactId, companyId, number });
      const body = t.kind === "TEXT" ? fillTemplate(t.body ?? "", vars) : null;
      const hash = t.kind === "TEXT" ? sha256(body ?? "") : t.file ? sha256(t.file.data) : null;
      const signerName = p?.acceptedName ?? p?.contact?.name ?? vars["cliente.nome"] ?? "Contratante";
      return tx.contract.create({
        data: {
          orgId,
          number,
          title: opts.title ?? `${t.name}${vars["cliente.nome"] ? ` — ${vars["cliente.nome"]}` : ""}`,
          kind: t.kind,
          body,
          fileId: t.kind === "PDF" ? t.fileId : null,
          hash,
          templateId: t.id,
          proposalId: opts.proposalId ?? null,
          dealId: opts.dealId ?? p?.dealId ?? null,
          contactId,
          companyId,
          createdById: opts.createdById ?? null,
          status: opts.send ? "SENT" : "DRAFT",
          sentAt: opts.send ? new Date() : null,
          signers: {
            create: [{ token: newToken(), name: signerName, email: p?.acceptedEmail ?? p?.contact?.email ?? null, document: p?.acceptedDoc ?? p?.company?.document ?? null, role: "Contratante", position: 0 }],
          },
        },
        include: { signers: true },
      });
    },
    { timeout: 30000, maxWait: 10000 },
  );
}

/** Conclui o contrato quando todos assinam e avisa a equipe. */
export async function maybeCompleteContract(contractId: string) {
  const c = await db.contract.findUniqueOrThrow({ where: { id: contractId }, include: { signers: true } });
  if (c.status === "SIGNED" || c.signers.some((s) => s.status !== "SIGNED")) return false;
  await db.contract.update({ where: { id: c.id }, data: { status: "SIGNED", completedAt: new Date() } });
  await logEvent({ orgId: c.orgId, type: "CONTRACT_SIGNED", dealId: c.dealId, contactId: c.contactId, companyId: c.companyId, data: { name: code("CTR", c.number) } });
  await notify(c.orgId, [c.createdById, ...(await managers(c.orgId))], {
    type: "CONTRACT_SIGNED",
    title: `Contrato ${code("CTR", c.number)} assinado por todos`,
    body: c.title,
    href: `/contracts/${c.id}`,
  });
  return true;
}
