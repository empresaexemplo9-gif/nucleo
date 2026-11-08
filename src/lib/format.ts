let TZ = "America/Sao_Paulo";
/** Fuso da organização: usado igualmente no servidor e no navegador para evitar divergências. */
export function setTimeZone(tz: string) {
  if (tz) TZ = tz;
}

export function money(value: number | string | { toString(): string } | null | undefined, currency = "BRL", locale = "pt-BR", compact = false) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 1 : 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function num(value: number, locale = "pt-BR") {
  return new Intl.NumberFormat(locale).format(value);
}

export function date(d: Date | string | null | undefined, locale = "pt-BR", opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts }).format(new Date(d));
}

export function dateTime(d: Date | string | null | undefined, locale = "pt-BR") {
  return date(d, locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function relative(d: Date | string, locale = "pt-BR") {
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export function daysSince(d: Date | string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function toDateInput(d: Date | string | null | undefined) {
  if (!d) return "";
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function toDateTimeInput(d: Date | string | null | undefined) {
  if (!d) return "";
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/** Chave do dia (AAAA-MM-DD) no fuso da organização. */
export function dayKey(d: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

/** Hora atual (0-23) no fuso da organização. */
export function currentHour() {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(new Date())) % 24;
}
