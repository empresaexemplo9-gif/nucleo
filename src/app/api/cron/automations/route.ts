import { timingSafeEqual } from "crypto";
import { runAll } from "@/lib/scheduler";

export const maxDuration = 60;

/**
 * Agendador: lembretes, follow-ups e fila de mensagens do WhatsApp.
 * Chamado pelo Vercel Cron (que envia `Authorization: Bearer $CRON_SECRET`) ou por qualquer agendador externo.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return Response.json({ error: "Não autorizado" }, { status: 401 });
  return Response.json({ ok: true, ...(await runAll()) });
}
