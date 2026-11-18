/** Nomes de cores usados no varejo de moda → amostra visual (sem dependências; vale no servidor e nas telas). */
const BASE: Record<string, string> = {
  preto: "#1b1a1a", branco: "#ffffff", "off white": "#f4efe6", offwhite: "#f4efe6", cru: "#ece3d2", gelo: "#eef0ee", creme: "#f1e6cf", marfim: "#f3ecd8",
  bege: "#d9c4a6", nude: "#d6b8a4", areia: "#d8c3a0", camel: "#b98a56", caramelo: "#b97a42", marrom: "#6e4a33", chocolate: "#4f3427", cafe: "#5b3d2b", tabaco: "#7a5232",
  cinza: "#9a9a9c", mescla: "#b4b3b1", grafite: "#3d3b3c", chumbo: "#4a4a4d", prata: "#c7c9cc", dourado: "#c9a54c", ouro: "#c9a54c", cobre: "#b06c45",
  azul: "#3463a8", marinho: "#1f2c4c", "azul marinho": "#1f2c4c", jeans: "#4a6b94", "azul claro": "#9fc0e3", "azul bebe": "#bcd6ee", ceu: "#9fc6ea", royal: "#2b4eb8", turquesa: "#3bb5b0", petroleo: "#21525a",
  verde: "#3f7d4f", militar: "#5b6340", "verde militar": "#5b6340", oliva: "#7a7a45", musgo: "#5d6236", menta: "#a9dcc4", "verde agua": "#9fd8cb", esmeralda: "#1f7a5a", salvia: "#9caf94",
  vermelho: "#c2313b", vinho: "#6b1f2e", bordo: "#6a1d2b", marsala: "#8a3b44", cereja: "#9e1f37",
  rosa: "#e6a3b3", rose: "#d9a6a0", "rosa claro": "#f2c9d1", "rosa bebe": "#f4d3da", pink: "#e2457f", fucsia: "#c9307a", blush: "#e8b9b0", goiaba: "#e46f6f",
  lilas: "#c5a8d8", lavanda: "#b7a6d8", roxo: "#6b3d8f", uva: "#5c2d5e", berinjela: "#4b2a3f",
  amarelo: "#f0cf4b", mostarda: "#c99a2e", manteiga: "#f3e1a0", laranja: "#e7843a", terracota: "#b5603f", ferrugem: "#9e4f2c", coral: "#ee7d6b", salmao: "#f19f8a", pessego: "#f4b996",
};

/** Padrões que não são uma cor só. */
const PATTERNS: Record<string, string> = {
  estampado: "conic-gradient(#d9a6a0 0 25%, #1f2c4c 0 50%, #c99a2e 0 75%, #f4efe6 0)",
  floral: "radial-gradient(circle at 30% 30%, #e6a3b3 0 22%, transparent 23%), radial-gradient(circle at 70% 65%, #9caf94 0 20%, transparent 21%), #f4efe6",
  listrado: "repeating-linear-gradient(90deg, #1f2c4c 0 3px, #f4efe6 3px 6px)",
  xadrez: "repeating-linear-gradient(0deg, rgba(110,30,40,.55) 0 3px, transparent 3px 6px), repeating-linear-gradient(90deg, rgba(110,30,40,.55) 0 3px, #f1e6cf 3px 6px)",
  "animal print": "radial-gradient(circle at 30% 35%, #3d2a1c 0 14%, transparent 15%), radial-gradient(circle at 70% 70%, #3d2a1c 0 12%, transparent 13%), #c99a5b",
  oncinha: "radial-gradient(circle at 30% 35%, #3d2a1c 0 14%, transparent 15%), radial-gradient(circle at 70% 70%, #3d2a1c 0 12%, transparent 13%), #c99a5b",
  "tie dye": "conic-gradient(#e6a3b3, #b7a6d8, #9fc6ea, #e6a3b3)",
  poa: "radial-gradient(circle, #f4efe6 0 18%, transparent 20%) 0 0/6px 6px, #1b1a1a",
  multicolor: "conic-gradient(#c2313b, #f0cf4b, #3f7d4f, #3463a8, #6b3d8f, #c2313b)",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim();

/** CSS de fundo para a amostra de uma cor (`null` quando o nome não é reconhecido). */
export function swatchFor(name: unknown): string | null {
  if (typeof name !== "string" || !name.trim()) return null;
  const n = norm(name);
  if (/^#[0-9a-f]{3,8}$/i.test(n)) return n;
  if (PATTERNS[n]) return PATTERNS[n]!;
  if (BASE[n]) return BASE[n]!;
  for (const [k, v] of Object.entries(PATTERNS)) if (n.includes(k)) return v;
  // "azul marinho", "verde militar"… tenta a expressão composta mais longa e depois a primeira palavra
  const keys = Object.keys(BASE).sort((a, b) => b.length - a.length);
  const hit = keys.find((k) => n.includes(k));
  return hit ? BASE[hit]! : null;
}

/** Cores claras pedem borda para aparecer sobre fundo branco. */
export function isLight(css: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(css);
  if (!m) return false;
  const v = parseInt(m[1]!, 16);
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 215;
}

/* ------------------------------ Grade tamanho × cor ------------------------------ */

export type GradeRow = { cor: string; q: Record<string, number> };

/** Lê e limpa a grade (tamanhos fora da lista e quantidades inválidas são descartados). */
export function parseGrade(raw: unknown, sizes: string[]): GradeRow[] {
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  const out: GradeRow[] = [];
  for (const r of v.slice(0, 40)) {
    if (!r || typeof r !== "object") continue;
    const cor = String((r as GradeRow).cor ?? "").trim().slice(0, 40);
    const q: Record<string, number> = {};
    for (const s of sizes) {
      const n = Math.floor(Number((r as GradeRow).q?.[s] ?? 0));
      if (Number.isFinite(n) && n > 0) q[s] = Math.min(n, 999_999);
    }
    if (cor || Object.keys(q).length) out.push({ cor: cor || "Única", q });
  }
  return out;
}

export const gradeTotal = (rows: GradeRow[]) => rows.reduce((t, r) => t + Object.values(r.q).reduce((a, b) => a + b, 0), 0);
