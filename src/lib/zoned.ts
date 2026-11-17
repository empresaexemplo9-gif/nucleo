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

/** Converte data e hora locais ("AAAA-MM-DDTHH:MM") de um fuso para o instante UTC. */
export function localToUtc(local: string, timeZone: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  let t = wanted;
  // duas passadas acertam também os dias de mudança de horário de verão
  for (let i = 0; i < 2; i++) {
    const z = zoned(new Date(t), timeZone);
    t += wanted - Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute);
  }
  return new Date(t);
}

/** Instante UTC → "AAAA-MM-DDTHH:MM" no fuso informado (valor de input datetime-local). */
export function utcToLocal(d: Date, timeZone: string) {
  const z = zoned(d, timeZone);
  return `${z.key}T${String(z.hour).padStart(2, "0")}:${String(z.minute).padStart(2, "0")}`;
}
