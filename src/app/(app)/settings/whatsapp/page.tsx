import { headers } from "next/headers";
import { requireFeature } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiAvailable } from "@/lib/whatsapp/ai";
import { resolveBot, resolveTemplates } from "@/lib/whatsapp/config";
import { guard } from "../guard";
import { WhatsAppSettings } from "./whatsapp-settings";

export const metadata = { title: "WhatsApp" };

export default async function WhatsAppPage() {
  const ctx = await guard("ADMIN");
  requireFeature(ctx, "whatsapp");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const [row, jobs, counts] = await Promise.all([
    db.whatsAppChannel.findUnique({ where: { orgId: ctx.org.id } }),
    db.whatsAppScheduled.findMany({ where: { orgId: ctx.org.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.whatsAppScheduled.groupBy({ by: ["status"], where: { orgId: ctx.org.id }, _count: true }),
  ]);
  const contacts = await db.contact.findMany({ where: { id: { in: jobs.map((j) => j.contactId).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
  return (
    <WhatsAppSettings
      superadmin={ctx.superadmin}
      aiReady={aiAvailable()}
      cronReady={!!process.env.CRON_SECRET}
      webhookUrl={`${proto}://${host}/api/whatsapp/webhook`}
      channel={
        row
          ? {
              phoneNumberId: row.phoneNumberId,
              wabaId: row.wabaId,
              displayPhone: row.displayPhone,
              active: row.active,
              hasAppSecret: !!row.appSecret,
              verifyToken: ctx.superadmin ? row.verifyToken : null,
            }
          : null
      }
      bot={resolveBot(row?.bot)}
      templates={resolveTemplates(row?.templates)}
      jobs={jobs.map((j) => ({
        id: j.id,
        to: j.to,
        contact: contacts.find((c) => c.id === j.contactId)?.name ?? null,
        status: j.status,
        error: j.error,
        sendAt: j.sendAt.toISOString(),
        what: ((j.payload as { text?: string }).text ?? (j.payload as { template?: { name: string } }).template?.name ?? "").slice(0, 120),
      }))}
      counts={Object.fromEntries(counts.map((c) => [c.status, c._count]))}
    />
  );
}
