/** Regras dos campos de módulo que valem no servidor e nas telas (sem dependências). */
import { gradeTotal, parseGrade } from "./fashion-colors";

/* ------------------------------ Fórmulas ------------------------------ */

type Tok = { t: "num"; v: number } | { t: "ref"; v: string } | { t: "op"; v: string } | { t: "fn"; v: string };

const FUNCS: Record<string, (a: number[]) => number> = {
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  arred: (a) => {
    const p = 10 ** Math.max(0, Math.min(6, Math.trunc(a[1] ?? 0)));
    return Math.round((a[0] ?? 0) * p) / p;
  },
  abs: (a) => Math.abs(a[0] ?? 0),
};

function tokenize(expr: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i]!;
    if (/\s/.test(c)) i++;
    else if (/[0-9.,]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9.,]/.test(expr[j]!)) j++;
      const raw = expr.slice(i, j);
      // aceita 1.234,56 e 1234.56
      const v = raw.includes(",") ? Number(raw.replace(/\./g, "").replace(",", ".")) : Number(raw);
      if (!Number.isFinite(v)) throw new Error(`Número inválido: ${raw}`);
      out.push({ t: "num", v });
      i = j;
    } else if (c === "{") {
      const j = expr.indexOf("}", i);
      if (j < 0) throw new Error("Falta fechar uma chave }");
      out.push({ t: "ref", v: expr.slice(i + 1, j).trim() });
      i = j + 1;
    } else if (/[a-z]/i.test(c)) {
      let j = i;
      while (j < expr.length && /[a-z]/i.test(expr[j]!)) j++;
      const name = expr.slice(i, j).toLowerCase();
      if (!FUNCS[name]) throw new Error(`Função desconhecida: ${name} (use min, max, arred, abs)`);
      out.push({ t: "fn", v: name });
      i = j;
    } else if ("+-*/();%".includes(c)) {
      out.push({ t: "op", v: c === ";" ? "," : c });
      i++;
    } else throw new Error(`Caractere não permitido na fórmula: ${c}`);
  }
  return out;
}

/** Avaliador de expressões aritméticas com {campos}: + - * / % ( ) e min, max, arred, abs. Sem eval. */
export function evalFormula(expr: string, get: (key: string) => number | null): number | null {
  const toks = tokenize(expr);
  let p = 0;
  let missing = 0;
  let refs = 0;
  const peek = () => toks[p];
  const eat = (v?: string) => {
    const t = toks[p];
    if (!t || (v && t.v !== v)) throw new Error(v ? `Esperado "${v}"` : "Fórmula incompleta");
    p++;
    return t;
  };
  function primary(): number {
    const t = peek();
    if (!t) throw new Error("Fórmula incompleta");
    if (t.t === "num") {
      p++;
      return t.v;
    }
    if (t.t === "ref") {
      p++;
      refs++;
      const v = get(t.v);
      if (v == null) missing++;
      return v ?? 0;
    }
    if (t.t === "fn") {
      p++;
      eat("(");
      const args = [expr0()];
      while (peek()?.v === ",") {
        p++;
        args.push(expr0());
      }
      eat(")");
      return FUNCS[t.v]!(args);
    }
    if (t.v === "(") {
      p++;
      const v = expr0();
      eat(")");
      return v;
    }
    if (t.v === "-" || t.v === "+") {
      p++;
      return t.v === "-" ? -primary() : primary();
    }
    throw new Error(`Símbolo inesperado: ${t.v}`);
  }
  function postfix(): number {
    let v = primary();
    while (peek()?.v === "%") {
      p++;
      v = v / 100;
    }
    return v;
  }
  function term(): number {
    let v = postfix();
    while (peek()?.v === "*" || peek()?.v === "/") {
      const op = eat().v;
      const r = postfix();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function expr0(): number {
    let v = term();
    while (peek()?.v === "+" || peek()?.v === "-") {
      const op = eat().v;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  const v = expr0();
  if (p < toks.length) throw new Error(`Símbolo inesperado: ${toks[p]!.v}`);
  // nenhum campo preenchido: sem resultado (evita mostrar 0 em registros vazios)
  if (refs && missing === refs) return null;
  return Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : null;
}

/** Campos referenciados por uma fórmula. */
export const formulaRefs = (expr: string) => [...expr.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]!.trim());

/** Valor numérico de um campo para uso em fórmulas (checklist conta itens marcados; sim/não vale 1/0). */
export function numericValue(type: string, v: unknown, options: string[] = []): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (type === "GRADE") return gradeTotal(parseGrade(v, options));
  if (Array.isArray(v)) return type === "CHECKLIST" && options.length ? v.length : v.length;
  if (type === "DATE" || type === "DATETIME") {
    const t = new Date(type === "DATE" ? `${v}T12:00:00Z` : `${v}:00Z`).getTime();
    return Number.isFinite(t) ? Math.floor(t / 86_400_000) : null; // em dias, para diferenças de datas
  }
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Calcula as fórmulas na ordem dos campos (uma fórmula pode usar outra calculada antes). */
export function applyFormulas(fields: { key: string; type: string; options: string[] }[], data: Record<string, unknown>) {
  for (const f of fields) {
    if (f.type !== "FORMULA" || !f.options[0]) continue;
    try {
      data[f.key] = evalFormula(f.options[0], (k) => {
        const ref = fields.find((x) => x.key === k);
        return ref ? numericValue(ref.type, data[k], ref.options) : null;
      });
    } catch {
      data[f.key] = null;
    }
  }
  return data;
}

/* ------------------------------ Recorrência ------------------------------ */

const PERIODS: [RegExp, { days?: number; months?: number }][] = [
  [/di[aá]ri/i, { days: 1 }],
  [/quinzen/i, { days: 14 }],
  [/semanal|toda semana/i, { days: 7 }],
  [/bimestr/i, { months: 2 }],
  [/trimestr/i, { months: 3 }],
  [/quadrimestr/i, { months: 4 }],
  [/semestr/i, { months: 6 }],
  [/bienal|2 anos/i, { months: 24 }],
  [/anual|anualmente|todo ano/i, { months: 12 }],
  [/mensal|todo m[eê]s/i, { months: 1 }],
];

/** Intervalo de repetição a partir do texto da opção ("Mensal", "Trimestral"…). `null` = não repete. */
export function recurrenceOf(option: unknown) {
  if (typeof option !== "string" || !option.trim()) return null;
  return PERIODS.find(([re]) => re.test(option))?.[1] ?? null;
}

/** Avança uma data "AAAA-MM-DD" ou "AAAA-MM-DDTHH:MM" pelo intervalo, mantendo o dia (ou o último do mês). */
export function advanceDate(value: string, step: { days?: number; months?: number }) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(T\d{2}:\d{2})?$/.exec(value);
  if (!m) return null;
  let y = Number(m[1]);
  let mo = Number(m[2]) - 1;
  let d = Number(m[3]);
  if (step.months) {
    mo += step.months;
    y += Math.floor(mo / 12);
    mo = ((mo % 12) + 12) % 12;
    d = Math.min(d, new Date(Date.UTC(y, mo + 1, 0)).getUTCDate());
  }
  const dt = new Date(Date.UTC(y, mo, d + (step.days ?? 0)));
  return dt.toISOString().slice(0, 10) + (m[4] ?? "");
}

/* ------------------------------ Status automático de estoque ------------------------------ */

export type StockRule = { qty: string; min: string; ok: string; low: string; out: string };

/**
 * Estoque: escolhe Disponível / Estoque baixo / Esgotado pela quantidade (ou pelo total da grade).
 * Só troca entre esses três: status manuais (ex.: "Fora de linha", "Aguardando reposição") são respeitados.
 */
export function stockStatus(rule: StockRule | null | undefined, fields: { key: string; type: string; options: string[] }[], data: Record<string, unknown>, current: string | null) {
  if (!rule) return null;
  const managed = [rule.ok, rule.low, rule.out].map((x) => x.toLowerCase());
  if (current && !managed.includes(current.toLowerCase())) return null;
  const f = fields.find((x) => x.key === rule.qty);
  const qty = f ? numericValue(f.type, data[rule.qty], f.options) : null;
  if (qty == null) return null;
  const minF = fields.find((x) => x.key === rule.min);
  const min = minF ? (numericValue(minF.type, data[rule.min], minF.options) ?? 0) : 0;
  return qty <= 0 ? rule.out : qty <= min ? rule.low : rule.ok;
}
