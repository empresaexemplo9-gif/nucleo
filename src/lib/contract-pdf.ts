import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { db } from "./db";
import { code } from "./commerce";

const A4: [number, number] = [595.28, 841.89];
const M = 56;

/** Remove caracteres que a fonte padrão do PDF não consegue desenhar. */
function safe(font: PDFFont, text: string) {
  let out = "";
  for (const ch of text.replace(/\t/g, "    ")) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += ch === "→" ? "->" : ch === "✓" ? "v" : "?";
    }
  }
  return out;
}

function wrap(font: PDFFont, text: string, size: number, width: number) {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > width && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

async function embedDataImage(pdf: PDFDocument, dataUrl: string | null | undefined): Promise<PDFImage | null> {
  if (!dataUrl) return null;
  const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const bytes = Buffer.from(m[2]!, "base64");
  try {
    return m[1] === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

async function orgLogo(pdf: PDFDocument, logoUrl: string | null) {
  if (!logoUrl) return null;
  if (logoUrl.startsWith("data:")) return embedDataImage(pdf, logoUrl);
  const id = /^\/api\/public\/logo\/([a-z0-9]+)$/.exec(logoUrl)?.[1];
  if (!id) return null;
  const f = await db.storedFile.findUnique({ where: { id } });
  if (!f) return null;
  try {
    if (f.mime === "image/png") return await pdf.embedPng(f.data);
    if (f.mime === "image/jpeg") return await pdf.embedJpg(f.data);
  } catch {
    /* formato não suportado no PDF (SVG/WebP) */
  }
  return null;
}

const hexRgb = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** Gera o PDF assinado: documento + certificado com assinaturas, selfies e evidências. */
export async function buildContractPdf(contractId: string) {
  const c = await db.contract.findUniqueOrThrow({ where: { id: contractId }, include: { org: true, file: true, signers: { orderBy: { position: "asc" } } } });
  const pdf = c.kind === "PDF" && c.file ? await PDFDocument.load(c.file.data, { ignoreEncryption: true }) : await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const brand = /^#[0-9a-f]{6}$/i.test(c.org.primaryColor) ? hexRgb(c.org.primaryColor) : rgb(0.7, 0.54, 0.31);
  const ink = rgb(0.07, 0.08, 0.1);
  const dim = rgb(0.35, 0.37, 0.41);
  const logo = await orgLogo(pdf, c.org.logoUrl);
  const ref = `${code("CTR", c.number)} · SHA-256 ${c.hash ?? "—"}`;
  const tz = c.org.timezone;
  const when = (d: Date | null) => (d ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: tz }).format(d) : "—");

  const header = (page: PDFPage) => {
    const [w, h] = [page.getWidth(), page.getHeight()];
    page.drawRectangle({ x: 0, y: h - 6, width: w, height: 6, color: brand });
    if (logo) {
      const s = Math.min(120 / logo.width, 34 / logo.height);
      page.drawImage(logo, { x: M, y: h - 26 - logo.height * s, width: logo.width * s, height: logo.height * s });
    } else page.drawText(safe(bold, c.org.name), { x: M, y: h - 44, size: 13, font: bold, color: ink });
    page.drawText(safe(font, code("CTR", c.number)), { x: w - M - font.widthOfTextAtSize(code("CTR", c.number), 9), y: h - 40, size: 9, font, color: dim });
  };
  const footer = (page: PDFPage, i: number, total: number) => {
    const txt = safe(mono, `${ref}  ·  pág. ${i}/${total}`);
    page.drawText(txt, { x: M, y: 26, size: 6.5, font: mono, color: dim });
  };

  // documento em texto
  if (c.kind !== "PDF") {
    let page = pdf.addPage(A4);
    header(page);
    let y = A4[1] - 96;
    page.drawText(safe(bold, c.title), { x: M, y, size: 16, font: bold, color: ink, maxWidth: A4[0] - 2 * M });
    y -= 30;
    for (const line of wrap(font, safe(font, c.body ?? ""), 10.5, A4[0] - 2 * M)) {
      if (y < 60) {
        page = pdf.addPage(A4);
        header(page);
        y = A4[1] - 90;
      }
      page.drawText(line, { x: M, y, size: 10.5, font, color: ink });
      y -= 15;
    }
  }

  // certificado de assinatura
  let cert = pdf.addPage(A4);
  header(cert);
  let y = A4[1] - 96;
  const line = (label: string, value: string, opts: { mono?: boolean; size?: number } = {}) => {
    const f = opts.mono ? mono : font;
    const size = opts.size ?? 9;
    cert.drawText(safe(bold, label), { x: M, y, size: 8, font: bold, color: dim });
    const rows = wrap(f, safe(f, value), size, A4[0] - 2 * M - 130);
    for (const r of rows) {
      cert.drawText(r, { x: M + 130, y, size, font: f, color: ink });
      y -= size + 4;
    }
    y -= 3;
  };
  cert.drawText(safe(bold, "Certificado de assinatura eletrônica"), { x: M, y, size: 16, font: bold, color: ink });
  y -= 26;
  line("Documento", `${code("CTR", c.number)} — ${c.title}`);
  line("Emitente", c.org.name);
  line("Status", c.status === "SIGNED" ? "Assinado por todas as partes" : "Assinaturas pendentes");
  line("Hash SHA-256", c.hash ?? "—", { mono: true, size: 7.5 });
  line("Enviado em", when(c.sentAt));
  line("Concluído em", when(c.completedAt));
  y -= 8;

  for (const s of c.signers) {
    const need = 190;
    if (y < need) {
      cert = pdf.addPage(A4);
      header(cert);
      y = A4[1] - 90;
    }
    cert.drawLine({ start: { x: M, y: y + 6 }, end: { x: A4[0] - M, y: y + 6 }, thickness: 0.6, color: rgb(0.85, 0.84, 0.8) });
    y -= 12;
    cert.drawText(safe(bold, `${s.name} — ${s.role}`), { x: M, y, size: 11, font: bold, color: ink });
    y -= 18;
    const top = y;
    line("Situação", s.status === "SIGNED" ? `Assinado em ${when(s.signedAt)}` : "Pendente");
    if (s.document) line("Documento", s.document);
    if (s.email) line("E-mail", s.email);
    if (s.ip) line("IP", s.ip);
    if (s.geo) line("Localização", s.geo);
    if (s.faceCheck) line("Captura facial", s.faceCheck);
    if (s.userAgent) line("Dispositivo", s.userAgent, { size: 7 });
    const sig = await embedDataImage(pdf, s.signature);
    const selfie = await embedDataImage(pdf, s.selfie);
    let bottom = y;
    if (selfie) {
      const sc = Math.min(90 / selfie.width, 90 / selfie.height);
      cert.drawImage(selfie, { x: A4[0] - M - selfie.width * sc, y: top - selfie.height * sc + 8, width: selfie.width * sc, height: selfie.height * sc });
      bottom = Math.min(bottom, top - selfie.height * sc);
    }
    if (sig) {
      const sc = Math.min(200 / sig.width, 60 / sig.height);
      const sy = bottom - sig.height * sc - 6;
      cert.drawImage(sig, { x: M + 130, y: sy, width: sig.width * sc, height: sig.height * sc });
      cert.drawLine({ start: { x: M + 130, y: sy - 2 }, end: { x: M + 340, y: sy - 2 }, thickness: 0.5, color: dim });
      cert.drawText("Assinatura", { x: M, y: sy + 10, size: 8, font: bold, color: dim });
      bottom = sy - 10;
    }
    y = bottom - 14;
  }
  if (y < 90) {
    cert = pdf.addPage(A4);
    header(cert);
    y = A4[1] - 90;
  }
  const legal =
    "Assinaturas eletrônicas realizadas na plataforma com registro de data e hora, IP, dispositivo, imagem da assinatura manuscrita na tela e captura facial (quando exigida), " +
    "vinculadas ao hash SHA-256 do documento. Válidas entre as partes que as admitirem, nos termos do art. 10, § 2º, da MP 2.200-2/2001 e da Lei 14.063/2020.";
  for (const l of wrap(font, safe(font, legal), 7.5, A4[0] - 2 * M)) {
    cert.drawText(l, { x: M, y, size: 7.5, font, color: dim });
    y -= 10;
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => footer(p, i + 1, pages.length));
  pdf.setTitle(`${code("CTR", c.number)} — ${c.title}`);
  pdf.setProducer(c.org.name);
  return { bytes: await pdf.save(), name: `${code("CTR", c.number)}-assinado.pdf` };
}
