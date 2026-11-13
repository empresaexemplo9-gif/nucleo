import { getContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildContractPdf } from "@/lib/contract-pdf";

export const maxDuration = 60;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext();
  if (!ctx) return new Response("Não autorizado", { status: 401 });
  const c = await db.contract.findFirst({ where: { id: (await params).id, orgId: ctx.org.id }, select: { id: true } });
  if (!c) return new Response("Não encontrado", { status: 404 });
  const { bytes, name } = await buildContractPdf(c.id);
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, no-store" } });
}
