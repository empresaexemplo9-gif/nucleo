import "server-only";
import type { Automation } from "@prisma/client";
import { db } from "./db";
import { money } from "./format";
import { resolveSettings } from "./labels";
import { baseUrl, executeRule, fmtDate, ORG_SELECT, recordVars, type Target } from "./automation";
import { TRIGGERS, type AutomationConfig, type AutomationTrigger } from "./automation-defs";
import { dispatchDue } from "./whatsapp/service";
import { dayKeyOffset, zoned } from "./zoned";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Tolerância a falhas do agendador: gatilhos vencidos há mais tempo que isso são ignorados. */
const LOOKBACK = 3 * DAY;
/** Lembretes do dia (aniversário, vencimento) só a partir desta hora local. */
const MORNING = 8;

const SCHEDULED = (Object.keys(TRIGGERS) as AutomationTrigger[]).filter((t) => TRIGGERS[t].scheduled);

type Org = { id: string; name: string; currency: string; locale: string; timezone: string; customDomain: string | null };

/** Dispara no máximo uma vez por regra e registro. */
async function once(org: Org, rule: Automation, key: string, target: Target) {
  const claim = await db.automationRun.createMany({ data: [{ automationId: rule.id, key }], skipDuplicates: true });
  if (!claim.count) return 0; // já disparou
  try {
    await executeRule(org, rule, target);
    return 1;
  } catch (e) {
    console.error(`Falha na automação "${rule.name}"`, e);
    return 0;
  }
}

async function scan(org: Org, rule: Automation, now: Date) {
  const c = (rule.config ?? {}) as AutomationConfig;
  const orgId = org.id;
  const days = Math.max(1, Number(c.days ?? 1));
  // janela em que o gatilho "vence": não reprocessa o passado ao criar a regra nem após uma parada longa
  const from = new Date(Math.max(now.getTime() - LOOKBACK, rule.createdAt.getTime() - DAY) - days * DAY);
  const until = new Date(now.getTime() - days * DAY);
  let fired = 0;

  switch (rule.trigger as AutomationTrigger) {
    case "DEAL_STALE": {
      const deals = await db.deal.findMany({ where: { orgId, status: "OPEN", stageChangedAt: { gte: from, lte: until }, ...(rule.stageId ? { stageId: rule.stageId } : {}) }, take: 200 });
      for (const d of deals)
        fired += await once(org, rule, `${d.id}:${d.stageChangedAt.toISOString()}`, {
          dealId: d.id, contactId: d.contactId, companyId: d.companyId, ownerId: d.ownerId, href: `/deals/${d.id}`,
          guard: { stageId: d.stageId },
        });
      break;
    }
    case "PROPOSAL_PENDING": {
      const list = await db.proposal.findMany({ where: { orgId, status: { in: ["SENT", "VIEWED"] }, sentAt: { gte: from, lte: until } }, take: 200 });
      const url = baseUrl(org);
      for (const p of list)
        fired += await once(org, rule, p.id, {
          dealId: p.dealId, contactId: p.contactId, companyId: p.companyId, ownerId: p.ownerId, href: `/proposals/${p.id}`,
          vars: { titulo: p.title, link: url ? `${url}/p/${p.token}` : "", valor: money(Number(p.totalOnce) || Number(p.totalMonthly), org.currency, org.locale) },
        });
      break;
    }
    case "ACTIVITY_REMINDER": {
      const hours = Math.min(168, Math.max(1, Number(c.hoursBefore ?? 24)));
      const list = await db.activity.findMany({
        where: { orgId, done: false, contactId: { not: null }, dueAt: { gt: now, lte: new Date(now.getTime() + hours * HOUR) }, ...(c.reminderType && c.reminderType !== "ANY" ? { type: c.reminderType as never } : {}) },
        take: 200,
      });
      for (const a of list)
        fired += await once(org, rule, `${a.id}:${a.dueAt!.toISOString()}`, {
          dealId: a.dealId, contactId: a.contactId, companyId: a.companyId, ownerId: a.assigneeId, href: "/activities",
          vars: { titulo: a.title, ...fmtDate(a.dueAt!, org) },
          guard: { activityId: a.id, activityDueAt: a.dueAt!.toISOString() },
        });
      break;
    }
    case "RECORD_DUE": {
      // contato só é obrigatório para mensagens ao cliente; avisos à equipe e atividades valem para qualquer registro
      const needsContact = rule.action === "SEND_WHATSAPP";
      const openRecord = { orgId, closedAt: null, ...(needsContact ? { contactId: { not: null } } : {}), OR: [{ statusId: null }, { status: { isFinal: false } }], ...(c.moduleKey ? { module: { key: c.moduleKey } } : {}) };
      if (c.dueUnit === "HOUR") {
        // horários marcados (consultas, visitas, aulas, audiências): X horas antes
        const hours = Math.min(168, Math.max(1, Number(c.hoursBefore ?? 24)));
        const list = await db.moduleRecord.findMany({ where: { ...openRecord, dueAt: { gt: now, lte: new Date(now.getTime() + hours * HOUR) } }, select: { id: true, dueAt: true }, take: 300 });
        for (const r of list) {
          const info = await recordVars(org, r.id);
          if (!info) continue;
          fired += await once(org, rule, `${r.id}:${r.dueAt!.toISOString()}`, {
            contactId: info.r.contactId, companyId: info.r.companyId, recordId: r.id, ownerId: info.r.assigneeId, href: info.href, vars: info.vars,
            guard: { recordId: r.id, recordDueAt: r.dueAt!.toISOString() },
          });
        }
        break;
      }
      if (zoned(now, org.timezone).hour < MORNING) break;
      const n = Math.max(0, Number(c.days ?? 0));
      const offset = c.when === "BEFORE" ? n : c.when === "AFTER" ? -n : 0;
      const dayKey = dayKeyOffset(now, org.timezone, offset);
      const center = now.getTime() + offset * DAY;
      const list = await db.moduleRecord.findMany({
        where: { ...openRecord, dueAt: { gte: new Date(center - 2 * DAY), lte: new Date(center + 2 * DAY) } },
        select: { id: true, dueAt: true },
        take: 300,
      });
      for (const r of list) {
        if (zoned(r.dueAt!, org.timezone).key !== dayKey) continue;
        const info = await recordVars(org, r.id);
        if (!info) continue;
        fired += await once(org, rule, `${r.id}:${dayKey}`, {
          contactId: info.r.contactId, companyId: info.r.companyId, recordId: r.id, ownerId: info.r.assigneeId, href: info.href, vars: info.vars,
          guard: { recordId: r.id, recordDueAt: r.dueAt!.toISOString() },
        });
      }
      break;
    }
    case "CONTACT_BIRTHDAY": {
      const z = zoned(now, org.timezone);
      if (z.hour < MORNING) break;
      const list = await db.$queryRaw<{ id: string; ownerId: string | null; companyId: string | null }[]>`
        SELECT id, "ownerId", "companyId" FROM "Contact"
        WHERE "orgId" = ${orgId} AND birthday IS NOT NULL
          AND EXTRACT(MONTH FROM birthday) = ${z.month} AND EXTRACT(DAY FROM birthday) = ${z.day}
        LIMIT 500`;
      for (const p of list) fired += await once(org, rule, `${p.id}:${z.year}`, { contactId: p.id, companyId: p.companyId, ownerId: p.ownerId, href: `/contacts/${p.id}` });
      break;
    }
  }
  return fired;
}

/** Lembretes e follow-ups de uma empresa. */
export async function runScheduled(orgId: string, now = new Date()) {
  const org = await db.organization.findUnique({ where: { id: orgId }, select: ORG_SELECT });
  if (!org || !resolveSettings(org.settings).modules.automations) return 0;
  const rules = await db.automation.findMany({ where: { orgId, active: true, trigger: { in: SCHEDULED } } });
  let fired = 0;
  for (const rule of rules) {
    try {
      fired += await scan(org, rule, now);
    } catch (e) {
      console.error(`Falha ao varrer a automação "${rule.name}"`, e);
    }
  }
  return fired;
}

/** Execução completa do agendador (cron): todas as empresas com regras agendadas + fila de envio. */
export async function runAll() {
  const orgs = await db.automation.findMany({ where: { active: true, trigger: { in: SCHEDULED } }, distinct: ["orgId"], select: { orgId: true } });
  let fired = 0;
  for (const { orgId } of orgs) fired += await runScheduled(orgId);
  await db.organization.updateMany({ where: { id: { in: orgs.map((o) => o.orgId) } }, data: { automationTickAt: new Date() } });
  const queue = await dispatchDue();
  // limpeza: o controle de disparo único só precisa cobrir o período de tolerância (aniversários: o ano)
  await db.automationRun.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 400 * DAY) } } });
  return { orgs: orgs.length, fired, ...queue };
}

/**
 * Execução oportunista enquanto alguém usa o sistema: complementa o cron quando ele roda poucas vezes por dia.
 * No máximo uma vez a cada 5 minutos por empresa.
 */
export async function tick(orgId: string) {
  try {
    const now = new Date();
    const claim = await db.organization.updateMany({
      where: { id: orgId, OR: [{ automationTickAt: null }, { automationTickAt: { lt: new Date(now.getTime() - 5 * 60_000) } }] },
      data: { automationTickAt: now },
    });
    if (!claim.count) return;
    await runScheduled(orgId, now);
    await dispatchDue(orgId, 20);
  } catch (e) {
    console.error("Falha no agendador", e);
  }
}
