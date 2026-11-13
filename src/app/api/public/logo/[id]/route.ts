import { db } from "@/lib/db";

/** Logotipo em alta resolução da empresa (público: usado na plataforma, propostas e contratos). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await db.organization.findFirst({ where: { logoUrl: `/api/public/logo/${id}` }, select: { id: true } });
  if (!org) return new Response("Não encontrado", { status: 404 });
  const f = await db.storedFile.findFirst({ where: { id, orgId: org.id } });
  if (!f) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(f.data), {
    headers: { "Content-Type": f.mime, "Cache-Control": "public, max-age=31536000, immutable", ...(f.mime === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } : {}) },
  });
}
