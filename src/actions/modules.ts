"use server";
import { revalidatePath } from "next/cache";
import type { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireContext, requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { slugify } from "@/lib/format";
import { canEditModule, installTemplate, newModuleKey } from "@/lib/modules";
import { FIELD_TYPES, MODULE_TEMPLATES } from "@/lib/module-templates";
import { fail, moneyOf, str } from "./helpers";
import type { ActionResult } from "@/components/use-action";

const ROLES: Role[] = ["VIEWER", "SALES", "MANAGER", "ADMIN", "OWNER"];
const done = (message: string, id?: string): ActionResult => {
  revalidatePath("/", "layout");
  return { ok: true, message, id };
};

async function ownModule(orgId: string, id: string) {
  const m = await db.customModule.findFirst({ where: { id, orgId }, include: { fields: true, statuses: true } });
  if (!m) throw new Error("Módulo não encontrado");
  return m;
}

/* ------------------------------ Módulos ------------------------------ */

export async function installModuleTemplates(keys: string[]): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const valid = keys.filter((k) => MODULE_TEMPLATES.some((t) => t.key === k));
    if (!valid.length) return { ok: false, error: "Selecione ao menos um modelo" };
    let lastKey = "";
    await db.$transaction(async (tx) => {
      for (const k of valid) lastKey = (await installTemplate(tx, ctx.org.id, k)).key;
    }, { timeout: 30000, maxWait: 10000 });
    return done(valid.length === 1 ? "Módulo instalado" : `${valid.length} módulos instalados`, lastKey);
  } catch (e) {
    return fail(e);
  }
}

export async function createModule(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const name = str(fd, "name");
    const singular = str(fd, "singular");
    if (!name || !singular) return { ok: false, error: "Informe o nome no plural e no singular" };
    let key = newModuleKey(name);
    for (let i = 2; await db.customModule.findUnique({ where: { orgId_key: { orgId: ctx.org.id, key } } }); i++) key = `${newModuleKey(name)}-${i}`;
    const position = await db.customModule.count({ where: { orgId: ctx.org.id } });
    const mod = await db.customModule.create({
      data: {
        orgId: ctx.org.id,
        key,
        name,
        singular,
        description: str(fd, "description"),
        icon: str(fd, "icon") ?? "folder",
        color: str(fd, "color") ?? "#b48a4f",
        prefix: (str(fd, "prefix") ?? name.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || "REG",
        position,
        statuses: {
          create: [
            { name: "Aberto", color: "#7d828c", position: 0 },
            { name: "Em andamento", color: "#3c78c0", position: 1 },
            { name: "Concluído", color: "#17905f", position: 2, isFinal: true },
          ],
        },
      },
    });
    return done("Módulo criado — agora adicione os campos", mod.id);
  } catch (e) {
    return fail(e);
  }
}

export async function updateModule(id: string, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const m = await ownModule(ctx.org.id, id);
    const role = (k: string, d: Role) => {
      const v = str(fd, k) as Role | null;
      return v && ROLES.includes(v) ? v : d;
    };
    const fieldKey = (k: string, types: string[]) => {
      const v = str(fd, k);
      return v && m.fields.some((f) => f.key === v && types.includes(f.type)) ? v : null;
    };
    await db.customModule.update({
      where: { id },
      data: {
        name: str(fd, "name") ?? m.name,
        singular: str(fd, "singular") ?? m.singular,
        description: str(fd, "description"),
        icon: str(fd, "icon") ?? m.icon,
        color: str(fd, "color") ?? m.color,
        prefix: (str(fd, "prefix") ?? m.prefix).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || m.prefix,
        group: str(fd, "group") ?? m.group,
        minRoleView: role("minRoleView", m.minRoleView),
        minRoleEdit: role("minRoleEdit", m.minRoleEdit),
        dueFieldKey: fieldKey("dueFieldKey", ["DATE"]),
        amountFieldKey: fieldKey("amountFieldKey", ["CURRENCY", "NUMBER"]),
      },
    });
    return done("Módulo atualizado");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteModule(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    await ownModule(ctx.org.id, id);
    await db.customModule.delete({ where: { id } });
    return done("Módulo excluído");
  } catch (e) {
    return fail(e);
  }
}

export async function moveModule(id: string, dir: -1 | 1): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const all = await db.customModule.findMany({ where: { orgId: ctx.org.id }, orderBy: { position: "asc" } });
    const i = all.findIndex((m) => m.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) return { ok: true };
    [all[i], all[j]] = [all[j]!, all[i]!];
    await db.$transaction(all.map((m, k) => db.customModule.update({ where: { id: m.id }, data: { position: k } })));
    return done("Ordem atualizada");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Campos ------------------------------ */

export async function saveModuleField(moduleId: string, id: string | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const m = await ownModule(ctx.org.id, moduleId);
    const label = str(fd, "label");
    if (!label) return { ok: false, error: "Informe o nome do campo" };
    const type = str(fd, "type") ?? "TEXT";
    if (!(type in FIELD_TYPES)) return { ok: false, error: "Tipo inválido" };
    const data = {
      label,
      type,
      options: (str(fd, "options") ?? "").split(/\n|,/).map((s) => s.trim()).filter(Boolean),
      required: fd.get("required") === "on",
      showInList: fd.get("showInList") === "on",
    };
    if ((type === "SELECT" || type === "MULTISELECT") && !data.options.length) return { ok: false, error: "Informe as opções da lista" };
    if (id) {
      await db.moduleField.updateMany({ where: { id, moduleId }, data });
    } else {
      let key = slugify(label).replace(/-/g, "_") || "campo";
      if (m.fields.some((f) => f.key === key) || key === "title") key = `${key}_${Date.now().toString(36)}`;
      await db.moduleField.create({ data: { ...data, key, moduleId, position: m.fields.length } });
      // define prazo/valor automaticamente quando ainda não houver
      if (type === "DATE" && !m.dueFieldKey) await db.customModule.update({ where: { id: moduleId }, data: { dueFieldKey: key } });
      if (type === "CURRENCY" && !m.amountFieldKey) await db.customModule.update({ where: { id: moduleId }, data: { amountFieldKey: key } });
    }
    return done("Campo salvo");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteModuleField(moduleId: string, id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const m = await ownModule(ctx.org.id, moduleId);
    const f = m.fields.find((x) => x.id === id);
    if (!f) return { ok: false, error: "Campo não encontrado" };
    await db.moduleField.delete({ where: { id } });
    await db.customModule.update({
      where: { id: moduleId },
      data: { dueFieldKey: m.dueFieldKey === f.key ? null : m.dueFieldKey, amountFieldKey: m.amountFieldKey === f.key ? null : m.amountFieldKey },
    });
    return done("Campo removido");
  } catch (e) {
    return fail(e);
  }
}

export async function moveModuleField(moduleId: string, id: string, dir: -1 | 1): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const m = await ownModule(ctx.org.id, moduleId);
    const all = [...m.fields].sort((a, b) => a.position - b.position);
    const i = all.findIndex((f) => f.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) return { ok: true };
    [all[i], all[j]] = [all[j]!, all[i]!];
    await db.$transaction(all.map((f, k) => db.moduleField.update({ where: { id: f.id }, data: { position: k } })));
    return done("Ordem atualizada");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Status ------------------------------ */

export type StatusInput = { id?: string; name: string; color: string; isFinal: boolean };

export async function saveModuleStatuses(moduleId: string, statuses: StatusInput[]): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const m = await ownModule(ctx.org.id, moduleId);
    if (!statuses.length) return { ok: false, error: "O módulo precisa de ao menos um status" };
    if (statuses.some((s) => !s.name.trim())) return { ok: false, error: "Todos os status precisam de nome" };
    const keep = new Set(statuses.filter((s) => s.id).map((s) => s.id!));
    const removed = m.statuses.filter((s) => !keep.has(s.id));
    await db.$transaction(async (tx) => {
      const ids: string[] = [];
      for (const [i, s] of statuses.entries()) {
        const data = { name: s.name.trim(), color: /^#[0-9a-fA-F]{6}$/.test(s.color) ? s.color : "#7d828c", isFinal: s.isFinal, position: i };
        if (s.id && m.statuses.some((x) => x.id === s.id)) {
          await tx.moduleStatus.update({ where: { id: s.id }, data });
          ids.push(s.id);
        } else ids.push((await tx.moduleStatus.create({ data: { ...data, moduleId } })).id);
      }
      if (removed.length) {
        await tx.moduleRecord.updateMany({ where: { statusId: { in: removed.map((r) => r.id) } }, data: { statusId: ids[0] } });
        await tx.moduleStatus.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
      }
    });
    return done("Status salvos");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Registros ------------------------------ */

type ModFull = Awaited<ReturnType<typeof ownModule>>;

/** Lê os campos do formulário (f_<chave>) conforme o tipo e valida vínculos. */
async function readRecordData(orgId: string, m: ModFull, fd: FormData, previous: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...previous };
  for (const f of m.fields) {
    const name = `f_${f.key}`;
    if (!fd.has(name)) continue;
    let v: unknown;
    if (f.type === "MULTISELECT") v = fd.getAll(name).map(String).filter((x) => x && f.options.includes(x));
    else if (f.type === "NUMBER" || f.type === "CURRENCY") v = str(fd, name) == null ? null : moneyOf(fd, name);
    else if (f.type === "BOOLEAN") v = str(fd, name) === "sim" ? true : str(fd, name) === "não" ? false : null;
    else if (f.type === "SELECT") {
      const s = str(fd, name);
      v = s && f.options.includes(s) ? s : null;
    } else if (f.type === "DATE") {
      const s = str(fd, name);
      v = s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    } else if (f.type === "CONTACT") {
      const s = str(fd, name);
      v = s && (await db.contact.findFirst({ where: { id: s, orgId }, select: { id: true } })) ? s : null;
    } else if (f.type === "COMPANY") {
      const s = str(fd, name);
      v = s && (await db.company.findFirst({ where: { id: s, orgId }, select: { id: true } })) ? s : null;
    } else v = str(fd, name);
    if (f.required && (v == null || v === "" || (Array.isArray(v) && !v.length))) throw new Error(`Preencha o campo "${f.label}"`);
    data[f.key] = v;
  }
  const dueRaw = m.dueFieldKey ? data[m.dueFieldKey] : null;
  const amountRaw = m.amountFieldKey ? data[m.amountFieldKey] : null;
  const firstOf = (type: string) => {
    const f = m.fields.filter((x) => x.type === type).sort((a, b) => a.position - b.position)[0];
    return f ? ((data[f.key] as string | null) ?? null) : null;
  };
  return {
    data: data as Prisma.InputJsonObject,
    dueAt: typeof dueRaw === "string" ? new Date(`${dueRaw}T12:00:00`) : null,
    amount: typeof amountRaw === "number" ? amountRaw : null,
    contactId: firstOf("CONTACT"),
    companyId: firstOf("COMPANY"),
  };
}

export async function createRecord(moduleId: string, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    const m = await ownModule(ctx.org.id, moduleId);
    if (!canEditModule(ctx, m)) return { ok: false, error: "Você não tem permissão para criar neste módulo" };
    const title = str(fd, "title");
    if (!title) return { ok: false, error: "Informe o título" };
    const parsed = await readRecordData(ctx.org.id, m, fd);
    const statusId = str(fd, "statusId") ?? [...m.statuses].sort((a, b) => a.position - b.position)[0]?.id ?? null;
    const status = m.statuses.find((s) => s.id === statusId);
    const rec = await db.$transaction(async (tx) => {
      const { sequence } = await tx.customModule.update({ where: { id: m.id }, data: { sequence: { increment: 1 } } });
      return tx.moduleRecord.create({
        data: {
          orgId: ctx.org.id,
          moduleId: m.id,
          number: sequence,
          title,
          statusId: status?.id ?? null,
          assigneeId: str(fd, "assigneeId") ?? ctx.user.id,
          createdById: ctx.user.id,
          position: Date.now(),
          closedAt: status?.isFinal ? new Date() : null,
          ...parsed,
        },
      });
    });
    await logEvent({ orgId: ctx.org.id, type: "RECORD_CREATED", userId: ctx.user.id, recordId: rec.id, contactId: rec.contactId, companyId: rec.companyId, data: { name: m.singular } });
    return done(`${m.singular} criado(a)`, rec.id);
  } catch (e) {
    return fail(e);
  }
}

async function ownRecord(orgId: string, id: string) {
  const r = await db.moduleRecord.findFirst({ where: { id, orgId }, include: { status: true } });
  if (!r) throw new Error("Registro não encontrado");
  const m = await ownModule(orgId, r.moduleId);
  return { r, m };
}

export async function updateRecord(id: string, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    const { r, m } = await ownRecord(ctx.org.id, id);
    if (!canEditModule(ctx, m)) return { ok: false, error: "Você não tem permissão para editar este módulo" };
    const parsed = await readRecordData(ctx.org.id, m, fd, (r.data ?? {}) as Record<string, unknown>);
    await db.moduleRecord.update({
      where: { id },
      data: { title: str(fd, "title") ?? r.title, assigneeId: fd.has("assigneeId") ? str(fd, "assigneeId") : r.assigneeId, ...parsed },
    });
    await logEvent({ orgId: ctx.org.id, type: "RECORD_UPDATED", userId: ctx.user.id, recordId: id });
    return done("Alterações salvas");
  } catch (e) {
    return fail(e);
  }
}

export async function setRecordStatus(id: string, statusId: string, position?: number): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    const { r, m } = await ownRecord(ctx.org.id, id);
    if (!canEditModule(ctx, m)) return { ok: false, error: "Sem permissão" };
    const st = m.statuses.find((s) => s.id === statusId);
    if (!st) return { ok: false, error: "Status inválido" };
    const changed = r.statusId !== st.id;
    await db.moduleRecord.update({
      where: { id },
      data: { statusId: st.id, position: position ?? r.position, ...(changed ? { closedAt: st.isFinal ? new Date() : null } : {}) },
    });
    if (changed) await logEvent({ orgId: ctx.org.id, type: "RECORD_STATUS", userId: ctx.user.id, recordId: id, data: { from: r.status?.name ?? "—", to: st.name } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRecords(ids: string[]): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    const recs = await db.moduleRecord.findMany({ where: { id: { in: ids }, orgId: ctx.org.id }, include: { module: true } });
    if (recs.some((r) => !hasRole(ctx, "MANAGER") && !(canEditModule(ctx, r.module) && r.createdById === ctx.user.id)))
      return { ok: false, error: "Apenas gestores podem excluir registros de outras pessoas" };
    await db.moduleRecord.deleteMany({ where: { id: { in: recs.map((r) => r.id) } } });
    return done(recs.length === 1 ? "Registro excluído" : `${recs.length} registros excluídos`);
  } catch (e) {
    return fail(e);
  }
}
