import { db } from "@/lib/db";

/** Fotos dos imóveis publicados no feed (os portais baixam as imagens por este endereço). */
export async function GET(_: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params;
  const f = await db.storedFile.findFirst({
    where: { id: fileId, mime: { startsWith: "image/" }, record: { module: { feedToken: token }, data: { path: ["publicar"], equals: true } } },
  });
  if (!f) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: { "Content-Type": f.mime, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
