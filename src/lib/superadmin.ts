/**
 * Superadmin da plataforma (DRAP): único acesso que edita a identidade visual e implanta módulos,
 * em qualquer empresa cliente. A lista pode ser trocada pela variável SUPERADMIN_EMAILS
 * (e-mails separados por vírgula) sem mudar o código.
 */
const DEFAULT_SUPERADMINS = ["thiagohccarvalho00@gmail.com"];

export function superadminEmails() {
  const env = process.env.SUPERADMIN_EMAILS;
  const list = env ? env.split(",") : DEFAULT_SUPERADMINS;
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isSuperadminEmail(email: string | null | undefined) {
  return !!email && superadminEmails().includes(email.trim().toLowerCase());
}

export const SUPERADMIN_ONLY = "Somente o superadmin da plataforma pode fazer esta alteração.";
