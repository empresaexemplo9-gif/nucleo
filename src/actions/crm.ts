"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { customFieldsOf, dateOf, fail, moneyOf, numOr, str, tagsOf } from "./helpers";
import type { ActionResult } from "@/components/use-action";
import type { ActivityType } from "@prisma/client";

/** Garante que o registro de módulo pertence à empresa. */
async function orgRecordId(orgId: string, id: string | null) {
  if (!id) return null;
  const r = await db.moduleRecord.findFirst({ where: { id, orgId }, select: { id: true } });
  return r?.id ?? null;
}

/* ---------------------------- CONTATOS ---------------------------- */

function contactData(fd: FormData) {
  return {
    name: str(fd, "name") ?? "",
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    whatsapp: str(fd, "whatsapp"),
    position: str(fd, "position"),
    companyId: str(fd, "companyId"),
    ownerId: str(fd, "ownerId"),
    source: str(fd, "source"),
    lifecycle: str(fd, "lifecycle") ?? "lead",
    birthday: dateOf(fd, "birthday"),
    tags: tagsOf(fd),
  };
}

export async function saveContact(id: string | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const data = contactData(fd);
    if (!data.name) return { ok: false, error: "Informe o nome" };
    const newCompany = str(fd, "newCompany");
    if (!data.companyId && newCompany) {
      data.companyId = (await db.company.create({ data: { orgId: ctx.org.id, name: newCompany, ownerId: ctx.user.id } })).id;
    }
    if (id) {
      const existing = await db.contact.findFirst({ where: { id, orgId: ctx.org.id } });
      if (!existing) return { ok: false, error: "Contato não encontrado" };
      await db.contact.update({
        where: { id },
        data: { ...data, customFields: { ...(existing.customFields as object), ...customFieldsOf(fd) } },
      });
      revalidatePath("/", "layout");
      return { ok: true, id, message: "Contato atualizado" };
    }
    const c = await db.contact.create({
      data: { ...data, ownerId: data.ownerId ?? ctx.user.id, orgId: ctx.org.id, customFields: customFieldsOf(fd) as object },
    });
    await logEvent({ orgId: ctx.org.id, type: "CONTACT_CREATED", userId: ctx.user.id, contactId: c.id });
    revalidatePath("/", "layout");
    return { ok: true, id: c.id, message: "Contato criado" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteContacts(ids: string[]): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    await db.contact.deleteMany({ where: { id: { in: ids }, orgId: ctx.org.id } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Excluído com sucesso" };
  } catch (e) {
    return fail(e);
  }
}

/** Importação de contatos via CSV (colunas: nome, email, telefone, cargo, empresa, origem, etiquetas). */
export async function importContacts(rows: Record<string, string>[]): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const pick = (r: Record<string, string>, ...keys: string[]) => {
      for (const k of Object.keys(r)) if (keys.includes(k.trim().toLowerCase())) return r[k]?.trim() || null;
      return null;
    };
    const companyCache = new Map<string, string>();
    let count = 0;
    for (const r of rows.slice(0, 5000)) {
      const name = pick(r, "nome", "name", "contato");
      if (!name) continue;
      let companyId: string | null = null;
      const companyName = pick(r, "empresa", "company", "organização", "organizacao");
      if (companyName) {
        const key = companyName.toLowerCase();
        if (!companyCache.has(key)) {
          const found =
            (await db.company.findFirst({ where: { orgId: ctx.org.id, name: { equals: companyName, mode: "insensitive" } } })) ??
            (await db.company.create({ data: { orgId: ctx.org.id, name: companyName, ownerId: ctx.user.id } }));
          companyCache.set(key, found.id);
        }
        companyId = companyCache.get(key)!;
      }
      await db.contact.create({
        data: {
          orgId: ctx.org.id,
          name,
          email: pick(r, "email", "e-mail"),
          phone: pick(r, "telefone", "phone", "celular"),
          whatsapp: pick(r, "whatsapp"),
          position: pick(r, "cargo", "position", "title"),
          source: pick(r, "origem", "source"),
          tags: (pick(r, "etiquetas", "tags") ?? "").split(/[;,]/).map((s) => s.trim()).filter(Boolean),
          companyId,
          ownerId: ctx.user.id,
        },
      });
      count++;
    }
    revalidatePath("/", "layout");
    return { ok: true, message: `${count} contato(s) importado(s)` };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------------------- EMPRESAS ---------------------------- */

export async function saveCompany(id: string | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const data = {
      name: str(fd, "name") ?? "",
      document: str(fd, "document"),
      domain: str(fd, "domain"),
      industry: str(fd, "industry"),
      size: str(fd, "size"),
      phone: str(fd, "phone"),
      email: str(fd, "email"),
      website: str(fd, "website"),
      address: str(fd, "address"),
      city: str(fd, "city"),
      state: str(fd, "state"),
      country: str(fd, "country"),
      ownerId: str(fd, "ownerId"),
      tags: tagsOf(fd),
    };
    if (!data.name) return { ok: false, error: "Informe o nome" };
    if (id) {
      const existing = await db.company.findFirst({ where: { id, orgId: ctx.org.id } });
      if (!existing) return { ok: false, error: "Empresa não encontrada" };
      await db.company.update({ where: { id }, data: { ...data, customFields: { ...(existing.customFields as object), ...customFieldsOf(fd) } } });
      revalidatePath("/", "layout");
      return { ok: true, id, message: "Empresa atualizada" };
    }
    const c = await db.company.create({
      data: { ...data, ownerId: data.ownerId ?? ctx.user.id, orgId: ctx.org.id, customFields: customFieldsOf(fd) as object },
    });
    await logEvent({ orgId: ctx.org.id, type: "COMPANY_CREATED", userId: ctx.user.id, companyId: c.id });
    revalidatePath("/", "layout");
    return { ok: true, id: c.id, message: "Empresa criada" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCompanies(ids: string[]): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    await db.company.deleteMany({ where: { id: { in: ids }, orgId: ctx.org.id } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Excluído com sucesso" };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------------------- ATIVIDADES ---------------------------- */

export async function saveActivity(id: string | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const title = str(fd, "title");
    if (!title) return { ok: false, error: "Informe o assunto" };
    const data = {
      title,
      type: (str(fd, "type") ?? "TASK") as ActivityType,
      description: str(fd, "description"),
      dueAt: dateOf(fd, "dueAt"),
      duration: str(fd, "duration") ? numOr(fd, "duration") : null,
      assigneeId: str(fd, "assigneeId") ?? ctx.user.id,
      dealId: str(fd, "dealId"),
      contactId: str(fd, "contactId"),
      companyId: str(fd, "companyId"),
      ...(fd.has("recordId") ? { recordId: await orgRecordId(ctx.org.id, str(fd, "recordId")) } : {}),
    };
    // herda contato/empresa do negócio
    if (data.dealId && (!data.contactId || !data.companyId)) {
      const deal = await db.deal.findFirst({ where: { id: data.dealId, orgId: ctx.org.id } });
      data.contactId ??= deal?.contactId ?? null;
      data.companyId ??= deal?.companyId ?? null;
    }
    if (id) {
      const ex = await db.activity.findFirst({ where: { id, orgId: ctx.org.id } });
      if (!ex) return { ok: false, error: "Atividade não encontrada" };
      await db.activity.update({ where: { id }, data });
    } else {
      await db.activity.create({ data: { ...data, orgId: ctx.org.id, createdById: ctx.user.id } });
    }
    revalidatePath("/", "layout");
    return { ok: true, message: id ? "Atividade atualizada" : "Atividade agendada" };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleActivity(id: string, done: boolean): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const a = await db.activity.findFirst({ where: { id, orgId: ctx.org.id } });
    if (!a) return { ok: false, error: "Atividade não encontrada" };
    await db.activity.update({ where: { id }, data: { done, doneAt: done ? new Date() : null } });
    if (done)
      await logEvent({ orgId: ctx.org.id, type: "ACTIVITY_DONE", userId: ctx.user.id, dealId: a.dealId, contactId: a.contactId, companyId: a.companyId, data: { title: a.title } });
    revalidatePath("/", "layout");
    return { ok: true, message: done ? "Atividade concluída" : "Atividade reaberta" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteActivity(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    await db.activity.deleteMany({ where: { id, orgId: ctx.org.id } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Atividade excluída" };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------------------- NOTAS ---------------------------- */

export async function addNote(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const content = str(fd, "content");
    if (!content) return { ok: false, error: "Escreva a nota" };
    await db.note.create({
      data: {
        orgId: ctx.org.id,
        content,
        authorId: ctx.user.id,
        dealId: str(fd, "dealId"),
        contactId: str(fd, "contactId"),
        companyId: str(fd, "companyId"),
        recordId: await orgRecordId(ctx.org.id, str(fd, "recordId")),
      },
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "Nota adicionada" };
  } catch (e) {
    return fail(e);
  }
}

export async function togglePinNote(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    const n = await db.note.findFirst({ where: { id, orgId: ctx.org.id } });
    if (!n) return { ok: false, error: "Nota não encontrada" };
    await db.note.update({ where: { id }, data: { pinned: !n.pinned } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteNote(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("SALES");
    await db.note.deleteMany({ where: { id, orgId: ctx.org.id } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Nota excluída" };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------------------- PRODUTOS ---------------------------- */

export async function saveProduct(id: string | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    const data = {
      name: str(fd, "name") ?? "",
      sku: str(fd, "sku"),
      description: str(fd, "description"),
      unit: str(fd, "unit"),
      price: moneyOf(fd, "price"),
      active: fd.get("active") !== "false",
    };
    if (!data.name) return { ok: false, error: "Informe o nome" };
    if (id) await db.product.updateMany({ where: { id, orgId: ctx.org.id }, data });
    else await db.product.create({ data: { ...data, orgId: ctx.org.id } });
    revalidatePath("/products");
    return { ok: true, message: "Produto salvo" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    await db.product.deleteMany({ where: { id, orgId: ctx.org.id } });
    revalidatePath("/products");
    return { ok: true, message: "Produto excluído" };
  } catch (e) {
    return fail(e);
  }
}
