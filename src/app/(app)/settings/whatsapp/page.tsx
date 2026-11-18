import { headers } from "next/headers";
import { db } from "@/lib/db";
import { aiAvailable } from "@/lib/whatsapp/ai";
import { resolveBot } from "@/lib/whatsapp/bot-config";
import { guard } from "../guard";
import { WhatsappSettings } from "./whatsapp-settings";

export const metadata = { title: "WhatsApp" };

export default async function WhatsappSettingsPage() {
  const ctx = await guard("ADMIN");
  const account = await db.whatsappAccount.findUnique({ where: { orgId: ctx.org.id } });
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const origin = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "";
  return (
    <WhatsappSettings
      webhookUrl={`${origin}/api/public/whatsapp/webhook`}
      cronReady={!!process.env.CRON_SECRET}
      superadmin={ctx.superadmin}
      ai={{ plan: ctx.settings.modules.aiBot, key: aiAvailable() }}
      account={
        account && {
          phoneNumberId: account.phoneNumberId,
          displayPhone: account.displayPhone,
          verifyToken: account.verifyToken,
          sendStart: account.sendStart,
          sendEnd: account.sendEnd,
          autoCreateContact: account.autoCreateContact,
          botEnabled: account.botEnabled,
          botMode: account.botMode,
          bot: resolveBot(account.botConfig),
        }
      }
    />
  );
}
