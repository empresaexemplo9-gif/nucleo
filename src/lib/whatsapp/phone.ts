/** Só dígitos; números brasileiros sem DDI (10 ou 11 dígitos) ganham o 55. */
export function normalizePhone(raw: string | null | undefined) {
  const d = (raw ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length < 10 || d.length > 15) return null;
  return d.length <= 11 ? `55${d}` : d;
}

/**
 * Chave de comparação tolerante ao nono dígito: no Brasil, DDD + 8 últimos dígitos
 * (o WhatsApp pode entregar o mesmo número com ou sem o 9). Fora do Brasil, o número inteiro.
 */
export function phoneKey(raw: string | null | undefined) {
  const d = normalizePhone(raw);
  if (!d) return null;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return `55${d.slice(2, 4)}${d.slice(-8)}`;
  return d;
}

export function formatPhone(digits: string) {
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const rest = digits.slice(4);
    return `+55 (${digits.slice(2, 4)}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
  }
  return `+${digits}`;
}
