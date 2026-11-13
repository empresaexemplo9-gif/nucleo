"use server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { code, INTERVALS, totals } from "@/lib/commerce";
import { contractVars, newToken, nextNumber, sha256, storeFile } from "@/lib/commerce-server";
import { fillTemplate } from "@/lib/commerce";
import type { ActionResult } from "@/components/use-action";
import { fail, str } from "./helpers";

const ok = (message: string, id?: string): ActionResult => ({ ok: true, message, id });

/* ------------------------------ Propostas ------------------------------ */

export type ProposalItemInput = {
  productId: string | null;
  name: string;
  description?: string | null;
  details?: string | null;
  billing: string;
  interval?: string | null;
  quantity: number;
  price: number;
  discount: number;
  setupFee: number;
};
export type ProposalInput = {
  title: string;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  validUntil?: string | null;
  intro?: string | null;
  terms?: string | null;
  discount?: number;
  contractTemplateId?: string | null;
  items: ProposalItemInput[];
};

async function belongs(orgId: string, input: ProposalInput) {
  const [deal, contact, company, tpl] = await Promise.all([
    input.dealId ? db.deal.findFirst({ where: { id: input.dealId, orgId }, select: { id: true, contactId: true, companyId: true } }) : null,
    input.contactId ? db.contact.findFirst({ where: { id: input.contactId, orgId }, select: { id: true } }) : null,
    input.companyId ? db.company.findFirst({ where: { id: input.companyId, orgId }, select: { id: true } }) : null,
    input.contractTemplateId ? db.contractTemplate.findFirst({ where: { id: input.contractTemplateId, orgId }, select: { id: true } }) : null,
  ]);
  return {
    dealId: deal?.id ?? null,
    contactId: contact?.id ?? deal?.contactId ?? null,
    companyId: company?.id ?? deal?.companyId ?? null,
    contractTemplateId: tpl?.id ?? null,
  };
}

function cleanItems(items: ProposalItemInput[]) {
  return items
    .filter((i) => i.name?.trim())
    .slice(0, 100)
    .map((i, position) => ({
      productId: i.productId || null,
      name: i.name.trim().slice(0, 200),
      description: i.description?.trim() || null,
      details: i.details?.trim() || null,
      billing: i.billing === "RECURRING" ? "RECURRING" : "ONE_TIME",
      interval: i.billing === "RECURRING" ? (i.interval && INTERVALS[i.interval] ? i.interval : "MONTHLY") : null,
      quantity: Math.max(0.01, Number(i.quantity) || 1),
      price: Math.max(0, Number(i.price) || 0),
      discount: Math.min(100, Math.max(0, Number(i.discount) || 0)),
      setupFee: Math.max(0, Number(i.setupFee) || 0),
      position,
    }));
}

export async function saveProposal(id: string | null, input: ProposalInput): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    if (!input.title?.trim()) return { ok: false, error: "Informe o título da proposta" };
    const items = cleanItems(input.items ?? []);
    if (!items.length) return { ok: false, error: "Adicione ao menos um item" };
    const products = await db.product.findMany({ where: { orgId: ctx.org.id, id: { in: items.map((i) => i.productId).filter((x): x is string => !!x) } }, select: { id: true } });
    for (const i of items) if (i.productId && !products.some((p) => p.id === i.productId)) i.productId = null;
    const discount = Math.max(0, Number(input.discount) || 0);
    const t = totals(items, discount);
    const rel = await belongs(ctx.org.id, input);
    const data = {
      title: input.title.trim().slice(0, 200),
      ...rel,
      validUntil: input.validUntil ? new Date(`${input.validUntil}T23:59:00`) : null,
      intro: input.intro?.trim() || null,
      terms: input.terms?.trim() || null,
      discount,
      totalOnce: t.once,
      totalMonthly: t.monthly,
    };
    if (id) {
      const p = await db.proposal.findFirst({ where: { id, orgId: ctx.org.id } });
      if (!p) return { ok: false, error: "Proposta não encontrada" };
      if (p.status === "ACCEPTED") return { ok: false, error: "Propostas aceitas não podem ser alteradas — duplique para criar uma nova versão" };
      await db.$transaction([db.proposalItem.deleteMany({ where: { proposalId: id } }), db.proposal.update({ where: { id }, data: { ...data, items: { create: items } } })]);
      revalidatePath(`/proposals/${id}`);
      return ok("Proposta salva", id);
    }
    const created = await db.$transaction(async (tx) => {
      const number = await nextNumber(tx, "proposal", ctx.org.id);
      return tx.proposal.create({ data: { ...data, orgId: ctx.org.id, number, token: newToken(), ownerId: ctx.user.id, items: { create: items } } });
    });
    revalidatePath("/proposals");
    return ok("Proposta criada", created.id);
  } catch (e) {
    return fail(e);
  }
}

export async function sendProposal(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const p = await db.proposal.findFirst({ where: { id, orgId: ctx.org.id } });
    if (!p) return { ok: false, error: "Proposta não encontrada" };
    if (p.status === "DRAFT") {
      await db.proposal.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
      await logEvent({ orgId: ctx.org.id, type: "PROPOSAL_SENT", userId: ctx.user.id, dealId: p.dealId, contactId: p.contactId, companyId: p.companyId, data: { name: code("PROP", p.number) } });
    }
    revalidatePath(`/proposals/${id}`);
    return ok("Link da proposta pronto para enviar");
  } catch (e) {
    return fail(e);
  }
}

export async function duplicateProposal(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const p = await db.proposal.findFirst({ where: { id, orgId: ctx.org.id }, include: { items: true } });
    if (!p) return { ok: false, error: "Proposta não encontrada" };
    const created = await db.$transaction(async (tx) => {
      const number = await nextNumber(tx, "proposal", ctx.org.id);
      return tx.proposal.create({
        data: {
          orgId: ctx.org.id,
          number,
          token: newToken(),
          ownerId: ctx.user.id,
          title: `${p.title} (v2)`,
          dealId: p.dealId,
          contactId: p.contactId,
          companyId: p.companyId,
          intro: p.intro,
          terms: p.terms,
          discount: p.discount,
          totalOnce: p.totalOnce,
          totalMonthly: p.totalMonthly,
          contractTemplateId: p.contractTemplateId,
          items: { create: p.items.map((i) => ({ productId: i.productId, name: i.name, description: i.description, details: i.details, billing: i.billing, interval: i.interval, quantity: i.quantity, price: i.price, discount: i.discount, setupFee: i.setupFee, position: i.position })) },
        },
      });
    });
    return ok("Proposta duplicada", created.id);
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProposal(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    await db.proposal.deleteMany({ where: { id, orgId: ctx.org.id } });
    revalidatePath("/proposals");
    return ok("Proposta excluída");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Pedidos e estoque ------------------------------ */

export async function setOrderStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    if (!["NEW", "PROCESSING", "FULFILLED", "CANCELED"].includes(status)) return { ok: false, error: "Status inválido" };
    const o = await db.order.findFirst({ where: { id, orgId: ctx.org.id }, include: { stockMoves: true } });
    if (!o) return { ok: false, error: "Pedido não encontrado" };
    await db.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { status } });
      // cancelamento devolve o estoque; reativação baixa novamente
      const net = new Map<string, number>();
      for (const m of o.stockMoves) net.set(m.productId, (net.get(m.productId) ?? 0) + Number(m.quantity));
      for (const [productId, q] of net) {
        const back = status === "CANCELED" ? -q : o.status === "CANCELED" ? -q : 0;
        if (!back) continue;
        await tx.stockMove.create({ data: { orgId: ctx.org.id, productId, quantity: back, reason: status === "CANCELED" ? "CANCEL" : "ORDER", orderId: id, userId: ctx.user.id, note: `Pedido ${code("PED", o.number)}` } });
        await tx.product.update({ where: { id: productId }, data: { stock: { increment: back } } });
      }
    });
    revalidatePath("/orders");
    return ok("Pedido atualizado");
  } catch (e) {
    return fail(e);
  }
}

export async function moveStock(productId: string, quantity: number, reason: "PURCHASE" | "ADJUST", note?: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    const q = Number(quantity);
    if (!Number.isFinite(q) || q === 0) return { ok: false, error: "Informe a quantidade" };
    const p = await db.product.findFirst({ where: { id: productId, orgId: ctx.org.id } });
    if (!p) return { ok: false, error: "Produto não encontrado" };
    await db.$transaction([
      db.stockMove.create({ data: { orgId: ctx.org.id, productId, quantity: q, reason, note: note?.slice(0, 200) || null, userId: ctx.user.id } }),
      db.product.update({ where: { id: productId }, data: { stock: { increment: q }, trackStock: true } }),
    ]);
    revalidatePath("/products");
    return ok(reason === "PURCHASE" ? "Entrada de estoque registrada" : "Estoque ajustado");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Modelos de contrato ------------------------------ */

export async function saveContractTemplate(id: string | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const name = str(fd, "name");
    if (!name) return { ok: false, error: "Informe o nome do modelo" };
    const kind = str(fd, "kind") === "PDF" ? "PDF" : "TEXT";
    const body = str(fd, "body");
    const file = fd.get("file");
    const current = id ? await db.contractTemplate.findFirst({ where: { id, orgId: ctx.org.id } }) : null;
    if (id && !current) return { ok: false, error: "Modelo não encontrado" };
    let fileId = current?.fileId ?? null;
    if (kind === "PDF" && file instanceof File && file.size) fileId = (await storeFile(ctx.org.id, file, ["application/pdf"])).id;
    if (kind === "PDF" && !fileId) return { ok: false, error: "Envie o arquivo PDF do contrato" };
    if (kind === "TEXT" && !body) return { ok: false, error: "Escreva o texto do contrato" };
    const data = { name, kind, body: kind === "TEXT" ? body : null, fileId: kind === "PDF" ? fileId : null };
    const t = id ? await db.contractTemplate.update({ where: { id }, data }) : await db.contractTemplate.create({ data: { ...data, orgId: ctx.org.id } });
    revalidatePath("/settings/contracts");
    return ok("Modelo salvo", t.id);
  } catch (e) {
    return fail(e);
  }
}

export async function deleteContractTemplate(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    await db.contractTemplate.deleteMany({ where: { id, orgId: ctx.org.id } });
    revalidatePath("/settings/contracts");
    return ok("Modelo excluído");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Contratos ------------------------------ */

export type SignerInput = { name: string; email?: string | null; document?: string | null; role: string };

/** Cria contrato: de um modelo, de um PDF enviado agora ou de um texto livre. */
export async function createContract(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const orgId = ctx.org.id;
    const source = str(fd, "source") ?? "TEMPLATE";
    const signers = (JSON.parse(String(fd.get("signers") ?? "[]")) as SignerInput[]).filter((s) => s.name?.trim()).slice(0, 10);
    if (!signers.length) return { ok: false, error: "Adicione ao menos um signatário" };
    const proposalId = str(fd, "proposalId");
    const proposal = proposalId ? await db.proposal.findFirst({ where: { id: proposalId, orgId } }) : null;
    const contactId = str(fd, "contactId") ?? proposal?.contactId ?? null;
    const companyId = str(fd, "companyId") ?? proposal?.companyId ?? null;
    const dealId = str(fd, "dealId") ?? proposal?.dealId ?? null;
    if (contactId && !(await db.contact.findFirst({ where: { id: contactId, orgId } }))) return { ok: false, error: "Contato inválido" };
    if (companyId && !(await db.company.findFirst({ where: { id: companyId, orgId } }))) return { ok: false, error: "Empresa inválida" };
    if (dealId && !(await db.deal.findFirst({ where: { id: dealId, orgId } }))) return { ok: false, error: "Negócio inválido" };

    let kind = "TEXT";
    let body: string | null = null;
    let fileId: string | null = null;
    let hash: string | null = null;
    let templateId: string | null = null;
    let title = str(fd, "title");

    const number = (await db.contract.aggregate({ where: { orgId }, _max: { number: true } }))._max.number! + 1 || 1;
    const vars = await contractVars(orgId, { proposalId: proposal?.id, contactId, companyId, number });

    if (source === "TEMPLATE") {
      const t = await db.contractTemplate.findFirst({ where: { id: str(fd, "templateId") ?? "", orgId }, include: { file: true } });
      if (!t) return { ok: false, error: "Selecione um modelo de contrato" };
      templateId = t.id;
      kind = t.kind;
      title ??= `${t.name}${vars["cliente.nome"] ? ` — ${vars["cliente.nome"]}` : ""}`;
      if (t.kind === "TEXT") body = fillTemplate(t.body ?? "", vars);
      else {
        fileId = t.fileId;
        hash = t.file ? sha256(t.file.data) : null;
      }
    } else if (source === "UPLOAD") {
      const file = fd.get("file");
      if (!(file instanceof File) || !file.size) return { ok: false, error: "Envie o PDF do contrato" };
      const f = await storeFile(orgId, file, ["application/pdf"]);
      kind = "PDF";
      fileId = f.id;
      hash = sha256(f.data);
      title ??= file.name.replace(/\.pdf$/i, "");
    } else {
      body = fillTemplate(str(fd, "body") ?? "", vars);
      if (!body.trim()) return { ok: false, error: "Escreva o texto do contrato" };
    }
    if (kind === "TEXT") hash = sha256(body ?? "");
    if (!title) return { ok: false, error: "Informe o título do contrato" };
    const send = fd.get("send") === "1";

    const c = await db.$transaction(async (tx) => {
      const n = await nextNumber(tx, "contract", orgId);
      return tx.contract.create({
        data: {
          orgId,
          number: n,
          title: title!.slice(0, 200),
          kind,
          body,
          fileId,
          hash,
          templateId,
          proposalId: proposal?.id ?? null,
          dealId,
          contactId,
          companyId,
          requireSelfie: fd.get("requireSelfie") === "1",
          createdById: ctx.user.id,
          status: send ? "SENT" : "DRAFT",
          sentAt: send ? new Date() : null,
          signers: {
            create: signers.map((s, position) => ({
              token: newToken(),
              name: s.name.trim().slice(0, 120),
              email: s.email?.trim() || null,
              document: s.document?.trim() || null,
              role: s.role?.trim() || "Contratante",
              position,
            })),
          },
        },
      });
    });
    if (send) await logEvent({ orgId, type: "CONTRACT_SENT", userId: ctx.user.id, dealId, contactId, companyId, data: { name: code("CTR", c.number) } });
    revalidatePath("/contracts");
    return ok(send ? "Contrato criado e liberado para assinatura" : "Contrato criado como rascunho", c.id);
  } catch (e) {
    return fail(e);
  }
}

export async function sendContract(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const c = await db.contract.findFirst({ where: { id, orgId: ctx.org.id } });
    if (!c) return { ok: false, error: "Contrato não encontrado" };
    if (c.status !== "DRAFT") return ok("Contrato já liberado");
    await db.contract.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
    await logEvent({ orgId: ctx.org.id, type: "CONTRACT_SENT", userId: ctx.user.id, dealId: c.dealId, contactId: c.contactId, companyId: c.companyId, data: { name: code("CTR", c.number) } });
    revalidatePath(`/contracts/${id}`);
    return ok("Contrato liberado para assinatura");
  } catch (e) {
    return fail(e);
  }
}

export async function addSigner(contractId: string, s: SignerInput): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const c = await db.contract.findFirst({ where: { id: contractId, orgId: ctx.org.id }, include: { signers: true } });
    if (!c) return { ok: false, error: "Contrato não encontrado" };
    if (c.status === "SIGNED" || c.status === "CANCELED") return { ok: false, error: "Contrato encerrado" };
    if (!s.name?.trim()) return { ok: false, error: "Informe o nome" };
    await db.contractSigner.create({ data: { contractId, token: newToken(), name: s.name.trim(), email: s.email || null, document: s.document || null, role: s.role || "Contratante", position: c.signers.length } });
    revalidatePath(`/contracts/${contractId}`);
    return ok("Signatário adicionado");
  } catch (e) {
    return fail(e);
  }
}

export async function removeSigner(contractId: string, signerId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const c = await db.contract.findFirst({ where: { id: contractId, orgId: ctx.org.id } });
    if (!c) return { ok: false, error: "Contrato não encontrado" };
    await db.contractSigner.deleteMany({ where: { id: signerId, contractId, status: "PENDING" } });
    revalidatePath(`/contracts/${contractId}`);
    return ok("Signatário removido");
  } catch (e) {
    return fail(e);
  }
}

export async function cancelContract(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    await db.contract.updateMany({ where: { id, orgId: ctx.org.id, status: { not: "SIGNED" } }, data: { status: "CANCELED" } });
    revalidatePath(`/contracts/${id}`);
    return ok("Contrato cancelado");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteContract(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    const c = await db.contract.findFirst({ where: { id, orgId: ctx.org.id } });
    if (c?.status === "SIGNED") return { ok: false, error: "Contratos assinados não podem ser excluídos" };
    await db.contract.deleteMany({ where: { id, orgId: ctx.org.id } });
    revalidatePath("/contracts");
    return ok("Contrato excluído");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Notificações ------------------------------ */

export async function markNotificationsRead(ids?: string[]): Promise<ActionResult> {
  try {
    const ctx = await requireRole("VIEWER");
    const where: Prisma.NotificationWhereInput = { userId: ctx.user.id, orgId: ctx.org.id, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) };
    await db.notification.updateMany({ where, data: { readAt: new Date() } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
