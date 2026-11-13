import "server-only";
import { cache } from "react";
import type { Prisma, Role } from "@prisma/client";
import { db } from "./db";
import { hasRole, type Ctx } from "./auth";
import { slugify } from "./format";
import { MODULE_TEMPLATES } from "./module-templates";

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
      dueFieldKey: t.fields.find((f) => f.due)?.key ?? null,
      amountFieldKey: t.fields.find((f) => f.amount)?.key ?? null,
    },
  });
  await tx.moduleField.createMany({
    data: t.fields.map((f, i) => ({ moduleId: mod.id, key: f.key, label: f.label, type: f.type, options: f.options ?? [], required: !!f.required, showInList: !!f.list, position: i })),
  });
  await tx.moduleStatus.createMany({
    data: t.statuses.map((s, i) => ({ moduleId: mod.id, name: s.name, color: s.color, isFinal: !!s.final, position: i })),
  });
  return mod;
}

/** Módulos visíveis para o usuário atual (ordenados). */
export const visibleModules = cache(async (ctx: Ctx) => {
  const all = await db.customModule.findMany({ where: { orgId: ctx.org.id }, orderBy: { position: "asc" } });
  return all.filter((m) => hasRole(ctx, m.minRoleView));
});

export async function getModuleByKey(ctx: Ctx, key: string) {
  const mod = await db.customModule.findUnique({
    where: { orgId_key: { orgId: ctx.org.id, key } },
    include: { fields: { orderBy: { position: "asc" } }, statuses: { orderBy: { position: "asc" } } },
  });
  if (!mod || !hasRole(ctx, mod.minRoleView)) return null;
  return mod;
}

export function canEditModule(ctx: Ctx, mod: { minRoleEdit: Role }) {
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
