import "server-only";
import type { ActionResult } from "@/components/use-action";

export function fail(error: unknown): ActionResult {
  const msg = error instanceof Error ? error.message : String(error);
  return { ok: false, error: msg.length > 200 ? "Não foi possível concluir a ação." : msg };
}

export function str(fd: FormData, k: string) {
  const v = fd.get(k);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function numOr(fd: FormData, k: string, d = 0) {
  const v = str(fd, k);
  if (v == null) return d;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : d;
}

/** Aceita "1234.56", "1.234,56" ou "1234,56". */
export function moneyOf(fd: FormData, k: string) {
  const v = str(fd, k);
  if (v == null) return 0;
  const cleaned = v.replace(/[^\d.,-]/g, "");
  const n = cleaned.includes(",") ? Number(cleaned.replace(/\./g, "").replace(",", ".")) : Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function dateOf(fd: FormData, k: string) {
  const v = str(fd, k);
  if (!v) return null;
  const d = new Date(v.length === 10 ? v + "T12:00:00" : v);
  return isNaN(d.getTime()) ? null : d;
}

export function tagsOf(fd: FormData, k = "tags") {
  return fd
    .getAll(k)
    .flatMap((v) => String(v).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Lê campos personalizados enviados como cf_<chave>. */
export function customFieldsOf(fd: FormData) {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(Array.from(fd.keys()))) {
    if (!key.startsWith("cf_")) continue;
    const all = fd.getAll(key).map(String);
    out[key.slice(3)] = all.length > 1 ? all : all[0];
  }
  return out;
}
