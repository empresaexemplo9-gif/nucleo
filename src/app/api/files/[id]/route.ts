import { getContext } from "@/lib/auth";
import { db } from "@/lib/db";

/** Arquivos do ambiente da empresa (somente usuários da própria empresa). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext();
  if (!ctx) return new Response("Não autorizado", { status: 401 });
  const f = await db.storedFile.findFirst({ where: { id: (await params).id, orgId: ctx.org.id } });
  if (!f) return new Response("Não encontrado", { status: 404 });
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(f.name)}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
