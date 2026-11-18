"use server";
import { revalidatePath } from "next/cache";
import type { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireContext, requireRole, requireSuperadmin } from "@/lib/auth";
import { PUBLIC_TYPES } from "@/lib/module-public";
import { logEvent } from "@/lib/events";
import { slugify } from "@/lib/format";
import { canEditModule, installTemplate, linkTemplateRefs, moduleRules, newModuleKey, recordCode, syncFromTemplate } from "@/lib/modules";
import { canFinance, isFinanceModule } from "@/lib/roles";
import { DATE_TYPES, FIELD_TYPES, MODULE_TEMPLATES, SEGMENT_PACKS } from "@/lib/module-templates";
import { advanceDate, applyFormulas, evalFormula, recurrenceOf, stockStatus } from "@/lib/module-logic";
import { parseGrade } from "@/lib/fashion-colors";
import { localToUtc, utcToLocal } from "@/lib/zoned";
import { runRecordAutomations } from "@/lib/automation";
import { randomBytes } from "crypto";
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
    const ctx = await requireSuperadmin();
    const valid = keys.filter((k) => MODULE_TEMPLATES.some((t) => t.key === k));
    if (!valid.length) return { ok: false, error: "Selecione ao menos um modelo" };
    let lastKey = "";
    await db.$transaction(async (tx) => {
      for (const k of valid) lastKey = (await installTemplate(tx, ctx.org.id, k)).key;
      await linkTemplateRefs(tx, ctx.org.id);
    }, { timeout: 30000, maxWait: 10000 });
    return done(valid.length === 1 ? "Módulo instalado" : `${valid.length} módulos instalados`, lastKey);
  } catch (e) {
    return fail(e);
  }
}

/**
 * Atualiza um pacote inteiro em um clique: instala os módulos que faltam e traz as novidades dos modelos
 * para os já instalados (campos, status, opções, regras e visual), sem apagar personalizações.
 */
export async function upgradePack(packKey: string): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
    const pack = SEGMENT_PACKS.find((p) => p.key === packKey);
    if (!pack) return { ok: false, error: "Pacote não encontrado" };
    const result = await db.$transaction(async (tx) => {
      const installed = await tx.customModule.findMany({ where: { orgId: ctx.org.id, templateKey: { in: pack.modules } }, select: { id: true, templateKey: true } });
      let created = 0;
      let updates = 0;
      for (const key of pack.modules) {
        const mine = installed.filter((m) => m.templateKey === key);
        if (!mine.length) {
          await installTemplate(tx, ctx.org.id, key);
          created++;
        } else for (const m of mine) updates += await syncFromTemplate(tx, m.id);
      }
      await linkTemplateRefs(tx, ctx.org.id);
      return { created, updates };
    }, { timeout: 60000, maxWait: 10000 });
    return done(`${pack.label}: ${result.created} módulo(s) novo(s) e ${result.updates} novidade(s) aplicadas aos módulos existentes`);
  } catch (e) {
    return fail(e);
  }
}

export async function createModule(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
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
    const ctx = await requireSuperadmin();
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
        dueFieldKey: fieldKey("dueFieldKey", DATE_TYPES),
        amountFieldKey: fieldKey("amountFieldKey", ["CURRENCY", "NUMBER", "FORMULA"]),
        recurrenceFieldKey: fieldKey("recurrenceFieldKey", ["SELECT"]),
      },
    });
    return done("Módulo atualizado");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteModule(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
    await ownModule(ctx.org.id, id);
    await db.customModule.delete({ where: { id } });
    return done("Módulo excluído");
  } catch (e) {
    return fail(e);
  }
}

export async function moveModule(id: string, dir: -1 | 1): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
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
    const ctx = await requireSuperadmin();
    const m = await ownModule(ctx.org.id, moduleId);
    const label = str(fd, "label");
    if (!label) return { ok: false, error: "Informe o nome do campo" };
    const type = str(fd, "type") ?? "TEXT";
    if (!(type in FIELD_TYPES)) return { ok: false, error: "Tipo inválido" };
    let options = (str(fd, "options") ?? "").split(type === "CHECKLIST" ? /\n/ : /\n|,/).map((s) => s.trim()).filter(Boolean);
    if (type === "RECORD") {
      const target = str(fd, "target");
      if (!target || !(await db.customModule.findUnique({ where: { orgId_key: { orgId: ctx.org.id, key: target } }, select: { id: true } }))) return { ok: false, error: "Escolha o módulo a vincular" };
      options = [target];
    }
    if (type === "FORMULA") {
      const expr = str(fd, "formula");
      if (!expr) return { ok: false, error: "Escreva a fórmula" };
      try {
        evalFormula(expr, () => 1);
      } catch (e) {
        return { ok: false, error: `Fórmula inválida: ${e instanceof Error ? e.message : e}` };
      }
      const unknown = [...expr.matchAll(/\{([^}]+)\}/g)].map((x) => x[1]!.trim()).filter((k) => !m.fields.some((f) => f.key === k));
      if (unknown.length) return { ok: false, error: `Campo inexistente na fórmula: {${unknown[0]}}. Use as chaves listadas abaixo do campo.` };
      const format = str(fd, "format");
      options = [expr, format === "CURRENCY" || format === "PERCENT" ? format : "NUMBER"];
    }
    const data = {
      label,
      type,
      options,
      required: type === "FORMULA" ? false : fd.get("required") === "on",
      showInList: fd.get("showInList") === "on",
    };
    if ((type === "SELECT" || type === "MULTISELECT" || type === "CHECKLIST" || type === "GRADE") && !data.options.length)
      return { ok: false, error: type === "CHECKLIST" ? "Informe os itens do checklist" : type === "GRADE" ? "Informe os tamanhos da grade" : "Informe as opções da lista" };
    if (id) {
      await db.moduleField.updateMany({ where: { id, moduleId }, data });
    } else {
      let key = slugify(label).replace(/-/g, "_") || "campo";
      if (m.fields.some((f) => f.key === key) || key === "title") key = `${key}_${Date.now().toString(36)}`;
      await db.moduleField.create({ data: { ...data, key, moduleId, position: m.fields.length } });
      // define prazo/valor automaticamente quando ainda não houver
      if (DATE_TYPES.includes(type) && !m.dueFieldKey) await db.customModule.update({ where: { id: moduleId }, data: { dueFieldKey: key } });
      if (type === "CURRENCY" && !m.amountFieldKey) await db.customModule.update({ where: { id: moduleId }, data: { amountFieldKey: key } });
    }
    return done("Campo salvo");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteModuleField(moduleId: string, id: string): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
    const m = await ownModule(ctx.org.id, moduleId);
    const f = m.fields.find((x) => x.id === id);
    if (!f) return { ok: false, error: "Campo não encontrado" };
    await db.moduleField.delete({ where: { id } });
    await db.customModule.update({
      where: { id: moduleId },
      data: {
        dueFieldKey: m.dueFieldKey === f.key ? null : m.dueFieldKey,
        amountFieldKey: m.amountFieldKey === f.key ? null : m.amountFieldKey,
        recurrenceFieldKey: m.recurrenceFieldKey === f.key ? null : m.recurrenceFieldKey,
      },
    });
    return done("Campo removido");
  } catch (e) {
    return fail(e);
  }
}

export async function moveModuleField(moduleId: string, id: string, dir: -1 | 1): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
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
    const ctx = await requireSuperadmin();
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

/** Lê os campos do formulário (f_<chave>) conforme o tipo, valida vínculos e calcula as fórmulas. */
async function readRecordData(orgId: string, timeZone: string, m: ModFull, fd: FormData, previous: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...previous };
  for (const f of m.fields) {
    const name = `f_${f.key}`;
    if (f.type === "FORMULA" || !fd.has(name)) continue;
    if (f.type === "RECORD" && (f.options[0] ?? "").startsWith("tpl:")) continue; // módulo vinculado não instalado
    let v: unknown;
    if (f.type === "MULTISELECT" || f.type === "CHECKLIST") v = fd.getAll(name).map(String).filter((x) => x && f.options.includes(x));
    else if (f.type === "GRADE") v = parseGrade(str(fd, name), f.options);
    else if (f.type === "NUMBER" || f.type === "CURRENCY") v = str(fd, name) == null ? null : moneyOf(fd, name);
    else if (f.type === "BOOLEAN") v = str(fd, name) === "sim" ? true : str(fd, name) === "não" ? false : null;
    else if (f.type === "SELECT") {
      const s = str(fd, name);
      v = s && f.options.includes(s) ? s : null;
    } else if (f.type === "DATE") {
      const s = str(fd, name);
      v = s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    } else if (f.type === "DATETIME") {
      const s = str(fd, name);
      v = s && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? s : null;
    } else if (f.type === "CONTACT") {
      const s = str(fd, name);
      v = s && (await db.contact.findFirst({ where: { id: s, orgId }, select: { id: true } })) ? s : null;
    } else if (f.type === "COMPANY") {
      const s = str(fd, name);
      v = s && (await db.company.findFirst({ where: { id: s, orgId }, select: { id: true } })) ? s : null;
    } else if (f.type === "RECORD") {
      const s = str(fd, name);
      v = s && (await db.moduleRecord.findFirst({ where: { id: s, orgId, module: { key: f.options[0] ?? "" } }, select: { id: true } })) ? s : null;
    } else v = str(fd, name);
    if (f.required && (v == null || v === "" || (Array.isArray(v) && !v.length))) throw new Error(`Preencha o campo "${f.label}"`);
    data[f.key] = v;
  }
  applyFormulas(m.fields.slice().sort((a, b) => a.position - b.position), data);
  return { data: data as Prisma.InputJsonObject, ...derived(m, data, timeZone) };
}

/** Colunas derivadas dos dados: prazo, valor e o primeiro contato/empresa vinculados. */
function derived(m: ModFull, data: Record<string, unknown>, timeZone: string) {
  const dueField = m.fields.find((f) => f.key === m.dueFieldKey);
  const dueRaw = dueField ? data[dueField.key] : null;
  const amountRaw = m.amountFieldKey ? data[m.amountFieldKey] : null;
  const firstOf = (type: string) => {
    const f = m.fields.filter((x) => x.type === type).sort((a, b) => a.position - b.position)[0];
    return f ? ((data[f.key] as string | null) ?? null) : null;
  };
  return {
    dueAt: typeof dueRaw === "string" ? (dueField!.type === "DATETIME" ? localToUtc(dueRaw, timeZone) : new Date(`${dueRaw}T12:00:00`)) : null,
    amount: typeof amountRaw === "number" ? amountRaw : null,
    contactId: firstOf("CONTACT"),
    companyId: firstOf("COMPANY"),
  };
}

/** Status automático de estoque (Disponível / Estoque baixo / Esgotado), quando o módulo tem a regra. */
function autoStatusId(m: ModFull, data: Record<string, unknown>, currentStatusId: string | null) {
  const current = m.statuses.find((s) => s.id === currentStatusId)?.name ?? null;
  const name = stockStatus(moduleRules(m.settings, m.templateKey).stock, m.fields, data, current);
  return name ? m.statuses.find((s) => s.name.toLowerCase() === name.toLowerCase())?.id ?? null : null;
}

/** Agenda: o mesmo responsável não pode ter dois compromissos abertos no mesmo horário. */
async function checkSlot(orgId: string, m: ModFull, dueAt: Date | null, assigneeId: string | null, timeZone: string, exceptId?: string) {
  const due = m.fields.find((f) => f.key === m.dueFieldKey);
  if (!dueAt || !assigneeId || due?.type !== "DATETIME") return;
  const finals = m.statuses.filter((s) => s.isFinal).map((s) => s.id);
  const clash = await db.moduleRecord.findFirst({
    where: { orgId, moduleId: m.id, assigneeId, dueAt, ...(exceptId ? { id: { not: exceptId } } : {}), OR: [{ statusId: null }, { statusId: { notIn: finals } }] },
    include: { assignee: { select: { name: true } } },
  });
  if (clash) {
    const [d, t] = utcToLocal(dueAt, timeZone).split("T");
    throw new Error(`Horário ocupado: ${clash.assignee?.name ?? "o responsável"} já tem ${recordCode(m.prefix, clash.number)} (${clash.title}) em ${d!.split("-").reverse().join("/")} às ${t}.`);
  }
}

export async function createRecord(moduleId: string, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    const m = await ownModule(ctx.org.id, moduleId);
    if (!canEditModule(ctx, m)) return { ok: false, error: "Você não tem permissão para criar neste módulo" };
    const title = str(fd, "title");
    if (!title) return { ok: false, error: "Informe o título" };
    const parsed = await readRecordData(ctx.org.id, ctx.org.timezone, m, fd);
    const chosen = str(fd, "statusId") ?? [...m.statuses].sort((a, b) => a.position - b.position)[0]?.id ?? null;
    const statusId = autoStatusId(m, parsed.data as Record<string, unknown>, chosen) ?? chosen;
    const status = m.statuses.find((s) => s.id === statusId);
    const assigneeId = fd.has("assigneeId") ? str(fd, "assigneeId") : ctx.user.id;
    await checkSlot(ctx.org.id, m, parsed.dueAt, assigneeId, ctx.org.timezone);
    const rec = await db.$transaction(async (tx) => {
      const { sequence } = await tx.customModule.update({ where: { id: m.id }, data: { sequence: { increment: 1 } } });
      return tx.moduleRecord.create({
        data: {
          orgId: ctx.org.id,
          moduleId: m.id,
          number: sequence,
          title,
          statusId: status?.id ?? null,
          assigneeId,
          createdById: ctx.user.id,
          position: Date.now(),
          closedAt: status?.isFinal ? new Date() : null,
          ...parsed,
        },
      });
    });
    await logEvent({ orgId: ctx.org.id, type: "RECORD_CREATED", userId: ctx.user.id, recordId: rec.id, contactId: rec.contactId, companyId: rec.companyId, data: { name: m.singular } });
    await runRecordAutomations(ctx.org.id, "RECORD_CREATED", rec.id);
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
    const parsed = await readRecordData(ctx.org.id, ctx.org.timezone, m, fd, (r.data ?? {}) as Record<string, unknown>);
    const assigneeId = fd.has("assigneeId") ? str(fd, "assigneeId") : r.assigneeId;
    if (!r.status?.isFinal) await checkSlot(ctx.org.id, m, parsed.dueAt, assigneeId, ctx.org.timezone, id);
    const auto = autoStatusId(m, parsed.data as Record<string, unknown>, r.statusId);
    await db.moduleRecord.update({ where: { id }, data: { title: str(fd, "title") ?? r.title, assigneeId, ...parsed, ...(auto && auto !== r.statusId ? { statusId: auto } : {}) } });
    if (auto && auto !== r.statusId) {
      await logEvent({ orgId: ctx.org.id, type: "RECORD_STATUS", recordId: id, data: { from: r.status?.name ?? "—", to: m.statuses.find((s) => s.id === auto)?.name ?? "" } });
      await runRecordAutomations(ctx.org.id, "RECORD_STATUS", id); // ex.: avisar a equipe quando o estoque fica baixo
    }
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
    if (!changed) return { ok: true };
    await logEvent({ orgId: ctx.org.id, type: "RECORD_STATUS", userId: ctx.user.id, recordId: id, data: { from: r.status?.name ?? "—", to: st.name } });
    const next = st.isFinal ? await scheduleNext(ctx.org.id, ctx.org.timezone, m, r.id, ctx.user.id) : null;
    await runRecordAutomations(ctx.org.id, "RECORD_STATUS", id);
    revalidatePath("/", "layout");
    return { ok: true, message: next ?? undefined };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Repetição (mensalidades, revisões, manutenções, renovações): ao concluir um registro com repetição,
 * cria o próximo com o prazo avançado. Gera uma única vez por registro, mesmo se reaberto e concluído de novo.
 */
async function scheduleNext(orgId: string, timeZone: string, m: ModFull, recordId: string, userId: string) {
  if (!m.recurrenceFieldKey || !m.dueFieldKey) return null;
  const r = await db.moduleRecord.findUniqueOrThrow({ where: { id: recordId } });
  const data = { ...((r.data ?? {}) as Record<string, unknown>) };
  const step = recurrenceOf(data[m.recurrenceFieldKey]);
  const due = data[m.dueFieldKey];
  if (!step || typeof due !== "string" || data.__proximo) return null;
  const nextDue = advanceDate(due, step);
  if (!nextDue) return null;
  const copy: Record<string, unknown> = { ...data, [m.dueFieldKey]: nextDue };
  delete copy.__proximo;
  // checklists recomeçam desmarcados
  for (const f of m.fields) if (f.type === "CHECKLIST") copy[f.key] = [];
  applyFormulas([...m.fields].sort((a, b) => a.position - b.position), copy);
  const first = [...m.statuses].sort((a, b) => a.position - b.position).find((s) => !s.isFinal);
  const rec = await db.$transaction(async (tx) => {
    const { sequence } = await tx.customModule.update({ where: { id: m.id }, data: { sequence: { increment: 1 } } });
    const created = await tx.moduleRecord.create({
      data: {
        orgId,
        moduleId: m.id,
        number: sequence,
        title: r.title,
        statusId: first?.id ?? null,
        assigneeId: r.assigneeId,
        createdById: userId,
        position: Date.now(),
        data: copy as Prisma.InputJsonObject,
        ...derived(m, copy, timeZone),
      },
    });
    await tx.moduleRecord.update({ where: { id: r.id }, data: { data: { ...data, __proximo: created.id } as Prisma.InputJsonObject } });
    return created;
  });
  await logEvent({ orgId, type: "RECORD_CREATED", userId, recordId: rec.id, contactId: rec.contactId, companyId: rec.companyId, data: { name: `${m.singular} (repetição de ${recordCode(m.prefix, r.number)})` } });
  await runRecordAutomations(orgId, "RECORD_CREATED", rec.id);
  const label = nextDue.length > 10 ? nextDue.slice(0, 10) : nextDue;
  return `Próximo(a) ${m.singular.toLowerCase()} criado(a): ${recordCode(m.prefix, rec.number)} para ${label.split("-").reverse().join("/")}`;
}

/** Marca ou desmarca um item de checklist direto na ficha do registro. */
export async function toggleChecklistItem(id: string, fieldKey: string, item: string, checked: boolean): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    const { r, m } = await ownRecord(ctx.org.id, id);
    if (!canEditModule(ctx, m)) return { ok: false, error: "Sem permissão" };
    const f = m.fields.find((x) => x.key === fieldKey && x.type === "CHECKLIST");
    if (!f || !f.options.includes(item)) return { ok: false, error: "Item inválido" };
    const data = { ...((r.data ?? {}) as Record<string, unknown>) };
    const cur = new Set(Array.isArray(data[fieldKey]) ? (data[fieldKey] as string[]) : []);
    if (checked) cur.add(item);
    else cur.delete(item);
    data[fieldKey] = f.options.filter((o) => cur.has(o));
    applyFormulas([...m.fields].sort((a, b) => a.position - b.position), data);
    await db.moduleRecord.update({ where: { id }, data: { data: data as Prisma.InputJsonObject, ...derived(m, data, ctx.org.timezone) } });
    revalidatePath(`/m/${m.key}/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Anexos ------------------------------ */

const FILE_TYPES: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf", "text/plain": "txt", "text/csv": "csv",
  "application/msword": "doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

/** Envia fotos e documentos para o registro (até 10 MB cada, até 30 por registro). */
export async function uploadRecordFiles(id: string, files: { name: string; dataUrl: string }[]): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    const { m } = await ownRecord(ctx.org.id, id);
    if (!canEditModule(ctx, m)) return { ok: false, error: "Sem permissão" };
    const count = await db.storedFile.count({ where: { recordId: id } });
    if (count + files.length > 30) return { ok: false, error: "Limite de 30 anexos por registro" };
    let pos = count;
    for (const f of files) {
      const mm = /^data:([\w.+/-]+);base64,([A-Za-z0-9+/=]+)$/.exec(f.dataUrl);
      if (!mm || !FILE_TYPES[mm[1]!]) return { ok: false, error: `Tipo de arquivo não aceito: ${f.name}. Envie imagens, PDF, Word, Excel ou texto.` };
      const buf = Buffer.from(mm[2]!, "base64");
      if (buf.length > 10 * 1024 * 1024) return { ok: false, error: `${f.name} passa de 10 MB` };
      const name = f.name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120) || `arquivo.${FILE_TYPES[mm[1]!]}`;
      await db.storedFile.create({ data: { orgId: ctx.org.id, recordId: id, name, mime: mm[1]!, size: buf.length, data: buf, position: pos++ } });
    }
    revalidatePath(`/m/${m.key}/${id}`);
    return { ok: true, message: files.length === 1 ? "Arquivo anexado" : `${files.length} arquivos anexados` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRecordFile(fileId: string): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    const f = await db.storedFile.findFirst({ where: { id: fileId, orgId: ctx.org.id, recordId: { not: null } } });
    if (!f) return { ok: false, error: "Arquivo não encontrado" };
    const { m } = await ownRecord(ctx.org.id, f.recordId!);
    if (!canEditModule(ctx, m)) return { ok: false, error: "Sem permissão" };
    await db.storedFile.delete({ where: { id: fileId } });
    revalidatePath(`/m/${m.key}/${f.recordId}`);
    return { ok: true, message: "Anexo removido" };
  } catch (e) {
    return fail(e);
  }
}

/** Define a capa (primeira imagem: usada nos portais e no cartão). */
export async function setRecordCover(fileId: string): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    const f = await db.storedFile.findFirst({ where: { id: fileId, orgId: ctx.org.id, recordId: { not: null } } });
    if (!f) return { ok: false, error: "Arquivo não encontrado" };
    const { m } = await ownRecord(ctx.org.id, f.recordId!);
    if (!canEditModule(ctx, m)) return { ok: false, error: "Sem permissão" };
    const all = await db.storedFile.findMany({ where: { recordId: f.recordId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
    const order = [f.id, ...all.map((x) => x.id).filter((x) => x !== f.id)];
    await db.$transaction(order.map((fid, i) => db.storedFile.update({ where: { id: fid }, data: { position: i } })));
    revalidatePath(`/m/${m.key}/${f.recordId}`);
    return { ok: true, message: "Capa definida" };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ Modelo, formulário e feed ------------------------------ */

export async function syncModuleTemplate(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireSuperadmin();
    await ownModule(ctx.org.id, id);
    const added = await db.$transaction(async (tx) => {
      const n = await syncFromTemplate(tx, id);
      await linkTemplateRefs(tx, ctx.org.id);
      return n;
    });
    return done(added ? `${added} novidade(s) do modelo adicionada(s)` : "O módulo já está com todas as novidades do modelo");
  } catch (e) {
    return fail(e);
  }
}

/** Liga/desliga o formulário público e salva seus textos. */
export async function saveModuleForm(id: string, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const m = await ownModule(ctx.org.id, id);
    const enabled = fd.get("formEnabled") === "on";
    const fields = fd.getAll("formFields").map(String).filter((k) => m.fields.some((f) => f.key === k && PUBLIC_TYPES.includes(f.type)));
    const settings = {
      ...((m.settings ?? {}) as Record<string, unknown>),
      form: {
        title: str(fd, "formTitle")?.slice(0, 120) ?? "",
        intro: str(fd, "formIntro")?.slice(0, 1500) ?? "",
        success: str(fd, "formSuccess")?.slice(0, 600) ?? "",
        fields,
      },
    };
    await db.customModule.update({
      where: { id },
      data: { settings: settings as Prisma.InputJsonObject, formToken: enabled ? (m.formToken ?? randomBytes(12).toString("base64url")) : null },
    });
    return done(enabled ? "Formulário público ativo" : "Formulário público desativado");
  } catch (e) {
    return fail(e);
  }
}

/** Liga/desliga o feed XML para portais (imóveis). */
export async function toggleModuleFeed(id: string, enabled: boolean): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const m = await ownModule(ctx.org.id, id);
    await db.customModule.update({ where: { id }, data: { feedToken: enabled ? (m.feedToken ?? randomBytes(16).toString("base64url")) : null } });
    return done(enabled ? "Feed para portais ativo" : "Feed para portais desativado");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRecords(ids: string[]): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    const recs = await db.moduleRecord.findMany({ where: { id: { in: ids }, orgId: ctx.org.id }, include: { module: true } });
    // lançamentos financeiros: só a administração e o financeiro
    if (recs.some((r) => isFinanceModule(r.module) && !canFinance(ctx.role, ctx.superadmin))) return { ok: false, error: "Somente o financeiro ou a administração pode excluir lançamentos financeiros" };
    if (recs.some((r) => !hasRole(ctx, "MANAGER") && !(canEditModule(ctx, r.module) && r.createdById === ctx.user.id)))
      return { ok: false, error: "Apenas gestores podem excluir registros de outras pessoas" };
    await db.moduleRecord.deleteMany({ where: { id: { in: recs.map((r) => r.id) } } });
    return done(recs.length === 1 ? "Registro excluído" : `${recs.length} registros excluídos`);
  } catch (e) {
    return fail(e);
  }
}
