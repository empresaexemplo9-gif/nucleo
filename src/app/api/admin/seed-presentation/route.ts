import { timingSafeEqual } from "crypto";
import { seedPresentation } from "@/lib/demo-presentation";

// Rota temporária: popula a conta indicada com dados de apresentação. Remover após o uso.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const expected = process.env.SEED_TOKEN ?? "";
  const ok = expected.length >= 32 && token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!ok) return new Response("Não autorizado", { status: 401 });
  const email = url.searchParams.get("email");
  if (!email) return Response.json({ ok: false, error: "Informe o e-mail" }, { status: 400 });
  try {
    return Response.json({ ok: true, ...(await seedPresentation(email)) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
