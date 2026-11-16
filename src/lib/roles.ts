/**
 * Hierarquia de acessos da empresa cliente (vale no servidor e nas telas).
 *
 * Superadmin da plataforma (DRAP) → acima de todas as empresas; cria administradores, financeiro e gestores.
 * Administrador → o nível mais alto dentro da empresa (quem cria a empresa pelo cadastro também é administrador).
 * Administradores e gestores → criam os demais acessos: consultores e visualização.
 * Financeiro → comanda a parte financeira (produtos, estoque, pedidos e o módulo Financeiro).
 */
export type Role = "OWNER" | "ADMIN" | "FINANCE" | "MANAGER" | "SALES" | "VIEWER";

/** Perfis da empresa, do mais alto ao mais baixo (OWNER é exibido como Administrador). */
export const ROLE_ORDER: Role[] = ["ADMIN", "FINANCE", "MANAGER", "SALES", "VIEWER"];

export const ROLE_INFO: Record<Role, { label: string; desc: string }> = {
  OWNER: { label: "Administrador", desc: "Nível mais alto da empresa: configurações, equipe e todos os registros." },
  ADMIN: { label: "Administrador", desc: "Nível mais alto da empresa: configurações, equipe e todos os registros." },
  FINANCE: { label: "Financeiro", desc: "Comanda o financeiro: produtos e preços, estoque, pedidos e lançamentos financeiros." },
  MANAGER: { label: "Gestor", desc: "Coordena a equipe: cria acessos de consultores, define metas e vê todos os registros." },
  SALES: { label: "Consultor", desc: "Atende clientes: cadastra contatos, conduz negócios, marca tarefas e transfere atendimentos." },
  VIEWER: { label: "Visualização", desc: "Consulta painéis, relatórios e registros, sem alterar dados." },
};

export const roleLabel = (r: string) => ROLE_INFO[r as Role]?.label ?? r;

/**
 * Nível para regras gerais do CRM. O financeiro trabalha no CRM como um consultor (vê e registra),
 * e ganha os poderes financeiros por `canFinance`, sem herdar a gestão de equipe.
 */
export const RANK: Record<Role, number> = { VIEWER: 0, SALES: 1, FINANCE: 1, MANAGER: 2, ADMIN: 3, OWNER: 4 };

const HIGH: Role[] = ["ADMIN", "FINANCE", "MANAGER"];
const BASE: Role[] = ["SALES", "VIEWER"];

/** Quem pode abrir a gestão de usuários. */
export const canManageUsers = (role: Role, superadmin: boolean) => superadmin || role === "OWNER" || role === "ADMIN" || role === "MANAGER";

/** Perfis que este acesso pode criar, alterar ou desativar. */
export function assignableRoles(role: Role, superadmin: boolean): Role[] {
  if (superadmin) return [...HIGH, ...BASE];
  return canManageUsers(role, false) ? [...BASE] : [];
}

/** Parte financeira da plataforma: administradores e financeiro. */
export const canFinance = (role: Role, superadmin: boolean) => superadmin || role === "OWNER" || role === "ADMIN" || role === "FINANCE";

/** Módulos de controle interno de natureza financeira (visíveis só para quem comanda o financeiro). */
export const isFinanceModule = (m: { templateKey?: string | null }) => m.templateKey === "financeiro";
