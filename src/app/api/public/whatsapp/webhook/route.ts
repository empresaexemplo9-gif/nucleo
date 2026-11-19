import { createHmac, timingSafeEqual } from "crypto";
import { after } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { runBot } from "@/lib/whatsapp/bot";
import { queueMessage, receiveMessage, receiveStatus, type Inbound } from "@/lib/whatsapp/service";

export const maxDuration = 60;

/** Verificação do webhook pela Meta: devolve o desafio se o token for de alguma empresa. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = q.get("hub.verify_token");
  if (q.get("hub.mode") !== "subscribe" || !token) return new Response("Requisição inválida", { status: 400 });
  const account = await db.whatsappAccount.findUnique({ where: { verifyToken: token }, select: { id: true } });
  if (!account) return new Response("Token inválido", { status: 403 });
  return new Response(q.get("hub.challenge") ?? "", { headers: { "Content-Type": "text/plain" } });
}

type WaMessage = { id: string; from: string; type: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } } };
type WaValue = {
  metadata?: { phone_number_id?: string };
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: WaMessage[];
  statuses?: { id: string; status: string; errors?: { title?: string; message?: string }[] }[];
};

const PLACEHOLDER: Record<string, string> = { image: "[imagem]", audio: "[áudio]", video: "[vídeo]", document: "[documento]", sticker: "[figurinha]", location: "[localização]", contacts: "[contato]", reaction: "" };

function textOf(m: WaMessage) {
  if (m.type === "text") return m.text?.body ?? "";
  if (m.type === "button") return m.button?.text ?? "";
  if (m.type === "interactive") return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
  return PLACEHOLDER[m.type] ?? "[mensagem não suportada]";
}

/** Mensagens e status enviados pela Meta. A assinatura é conferida com o segredo do app da empresa. */
export async function POST(req: Request) {
  const raw = await req.text();
  let body: { entry?: { changes?: { value?: WaValue }[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }
  const values = (body.entry ?? []).flatMap((e) => e.changes ?? []).map((c) => c.value).filter((v): v is WaValue => !!v?.metadata?.phone_number_id);
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  for (const value of values) {
    const account = await db.whatsappAccount.findUnique({ where: { phoneNumberId: value.metadata!.phone_number_id! } });
    if (!account || !account.active) continue;
    const expected = "sha256=" + createHmac("sha256", decrypt(account.appSecretEnc)).update(raw).digest("hex");
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return new Response("Assinatura inválida", { status: 401 });

    for (const s of value.statuses ?? []) await receiveStatus(account.orgId, { id: s.id, status: s.status, error: s.errors?.[0]?.message || s.errors?.[0]?.title });
    for (const m of value.messages ?? []) {
      const text = textOf(m).trim();
      if (!text) continue;
      const inbound: Inbound = { waId: m.id, from: m.from, text: text.slice(0, 4000), name: value.contacts?.find((c) => c.wa_id === m.from)?.profile?.name ?? value.contacts?.[0]?.profile?.name };
      const got = await receiveMessage(account, inbound);
      if (!got) continue;
      // responde depois de confirmar o recebimento: a Meta reenvia se o webhook demorar
      after(async () => {
        try {
          if (got.optOut) await queueMessage({ orgId: account.orgId, conversationId: got.conversation.id, body: "Pronto! Você não receberá mais mensagens automáticas. Para voltar a receber, envie VOLTAR.", source: "BOT" });
          else if (m.type === "text" || m.type === "button" || m.type === "interactive") await runBot(account, got.conversation, text, got.first);
        } catch (e) {
          console.error("Falha no chatbot", e);
        }
      });
    }
  }
  return Response.json({ ok: true });
}
