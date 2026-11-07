import { db } from "@/lib/db";
import { guard } from "../guard";
import { AutomationsManager } from "./automations-manager";

export const metadata = { title: "Automações" };

export default async function AutomationsPage() {
  const ctx = await guard("ADMIN");
  const list = await db.automation.findMany({ where: { orgId: ctx.org.id }, orderBy: { createdAt: "asc" } });
  return (
    <AutomationsManager
      automations={list.map((a) => ({ id: a.id, name: a.name, trigger: a.trigger, stageId: a.stageId, action: a.action, active: a.active, config: a.config as Record<string, string | number | null> }))}
    />
  );
}
