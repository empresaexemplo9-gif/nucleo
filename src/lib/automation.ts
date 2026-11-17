import type { Automation } from "@prisma/client";
import { resolveSettings } from "./labels";
import { db } from "./db";
import { logEvent } from "./events";
import { money } from "./format";
import { managers, notify } from "./notify";
import { render, TRIGGERS, type AutomationConfig, type AutomationTrigger } from "./automation-defs";
import { conversationForContact, queueMessage, type Guard } from "./whatsapp/service";

export type { AutomationTrigger } from "./automation-defs";

type OrgInfo = { id: string; name: string; currency: string; locale: string; timezone: string; customDomain: string | null };

/** Sobre o que a automação age e os dados disponíveis para as mensagens. */
export type Target = {
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  recordId?: string | null;
  ownerId?: string | null;
  href?: string;
  vars?: Record<string, string>;
  guard?: Guard;
};

const UNIT = { MIN: 60_000, HOUR: 3_600_000, DAY: 86_400_000 };

export function baseUrl(org: { customDomain: string | null }) {
  const host = org.customDomain || process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "";
  return host ? (/^https?:\/\//.test(host) ? host : `https://${host}`).replace(/\/$/, "") : "";
}

export function fmtDate(d: Date, org: OrgInfo) {
  return {
    data: new Intl.DateTimeFormat(org.locale, { timeZone: org.timezone, weekday: "long", day: "2-digit", month: "2-digit" }).format(d),
    hora: new Intl.DateTimeFormat(org.locale, { timeZone: org.timezone, hour: "2-digit", minute: "2-digit" }).format(d),
  };
}

async function baseVars(org: OrgInfo, t: Target) {
  const [contact, deal, owner] = await Promise.all([
    t.contactId ? db.contact.findUnique({ where: { id: t.contactId }, select: { name: true } }) : null,
    t.dealId ? db.deal.findUnique({ where: { id: t.dealId }, select: { title: true, value: true } }) : null,
    t.ownerId ? db.user.findUnique({ where: { id: t.ownerId }, select: { name: true } }) : null,
  ]);
  const full = contact?.name ?? "";
  const vars: Record<string, string> = {
    nome: full.trim().split(/\s+/)[0] ?? "",
    nome_completo: full,
    empresa: org.name,
    responsavel: owner?.name ?? org.name,
    negocio: deal?.title ?? "",
    valor: deal ? money(deal.value, org.currency, org.locale) : "",
    titulo: deal?.title ?? "",
    data: "",
    hora: "",
    link: "",
    ...(t.vars ?? {}),
  };
  return vars;
}

/** Executa a ação de uma regra sobre o alvo. */
export async function executeRule(org: OrgInfo, rule: Automation, t: Target) {
  const orgId = org.id;
  const c = (rule.config ?? {}) as AutomationConfig;
  const vars = await baseVars(org, t);
  const txt = (s: string | undefined | null) => render(s ?? "", vars).trim();
  switch (rule.action) {
    case "CREATE_ACTIVITY": {
      const due = new Date();
      due.setDate(due.getDate() + Number(c.daysOffset ?? 0));
      due.setHours(9, 0, 0, 0);
      await db.activity.create({
        data: {
          orgId,
          type: (c.activityType as never) ?? "TASK",
          title: txt(c.title) || "Follow-up",
          dueAt: due,
          dealId: t.dealId,
          contactId: t.contactId,
          companyId: t.companyId,
          recordId: t.recordId,
          assigneeId: t.ownerId,
        },
      });
      break;
    }
    case "ADD_TAG":
      if (c.tag && t.dealId) {
        const deal = await db.deal.findUnique({ where: { id: t.dealId }, select: { tags: true } });
        if (deal && !deal.tags.includes(c.tag)) await db.deal.update({ where: { id: t.dealId }, data: { tags: { push: c.tag } } });
      }
      break;
    case "SET_OWNER":
      if (c.ownerId && t.dealId) await db.deal.update({ where: { id: t.dealId }, data: { ownerId: c.ownerId } });
      break;
    case "ADD_NOTE":
      if (c.note && (t.dealId || t.contactId || t.recordId))
        await db.note.create({ data: { orgId, dealId: t.dealId, contactId: t.dealId ? null : t.contactId, recordId: t.recordId, content: txt(c.note) } });
      break;
    case "SET_LIFECYCLE":
      if (c.lifecycle && t.contactId) await db.contact.update({ where: { id: t.contactId }, data: { lifecycle: c.lifecycle } });
      break;
    case "NOTIFY_TEAM": {
      const to = c.notifyTo ?? "OWNER";
      const ids = [...(to !== "MANAGERS" ? [t.ownerId] : []), ...(to !== "OWNER" || !t.ownerId ? await managers(orgId) : [])];
      await notify(orgId, ids, { type: "AUTOMATION", title: txt(c.title) || rule.name, body: txt(c.note) || undefined, href: t.href });
      break;
    }
    case "SEND_WHATSAPP": {
      const body = txt(c.message);
      if (!body || !t.contactId) break;
      const conv = await conversationForContact(orgId, t.contactId);
      if (!conv) break; // contato sem número
      const delay = TRIGGERS[rule.trigger as AutomationTrigger]?.scheduled ? 0 : Math.max(0, Number(c.delayValue ?? 0)) * UNIT[c.delayUnit ?? "MIN"];
      await queueMessage({
        orgId,
        conversationId: conv.id,
        body,
        source: "AUTOMATION",
        scheduledAt: delay ? new Date(Date.now() + delay) : null,
        template: c.templateName
          ? { name: c.templateName, lang: c.templateLang || "pt_BR", params: (c.templateParams ?? "").split(",").map((p) => p.trim().replace(/[{}]/g, "")).filter(Boolean).map((k) => vars[k] ?? "") }
          : null,
        guard: { ...t.guard, ...(c.stopOnReply ? { stopOnReply: true } : {}), ...(c.whileInStage && rule.stageId ? { stageId: rule.stageId } : {}) },
        automationId: rule.id,
        dealId: t.dealId,
      });
      break;
    }
  }
  // o envio de WhatsApp registra o próprio evento quando a mensagem sai de fato
  if (rule.action !== "SEND_WHATSAPP" && (t.dealId || t.contactId || t.recordId))
    await logEvent({ orgId, type: "AUTOMATION", dealId: t.dealId, contactId: t.dealId ? null : t.contactId, recordId: t.recordId, data: { name: rule.name } });
}

/** Variáveis de um registro de módulo: título, código, status, prazo, valor e cada campo pela chave ({rastreio}, {placa}…). */
export async function recordVars(org: OrgInfo, recordId: string) {
  const r = await db.moduleRecord.findUnique({ where: { id: recordId }, include: { status: true, module: { include: { fields: true } } } });
  if (!r) return null;
  const data = (r.data ?? {}) as Record<string, unknown>;
  const refIds = r.module.fields.filter((f) => ["CONTACT", "COMPANY", "RECORD"].includes(f.type)).map((f) => data[f.key]).filter((v): v is string => typeof v === "string");
  const [contacts, companies, records] = refIds.length
    ? await Promise.all([
        db.contact.findMany({ where: { id: { in: refIds }, orgId: org.id }, select: { id: true, name: true } }),
        db.company.findMany({ where: { id: { in: refIds }, orgId: org.id }, select: { id: true, name: true } }),
        db.moduleRecord.findMany({ where: { id: { in: refIds }, orgId: org.id }, select: { id: true, title: true } }),
      ])
    : [[], [], []];
  const names = Object.fromEntries([...contacts, ...companies, ...records.map((x) => ({ id: x.id, name: x.title }))].map((x) => [x.id, x.name]));
  const vars: Record<string, string> = {
    titulo: r.title,
    codigo: `${r.module.prefix}-${String(r.number).padStart(4, "0")}`,
    status: r.status?.name ?? "",
    valor: r.amount != null ? money(r.amount, org.currency, org.locale) : "",
    ...(r.dueAt ? fmtDate(r.dueAt, org) : {}),
  };
  for (const f of r.module.fields) {
    const v = data[f.key];
    if (v == null || v === "" || f.key in vars) continue;
    if (f.type === "CURRENCY") vars[f.key] = money(Number(v), org.currency, org.locale);
    else if (f.type === "DATE") vars[f.key] = String(v).split("-").reverse().join("/");
    else if (f.type === "DATETIME") vars[f.key] = String(v).replace(/^(\d{4})-(\d{2})-(\d{2})T/, "$3/$2/$1 às ");
    else if (f.type === "BOOLEAN") vars[f.key] = v ? "sim" : "não";
    else if (Array.isArray(v)) vars[f.key] = v.join(", ");
    else if (["CONTACT", "COMPANY", "RECORD"].includes(f.type)) vars[f.key] = names[String(v)] ?? "";
    else if (f.type === "FORMULA" && f.options[1] === "CURRENCY") vars[f.key] = money(Number(v), org.currency, org.locale);
    else if (f.type === "FORMULA" && f.options[1] === "PERCENT") vars[f.key] = `${Number(v).toLocaleString(org.locale)}%`;
    else vars[f.key] = String(v);
  }
  return { r, vars, href: `/m/${r.module.key}/${r.id}` };
}

/** Executa as automações de um evento de módulo (registro criado ou mudança de status). */
export async function runRecordAutomations(orgId: string, trigger: "RECORD_CREATED" | "RECORD_STATUS", recordId: string) {
  try {
    const org = await db.organization.findUnique({ where: { id: orgId }, select: ORG_SELECT });
    if (!org || !resolveSettings(org.settings).modules.automations) return;
    const rules = await db.automation.findMany({ where: { orgId, trigger, active: true } });
    if (!rules.length) return;
    const info = await recordVars(org, recordId);
    if (!info) return;
    const { r, vars, href } = info;
    for (const rule of rules) {
      const c = (rule.config ?? {}) as AutomationConfig;
      if (c.moduleKey && c.moduleKey !== r.module.key) continue;
      if (trigger === "RECORD_STATUS" && c.statusName && c.statusName.toLowerCase() !== (r.status?.name ?? "").toLowerCase()) continue;
      try {
        await executeRule(org, rule, { contactId: r.contactId, companyId: r.companyId, recordId: r.id, ownerId: r.assigneeId, href, vars });
      } catch (e) {
        console.error(`Falha na automação "${rule.name}"`, e);
      }
    }
  } catch (e) {
    console.error("Falha ao executar automação de módulo", e);
  }
}

export const ORG_SELECT = { id: true, name: true, currency: true, locale: true, timezone: true, customDomain: true, settings: true } as const;

/** Executa as automações de um evento do funil. Erros nunca interrompem a ação do usuário. */
export async function runAutomations(orgId: string, trigger: AutomationTrigger, dealId: string, stageId?: string) {
  try {
    const org = await db.organization.findUnique({ where: { id: orgId }, select: ORG_SELECT });
    // automações fora do plano não rodam
    if (!org || !resolveSettings(org.settings).modules.automations) return;
    const rules = await db.automation.findMany({
      where: { orgId, trigger, active: true, ...(trigger === "DEAL_STAGE_ENTERED" ? { stageId } : {}) },
    });
    if (!rules.length) return;
    for (const rule of rules) {
      try {
        // relê o negócio a cada regra: uma regra anterior pode ter trocado o responsável
        const deal = await db.deal.findUnique({ where: { id: dealId } });
        if (!deal) return;
        await executeRule(org, rule, { dealId: deal.id, contactId: deal.contactId, companyId: deal.companyId, ownerId: deal.ownerId, href: `/deals/${deal.id}` });
      } catch (e) {
        console.error(`Falha na automação "${rule.name}"`, e);
      }
    }
  } catch (e) {
    console.error("Falha ao executar automação", e);
  }
}
