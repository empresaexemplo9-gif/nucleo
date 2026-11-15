/** Utilitários de cor usados no estúdio de marca (somente cliente/puros). */

export type RGB = [number, number, number];

export const toHex = ([r, g, b]: RGB) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const fromHex = (h: string): RGB => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function lumOf([r, g, b]: RGB) {
  const f = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Razão de contraste WCAG entre duas cores hex. */
export function contrast(a: string, b: string) {
  const [x, y] = [lumOf(fromHex(a)), lumOf(fromHex(b))].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

/** Escurece/clareia misturando com preto/branco. */
export function mix(h: string, target: string, amount: number) {
  const a = fromHex(h), b = fromHex(target);
  return toHex([0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * amount) as RGB);
}

/**
 * Extrai as cores predominantes de uma imagem (logo ou identidade visual).
 * Ignora transparência e fundos quase brancos; agrupa tons parecidos.
 */
export function extractPalette(img: HTMLImageElement, max = 8): string[] {
  const size = 96;
  const c = document.createElement("canvas");
  const ratio = Math.min(size / (img.naturalWidth || size), size / (img.naturalHeight || size));
  c.width = Math.max(1, Math.round((img.naturalWidth || size) * ratio));
  c.height = Math.max(1, Math.round((img.naturalHeight || size) * ratio));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
    if (a < 160) continue;
    const [, s, l] = rgbToHsl([r, g, b]);
    if (l > 0.94 || (l > 0.88 && s < 0.15)) continue; // fundo branco
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    buckets.set(key, e);
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((e) => ({ n: e.n, rgb: [e.r / e.n, e.g / e.n, e.b / e.n] as RGB }));
  const out: { n: number; rgb: RGB }[] = [];
  for (const s of sorted) {
    const near = out.find((o) => Math.hypot(o.rgb[0] - s.rgb[0], o.rgb[1] - s.rgb[1], o.rgb[2] - s.rgb[2]) < 48);
    if (near) near.n += s.n;
    else out.push({ ...s });
    if (out.length >= max * 3) break;
  }
  return out.sort((a, b) => b.n - a.n).slice(0, max).map((o) => toHex(o.rgb));
}

/** Sugere cor principal (marcante) e de destaque (tom diferente) a partir da paleta. */
export function suggestPair(palette: string[]): { primary: string; accent: string } | null {
  if (!palette.length) return null;
  const info = palette.map((h) => ({ h, hsl: rgbToHsl(fromHex(h)) }));
  const vivid = info.filter((x) => x.hsl[1] > 0.22 && x.hsl[2] > 0.12 && x.hsl[2] < 0.85);
  const primary = (vivid[0] ?? info[0])!;
  const hueDist = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const accent =
    vivid.find((x) => x.h !== primary.h && hueDist(x.hsl[0], primary.hsl[0]) > 35) ??
    info.find((x) => x.h !== primary.h && Math.abs(x.hsl[2] - primary.hsl[2]) > 0.18);
  return { primary: primary.h, accent: accent?.h ?? mix(primary.h, "#ffffff", 0.35) };
}

/** Lê um arquivo de imagem e devolve um data URL otimizado para logotipo. */
export async function fileToLogoDataUrl(file: File, maxSide = 512): Promise<string> {
  const raw = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
  if (file.type === "image/svg+xml" && raw.length < 6_000_000) return raw;
  const img = await loadImage(raw);
  const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * ratio);
  c.height = Math.round(img.naturalHeight * ratio);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const png = c.toDataURL("image/png");
  return png.length < 7_500_000 ? png : c.toDataURL("image/webp", 0.92);
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Não foi possível ler a imagem"));
    img.src = src;
  });
}

export type Aesthetic = { bg: string; card: string; text: string; primary: string; accent: string; nav: [string, string, string, string]; btn: [string, string] };

/**
 * Lê a estética completa de uma imagem (identidade visual, tela, moodboard): fundo dominante,
 * painéis, texto, cor do menu, cor principal e de destaque — ponderando a área que cada cor ocupa.
 */
export function extractAesthetic(img: HTMLImageElement): Aesthetic | null {
  const size = 128;
  const c = document.createElement("canvas");
  const ratio = Math.min(size / (img.naturalWidth || size), size / (img.naturalHeight || size));
  c.width = Math.max(1, Math.round((img.naturalWidth || size) * ratio));
  c.height = Math.max(1, Math.round((img.naturalHeight || size) * ratio));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 160) continue;
    const [r, g, b] = [data[i]!, data[i + 1]!, data[i + 2]!];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    buckets.set(key, e);
    total++;
  }
  if (!total) return null;
  const merged: { n: number; rgb: RGB }[] = [];
  for (const e of [...buckets.values()].sort((a, b) => b.n - a.n)) {
    const rgb: RGB = [e.r / e.n, e.g / e.n, e.b / e.n];
    const near = merged.find((o) => Math.hypot(o.rgb[0] - rgb[0], o.rgb[1] - rgb[1], o.rgb[2] - rgb[2]) < 36);
    if (near) near.n += e.n;
    else if (merged.length < 40) merged.push({ n: e.n, rgb });
  }
  const cs = merged.sort((a, b) => b.n - a.n).map((m) => ({ h: toHex(m.rgb), share: m.n / total, hsl: rgbToHsl(m.rgb) }));
  const on = (x: string) => (contrast("#ffffff", x) >= contrast("#0a0a0a", x) ? "#ffffff" : "#0a0a0a");
  const hueDist = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

  const top = cs[0]!.h;
  const darkBg = on(top) === "#ffffff";
  // fundo e painéis: as duas cores vizinhas de maior área; o painel é sempre a mais clara
  const panel = cs.find((x) => x.h !== top && x.share > 0.06 && contrast(x.h, top) < 1.3)?.h;
  const lighter = (a: string, b: string) => (contrast(a, "#000000") >= contrast(b, "#000000") ? [a, b] : [b, a]);
  const [card, bg] = panel ? lighter(top, panel) : [mix(top, "#ffffff", darkBg ? 0.07 : 0.6), top];
  const ink = cs.filter((x) => x.share > 0.004).sort((a, b) => contrast(b.h, bg) - contrast(a.h, bg))[0];
  const text = ink && contrast(ink.h, bg) >= 7 ? ink.h : darkBg ? "#f4f4f2" : "#141414";
  const navBg = cs.find((x) => x.h !== bg && x.share > 0.06 && contrast(x.h, bg) > 1.8)?.h ?? bg;
  const vivid = cs.filter((x) => x.hsl[1] > 0.3 && x.hsl[2] > 0.15 && x.hsl[2] < 0.85 && x.h !== bg)
    // cor de marca: saturada, presente e que se destaca do fundo (não um pastel de área grande)
    .map((x) => ({ ...x, score: Math.sqrt(x.share) * x.hsl[1] * Math.min(contrast(x.h, bg), 4) }))
    .sort((a, b) => b.score - a.score);
  const free = vivid.filter((x) => x.h !== navBg);
  const main = free[0] ?? vivid[0];
  const primary = main?.h ?? text;
  const second = main ? (free.find((x) => x.h !== primary && hueDist(x.hsl[0], main.hsl[0]) > 35) ?? vivid.find((x) => x.h !== primary)) : undefined;
  const accent = second?.h ?? mix(primary, darkBg ? "#ffffff" : "#000000", 0.35);
  const active = [accent, primary].find((x) => contrast(x, navBg) >= 1.6) ?? on(navBg);
  return { bg, card, text, primary, accent, nav: [navBg, on(navBg), active, on(active)], btn: [primary, on(primary)] };
}
