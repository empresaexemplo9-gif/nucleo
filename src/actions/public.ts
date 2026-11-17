"use server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { code } from "@/lib/commerce";
import { afterAcceptance, maybeCompleteContract } from "@/lib/commerce-server";
import { managers, notify } from "@/lib/notify";
import type { ActionResult } from "@/components/use-action";
import { fail, str } from "./helpers";
import type { Prisma } from "@prisma/client";
import { formSettings, PUBLIC_TYPES } from "@/lib/module-public";
import { applyFormulas } from "@/lib/module-logic";
import { normalizePhone } from "@/lib/whatsapp/phone";
import { findContactByPhone } from "@/lib/whatsapp/service";
import { runRecordAutomations } from "@/lib/automation";
import { localToUtc } from "@/lib/zoned";

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

/* ------------------------------ Formulário público de módulo ------------------------------ */

/**
 * Envio do formulário público de um módulo (pedido, agendamento, pré-matrícula, solicitação de serviço…).
 * Cadastra ou reaproveita o contato pelo WhatsApp/e-mail, cria o registro e avisa a equipe.
 */
export async function submitModuleForm(token: string, fd: FormData): Promise<ActionResult> {
  try {
    if (str(fd, "website")) return { ok: true }; // armadilha para robôs: campo invisível preenchido
    const mod = await db.customModule.findUnique({ where: { formToken: token }, include: { fields: { orderBy: { position: "asc" } }, statuses: { orderBy: { position: "asc" } }, org: { select: { timezone: true } } } });
    if (!mod) return { ok: false, error: "Formulário indisponível" };
    const name = str(fd, "__name");
    const phone = str(fd, "__phone");
    const email = str(fd, "__email")?.toLowerCase() ?? null;
    if (!name || name.length < 2) return { ok: false, error: "Informe seu nome" };
    if (!phone && !email) return { ok: false, error: "Informe seu WhatsApp ou e-mail para retornarmos" };
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "E-mail inválido" };
    const wa = normalizePhone(phone);
    if (phone && !wa) return { ok: false, error: "WhatsApp inválido: informe DDD e número" };

    const { ip, userAgent } = await client();
    // limite simples por endereço: até 5 envios a cada 10 minutos neste formulário
    if (ip) {
      const recent = await db.timelineEvent.count({ where: { orgId: mod.orgId, type: "RECORD_CREATED", createdAt: { gt: new Date(Date.now() - 600_000) }, data: { path: ["formIp"], equals: ip } } });
      if (recent >= 5) return { ok: false, error: "Muitos envios em pouco tempo. Tente novamente em alguns minutos." };
    }

    const allowed = new Set(formSettings(mod.settings).fields);
    const data: Record<string, unknown> = {};
    for (const f of mod.fields) {
      if (!allowed.has(f.key) || !PUBLIC_TYPES.includes(f.type)) continue;
      const key = `f_${f.key}`;
      let v: unknown = null;
      const s = str(fd, key)?.slice(0, 4000) ?? null;
      if (f.type === "MULTISELECT") v = fd.getAll(key).map(String).filter((x) => f.options.includes(x));
      else if (f.type === "SELECT") v = s && f.options.includes(s) ? s : null;
      else if (f.type === "NUMBER" || f.type === "CURRENCY") v = s == null ? null : Number(s.replace(/\./g, "").replace(",", "."));
      else if (f.type === "BOOLEAN") v = s === "sim" ? true : s === "não" ? false : null;
      else if (f.type === "DATE") v = s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
      else if (f.type === "DATETIME") v = s && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? s : null;
      else v = s;
      if (typeof v === "number" && !Number.isFinite(v)) v = null;
      if (f.required && (v == null || v === "" || (Array.isArray(v) && !v.length))) return { ok: false, error: `Preencha o campo "${f.label}"` };
      data[f.key] = v;
    }

    // contato: reaproveita pelo WhatsApp ou e-mail; senão, cadastra como lead
    let contactId = wa ? ((await findContactByPhone(mod.orgId, wa))?.id ?? null) : null;
    if (!contactId && email) contactId = (await db.contact.findFirst({ where: { orgId: mod.orgId, email: { equals: email, mode: "insensitive" } }, select: { id: true } }))?.id ?? null;
    if (!contactId) {
      const c = await db.contact.create({ data: { orgId: mod.orgId, name: name.slice(0, 120), whatsapp: wa, email, source: `Formulário · ${mod.name}`.slice(0, 60), lifecycle: "lead" } });
      contactId = c.id;
      await logEvent({ orgId: mod.orgId, type: "CONTACT_CREATED", contactId, data: { name: `via formulário de ${mod.name.toLowerCase()}` } });
    }
    const contactField = mod.fields.find((f) => f.type === "CONTACT");
    if (contactField) data[contactField.key] = contactId;
    applyFormulas(mod.fields, data);
    const dueField = mod.fields.find((f) => f.key === mod.dueFieldKey);
    const dueRaw = dueField ? data[dueField.key] : null;
    const amountRaw = mod.amountFieldKey ? data[mod.amountFieldKey] : null;
    const first = mod.statuses.find((s) => !s.isFinal) ?? mod.statuses[0];

    const rec = await db.$transaction(async (tx) => {
      const { sequence } = await tx.customModule.update({ where: { id: mod.id }, data: { sequence: { increment: 1 } } });
      return tx.moduleRecord.create({
        data: {
          orgId: mod.orgId,
          moduleId: mod.id,
          number: sequence,
          title: `${mod.singular} · ${name}`.slice(0, 160),
          statusId: first?.id ?? null,
          contactId,
          position: Date.now(),
          data: { ...data, __origem: "Formulário público" } as Prisma.InputJsonObject,
          dueAt: typeof dueRaw === "string" ? (dueField!.type === "DATETIME" ? localToUtc(dueRaw, mod.org.timezone) : new Date(`${dueRaw}T12:00:00`)) : null,
          amount: typeof amountRaw === "number" ? amountRaw : null,
        },
      });
    });
    await logEvent({ orgId: mod.orgId, type: "RECORD_CREATED", recordId: rec.id, contactId, data: { name: `${mod.singular} pelo formulário público`, formIp: ip, ua: userAgent } });
    await notify(mod.orgId, await managers(mod.orgId), { type: "FORM", title: `Novo(a) ${mod.singular.toLowerCase()} pelo formulário: ${name}`, body: [wa, email].filter(Boolean).join(" · "), href: `/m/${mod.key}/${rec.id}` });
    await runRecordAutomations(mod.orgId, "RECORD_CREATED", rec.id);
    return { ok: true, message: formSettings(mod.settings).success || "Recebemos seu envio! Em breve entraremos em contato." };
  } catch (e) {
    return fail(e);
  }
}
