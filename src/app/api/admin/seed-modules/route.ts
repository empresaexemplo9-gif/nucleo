import { timingSafeEqual } from "crypto";
import { seedModules } from "@/lib/demo-modules";

export const maxDuration = 300;

const ALLOWED = "thiagohccarvalho00@gmail.com";

// Rota temporária: cria módulos de controle interno de apresentação na conta indicada. Remover após o uso.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const expected = process.env.SEED_TOKEN ?? "";
  const ok = expected.length >= 32 && token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!ok) return new Response("Não autorizado", { status: 401 });
  try {
    return Response.json(await seedModules(ALLOWED));
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
