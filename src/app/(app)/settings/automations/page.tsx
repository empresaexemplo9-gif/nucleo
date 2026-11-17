import { requireFeature } from "@/lib/auth";
import { db } from "@/lib/db";
import { guard } from "../guard";
import { AutomationsManager } from "./automations-manager";

export const metadata = { title: "Automações" };

export default async function AutomationsPage() {
  const ctx = await guard("ADMIN");
  requireFeature(ctx, "automations");
  const [list, account] = await Promise.all([
    db.automation.findMany({ where: { orgId: ctx.org.id }, orderBy: { createdAt: "asc" } }),
    db.whatsappAccount.findUnique({ where: { orgId: ctx.org.id }, select: { active: true } }),
  ]);
  return (
    <AutomationsManager
      whatsapp={!!account?.active}
      automations={list.map((a) => ({ id: a.id, name: a.name, trigger: a.trigger, stageId: a.stageId, action: a.action, active: a.active, config: a.config as Record<string, string | number | boolean | null> }))}
    />
  );
}
