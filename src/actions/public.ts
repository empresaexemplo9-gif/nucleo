"use server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { code } from "@/lib/commerce";
import { afterAcceptance, maybeCompleteContract } from "@/lib/commerce-server";
import { managers, notify } from "@/lib/notify";
import type { ActionResult } from "@/components/use-action";
import { fail, str } from "./helpers";

async function client() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0]!.trim() || null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

/** Aceite da proposta pelo cliente, direto no link público. */
export async function acceptProposal(token: string, fd: FormData): Promise<ActionResult & { contractToken?: string | null }> {
  try {
    const p = await db.proposal.findUnique({ where: { token } });
    if (!p) return { ok: false, error: "Proposta não encontrada" };
    if (p.status === "ACCEPTED") return { ok: false, error: "Esta proposta já foi aceita" };
    if (p.status === "REJECTED") return { ok: false, error: "Esta proposta foi recusada" };
    if (p.validUntil && p.validUntil < new Date()) return { ok: false, error: "Proposta expirada — solicite uma nova ao vendedor" };
    const name = str(fd, "name");
    if (!name || name.length < 3) return { ok: false, error: "Informe seu nome completo" };
    if (fd.get("agree") !== "on") return { ok: false, error: "Confirme que leu e aceita a proposta" };
    const { ip, userAgent } = await client();
    const upd = await db.proposal.updateMany({
      where: { id: p.id, status: { notIn: ["ACCEPTED", "REJECTED"] } },
      data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedName: name.slice(0, 120), acceptedEmail: str(fd, "email"), acceptedDoc: str(fd, "document"), acceptedIp: ip, acceptedAgent: userAgent },
    });
    if (!upd.count) return { ok: false, error: "Esta proposta já foi respondida" };
    const { contractToken } = await afterAcceptance(p.id);
    return { ok: true, message: "Proposta aceita! A equipe já foi avisada.", contractToken };
  } catch (e) {
    return fail(e);
  }
}

export async function rejectProposal(token: string, reason: string): Promise<ActionResult> {
  try {
    const p = await db.proposal.findUnique({ where: { token } });
    if (!p || p.status === "ACCEPTED" || p.status === "REJECTED") return { ok: false, error: "Esta proposta não pode mais ser respondida" };
    await db.proposal.update({ where: { id: p.id }, data: { status: "REJECTED", rejectedAt: new Date(), rejectedReason: reason.slice(0, 500) || null } });
    await logEvent({ orgId: p.orgId, type: "PROPOSAL_REJECTED", dealId: p.dealId, contactId: p.contactId, companyId: p.companyId, data: { name: code("PROP", p.number), reason: reason.slice(0, 200) } });
    await notify(p.orgId, [p.ownerId, ...(await managers(p.orgId))], {
      type: "PROPOSAL_REJECTED",
      title: `Proposta ${code("PROP", p.number)} recusada`,
      body: reason ? `Motivo: ${reason.slice(0, 200)}` : p.title,
      href: `/proposals/${p.id}`,
    });
    return { ok: true, message: "Resposta registrada. Obrigado!" };
  } catch (e) {
    return fail(e);
  }
}

const isImage = (s: unknown, max: number): s is string => typeof s === "string" && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length <= max;

/** Assinatura eletrônica: desenho na tela + selfie com evidências (IP, aparelho, hash, data). */
export async function signContract(
  token: string,
  input: { name: string; document?: string; signature: string; selfie?: string | null; faceCheck?: string; consent: boolean; geo?: string | null },
): Promise<ActionResult> {
  try {
    const s = await db.contractSigner.findUnique({ where: { token }, include: { contract: true } });
    if (!s) return { ok: false, error: "Link de assinatura inválido" };
    const c = s.contract;
    if (c.status === "CANCELED") return { ok: false, error: "Este contrato foi cancelado" };
    if (c.status === "DRAFT") return { ok: false, error: "Este contrato ainda não foi liberado para assinatura" };
    if (s.status === "SIGNED") return { ok: false, error: "Você já assinou este contrato" };
    if (!input.consent) return { ok: false, error: "É necessário concordar com os termos da assinatura eletrônica" };
    if (!input.name?.trim() || input.name.trim().length < 3) return { ok: false, error: "Informe seu nome completo" };
    if (!isImage(input.signature, 400_000)) return { ok: false, error: "Desenhe sua assinatura" };
    if (c.requireSelfie && !isImage(input.selfie, 900_000)) return { ok: false, error: "Faça a captura facial (selfie) para assinar" };
    const { ip, userAgent } = await client();
    await db.contractSigner.update({
      where: { id: s.id },
      data: {
        status: "SIGNED",
        signedAt: new Date(),
        name: input.name.trim().slice(0, 120),
        document: input.document?.trim().slice(0, 30) || s.document,
        signature: input.signature,
        selfie: isImage(input.selfie, 900_000) ? input.selfie : null,
        faceCheck: input.faceCheck?.slice(0, 120) || null,
        geo: input.geo?.slice(0, 80) || null,
        ip,
        userAgent,
        hash: c.hash,
      },
    });
    const done = await maybeCompleteContract(c.id);
    if (!done)
      await notify(c.orgId, [c.createdById], {
        type: "CONTRACT_SIGNER",
        title: `${input.name.trim()} assinou o contrato ${code("CTR", c.number)}`,
        body: c.title,
        href: `/contracts/${c.id}`,
      });
    return { ok: true, message: "Contrato assinado com sucesso!" };
  } catch (e) {
    return fail(e);
  }
}
