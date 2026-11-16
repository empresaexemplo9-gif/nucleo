"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hasRole, requireRole } from "@/lib/auth";
import { fail } from "./helpers";
import type { ActionResult } from "@/components/use-action";

/** Item do checklist de um negócio da empresa atual (ou erro). */
async function ownItem(orgId: string, id: string) {
  const item = await db.dealChecklistItem.findFirst({ where: { id, orgId } });
  if (!item) throw new Error("Item não encontrado");
  return item;
}

const refresh = (dealId: string) => {
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
};

/** Adiciona um item avulso ao checklist do negócio. */
export async function addChecklistItem(dealId: string, title: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const t = title.trim().slice(0, 160);
    if (!t) return { ok: false, error: "Escreva o item" };
    const deal = await db.deal.findFirst({ where: { id: dealId, orgId: ctx.org.id }, select: { id: true } });
    if (!deal) return { ok: false, error: "Negócio não encontrado" };
    const last = await db.dealChecklistItem.findFirst({ where: { dealId }, orderBy: { position: "desc" }, select: { position: true } });
    await db.dealChecklistItem.create({ data: { orgId: ctx.org.id, dealId, title: t, position: (last?.position ?? 0) + 10, createdById: ctx.user.id } });
    refresh(dealId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Marca ou desmarca um item, registrando quem concluiu e quando. */
export async function toggleChecklistItem(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const item = await ownItem(ctx.org.id, id);
    const done = !item.done;
    await db.dealChecklistItem.update({ where: { id }, data: { done, doneAt: done ? new Date() : null, doneById: done ? ctx.user.id : null } });
    refresh(item.dealId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Remove um item: quem criou o item avulso, ou gestores e acima (itens da etapa só gestores e acima). */
export async function deleteChecklistItem(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const item = await ownItem(ctx.org.id, id);
    const mine = !item.stageId && item.createdById === ctx.user.id;
    if (!mine && !hasRole(ctx, "MANAGER")) return { ok: false, error: "Itens do checklist da etapa só podem ser removidos por gestores" };
    await db.dealChecklistItem.delete({ where: { id } });
    refresh(item.dealId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
