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
