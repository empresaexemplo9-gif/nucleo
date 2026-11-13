import { db } from "@/lib/db";

/** PDF original do contrato para quem tem o link de assinatura. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const s = await db.contractSigner.findUnique({ where: { token: (await params).token }, include: { contract: { include: { file: true } } } });
  const f = s?.contract.file;
  if (!s || !f || s.contract.status === "CANCELED") return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(f.data), {
    headers: { "Content-Type": f.mime, "Content-Disposition": `inline; filename="${encodeURIComponent(f.name)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
