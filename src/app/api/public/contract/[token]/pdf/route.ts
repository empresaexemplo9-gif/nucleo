import { db } from "@/lib/db";
import { buildContractPdf } from "@/lib/contract-pdf";

export const maxDuration = 60;

/** Via assinada para o signatário (somente após assinar). */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const s = await db.contractSigner.findUnique({ where: { token: (await params).token } });
  if (!s || s.status !== "SIGNED") return new Response("Não encontrado", { status: 404 });
  const { bytes, name } = await buildContractPdf(s.contractId);
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
}
