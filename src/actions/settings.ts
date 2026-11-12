"use server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import type { EntityType, FieldType, Role, StageType } from "@prisma/client";
import { db } from "@/lib/db";
import { checkPassword, hashPassword, requireContext, requireRole } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { DEFAULT_LABELS, type Labels, type OrgSettings } from "@/lib/labels";
import { RADII, SANS_FONTS, SERIF_FONTS, SURFACES } from "@/lib/theme-options";
import { fail, moneyOf, numOr, str } from "./helpers";
import type { ActionResult } from "@/components/use-action";

const done = (message = "Configurações salvas"): ActionResult => {
  revalidatePath("/", "layout");
  return { ok: true, message };
};

/* ------------------------- Marca / whitelabel ------------------------- */

/** Logo: link https ou imagem embutida (data URL) de tipos seguros e tamanho limitado. */
function isValidLogo(v: string) {
  if (/^https:\/\/[^\s"'<>]+$/i.test(v)) return v.length <= 2000;
  const m = /^data:image\/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/.exec(v);
  return !!m && m[2]!.length <= 800_000;
}

export async function updateBranding(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const customDomain = str(fd, "customDomain")?.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? null;
    if (customDomain) {
      const taken = await db.organization.findFirst({ where: { customDomain, NOT: { id: ctx.org.id } } });
      if (taken) return { ok: false, error: "Este domínio já está em uso" };
    }
    const logoUrl = str(fd, "logoUrl");
    if (logoUrl && !isValidLogo(logoUrl)) return { ok: false, error: "Logotipo inválido: use um link https ou uma imagem PNG, JPG, WebP ou SVG de até 600 KB" };
    const hex = (k: string) => {
      const v = str(fd, k);
      return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null;
    };
    const pick = (k: string, allowed: string[]) => {
      const v = str(fd, k);
      return v && allowed.includes(v) ? v : undefined;
    };
    const brand = {
      ...ctx.settings.brand,
      font: pick("font", SANS_FONTS.map((f) => f.key)) ?? ctx.settings.brand.font,
      serifFont: pick("serifFont", SERIF_FONTS.map((f) => f.key)) ?? ctx.settings.brand.serifFont,
      surface: pick("surface", SURFACES.map((f) => f.key)) ?? ctx.settings.brand.surface,
      radius: pick("radius", RADII.map((f) => f.key)) ?? ctx.settings.brand.radius,
    };
    await db.organization.update({
      where: { id: ctx.org.id },
      data: {
        name: str(fd, "name") ?? ctx.org.name,
        logoUrl,
        settings: { ...(ctx.org.settings as object), brand },
        primaryColor: hex("primaryColor") ?? ctx.org.primaryColor,
        accentColor: hex("accentColor") ?? ctx.org.accentColor,
        currency: str(fd, "currency") ?? ctx.org.currency,
        locale: str(fd, "locale") ?? ctx.org.locale,
        timezone: str(fd, "timezone") ?? ctx.org.timezone,
        customDomain,
      },
    });
    return done("Marca atualizada");
  } catch (e) {
    return fail(e);
  }
}

export async function updateLabels(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const labels: Partial<Labels> = {};
    for (const k of Object.keys(DEFAULT_LABELS) as (keyof Labels)[]) {
      labels[k] = { singular: str(fd, `${k}.singular`) ?? DEFAULT_LABELS[k].singular, plural: str(fd, `${k}.plural`) ?? DEFAULT_LABELS[k].plural };
    }
    await db.organization.update({ where: { id: ctx.org.id }, data: { labels } });
    return done("Nomenclaturas atualizadas");
  } catch (e) {
    return fail(e);
  }
}

export async function updateOrgSettings(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const s: OrgSettings = {
      ...ctx.settings,
      visibility: str(fd, "visibility") === "OWN" ? "OWN" : "ALL",
      requireLostReason: fd.get("requireLostReason") === "on",
      weekStartsOn: str(fd, "weekStartsOn") === "0" ? 0 : 1,
      modules: {
        products: fd.get("mod_products") === "on",
        goals: fd.get("mod_goals") === "on",
        automations: fd.get("mod_automations") === "on",
        companies: fd.get("mod_companies") === "on",
      },
    };
    await db.organization.update({ where: { id: ctx.org.id }, data: { settings: { ...(ctx.org.settings as object), ...s } } });
    return done();
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------- Funis e etapas ------------------------- */

export async function createPipeline(name: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    if (!name.trim()) return { ok: false, error: "Informe o nome" };
    const count = await db.pipeline.count({ where: { orgId: ctx.org.id } });
    const p = await db.pipeline.create({ data: { orgId: ctx.org.id, name: name.trim(), position: count, isDefault: count === 0 } });
    await db.stage.createMany({
      data: [
        { pipelineId: p.id, name: "Novo", color: "#7d828c", probability: 10, position: 0 },
        { pipelineId: p.id, name: "Em andamento", color: "#3c78c0", probability: 50, position: 1 },
        { pipelineId: p.id, name: "Fechamento", color: "#b48a4f", probability: 80, position: 2 },
        { pipelineId: p.id, name: "Ganho", color: "#17905f", probability: 100, position: 100, type: "WON" },
        { pipelineId: p.id, name: "Perdido", color: "#cf3a56", probability: 0, position: 101, type: "LOST" },
      ],
    });
    revalidatePath("/", "layout");
    return { ok: true, id: p.id, message: "Funil criado" };
  } catch (e) {
    return fail(e);
  }
}

export async function updatePipeline(id: string, data: { name?: string; isDefault?: boolean }): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    if (data.isDefault) await db.pipeline.updateMany({ where: { orgId: ctx.org.id }, data: { isDefault: false } });
    await db.pipeline.updateMany({ where: { id, orgId: ctx.org.id }, data });
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function deletePipeline(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const count = await db.pipeline.count({ where: { orgId: ctx.org.id } });
    if (count <= 1) return { ok: false, error: "É necessário manter ao menos um funil" };
    const p = await db.pipeline.findFirst({ where: { id, orgId: ctx.org.id } });
    if (!p) return { ok: false, error: "Funil não encontrado" };
    await db.deal.deleteMany({ where: { pipelineId: id } });
    await db.pipeline.delete({ where: { id } });
    if (p.isDefault) {
      const first = await db.pipeline.findFirst({ where: { orgId: ctx.org.id }, orderBy: { position: "asc" } });
      if (first) await db.pipeline.update({ where: { id: first.id }, data: { isDefault: true } });
    }
    return done("Funil excluído");
  } catch (e) {
    return fail(e);
  }
}

export type StageInput = { id?: string; name: string; color: string; probability: number; rottingDays: number | null; type: StageType };

/** Salva todas as etapas de um funil de uma vez (ordem = ordem do array). */
export async function saveStages(pipelineId: string, stages: StageInput[]): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const p = await db.pipeline.findFirst({ where: { id: pipelineId, orgId: ctx.org.id }, include: { stages: true } });
    if (!p) return { ok: false, error: "Funil não encontrado" };
    const open = stages.filter((s) => s.type === "OPEN");
    if (!open.length) return { ok: false, error: "O funil precisa de ao menos uma etapa aberta" };
    if (stages.some((s) => !s.name.trim())) return { ok: false, error: "Todas as etapas precisam de nome" };

    const keepIds = new Set(stages.filter((s) => s.id).map((s) => s.id!));
    const removed = p.stages.filter((s) => !keepIds.has(s.id));
    await db.$transaction(async (tx) => {
      for (const [i, s] of stages.entries()) {
        const data = {
          name: s.name.trim(),
          color: s.color,
          probability: Math.max(0, Math.min(100, Math.round(s.probability))),
          rottingDays: s.rottingDays || null,
          type: s.type,
          position: s.type === "OPEN" ? i : s.type === "WON" ? 100 : 101,
        };
        if (s.id && p.stages.some((x) => x.id === s.id)) await tx.stage.update({ where: { id: s.id }, data });
        else await tx.stage.create({ data: { ...data, pipelineId } });
      }
      if (removed.length) {
        const fallback = await tx.stage.findFirst({ where: { pipelineId, type: "OPEN", id: { notIn: removed.map((r) => r.id) } }, orderBy: { position: "asc" } });
        if (fallback) await tx.deal.updateMany({ where: { stageId: { in: removed.map((r) => r.id) } }, data: { stageId: fallback.id } });
        await tx.stage.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
      }
    });
    return done("Etapas salvas");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------- Campos personalizados ------------------------- */

export async function saveCustomField(id: string | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const label = str(fd, "label");
    if (!label) return { ok: false, error: "Informe o nome do campo" };
    const entity = (str(fd, "entity") ?? "DEAL") as EntityType;
    const data = {
      label,
      type: (str(fd, "type") ?? "TEXT") as FieldType,
      options: (str(fd, "options") ?? "").split(/\n|,/).map((s) => s.trim()).filter(Boolean),
      required: fd.get("required") === "on",
    };
    if (id) await db.customField.updateMany({ where: { id, orgId: ctx.org.id }, data });
    else {
      let key = slugify(label).replace(/-/g, "_") || "campo";
      const exists = await db.customField.findFirst({ where: { orgId: ctx.org.id, entity, key } });
      if (exists) key = `${key}_${Date.now().toString(36)}`;
      const position = await db.customField.count({ where: { orgId: ctx.org.id, entity } });
      await db.customField.create({ data: { ...data, entity, key, position, orgId: ctx.org.id } });
    }
    return done("Campo salvo");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCustomField(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    await db.customField.deleteMany({ where: { id, orgId: ctx.org.id } });
    return done("Campo removido");
  } catch (e) {
    return fail(e);
  }
}

export async function moveCustomField(id: string, dir: -1 | 1): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const f = await db.customField.findFirst({ where: { id, orgId: ctx.org.id } });
    if (!f) return { ok: false, error: "Campo não encontrado" };
    const all = await db.customField.findMany({ where: { orgId: ctx.org.id, entity: f.entity }, orderBy: { position: "asc" } });
    const i = all.findIndex((x) => x.id === id);
    const j = i + dir;
    if (j < 0 || j >= all.length) return { ok: true };
    [all[i], all[j]] = [all[j]!, all[i]!];
    await db.$transaction(all.map((x, k) => db.customField.update({ where: { id: x.id }, data: { position: k } })));
    return done("Ordem atualizada");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------- Motivos de perda & etiquetas ------------------------- */

export async function addLostReason(label: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    if (!label.trim()) return { ok: false, error: "Informe o motivo" };
    await db.lostReason.create({ data: { orgId: ctx.org.id, label: label.trim() } });
    return done("Motivo adicionado");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLostReason(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    await db.lostReason.deleteMany({ where: { id, orgId: ctx.org.id } });
    return done("Motivo removido");
  } catch (e) {
    return fail(e);
  }
}

export async function saveTag(name: string, color: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    if (!name.trim()) return { ok: false, error: "Informe o nome" };
    await db.tag.upsert({
      where: { orgId_name: { orgId: ctx.org.id, name: name.trim() } },
      create: { orgId: ctx.org.id, name: name.trim(), color },
      update: { color },
    });
    return done("Etiqueta salva");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTag(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    await db.tag.deleteMany({ where: { id, orgId: ctx.org.id } });
    return done("Etiqueta removida");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------- Usuários ------------------------- */

export async function inviteUser(fd: FormData): Promise<ActionResult & { link?: string }> {
  try {
    const ctx = await requireRole("ADMIN");
    const email = str(fd, "email")?.toLowerCase();
    const role = (str(fd, "role") ?? "SALES") as Role;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "E-mail inválido" };
    if (role === "OWNER" && ctx.role !== "OWNER") return { ok: false, error: "Apenas o proprietário pode convidar outro proprietário" };
    const member = await db.membership.findFirst({ where: { orgId: ctx.org.id, user: { email }, active: true } });
    if (member) return { ok: false, error: "Este usuário já faz parte da equipe" };
    const token = randomBytes(24).toString("base64url");
    await db.invite.create({ data: { orgId: ctx.org.id, email, role, token } });
    revalidatePath("/settings/users");
    return { ok: true, message: "Convite criado — copie o link e envie ao usuário", link: `/invite/${token}` };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeInvite(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    await db.invite.deleteMany({ where: { id, orgId: ctx.org.id } });
    return done("Convite revogado");
  } catch (e) {
    return fail(e);
  }
}

export async function updateMember(id: string, data: { role?: Role; active?: boolean }): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const m = await db.membership.findFirst({ where: { id, orgId: ctx.org.id } });
    if (!m) return { ok: false, error: "Usuário não encontrado" };
    if (m.userId === ctx.user.id) return { ok: false, error: "Você não pode alterar o próprio acesso" };
    if ((m.role === "OWNER" || data.role === "OWNER") && ctx.role !== "OWNER") return { ok: false, error: "Apenas o proprietário pode fazer isso" };
    await db.membership.update({ where: { id }, data });
    return done("Usuário atualizado");
  } catch (e) {
    return fail(e);
  }
}

export async function createUserDirect(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const email = str(fd, "email")?.toLowerCase();
    const name = str(fd, "name");
    const password = str(fd, "password");
    const role = (str(fd, "role") ?? "SALES") as Role;
    if (!email || !name || !password) return { ok: false, error: "Preencha nome, e-mail e senha" };
    if (password.length < 8) return { ok: false, error: "Senha com no mínimo 8 caracteres" };
    if (role === "OWNER" && ctx.role !== "OWNER") return { ok: false, error: "Sem permissão" };
    let user = await db.user.findUnique({ where: { email } });
    if (!user) user = await db.user.create({ data: { email, name, passwordHash: await hashPassword(password) } });
    await db.membership.upsert({
      where: { userId_orgId: { userId: user.id, orgId: ctx.org.id } },
      create: { userId: user.id, orgId: ctx.org.id, role },
      update: { role, active: true },
    });
    return done("Usuário adicionado");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------- Automações ------------------------- */

export async function saveAutomation(id: string | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    const name = str(fd, "name");
    const trigger = str(fd, "trigger");
    const action = str(fd, "action");
    if (!name || !trigger || !action) return { ok: false, error: "Preencha nome, gatilho e ação" };
    const stageId = trigger === "DEAL_STAGE_ENTERED" ? str(fd, "stageId") : null;
    if (trigger === "DEAL_STAGE_ENTERED" && !stageId) return { ok: false, error: "Selecione a etapa" };
    const config = {
      activityType: str(fd, "activityType") ?? "TASK",
      title: str(fd, "title"),
      daysOffset: numOr(fd, "daysOffset", 0),
      tag: str(fd, "tag"),
      ownerId: str(fd, "ownerId"),
      note: str(fd, "note"),
      lifecycle: str(fd, "lifecycle"),
    };
    const data = { name, trigger, action, stageId, config };
    if (id) await db.automation.updateMany({ where: { id, orgId: ctx.org.id }, data });
    else await db.automation.create({ data: { ...data, orgId: ctx.org.id } });
    return done("Automação salva");
  } catch (e) {
    return fail(e);
  }
}

export async function toggleAutomation(id: string, active: boolean): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    await db.automation.updateMany({ where: { id, orgId: ctx.org.id }, data: { active } });
    return done(active ? "Automação ativada" : "Automação pausada");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("ADMIN");
    await db.automation.deleteMany({ where: { id, orgId: ctx.org.id } });
    return done("Automação excluída");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------- Metas ------------------------- */

export async function saveGoal(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    const period = str(fd, "period");
    if (!period || !/^\d{4}-\d{2}$/.test(period)) return { ok: false, error: "Período inválido" };
    const userId = str(fd, "userId");
    const metric = str(fd, "metric") ?? "REVENUE";
    const target = moneyOf(fd, "target");
    const existing = await db.goal.findFirst({ where: { orgId: ctx.org.id, period, metric, userId } });
    if (existing) await db.goal.update({ where: { id: existing.id }, data: { target } });
    else await db.goal.create({ data: { orgId: ctx.org.id, period, metric, userId, target } });
    return done("Meta salva");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("MANAGER");
    await db.goal.deleteMany({ where: { id, orgId: ctx.org.id } });
    return done("Meta removida");
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------- Perfil ------------------------- */

export async function updateProfile(fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireContext();
    const name = str(fd, "name");
    const current = str(fd, "currentPassword");
    const next = str(fd, "newPassword");
    const data: { name?: string; avatarColor?: string; phone?: string | null; passwordHash?: string } = {};
    if (name) data.name = name;
    data.avatarColor = str(fd, "avatarColor") ?? undefined;
    data.phone = str(fd, "phone");
    if (next) {
      if (next.length < 8) return { ok: false, error: "A nova senha deve ter pelo menos 8 caracteres" };
      const user = await db.user.findUniqueOrThrow({ where: { id: ctx.user.id } });
      if (!current || !(await checkPassword(current, user.passwordHash))) return { ok: false, error: "Senha atual incorreta" };
      data.passwordHash = await hashPassword(next);
    }
    await db.user.update({ where: { id: ctx.user.id }, data });
    return done("Perfil atualizado");
  } catch (e) {
    return fail(e);
  }
}
