import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Cliente mínimo do WhatsApp Cloud API (Meta Graph API). */
const GRAPH = process.env.WHATSAPP_GRAPH_URL || "https://graph.facebook.com";
const VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";

export type Creds = { phoneNumberId: string; accessToken: string; wabaId?: string | null };

export class WhatsAppError extends Error {
  constructor(message: string, readonly code?: number) {
    super(message);
  }
}

async function call<T>(creds: Creds, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${GRAPH}/${VERSION}/${path}`, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: { Authorization: `Bearer ${creds.accessToken}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number; error_user_msg?: string } } & T;
  if (!res.ok || json.error) {
    const e = json.error;
    throw new WhatsAppError(friendly(e?.code, e?.error_user_msg || e?.message || `Erro ${res.status} na API do WhatsApp`), e?.code);
  }
  return json;
}

function friendly(code: number | undefined, msg: string) {
  if (code === 131047 || code === 131026) return "Fora da janela de 24h: o cliente precisa receber um modelo aprovado.";
  if (code === 190) return "Token de acesso do WhatsApp inválido ou expirado.";
  if (code === 131030) return "Número não está na lista de destinatários de teste do app da Meta.";
  if (code === 132001) return "Modelo de mensagem não encontrado ou não aprovado nesse idioma.";
  return msg;
}

type SendResult = { messages?: { id: string }[] };

function send(creds: Creds, to: string, payload: Record<string, unknown>) {
  return call<SendResult>(creds, `${creds.phoneNumberId}/messages`, {
    body: { messaging_product: "whatsapp", recipient_type: "individual", to, ...payload },
  }).then((r) => r.messages?.[0]?.id ?? null);
}

export const sendText = (creds: Creds, to: string, body: string) => send(creds, to, { type: "text", text: { body: body.slice(0, 4096), preview_url: true } });

export const sendTemplate = (creds: Creds, to: string, name: string, language: string, params: string[]) =>
  send(creds, to, {
    type: "template",
    template: {
      name,
      language: { code: language },
      ...(params.length ? { components: [{ type: "body", parameters: params.map((p) => ({ type: "text", text: p || "-" })) }] } : {}),
    },
  });

/** Até 3 opções viram botões; até 10 viram lista. */
export function sendMenu(creds: Creds, to: string, body: string, options: { id: string; label: string }[], button = "Ver opções") {
  if (options.length <= 3)
    return send(creds, to, {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body.slice(0, 1024) },
        action: { buttons: options.map((o) => ({ type: "reply", reply: { id: o.id, title: o.label.slice(0, 20) } })) },
      },
    });
  return send(creds, to, {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body.slice(0, 1024) },
      action: { button: button.slice(0, 20), sections: [{ title: "Opções", rows: options.slice(0, 10).map((o) => ({ id: o.id, title: o.label.slice(0, 24) })) }] },
    },
  });
}

export const markRead = (creds: Creds, messageId: string) =>
  call(creds, `${creds.phoneNumberId}/messages`, { body: { messaging_product: "whatsapp", status: "read", message_id: messageId } }).catch(() => null);

export const phoneInfo = (creds: Creds) =>
  call<{ display_phone_number?: string; verified_name?: string; quality_rating?: string }>(creds, `${creds.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`);

type MetaTemplate = { name: string; language: string; status: string; category?: string; components?: { type: string; text?: string }[] };

export async function listTemplates(creds: Creds) {
  if (!creds.wabaId) throw new WhatsAppError("Informe o ID da conta do WhatsApp Business (WABA) para buscar os modelos.");
  const r = await call<{ data: MetaTemplate[] }>(creds, `${creds.wabaId}/message_templates?fields=name,language,status,category,components&limit=200`);
  return r.data.filter((t) => t.status === "APPROVED");
}

/** Confere a assinatura X-Hub-Signature-256 do webhook. */
export function validSignature(raw: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(header.slice(7), "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
