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
