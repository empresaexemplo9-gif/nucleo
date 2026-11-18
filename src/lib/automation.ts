import { resolveSettings } from "./labels";
import { db } from "./db";
import { logEvent } from "./events";

export type AutomationTrigger = "DEAL_CREATED" | "DEAL_STAGE_ENTERED" | "DEAL_WON" | "DEAL_LOST";

export const TRIGGERS: Record<AutomationTrigger, string> = {
  DEAL_CREATED: "Quando um negócio for criado",
  DEAL_STAGE_ENTERED: "Quando um negócio entrar na etapa",
  DEAL_WON: "Quando um negócio for ganho",
  DEAL_LOST: "Quando um negócio for perdido",
};

export const ACTIONS = {
  CREATE_ACTIVITY: "Criar atividade",
  ADD_TAG: "Adicionar etiqueta",
  SET_OWNER: "Definir responsável",
  ADD_NOTE: "Adicionar nota",
  SET_LIFECYCLE: "Alterar ciclo de vida do contato",
  SEND_WHATSAPP: "Enviar WhatsApp",
} as const;

type Config = {
  activityType?: string;
  title?: string;
  daysOffset?: number;
  tag?: string;
  ownerId?: string;
  note?: string;
  lifecycle?: string;
  /** SEND_WHATSAPP: modelo aprovado, variáveis separadas por "|", texto dentro da janela de 24h e atraso */
  waTemplate?: string;
  waParams?: string;
  waText?: string;
  delayHours?: number;
  skipIfReplied?: boolean;
};

/** Executa automações configuradas. Erros nunca interrompem a ação do usuário. */
export async function runAutomations(orgId: string, trigger: AutomationTrigger, dealId: string, stageId?: string) {
  try {
    // automações fora do plano não rodam
    const org = await db.organization.findUnique({ where: { id: orgId }, select: { settings: true } });
    if (!resolveSettings(org?.settings).modules.automations) return;
    const rules = await db.automation.findMany({
      where: { orgId, trigger, active: true, ...(trigger === "DEAL_STAGE_ENTERED" ? { stageId } : {}) },
    });
    if (!rules.length) return;
    const deal = await db.deal.findUnique({ where: { id: dealId } });
    if (!deal) return;
    for (const rule of rules) {
      const c = (rule.config ?? {}) as Config;
      switch (rule.action) {
        case "CREATE_ACTIVITY": {
          const due = new Date();
          due.setDate(due.getDate() + Number(c.daysOffset ?? 0));
          due.setHours(9, 0, 0, 0);
          await db.activity.create({
            data: {
              orgId,
              type: (c.activityType as never) ?? "TASK",
              title: (c.title || "Follow-up").replace("{negocio}", deal.title),
              dueAt: due,
              dealId: deal.id,
              contactId: deal.contactId,
              companyId: deal.companyId,
              assigneeId: deal.ownerId,
            },
          });
          break;
        }
        case "ADD_TAG":
          if (c.tag && !deal.tags.includes(c.tag))
            await db.deal.update({ where: { id: deal.id }, data: { tags: { push: c.tag } } });
          break;
        case "SET_OWNER":
          if (c.ownerId) await db.deal.update({ where: { id: deal.id }, data: { ownerId: c.ownerId } });
          break;
        case "ADD_NOTE":
          if (c.note) await db.note.create({ data: { orgId, dealId: deal.id, content: c.note } });
          break;
        case "SEND_WHATSAPP":
          await queueWhatsApp(orgId, rule.id, deal, c);
          break;
        case "SET_LIFECYCLE":
          if (c.lifecycle && deal.contactId)
            await db.contact.update({ where: { id: deal.contactId }, data: { lifecycle: c.lifecycle } });
          break;
      }
      await logEvent({ orgId, type: "AUTOMATION", dealId: deal.id, data: { name: rule.name } });
    }
  } catch (e) {
    console.error("Falha ao executar automação", e);
  }
}

/** Envio de WhatsApp da automação: imediato ou agendado (follow-up). */
async function queueWhatsApp(orgId: string, automationId: string, deal: { id: string; title: string; value: unknown; contactId: string | null; ownerId: string | null }, c: Config) {
  if (!deal.contactId) return;
  const { getChannel, deliver } = await import("./whatsapp/service");
  const { fillVars, toWaId } = await import("./whatsapp/config");
  const channel = await getChannel(orgId);
  if (!channel) return;
  const contact = await db.contact.findUnique({ where: { id: deal.contactId }, select: { name: true, whatsapp: true, phone: true } });
  const to = toWaId(contact?.whatsapp) ?? toWaId(contact?.phone);
  if (!contact || !to) return;
  const owner = deal.ownerId ? await db.user.findUnique({ where: { id: deal.ownerId }, select: { name: true } }) : null;
  const vars = {
    nome: contact.name,
    primeiro_nome: contact.name.split(" ")[0],
    empresa: channel.orgName,
    negocio: deal.title,
    consultor: owner?.name.split(" ")[0],
    valor: Number(deal.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  };
  const tpl = c.waTemplate ? channel.templates.find((t) => t.name === c.waTemplate) : undefined;
  const payload = {
    template: tpl ? { name: tpl.name, language: tpl.language, params: (c.waParams ?? "").split("|").map((p) => fillVars(p.trim(), vars)).slice(0, tpl.params) } : undefined,
    text: c.waText ? fillVars(c.waText, vars) : undefined,
    skipIfReplied: !!c.skipIfReplied,
  };
  if (!payload.template && !payload.text) return;
  const hours = Math.max(0, Number(c.delayHours ?? 0));
  if (hours > 0) {
    await db.whatsAppScheduled.create({
      data: { orgId, to, contactId: deal.contactId, dealId: deal.id, automationId, payload, sendAt: new Date(Date.now() + hours * 3600_000) },
    });
    return;
  }
  try {
    await deliver(channel, to, payload, { contactName: contact.name });
  } catch (e) {
    await db.whatsAppScheduled.create({
      data: { orgId, to, contactId: deal.contactId, dealId: deal.id, automationId, payload, sendAt: new Date(), status: "FAILED", error: (e as Error).message.slice(0, 500) },
    });
  }
}
