import { processScheduled } from "@/lib/whatsapp/service";

export const maxDuration = 60;

/**
 * Envios agendados do WhatsApp (follow-ups). Chamado pelo cron da Vercel ou por um agendador externo
 * com o cabeçalho Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const r = await processScheduled(50);
  return Response.json(r);
}
