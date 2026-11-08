import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export type Period = "month" | "last_month" | "quarter" | "year" | "30d" | "90d";

export const PERIODS: Record<Period, string> = {
  month: "Este mês",
  last_month: "Mês passado",
  quarter: "Este trimestre",
  year: "Este ano",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
};

export function periodRange(p: Period): { from: Date; to: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (p) {
    case "last_month":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
    case "quarter":
      return { from: new Date(y, Math.floor(m / 3) * 3, 1), to: new Date(y, Math.floor(m / 3) * 3 + 3, 1) };
    case "year":
      return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
    case "30d":
      return { from: new Date(Date.now() - 30 * 86400000), to: new Date(Date.now() + 1000) };
    case "90d":
      return { from: new Date(Date.now() - 90 * 86400000), to: new Date(Date.now() + 1000) };
    default:
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) };
  }
}

/** Receita ganha por mês (últimos N meses). */
export async function wonByMonth(where: Prisma.DealWhereInput, months = 6) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const deals = await db.deal.findMany({ where: { ...where, status: "WON", closedAt: { gte: from } }, select: { value: true, closedAt: true } });
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const list = deals.filter((x) => x.closedAt!.getFullYear() === d.getFullYear() && x.closedAt!.getMonth() === d.getMonth());
    return {
      name: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      value: list.reduce((s, x) => s + Number(x.value), 0),
      count: list.length,
    };
  });
}

/** Período imediatamente anterior, com a mesma duração (para comparação). */
export function previousRange(p: Period): { from: Date; to: Date } {
  const { from, to } = periodRange(p);
  if (p === "month" || p === "last_month") return { from: new Date(from.getFullYear(), from.getMonth() - 1, 1), to: from };
  if (p === "quarter") return { from: new Date(from.getFullYear(), from.getMonth() - 3, 1), to: from };
  if (p === "year") return { from: new Date(from.getFullYear() - 1, 0, 1), to: from };
  const len = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - len), to: from };
}

export function delta(cur: number, prev: number) {
  if (!prev) return cur ? 100 : null;
  return ((cur - prev) / prev) * 100;
}

/** Séries mensais (últimos N meses) para mini-gráficos. */
export async function monthlySeries(where: Prisma.DealWhereInput, months = 6) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const [closed, created] = await Promise.all([
    db.deal.findMany({ where: { ...where, status: { in: ["WON", "LOST"] }, closedAt: { gte: from } }, select: { value: true, status: true, closedAt: true } }),
    db.deal.findMany({ where: { ...where, createdAt: { gte: from } }, select: { createdAt: true } }),
  ]);
  const same = (d: Date, m: Date) => d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
  return Array.from({ length: months }, (_, i) => {
    const m = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const won = closed.filter((d) => d.status === "WON" && same(d.closedAt!, m));
    const lost = closed.filter((d) => d.status === "LOST" && same(d.closedAt!, m)).length;
    const wonValue = won.reduce((s, d) => s + Number(d.value), 0);
    return {
      won: wonValue,
      wonCount: won.length,
      ticket: won.length ? wonValue / won.length : 0,
      rate: won.length + lost ? (won.length / (won.length + lost)) * 100 : 0,
      created: created.filter((d) => same(d.createdAt, m)).length,
    };
  });
}
