import "server-only";

/** Cliente mínimo da WhatsApp Cloud API (API oficial da Meta). */
const GRAPH = () => (process.env.WHATSAPP_GRAPH_URL || "https://graph.facebook.com/v23.0").replace(/\/$/, "");

export type WaTemplate = { name: string; lang: string; params: string[] };
export type WaResult = { ok: true; waId: string } | { ok: false; error: string; code?: number; retryable: boolean };

/** Código da Meta para "fora da janela de 24h": só modelos aprovados podem ser enviados. */
export const OUTSIDE_WINDOW = 131047;

async function call(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${GRAPH()}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { res, json };
}

async function post(phoneNumberId: string, token: string, payload: Record<string, unknown>): Promise<WaResult> {
  try {
    const { res, json } = await call(`${phoneNumberId}/messages`, token, { method: "POST", body: JSON.stringify({ messaging_product: "whatsapp", ...payload }) });
    const id = (json?.messages as { id?: string }[] | undefined)?.[0]?.id;
    if (res.ok && id) return { ok: true, waId: id };
    const err = json?.error as { message?: string; code?: number; error_data?: { details?: string } } | undefined;
    return {
      ok: false,
      error: (err?.error_data?.details || err?.message || `Erro ${res.status} ao enviar`).slice(0, 300),
      code: err?.code,
      retryable: res.status === 429 || res.status >= 500,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Falha de rede", retryable: true };
  }
}

export function sendText(phoneNumberId: string, token: string, to: string, body: string) {
  return post(phoneNumberId, token, { to, type: "text", text: { body: body.slice(0, 4096), preview_url: true } });
}

export function sendTemplate(phoneNumberId: string, token: string, to: string, t: WaTemplate) {
  return post(phoneNumberId, token, {
    to,
    type: "template",
    template: {
      name: t.name,
      language: { code: t.lang || "pt_BR" },
      ...(t.params.length ? { components: [{ type: "body", parameters: t.params.map((text) => ({ type: "text", text: text.replace(/\s+/g, " ").slice(0, 1000) || "-" })) }] } : {}),
    },
  });
}

/** Confere as credenciais lendo os dados do número na Meta. */
export async function fetchPhoneInfo(phoneNumberId: string, token: string) {
  try {
    const { res, json } = await call(`${phoneNumberId}?fields=display_phone_number,verified_name`, token);
    if (!res.ok) return { ok: false as const, error: ((json?.error as { message?: string })?.message || `Erro ${res.status}`).slice(0, 300) };
    return { ok: true as const, displayPhone: String(json?.display_phone_number ?? ""), name: String(json?.verified_name ?? "") };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Falha de rede" };
  }
}
