import { after } from "next/server";
import { db } from "@/lib/db";
import { validSignature } from "@/lib/whatsapp/cloud";
import { channelByPhoneId, handleInbound, handleStatus, processScheduled } from "@/lib/whatsapp/service";

export const maxDuration = 60;

/** Verificação do webhook pela Meta (hub.challenge). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = u.searchParams.get("hub.verify_token");
  if (u.searchParams.get("hub.mode") !== "subscribe" || !token) return new Response("Forbidden", { status: 403 });
  const ok = await db.whatsAppChannel.findFirst({ where: { verifyToken: token }, select: { id: true } });
  if (!ok) return new Response("Forbidden", { status: 403 });
  return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
}

type Change = {
  field: string;
  value: {
    metadata?: { phone_number_id: string };
    contacts?: { wa_id: string; profile?: { name?: string } }[];
    messages?: Parameters<typeof handleInbound>[1][];
    statuses?: Parameters<typeof handleStatus>[0][];
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  let body: { object?: string; entry?: { changes?: Change[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  if (body.object !== "whatsapp_business_account") return new Response("ok");
  const signature = req.headers.get("x-hub-signature-256");
  const changes = (body.entry ?? []).flatMap((e) => e.changes ?? []).filter((c) => c.field === "messages" && c.value.metadata);
  const work: (() => Promise<void>)[] = [];
  for (const change of changes) {
    const channel = await channelByPhoneId(change.value.metadata!.phone_number_id);
    if (!channel) continue;
    // com a chave secreta do app cadastrada, só aceita eventos assinados pela Meta
    if (channel.appSecret && !validSignature(raw, signature, channel.appSecret)) return new Response("Invalid signature", { status: 401 });
    const names = new Map((change.value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]));
    for (const s of change.value.statuses ?? []) work.push(() => handleStatus(s));
    for (const m of change.value.messages ?? []) work.push(() => handleInbound(channel, m, names.get(m.from)));
  }
  // responde rápido para a Meta e processa em seguida (chatbot e IA podem levar alguns segundos)
  after(async () => {
    for (const w of work) {
      try {
        await w();
      } catch (e) {
        console.error("[whatsapp-webhook]", e);
      }
    }
    await processScheduled(10).catch((e) => console.error("[whatsapp-scheduled]", e));
  });
  return new Response("ok");
}
