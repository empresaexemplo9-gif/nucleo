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
} as const;

type Config = {
  activityType?: string;
  title?: string;
  daysOffset?: number;
  tag?: string;
  ownerId?: string;
  note?: string;
  lifecycle?: string;
};

/** Executa automações configuradas. Erros nunca interrompem a ação do usuário. */
export async function runAutomations(orgId: string, trigger: AutomationTrigger, dealId: string, stageId?: string) {
  try {
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
