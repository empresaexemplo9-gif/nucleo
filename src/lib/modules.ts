import "server-only";
import { cache } from "react";
import type { Prisma, Role } from "@prisma/client";
import { db } from "./db";
import { hasRole, type Ctx } from "./auth";
import { slugify } from "./format";
import { fieldOptions, MODULE_TEMPLATES } from "./module-templates";
import { canFinance, isFinanceModule } from "./roles";

type Tx = Prisma.TransactionClient | typeof db;

/** Instala um modelo pronto como módulo da empresa (chave única por empresa). */
export async function installTemplate(tx: Tx, orgId: string, templateKey: string) {
  const t = MODULE_TEMPLATES.find((m) => m.key === templateKey);
  if (!t) throw new Error(`Modelo ${templateKey} não encontrado`);
  let key = t.key;
  for (let i = 2; await tx.customModule.findUnique({ where: { orgId_key: { orgId, key } } }); i++) key = `${t.key}-${i}`;
  const position = await tx.customModule.count({ where: { orgId } });
  const mod = await tx.customModule.create({
    data: {
      orgId,
      key,
      name: t.name,
      singular: t.singular,
      description: t.description,
      icon: t.icon,
      color: t.color,
      prefix: t.prefix,
      position,
      templateKey: t.key,
      ...(t.minRoleView ? { minRoleView: t.minRoleView } : {}),
      ...(t.minRoleEdit ? { minRoleEdit: t.minRoleEdit } : {}),
      ...(t.group ? { group: t.group } : {}),
      dueFieldKey: t.fields.find((f) => f.due)?.key ?? null,
      amountFieldKey: t.fields.find((f) => f.amount)?.key ?? null,
      recurrenceFieldKey: t.fields.find((f) => f.recur)?.key ?? null,
    },
  });
  await tx.moduleField.createMany({
    data: t.fields.map((f, i) => ({ moduleId: mod.id, key: f.key, label: f.label, type: f.type, options: fieldOptions(f), required: !!f.required, showInList: !!f.list, position: i })),
  });
  await tx.moduleStatus.createMany({
    data: t.statuses.map((s, i) => ({ moduleId: mod.id, name: s.name, color: s.color, isFinal: !!s.final, position: i })),
  });
  return mod;
}

/**
 * Liga os campos de vínculo dos modelos ("tpl:imoveis") ao módulo instalado com aquele modelo.
 * Roda depois de cada instalação: a ordem de instalação dos módulos de um pacote não importa.
 */
export async function linkTemplateRefs(tx: Tx, orgId: string) {
  const pending = await tx.moduleField.findMany({ where: { type: "RECORD", module: { orgId } } });
  const mods = await tx.customModule.findMany({ where: { orgId }, select: { key: true, templateKey: true }, orderBy: { position: "asc" } });
  for (const f of pending) {
    const ref = f.options[0] ?? "";
    if (!ref.startsWith("tpl:")) continue;
    const target = mods.find((m) => m.templateKey === ref.slice(4));
    if (target) await tx.moduleField.update({ where: { id: f.id }, data: { options: [target.key] } });
  }
}

/**
 * Atualiza um módulo instalado com as novidades do modelo: campos e status que faltam,
 * opções novas nas listas e as configurações de prazo, valor e repetição ainda vazias.
 * Nada do que a empresa personalizou é apagado ou renomeado.
 */
export async function syncFromTemplate(tx: Tx, moduleId: string) {
  const mod = await tx.customModule.findUniqueOrThrow({ where: { id: moduleId }, include: { fields: true, statuses: true } });
  const t = MODULE_TEMPLATES.find((m) => m.key === mod.templateKey);
  if (!t) throw new Error("Este módulo não veio de um modelo pronto");
  let added = 0;
  let pos = mod.fields.length;
  for (const f of t.fields) {
    const cur = mod.fields.find((x) => x.key === f.key);
    if (!cur) {
      await tx.moduleField.create({ data: { moduleId, key: f.key, label: f.label, type: f.type, options: fieldOptions(f), required: false, showInList: !!f.list, position: pos++ } });
      added++;
    } else if ((cur.type === "SELECT" || cur.type === "MULTISELECT" || cur.type === "CHECKLIST") && cur.type === f.type) {
      const extra = (f.options ?? []).filter((o) => !cur.options.includes(o));
      if (extra.length) await tx.moduleField.update({ where: { id: cur.id }, data: { options: [...cur.options, ...extra] } });
    }
  }
  let spos = mod.statuses.length;
  const finals = mod.statuses.filter((s) => s.isFinal);
  for (const s of t.statuses) {
    if (mod.statuses.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) continue;
    // status abertos novos entram antes dos finais, para o quadro continuar na ordem do fluxo
    const position = s.final || !finals.length ? spos++ : Math.min(...finals.map((x) => x.position));
    if (!s.final && finals.length) await tx.moduleStatus.updateMany({ where: { moduleId, isFinal: true }, data: { position: { increment: 1 } } });
    await tx.moduleStatus.create({ data: { moduleId, name: s.name, color: s.color, isFinal: !!s.final, position } });
    added++;
  }
  const keys = new Set([...mod.fields.map((f) => f.key), ...t.fields.map((f) => f.key)]);
  const pick = (flag: "due" | "amount" | "recur") => t.fields.find((f) => f[flag] && keys.has(f.key))?.key ?? null;
  await tx.customModule.update({
    where: { id: moduleId },
    data: {
      description: mod.description || t.description,
      dueFieldKey: mod.dueFieldKey ?? pick("due"),
      amountFieldKey: mod.amountFieldKey ?? pick("amount"),
      recurrenceFieldKey: mod.recurrenceFieldKey ?? pick("recur"),
    },
  });
  return added;
}

/** Módulos visíveis para o usuário atual (ordenados). */
export const visibleModules = cache(async (ctx: Ctx) => {
  const all = await db.customModule.findMany({ where: { orgId: ctx.org.id }, orderBy: { position: "asc" } });
  return all.filter((m) => canView(ctx, m));
});

export async function getModuleByKey(ctx: Ctx, key: string) {
  const mod = await db.customModule.findUnique({
    where: { orgId_key: { orgId: ctx.org.id, key } },
    include: { fields: { orderBy: { position: "asc" } }, statuses: { orderBy: { position: "asc" } } },
  });
  if (!mod || !canView(ctx, mod)) return null;
  return mod;
}

/** Módulos financeiros ficam com a administração e o financeiro; os demais seguem o perfil mínimo. */
function canView(ctx: Ctx, mod: { minRoleView: Role; templateKey?: string | null }) {
  if (isFinanceModule(mod)) return canFinance(ctx.role, ctx.superadmin);
  return hasRole(ctx, mod.minRoleView);
}

export function canEditModule(ctx: Ctx, mod: { minRoleEdit: Role; templateKey?: string | null }) {
  if (isFinanceModule(mod)) return canFinance(ctx.role, ctx.superadmin);
  return hasRole(ctx, mod.minRoleEdit);
}

/** Filtro de visibilidade: vendedores com visibilidade "própria" veem só o que criaram ou é deles. */
export function recordScope(ctx: Ctx): Prisma.ModuleRecordWhereInput {
  if (ctx.settings.visibility === "OWN" && ctx.role === "SALES") return { OR: [{ assigneeId: ctx.user.id }, { createdById: ctx.user.id }] };
  return {};
}

export function newModuleKey(name: string) {
  return slugify(name) || "modulo";
}

export const recordCode = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, "0")}`;
