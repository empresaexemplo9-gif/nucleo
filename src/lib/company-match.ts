import "server-only";
import { db } from "./db";
import { slugify } from "./format";

/** Sufixos societários e palavras que não diferenciam uma empresa da outra. */
const NOISE = new Set(["ltda", "limitada", "me", "mei", "epp", "eireli", "sa", "s-a", "cia", "companhia", "slu", "ss"]);

/** Chave do nome da empresa: sem acento, pontuação, maiúsculas e sufixos como LTDA, ME, S/A. */
export function companyKey(name: string) {
  return slugify(name.replace(/\bs\s*\/\s*a\b/gi, "sa"))
    .split("-")
    .filter((w) => w && !NOISE.has(w))
    .join("-");
}

/** Provedores de e-mail pessoal: não servem para provar que a pessoa é da empresa. */
const FREE = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.com.br", "outlook.com", "outlook.com.br", "live.com", "msn.com",
  "yahoo.com", "yahoo.com.br", "icloud.com", "me.com", "uol.com.br", "bol.com.br", "terra.com.br", "ig.com.br",
  "globo.com", "globomail.com", "zipmail.com.br", "protonmail.com", "proton.me", "aol.com", "gmx.com", "yandex.com",
]);

export const emailDomain = (email: string) => email.split("@")[1]?.toLowerCase().trim() ?? "";
export const isCorporateDomain = (domain: string) => !!domain && !FREE.has(domain);

/** Empresa já cadastrada com o mesmo nome (a mais antiga, se houver mais de uma). */
export async function findCompanyByName(name: string) {
  const key = companyKey(name);
  if (!key) return null;
  const first = key.split("-")[0]!;
  const candidates = await db.organization.findMany({
    where: { OR: [{ slug: { startsWith: first } }, { name: { contains: first, mode: "insensitive" } }] },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
    take: 200,
  });
  return candidates.find((o) => companyKey(o.name) === key) ?? null;
}

/** Algum membro ativo da empresa usa este domínio corporativo de e-mail? */
export async function domainBelongsTo(orgId: string, domain: string) {
  if (!isCorporateDomain(domain)) return false;
  const m = await db.membership.findFirst({ where: { orgId, active: true, user: { email: { endsWith: `@${domain}` } } }, select: { id: true } });
  return !!m;
}
