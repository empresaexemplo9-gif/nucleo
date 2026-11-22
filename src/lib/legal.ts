/** Dados do responsável pela plataforma exibidos nas páginas legais. */
export const LEGAL = {
  company: process.env.LEGAL_COMPANY_NAME || "DRAP SoftwareHouse & Business",
  document: process.env.LEGAL_COMPANY_DOCUMENT || "",
  email: process.env.LEGAL_CONTACT_EMAIL || "",
  site: "https://drap-softwerehouse.vercel.app/",
  updatedAt: "22 de novembro de 2026",
};

export const contactText = () => (LEGAL.email ? `pelo e-mail ${LEGAL.email}` : `pelo canal de atendimento em ${LEGAL.site}`);
