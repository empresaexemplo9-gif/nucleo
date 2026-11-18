import { requireFeature } from "@/lib/auth";
import { db } from "@/lib/db";
import { guard } from "../guard";
import { AutomationsManager } from "./automations-manager";
import { resolveTemplates } from "@/lib/whatsapp/config";

export const metadata = { title: "Automações" };

export default async function AutomationsPage() {
  const ctx = await guard("ADMIN");
  requireFeature(ctx, "automations");
  const [list, channel] = await Promise.all([
    db.automation.findMany({ where: { orgId: ctx.org.id }, orderBy: { createdAt: "asc" } }),
    ctx.settings.modules.whatsapp ? db.whatsAppChannel.findUnique({ where: { orgId: ctx.org.id }, select: { templates: true, active: true } }) : null,
  ]);
  return (
    <AutomationsManager
      whatsapp={channel?.active ? { templates: resolveTemplates(channel.templates) } : null}
      automations={list.map((a) => ({ id: a.id, name: a.name, trigger: a.trigger, stageId: a.stageId, action: a.action, active: a.active, config: a.config as Record<string, string | number | null> }))}
    />
  );
}
