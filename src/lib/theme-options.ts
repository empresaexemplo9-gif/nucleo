/** Opções de personalização visual (whitelabel): fontes, tons de fundo e CSS derivado. */

export type FontOption = { key: string; label: string; family: string; google?: string; kind: "sans" | "serif" };

/** Fontes principais (corpo e títulos). A primeira é o padrão da plataforma, já carregada pelo app. */
export const SANS_FONTS: FontOption[] = [
  { key: "inter-tight", label: "Inter Tight (padrão)", family: "var(--font-inter-tight), 'Inter Tight'", kind: "sans" },
  { key: "inter", label: "Inter", family: "'Inter'", google: "Inter:wght@300;400;500;600;700", kind: "sans" },
  { key: "manrope", label: "Manrope", family: "'Manrope'", google: "Manrope:wght@300;400;500;600;700", kind: "sans" },
  { key: "plus-jakarta", label: "Plus Jakarta Sans", family: "'Plus Jakarta Sans'", google: "Plus+Jakarta+Sans:wght@300;400;500;600;700", kind: "sans" },
  { key: "dm-sans", label: "DM Sans", family: "'DM Sans'", google: "DM+Sans:wght@300;400;500;600;700", kind: "sans" },
  { key: "poppins", label: "Poppins", family: "'Poppins'", google: "Poppins:wght@300;400;500;600;700", kind: "sans" },
  { key: "montserrat", label: "Montserrat", family: "'Montserrat'", google: "Montserrat:wght@300;400;500;600;700", kind: "sans" },
  { key: "space-grotesk", label: "Space Grotesk", family: "'Space Grotesk'", google: "Space+Grotesk:wght@300;400;500;600;700", kind: "sans" },
  { key: "nunito", label: "Nunito", family: "'Nunito'", google: "Nunito:wght@300;400;500;600;700", kind: "sans" },
  { key: "work-sans", label: "Work Sans", family: "'Work Sans'", google: "Work+Sans:wght@300;400;500;600;700", kind: "sans" },
  { key: "ibm-plex", label: "IBM Plex Sans", family: "'IBM Plex Sans'", google: "IBM+Plex+Sans:wght@300;400;500;600;700", kind: "sans" },
  { key: "outfit", label: "Outfit", family: "'Outfit'", google: "Outfit:wght@300;400;500;600;700", kind: "sans" },
];

/** Fontes de destaque (palavras em itálico nos títulos). */
export const SERIF_FONTS: FontOption[] = [
  { key: "instrument", label: "Instrument Serif (padrão)", family: "var(--font-instrument), 'Instrument Serif'", kind: "serif" },
  { key: "playfair", label: "Playfair Display", family: "'Playfair Display'", google: "Playfair+Display:ital,wght@0,400;1,400", kind: "serif" },
  { key: "lora", label: "Lora", family: "'Lora'", google: "Lora:ital,wght@0,400;1,400", kind: "serif" },
  { key: "dm-serif", label: "DM Serif Display", family: "'DM Serif Display'", google: "DM+Serif+Display:ital@0;1", kind: "serif" },
  { key: "fraunces", label: "Fraunces", family: "'Fraunces'", google: "Fraunces:ital,wght@0,400;1,400", kind: "serif" },
  { key: "cormorant", label: "Cormorant Garamond", family: "'Cormorant Garamond'", google: "Cormorant+Garamond:ital,wght@0,500;1,500", kind: "serif" },
  { key: "same", label: "Mesma da fonte principal", family: "", kind: "serif" },
];

export type SurfaceOption = { key: string; label: string; vars: Record<string, string> };

/** Tons de fundo do tema claro. */
export const SURFACES: SurfaceOption[] = [
  { key: "paper", label: "Papel (padrão)", vars: {} },
  { key: "neutral", label: "Neutro", vars: { "--bg": "#f3f4f6", "--surface-2": "#f9fafb", "--surface-3": "#e5e7eb", "--card-bg": "linear-gradient(180deg,#ffffff,#f9fafb)", "--nav-bg": "rgba(243,244,246,.8)", "--menu-bg": "rgba(243,244,246,.97)" } },
  { key: "white", label: "Branco", vars: { "--bg": "#ffffff", "--surface-2": "#fafafa", "--surface-3": "#ededed", "--card-bg": "#ffffff", "--nav-bg": "rgba(255,255,255,.82)", "--menu-bg": "rgba(255,255,255,.97)" } },
  { key: "brand", label: "Tom da marca", vars: { "--bg": "color-mix(in oklab, var(--accent) 6%, #f7f7f5)", "--surface-2": "color-mix(in oklab, var(--accent) 3%, #fbfbfa)", "--surface-3": "color-mix(in oklab, var(--accent) 12%, #ecebe7)", "--nav-bg": "color-mix(in oklab, var(--accent) 5%, rgba(247,247,245,.8))" } },
];

export type BrandTheme = { font?: string; serifFont?: string; surface?: string; radius?: string };

export const RADII = [
  { key: "soft", label: "Suave (padrão)", radius: "14px", sm: "8px" },
  { key: "sharp", label: "Reto", radius: "6px", sm: "4px" },
  { key: "round", label: "Arredondado", radius: "22px", sm: "12px" },
];

export const findSans = (k?: string) => SANS_FONTS.find((f) => f.key === k) ?? SANS_FONTS[0]!;
export const findSerif = (k?: string) => SERIF_FONTS.find((f) => f.key === k) ?? SERIF_FONTS[0]!;

/** URL do Google Fonts para as fontes escolhidas (ou null quando só usa as padrão). */
export function googleFontsHref(t: BrandTheme) {
  const fams = [findSans(t.font).google, findSerif(t.serifFont).google].filter(Boolean);
  return fams.length ? `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${f}`).join("&")}&display=swap` : null;
}

/** CSS com fontes, raio e tom de fundo da empresa (vazio quando tudo é padrão). */
export function themeCss(t: BrandTheme) {
  const sans = findSans(t.font);
  const serif = findSerif(t.serifFont);
  const root: string[] = [];
  if (sans.key !== SANS_FONTS[0]!.key) root.push(`--app-font:${sans.family}, system-ui, sans-serif`);
  if (serif.key === "same") root.push(`--app-serif:var(--app-font)`);
  else if (serif.key !== SERIF_FONTS[0]!.key) root.push(`--app-serif:${serif.family}, Georgia, serif`);
  const radius = RADII.find((r) => r.key === t.radius);
  if (radius && radius.key !== "soft") root.push(`--radius:${radius.radius}`, `--radius-sm:${radius.sm}`);
  const surface = SURFACES.find((s) => s.key === t.surface);
  const light = surface ? Object.entries(surface.vars).map(([k, v]) => `${k}:${v}`) : [];
  let css = "";
  if (root.length) css += `:root{${root.join(";")}}`;
  if (light.length) css += `:root:not([data-theme="dark"]){${light.join(";")}}`;
  return css;
}
