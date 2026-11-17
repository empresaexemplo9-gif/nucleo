/** Data e hora locais de um instante em um fuso (sem dependências). */
export function zoned(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: n("year"), month: n("month"), day: n("day"), hour: n("hour"), minute: n("minute"), key: `${n("year")}-${String(n("month")).padStart(2, "0")}-${String(n("day")).padStart(2, "0")}` };
}

/** Dia local (AAAA-MM-DD) deslocado em N dias. */
export function dayKeyOffset(d: Date, timeZone: string, days: number) {
  return zoned(new Date(d.getTime() + days * 86_400_000), timeZone).key;
}

/**
 * Respeita o horário comercial: devolve o próprio instante se estiver entre `start` e `end` (hora local),
 * ou o próximo início de janela.
 */
export function nextSendTime(d: Date, timeZone: string, start: number, end: number) {
  if (start >= end) return d;
  const z = zoned(d, timeZone);
  if (z.hour >= start && z.hour < end) return d;
  const hours = (start - z.hour + 24) % 24 || 24;
  return new Date(d.getTime() + hours * 3_600_000 - z.minute * 60_000);
}
