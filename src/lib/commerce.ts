/** Regras comerciais compartilhadas (cliente e servidor). */

export const BILLING: Record<string, string> = { ONE_TIME: "Pagamento único", RECURRING: "Recorrente" };
export const INTERVALS: Record<string, { label: string; short: string; months: number }> = {
  MONTHLY: { label: "Mensal", short: "mês", months: 1 },
  QUARTERLY: { label: "Trimestral", short: "trimestre", months: 3 },
  SEMIANNUAL: { label: "Semestral", short: "semestre", months: 6 },
  YEARLY: { label: "Anual", short: "ano", months: 12 },
};

export const PROPOSAL_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Rascunho", color: "var(--text-mute)" },
  SENT: { label: "Enviada", color: "var(--accent-2)" },
  VIEWED: { label: "Visualizada", color: "var(--warn)" },
  ACCEPTED: { label: "Aceita", color: "var(--ok)" },
  REJECTED: { label: "Recusada", color: "var(--err)" },
};
export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Novo", color: "var(--accent-2)" },
  PROCESSING: { label: "Em separação", color: "var(--warn)" },
  FULFILLED: { label: "Entregue / ativo", color: "var(--ok)" },
  CANCELED: { label: "Cancelado", color: "var(--err)" },
};
export const CONTRACT_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Rascunho", color: "var(--text-mute)" },
  SENT: { label: "Aguardando assinaturas", color: "var(--warn)" },
  SIGNED: { label: "Assinado", color: "var(--ok)" },
  CANCELED: { label: "Cancelado", color: "var(--err)" },
};

export type LineInput = { billing: string; interval?: string | null; quantity: number; price: number; discount: number; setupFee: number };

/** Valor líquido de uma linha (por ciclo, no caso recorrente). */
export const lineTotal = (l: LineInput) => Math.round(l.quantity * l.price * (1 - Math.min(100, Math.max(0, l.discount)) / 100) * 100) / 100;

/** Totais: único (inclui taxas de adesão) e recorrente normalizado por mês. */
export function totals(lines: LineInput[], discount = 0) {
  let once = 0;
  let monthly = 0;
  const byInterval: Record<string, number> = {};
  for (const l of lines) {
    const t = lineTotal(l);
    once += l.setupFee * l.quantity;
    if (l.billing === "RECURRING") {
      const iv = l.interval && INTERVALS[l.interval] ? l.interval : "MONTHLY";
      byInterval[iv] = (byInterval[iv] ?? 0) + t;
      monthly += t / INTERVALS[iv]!.months;
    } else once += t;
  }
  once = Math.max(0, once - discount);
  return { once: round(once), monthly: round(monthly), byInterval };
}
const round = (n: number) => Math.round(n * 100) / 100;

export const billingLabel = (billing: string, interval?: string | null) =>
  billing === "RECURRING" ? `Recorrente · ${INTERVALS[interval ?? "MONTHLY"]?.label.toLowerCase() ?? "mensal"}` : "Pagamento único";

/** Variáveis aceitas nos modelos de contrato. */
export const CONTRACT_VARS: [string, string][] = [
  ["{{empresa.nome}}", "Nome da sua empresa"],
  ["{{cliente.nome}}", "Nome do cliente (pessoa ou empresa)"],
  ["{{cliente.documento}}", "CPF/CNPJ do cliente"],
  ["{{cliente.email}}", "E-mail do cliente"],
  ["{{contato.nome}}", "Nome do contato"],
  ["{{proposta.numero}}", "Número da proposta"],
  ["{{proposta.itens}}", "Lista de itens contratados"],
  ["{{proposta.valor_unico}}", "Total de pagamento único"],
  ["{{proposta.valor_mensal}}", "Total recorrente por mês"],
  ["{{contrato.numero}}", "Número do contrato"],
  ["{{data}}", "Data de hoje por extenso"],
];

export function fillTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{\s*([a-z_.]+)\s*\}\}/gi, (m, k: string) => vars[k.toLowerCase()] ?? m);
}

export const code = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, "0")}`;
