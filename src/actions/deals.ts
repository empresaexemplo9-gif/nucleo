"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { runAutomations } from "@/lib/automation";
import { customFieldsOf, dateOf, fail, moneyOf, str, tagsOf } from "./helpers";
import type { ActionResult } from "@/components/use-action";

async function assertDeal(orgId: string, id: string) {
  const deal = await db.deal.findFirst({ where: { id, orgId }, include: { stage: true } });
  if (!deal) throw new Error("Negócio não encontrado");
  return deal;
}

export async function createDeal(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const title = str(fd, "title");
    if (!title) return { ok: false, error: "Informe o título" };
    const pipelineId = str(fd, "pipelineId");
    const pipeline = await db.pipeline.findFirst({
      where: { orgId: ctx.org.id, ...(pipelineId ? { id: pipelineId } : { isDefault: true }) },
      include: { stages: { where: { type: "OPEN" }, orderBy: { position: "asc" } } },
    });
    if (!pipeline || !pipeline.stages.length) return { ok: false, error: "Funil sem etapas" };
    const stageId = str(fd, "stageId") ?? pipeline.stages[0]!.id;

    // contato/empresa rápidos: permite criar pelo nome
    let contactId = str(fd, "contactId");
    let companyId = str(fd, "companyId");
    const newCompany = str(fd, "newCompany");
    const newContact = str(fd, "newContact");
    if (!companyId && newCompany) {
      companyId = (await db.company.create({ data: { orgId: ctx.org.id, name: newCompany, ownerId: ctx.user.id } })).id;
    }
    if (!contactId && newContact) {
      contactId = (
        await db.contact.create({
          data: { orgId: ctx.org.id, name: newContact, companyId, ownerId: ctx.user.id, email: str(fd, "newContactEmail"), phone: str(fd, "newContactPhone") },
        })
      ).id;
    }
    if (contactId && !companyId) {
      companyId = (await db.contact.findFirst({ where: { id: contactId, orgId: ctx.org.id } }))?.companyId ?? null;
    }

    const last = await db.deal.findFirst({ where: { stageId }, orderBy: { position: "desc" } });
    const deal = await db.deal.create({
      data: {
        orgId: ctx.org.id,
        title,
        value: moneyOf(fd, "value"),
        pipelineId: pipeline.id,
        stageId,
        contactId,
        companyId,
        ownerId: str(fd, "ownerId") ?? ctx.user.id,
        expectedClose: dateOf(fd, "expectedClose"),
        source: str(fd, "source"),
        tags: tagsOf(fd),
        customFields: customFieldsOf(fd) as object,
        position: (last?.position ?? 0) + 1000,
      },
    });
    await logEvent({ orgId: ctx.org.id, type: "DEAL_CREATED", userId: ctx.user.id, dealId: deal.id, contactId, companyId });
    await runAutomations(ctx.org.id, "DEAL_CREATED", deal.id);
    await runAutomations(ctx.org.id, "DEAL_STAGE_ENTERED", deal.id, stageId);
    revalidatePath("/", "layout");
    return { ok: true, id: deal.id, message: "Negócio criado" };
  } catch (e) {
    return fail(e);
  }
}

export async function updateDeal(id: string, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const deal = await assertDeal(ctx.org.id, id);
    const ownerId = str(fd, "ownerId");
    const prob = str(fd, "probability");
    await db.deal.update({
      where: { id },
      data: {
        title: str(fd, "title") ?? deal.title,
        value: moneyOf(fd, "value"),
        contactId: str(fd, "contactId"),
        companyId: str(fd, "companyId"),
        ownerId,
        expectedClose: dateOf(fd, "expectedClose"),
        source: str(fd, "source"),
        probability: prob ? Math.max(0, Math.min(100, Number(prob))) : null,
        tags: tagsOf(fd),
        customFields: { ...(deal.customFields as object), ...customFieldsOf(fd) },
      },
    });
    if (ownerId !== deal.ownerId) await logEvent({ orgId: ctx.org.id, type: "DEAL_OWNER", userId: ctx.user.id, dealId: id });
    else await logEvent({ orgId: ctx.org.id, type: "DEAL_UPDATED", userId: ctx.user.id, dealId: id });
    revalidatePath("/", "layout");
    return { ok: true, message: "Alterações salvas" };
  } catch (e) {
    return fail(e);
  }
}

/** Move o negócio para outra etapa e/ou posição (drag-and-drop do Kanban). */
export async function moveDeal(id: string, stageId: string, position?: number): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const deal = await assertDeal(ctx.org.id, id);
    const stage = await db.stage.findFirst({ where: { id: stageId, pipeline: { orgId: ctx.org.id } } });
    if (!stage) return { ok: false, error: "Etapa inválida" };
    const changed = stage.id !== deal.stageId;
    const status = stage.type === "WON" ? "WON" : stage.type === "LOST" ? "LOST" : "OPEN";
    await db.deal.update({
      where: { id },
      data: {
        stageId,
        pipelineId: stage.pipelineId,
        position: position ?? deal.position,
        ...(changed ? { stageChangedAt: new Date(), status, closedAt: status === "OPEN" ? null : new Date() } : {}),
      },
    });
    if (changed) {
      await logEvent({
        orgId: ctx.org.id,
        type: "DEAL_STAGE",
        userId: ctx.user.id,
        dealId: id,
        data: { from: deal.stage.name, to: stage.name },
      });
      await runAutomations(ctx.org.id, "DEAL_STAGE_ENTERED", id, stageId);
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setDealStatus(id: string, status: "WON" | "LOST" | "OPEN", lostReason?: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const deal = await assertDeal(ctx.org.id, id);
    if (status === "LOST" && ctx.settings.requireLostReason && !lostReason) return { ok: false, error: "Informe o motivo da perda" };
    let stageId = deal.stageId;
    if (status === "OPEN" && deal.stage.type !== "OPEN") {
      const first = await db.stage.findFirst({ where: { pipelineId: deal.pipelineId, type: "OPEN" }, orderBy: { position: "desc" } });
      if (first) stageId = first.id;
    } else if (status !== "OPEN") {
      const terminal = await db.stage.findFirst({ where: { pipelineId: deal.pipelineId, type: status } });
      if (terminal) stageId = terminal.id;
    }
    await db.deal.update({
      where: { id },
      data: {
        status,
        stageId,
        lostReason: status === "LOST" ? lostReason : null,
        closedAt: status === "OPEN" ? null : new Date(),
        stageChangedAt: new Date(),
      },
    });
    await logEvent({
      orgId: ctx.org.id,
      type: status === "WON" ? "DEAL_WON" : status === "LOST" ? "DEAL_LOST" : "DEAL_REOPENED",
      userId: ctx.user.id,
      dealId: id,
      data: lostReason ? { reason: lostReason } : {},
    });
    if (status === "WON") {
      await runAutomations(ctx.org.id, "DEAL_WON", id);
      if (deal.contactId) await db.contact.update({ where: { id: deal.contactId }, data: { lifecycle: "customer" } });
    }
    if (status === "LOST") await runAutomations(ctx.org.id, "DEAL_LOST", id);
    revalidatePath("/", "layout");
    return { ok: true, message: status === "WON" ? "🎉 Negócio ganho!" : status === "LOST" ? "Negócio marcado como perdido" : "Negócio reaberto" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteDeal(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    await assertDeal(ctx.org.id, id);
    await db.deal.delete({ where: { id } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Negócio excluído" };
  } catch (e) {
    return fail(e);
  }
}

export async function addDealProduct(dealId: string, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    await assertDeal(ctx.org.id, dealId);
    const productId = str(fd, "productId");
    const product = productId ? await db.product.findFirst({ where: { id: productId, orgId: ctx.org.id } }) : null;
    if (!product) return { ok: false, error: "Selecione um produto" };
    const price = str(fd, "price") ? moneyOf(fd, "price") : Number(product.price);
    await db.dealProduct.create({
      data: { dealId, productId: product.id, quantity: moneyOf(fd, "quantity") || 1, price, discount: moneyOf(fd, "discount") },
    });
    await syncDealValue(dealId);
    revalidatePath(`/deals/${dealId}`);
    return { ok: true, message: "Produto adicionado" };
  } catch (e) {
    return fail(e);
  }
}

export async function removeDealProduct(itemId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const item = await db.dealProduct.findFirst({ where: { id: itemId, deal: { orgId: ctx.org.id } } });
    if (!item) return { ok: false, error: "Item não encontrado" };
    await db.dealProduct.delete({ where: { id: itemId } });
    await syncDealValue(item.dealId);
    revalidatePath(`/deals/${item.dealId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

async function syncDealValue(dealId: string) {
  const items = await db.dealProduct.findMany({ where: { dealId } });
  const total = items.reduce((s, i) => s + Number(i.quantity) * Number(i.price) * (1 - Number(i.discount) / 100), 0);
  await db.deal.update({ where: { id: dealId }, data: { value: Math.round(total * 100) / 100 } });
}

export async function bulkDeals(ids: string[], action: "delete" | "owner" | "stage", value?: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole(action === "delete" ? "MANAGER" : "SALES");
    const where = { id: { in: ids }, orgId: ctx.org.id };
    if (action === "delete") await db.deal.deleteMany({ where });
    if (action === "owner") await db.deal.updateMany({ where, data: { ownerId: value || null } });
    if (action === "stage" && value) for (const id of ids) await moveDeal(id, value);
    revalidatePath("/", "layout");
    return { ok: true, message: `${ids.length} registro(s) atualizado(s)` };
  } catch (e) {
    return fail(e);
  }
}
