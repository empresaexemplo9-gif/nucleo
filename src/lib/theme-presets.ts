/**
 * Temas prontos (whitelabel): 30 identidades visuais completas — paleta, tipografia,
 * cantos, sombras e navegação — aplicáveis com um clique no estúdio de marca.
 * Cada tema é descrito de forma compacta e os tokens CSS são derivados aqui,
 * com contraste AA garantido por cálculo (texto, botões e navegação).
 */
import { contrast, mix } from "./color-tools";

export type PresetGroup = "classicos" | "ousados" | "criativos";
type Look = "soft" | "flat" | "hard" | "lift" | "glass" | "glow";

export type ThemePreset = {
  key: string;
  name: string;
  group: PresetGroup;
  note: string;
  dark?: boolean;
  /** Fundo da página, fundo dos painéis e cor do texto. */
  bg: string;
  card: string;
  text: string;
  /** Cores de marca sugeridas (a empresa pode trocar depois). */
  primary: string;
  accent: string;
  /** Navegação lateral: fundo, texto, item ativo (fundo, texto). "p"/"a" = cor principal/destaque. */
  nav: [string, string, string, string];
  /** Botão principal: fundo e texto. */
  btn: [string, string];
  display: string;
  body: string;
  head?: { w?: number; italic?: boolean; upper?: boolean; track?: string };
  /** Palavra de destaque dos títulos em itálico. */
  hl?: boolean;
  /** Mantém rótulos e números em fonte monoespaçada. */
  mono?: boolean;
  radius: number;
  look: Look;
  line?: string;
  lineA?: number;
  bgImage?: string;
  noise?: number;
  grid?: number;
};

export const PRESET_GROUPS: { key: PresetGroup; label: string; hint: string }[] = [
  { key: "classicos", label: "Clássicos", hint: "Elegantes e discretos" },
  { key: "ousados", label: "Ousados", hint: "Cor e personalidade fortes" },
  { key: "criativos", label: "Criativos", hint: "Inspirados em design gráfico" },
];

/** Fontes usadas pelos temas: família CSS e especificação do Google Fonts. */
const FONTS: Record<string, { css: string; google?: string }> = {
  "Inter Tight": { css: "var(--font-inter-tight), 'Inter Tight'" },
  "JetBrains Mono": { css: "var(--font-jetbrains), 'JetBrains Mono', ui-monospace" },
  Inter: { css: "'Inter'", google: "Inter:wght@300..700" },
  Nunito: { css: "'Nunito'", google: "Nunito:wght@300..900" },
  "Nunito Sans": { css: "'Nunito Sans'", google: "Nunito+Sans:wght@300..800" },
  "DM Sans": { css: "'DM Sans'", google: "DM+Sans:wght@300..700" },
  Outfit: { css: "'Outfit'", google: "Outfit:wght@200..700" },
  Jost: { css: "'Jost'", google: "Jost:wght@200..700" },
  Sora: { css: "'Sora'", google: "Sora:wght@300..700" },
  Poppins: { css: "'Poppins'", google: "Poppins:wght@300;400;500;600;700;800" },
  "Work Sans": { css: "'Work Sans'", google: "Work+Sans:wght@300..700" },
  "IBM Plex Sans": { css: "'IBM Plex Sans'", google: "IBM+Plex+Sans:wght@300;400;500;600;700" },
  Quicksand: { css: "'Quicksand'", google: "Quicksand:wght@400..700" },
  Fredoka: { css: "'Fredoka'", google: "Fredoka:wght@400..700" },
  "Baloo 2": { css: "'Baloo 2'", google: "Baloo+2:wght@500..800" },
  Archivo: { css: "'Archivo'", google: "Archivo:wght@400..800" },
  "Archivo Narrow": { css: "'Archivo Narrow'", google: "Archivo+Narrow:wght@500..700" },
  Oswald: { css: "'Oswald'", google: "Oswald:wght@400..700" },
  Anton: { css: "'Anton'", google: "Anton" },
  "Bebas Neue": { css: "'Bebas Neue'", google: "Bebas+Neue" },
  "Barlow Condensed": { css: "'Barlow Condensed'", google: "Barlow+Condensed:wght@500;600;700" },
  Unbounded: { css: "'Unbounded'", google: "Unbounded:wght@400..700" },
  "Chakra Petch": { css: "'Chakra Petch'", google: "Chakra+Petch:wght@400;500;600;700" },
  Cinzel: { css: "'Cinzel'", google: "Cinzel:wght@500..700" },
  "Playfair Display": { css: "'Playfair Display'", google: "Playfair+Display:ital,wght@0,400..800;1,400..800" },
  "Cormorant Garamond": { css: "'Cormorant Garamond'", google: "Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600" },
  "DM Serif Display": { css: "'DM Serif Display'", google: "DM+Serif+Display:ital@0;1" },
  Fraunces: { css: "'Fraunces'", google: "Fraunces:ital,wght@0,400..700;1,400..700" },
  Bitter: { css: "'Bitter'", google: "Bitter:wght@400..800" },
  "Zilla Slab": { css: "'Zilla Slab'", google: "Zilla+Slab:wght@400;500;600;700" },
};
const SERIFS = new Set(["Playfair Display", "Cormorant Garamond", "DM Serif Display", "Fraunces", "Bitter", "Zilla Slab", "Cinzel"]);

export const THEME_PRESETS: ThemePreset[] = [
  /* ------------------------------ Clássicos ------------------------------ */
  { key: "lavanda-editorial", name: "Lavanda editorial", group: "classicos", note: "Lavanda, berinjela e amarelo ácido com serifa itálica",
    bg: "#eadcfd", card: "#f8f4fd", text: "#2a0f2e", primary: "#421240", accent: "#e9ef4f",
    nav: ["p", "#f3e9f7", "a", "#2a0f2e"], btn: ["a", "#2a0f2e"],
    display: "Playfair Display", body: "Nunito Sans", head: { w: 700, italic: true, track: "-0.02em" }, radius: 18, look: "soft" },
  { key: "terracota-organico", name: "Terracota orgânico", group: "classicos", note: "Areia quente, terracota e verde-oliva",
    bg: "#f8eade", card: "#fdf5eb", text: "#3b2218", primary: "#9c4128", accent: "#7d8a3c",
    nav: ["p", "#fbeee2", "#b9654a", "#ffffff"], btn: ["#4b5a26", "#ffffff"],
    display: "Nunito", body: "Nunito", head: { w: 800, track: "-0.01em" }, radius: 16, look: "soft" },
  { key: "grafite-neon", name: "Grafite neon", group: "classicos", note: "Painel escuro em grafite com destaques verde-limão", dark: true,
    bg: "#0d1013", card: "#181c1f", text: "#f2f4f1", primary: "#b6f03c", accent: "#8fb84a",
    nav: ["#121619", "#e6e9e6", "p", "#0d1013"], btn: ["p", "#0d1013"],
    display: "Oswald", body: "Inter", head: { w: 600, upper: true, track: "0.01em" }, mono: true, radius: 6, look: "flat" },
  { key: "oceano", name: "Oceano", group: "classicos", note: "Água-marinha clara, azul-petróleo, turquesa e coral",
    bg: "#dff5f4", card: "#fafdfd", text: "#0b3442", primary: "#12a79e", accent: "#ff6b57",
    nav: ["#013c4e", "#e6f6f6", "p", "#ffffff"], btn: ["a", "#ffffff"],
    display: "Nunito", body: "Nunito", head: { w: 800, track: "-0.01em" }, radius: 14, look: "soft" },
  { key: "cereja", name: "Cereja", group: "classicos", note: "Branco e rosado com vermelho-cereja e serifa elegante",
    bg: "#fdf8f8", card: "#ffffff", text: "#4a0f1c", primary: "#d81e3a", accent: "#e8909b",
    nav: ["#fcf0f1", "#4a0f1c", "#f6dde0", "#a8102a"], btn: ["p", "#ffffff"],
    display: "Playfair Display", body: "Inter", head: { w: 600, track: "-0.01em" }, hl: true, radius: 6, look: "flat" },
  { key: "swiss-laranja", name: "Swiss laranja", group: "classicos", note: "Modernismo suíço: grade rígida, preto e laranja vivo",
    bg: "#f5f5f4", card: "#fcfcfb", text: "#141414", primary: "#ff5a14", accent: "#141414",
    nav: ["#efefee", "#141414", "#fde0d2", "#141414"], btn: ["p", "#141414"],
    display: "Archivo", body: "Inter", head: { w: 800, track: "-0.03em" }, radius: 3, look: "flat" },
  { key: "azul-noturno", name: "Azul noturno", group: "classicos", note: "Marinho profundo com azul-gelo e âmbar", dark: true,
    bg: "#060e28", card: "#101938", text: "#e8eefc", primary: "#6fb6ff", accent: "#f5a623",
    nav: ["#091333", "#cdd8f5", "#1f4fa3", "#ffffff"], btn: ["a", "#0b1431"],
    display: "Outfit", body: "Inter", head: { w: 300, track: "-0.01em" }, mono: true, radius: 8, look: "flat" },
  { key: "pistache", name: "Pistache", group: "classicos", note: "Verde-pistache, painéis brancos e rosa suave",
    bg: "#e3f2d5", card: "#ffffff", text: "#2c3a12", primary: "#4a6b1e", accent: "#f09ab5",
    nav: ["#e3f2d5", "#2c3a12", "#c6e2a9", "#2c3a12"], btn: ["#3f5c17", "#ffffff"],
    display: "Fredoka", body: "DM Sans", head: { w: 600, track: "-0.01em" }, radius: 18, look: "soft" },
  { key: "monocromatico", name: "Monocromático", group: "classicos", note: "Preto, branco quente e cinzas — luxo editorial",
    bg: "#fbfbfa", card: "#ffffff", text: "#0a0a0a", primary: "#0a0a0a", accent: "#8a8a8a",
    nav: ["#050505", "#f2f2f0", "#2a2a2a", "#ffffff"], btn: ["p", "#ffffff"],
    display: "Jost", body: "Inter", head: { w: 300, track: "-0.02em" }, radius: 2, look: "flat" },
  { key: "ameixa-damasco", name: "Ameixa e damasco", group: "classicos", note: "Pêssego claro, ameixa e botões damasco",
    bg: "#fedfd5", card: "#fef6f2", text: "#4a1238", primary: "#6c1e4d", accent: "#f39a52",
    nav: ["p", "#fbe9ef", "#8d3f6c", "#ffffff"], btn: ["a", "#4a1238"],
    display: "Bitter", body: "Nunito Sans", head: { w: 700, track: "-0.02em" }, radius: 12, look: "soft" },

  /* ------------------------------- Ousados ------------------------------- */
  { key: "ultravioleta-holografico", name: "Ultravioleta holográfico", group: "ousados", note: "Central futurista em violeta com orquídea e ciano", dark: true,
    bg: "#0d0a2e", card: "#1b1650", text: "#f1edff", primary: "#c56bff", accent: "#2fe6ff",
    nav: ["#120b3a", "#d9d2ff", "#3a2a8c", "#ffffff"], btn: ["a", "#0d0a2e"],
    display: "Unbounded", body: "Inter", head: { w: 500, upper: true, track: "0.02em" }, mono: true, radius: 14, look: "glow",
    bgImage: "radial-gradient(60% 50% at 20% 0%, rgba(150,60,255,.38), transparent 70%), radial-gradient(50% 45% at 100% 30%, rgba(40,200,255,.22), transparent 70%)" },
  { key: "cobalto-brutalista", name: "Cobalto brutalista", group: "ousados", note: "Neobrutalismo: cobalto, amarelo-manteiga e contornos pretos",
    bg: "#fdf0a6", card: "#ffffff", text: "#0a0a0a", primary: "#0a1df0", accent: "#ff4b1f",
    nav: ["p", "#ffffff", "#ffe14a", "#0a0a0a"], btn: ["a", "#0a0a0a"],
    display: "Anton", body: "Archivo", head: { w: 400, upper: true, track: "0.01em" }, radius: 0, look: "hard" },
  { key: "rubi-cromado", name: "Rubi cromado", group: "ousados", note: "Bordô profundo, vidro escuro e brilho rubi", dark: true,
    bg: "#1c0206", card: "#381a1f", text: "#f6eeee", primary: "#f0425c", accent: "#c9c2c4",
    nav: ["#2a060c", "#f0e4e6", "#7a1022", "#ffffff"], btn: ["#e0243f", "#ffffff"],
    display: "Playfair Display", body: "Outfit", head: { w: 600, track: "-0.01em" }, hl: true, radius: 10, look: "glass",
    bgImage: "radial-gradient(55% 60% at 0% 100%, rgba(190,20,50,.4), transparent 70%), radial-gradient(40% 40% at 100% 0%, rgba(120,10,30,.5), transparent 70%)" },
  { key: "tropical-pop", name: "Tropical pop", group: "ousados", note: "Modernismo tropical: esmeralda, tangerina e pink",
    bg: "#fbede3", card: "#fef7ef", text: "#0b3d2a", primary: "#01663c", accent: "#ff3d7f",
    nav: ["#01472b", "#eafff3", "#18a35a", "#ffffff"], btn: ["a", "#ffffff"],
    display: "Baloo 2", body: "DM Sans", head: { w: 800, track: "-0.01em" }, radius: 20, look: "soft" },
  { key: "obsidiana-ouro", name: "Obsidiana e ouro", group: "ousados", note: "Preto obsidiana com ouro champanhe e serifa dramática", dark: true,
    bg: "#0c0a09", card: "#181410", text: "#f3ead8", primary: "#d4af6a", accent: "#a8946c",
    nav: ["#120e0c", "#d9cdb8", "#2a2118", "#e8c98a"], btn: ["p", "#14100c"],
    display: "Cormorant Garamond", body: "Jost", head: { w: 600, track: "-0.01em" }, hl: true, radius: 6, look: "flat", line: "#d4af6a", lineA: 20,
    bgImage: "radial-gradient(60% 40% at 80% 0%, rgba(212,175,106,.12), transparent 70%)" },
  { key: "coral-aquatico", name: "Coral aquático", group: "ousados", note: "Espuma-do-mar luminosa, coral intenso e turquesa",
    bg: "#cdf6f3", card: "#f3fdfc", text: "#0d4a57", primary: "#ff5a4a", accent: "#19c2bd",
    nav: ["#e3faf9", "#0d4a57", "p", "#ffffff"], btn: ["p", "#ffffff"],
    display: "Quicksand", body: "Nunito", head: { w: 700, track: "-0.01em" }, radius: 18, look: "glass",
    bgImage: "linear-gradient(160deg, #d6f8f6 0%, #aef4f0 55%, #c8f6f4 100%)" },
  { key: "magenta-editorial", name: "Magenta editorial", group: "ousados", note: "Revista de moda: títulos gigantes, magenta e laranja",
    bg: "#fdf3ee", card: "#fffaf7", text: "#0a0a0a", primary: "#e0116f", accent: "#ff6a13",
    nav: ["#0a0a0a", "#f7efe9", "p", "#ffffff"], btn: ["a", "#0a0a0a"],
    display: "Bebas Neue", body: "Inter", head: { w: 400, upper: true, track: "0.01em" }, radius: 0, look: "flat", lineA: 26 },
  { key: "solar-retrofuturo", name: "Solar retrofuturo", group: "ousados", note: "Berinjela profunda com laranja pôr do sol e lilás", dark: true,
    bg: "#3a0829", card: "#55113c", text: "#fde8df", primary: "#ff8a2a", accent: "#e0b8ee",
    nav: ["#2c0620", "#f6d9d0", "p", "#2c0620"], btn: ["p", "#2c0620"],
    display: "Chakra Petch", body: "DM Sans", head: { w: 700, track: "0" }, radius: 16, look: "glow", noise: 0.05,
    bgImage: "radial-gradient(70% 45% at 70% 0%, rgba(255,120,40,.3), transparent 70%)" },
  { key: "esmeralda-artdeco", name: "Esmeralda art déco", group: "ousados", note: "Esmeralda profunda, latão e coral em geometria déco", dark: true,
    bg: "#002b1e", card: "#0b3a2a", text: "#faf1e3", primary: "#d6b36a", accent: "#f0785a",
    nav: ["#00241a", "#efe2c8", "p", "#00241a"], btn: ["a", "#1a0a05"],
    display: "Cinzel", body: "Jost", head: { w: 600, upper: true, track: "0.05em" }, radius: 2, look: "flat", line: "#d6b36a", lineA: 26 },
  { key: "gelo-prisma", name: "Gelo prisma", group: "ousados", note: "Branco-gelo, ultramarino e reflexos espectrais",
    bg: "#eef0fd", card: "#fbfbff", text: "#0b0b14", primary: "#1f35ff", accent: "#c23df0",
    nav: ["#f1ecfd", "#0b0b14", "p", "#ffffff"], btn: ["p", "#ffffff"],
    display: "Sora", body: "Inter", head: { w: 600, track: "-0.03em" }, radius: 16, look: "glass",
    bgImage: "linear-gradient(135deg, #f6e9fd 0%, #eef0fd 40%, #dcedfa 70%, #f4e4fb 100%)" },

  /* ------------------------------ Criativos ------------------------------ */
  { key: "risografia", name: "Risografia", group: "criativos", note: "Papel reciclado, azul-tinta, vermelhão e girassol",
    bg: "#f9efdd", card: "#fcf5e8", text: "#14264a", primary: "#0d2e62", accent: "#e8442e",
    nav: ["p", "#f6ecd8", "#f6c544", "#0d2e62"], btn: ["p", "#ffffff"],
    display: "DM Serif Display", body: "DM Sans", head: { w: 400, track: "-0.01em" }, hl: true, radius: 8, look: "flat", noise: 0.06 },
  { key: "papel-recortado", name: "Papel recortado", group: "criativos", note: "Camadas de papel em lavanda, pêssego e menta",
    bg: "#f8eee7", card: "#fdf7f0", text: "#3b1d4a", primary: "#5b2a78", accent: "#f2a98c",
    nav: ["#f3e6ec", "#3b1d4a", "#e0c9ee", "#3b1d4a"], btn: ["p", "#ffffff"],
    display: "Nunito", body: "Nunito", head: { w: 800, track: "-0.01em" }, radius: 16, look: "lift" },
  { key: "ceramica-azul", name: "Cerâmica azul", group: "criativos", note: "Azul e branco de azulejo, com serifa egípcia",
    bg: "#f3f5f9", card: "#ffffff", text: "#0f2350", primary: "#1b3fa8", accent: "#7b96d6",
    nav: ["#eef1f7", "#0f2350", "#ffffff", "#1b3fa8"], btn: ["p", "#ffffff"],
    display: "Zilla Slab", body: "Inter", head: { w: 600, track: "-0.01em" }, radius: 12, look: "soft" },
  { key: "cartografia", name: "Cartografia", group: "criativos", note: "Design de mapas: pinho, laranja-segurança e azul-céu",
    bg: "#dde5dc", card: "#eaf0e9", text: "#0f2e22", primary: "#f2600c", accent: "#2d9ad6",
    nav: ["#0a2e1e", "#dfe9e0", "p", "#0a1a12"], btn: ["p", "#0a1a12"],
    display: "Barlow Condensed", body: "IBM Plex Sans", head: { w: 700, upper: true, track: "0.02em" }, mono: true, radius: 2, look: "flat", grid: 0.6 },
  { key: "bauhaus", name: "Bauhaus", group: "criativos", note: "Creme com azul, vermelho e ocre primários",
    bg: "#fbf2e1", card: "#fef8eb", text: "#15151c", primary: "#0a3aa0", accent: "#e23a2a",
    nav: ["#042d7f", "#ffffff", "#f0b429", "#15151c"], btn: ["p", "#ffffff"],
    display: "Poppins", body: "Poppins", head: { w: 800, track: "-0.03em" }, radius: 6, look: "flat" },
  { key: "aero-perola", name: "Aero pérola", group: "criativos", note: "Pérola e céu, controles azul-celeste e verde-maçã",
    bg: "#e6eff9", card: "#f8fbfe", text: "#12304a", primary: "#1272d6", accent: "#5cb82a",
    nav: ["#eef5fc", "#12304a", "p", "#ffffff"], btn: ["p", "#ffffff"],
    display: "Nunito", body: "Nunito", head: { w: 700, track: "-0.01em" }, radius: 14, look: "glass",
    bgImage: "linear-gradient(180deg, #e3edfd 0%, #eef5fc 45%, #e1effb 100%)" },
  { key: "terminal-ambar", name: "Terminal âmbar", group: "criativos", note: "Âmbar sobre tinta escura, estética de terminal", dark: true,
    bg: "#0d0807", card: "#17100b", text: "#f1e6d2", primary: "#f5a623", accent: "#c98a3c",
    nav: ["#0d0808", "#d9c8a8", "#2b1c0e", "p"], btn: ["p", "#0d0807"],
    display: "JetBrains Mono", body: "Inter", head: { w: 500, track: "-0.02em" }, mono: true, radius: 3, look: "flat", line: "#c98a3c", lineA: 26 },
  { key: "memphis", name: "Memphis", group: "criativos", note: "Pêssego, índigo, lilás, menta e coral — lúdico e geométrico",
    bg: "#fee5de", card: "#fef8f8", text: "#1f1147", primary: "#5b2fd6", accent: "#ff7a6b",
    nav: ["#251351", "#efe8ff", "#cdb7f5", "#1f1147"], btn: ["p", "#ffffff"],
    display: "Fredoka", body: "DM Sans", head: { w: 600, track: "-0.01em" }, radius: 18, look: "lift" },
  { key: "botanico-editorial", name: "Botânico editorial", group: "criativos", note: "Pedra clara, verde-musgo, argila e rosa seco",
    bg: "#f3ebe2", card: "#faf4ec", text: "#2b2e1f", primary: "#404430", accent: "#b8735a",
    nav: ["#3f4230", "#f1ead9", "#5a5f43", "#ffffff"], btn: ["p", "#ffffff"],
    display: "Fraunces", body: "Work Sans", head: { w: 500, track: "-0.02em" }, hl: true, radius: 10, look: "soft" },
  { key: "arquitetura-ameixa", name: "Arquitetura ameixa", group: "criativos", note: "Cinza-lavanda, ameixa saturada e chartreuse",
    bg: "#e6e0ee", card: "#f8f6fa", text: "#1c1024", primary: "#5c1f58", accent: "#c6e235",
    nav: ["#461142", "#f1e6f2", "a", "#1c1024"], btn: ["a", "#1c1024"],
    display: "Archivo Narrow", body: "Inter", head: { w: 700, upper: true, track: "0.01em" }, mono: true, radius: 4, look: "lift" },
];

/** Base neutra usada quando a empresa personaliza tudo sem partir de um tema pronto. */
export const BASE_PRESET: ThemePreset = {
  key: "personalizado", name: "Personalizado", group: "classicos", note: "Visual próprio da empresa",
  bg: "#f5f3ee", card: "#ffffff", text: "#121419", primary: "#b48a4f", accent: "#3c78c0",
  nav: ["#efece5", "#121419", "#ffffff", "#121419"], btn: ["#15171c", "#f5f3ee"],
  display: "Inter Tight", body: "Inter Tight", head: { w: 500, track: "-0.03em" }, mono: true, radius: 14, look: "soft",
};

export const FONT_NAMES = Object.keys(FONTS);
export const LOOKS: { key: Look; label: string }[] = [
  { key: "soft", label: "Suave (sombra leve)" },
  { key: "flat", label: "Plano (só contorno)" },
  { key: "lift", label: "Recorte (sombra sólida)" },
  { key: "hard", label: "Brutalista (contorno grosso)" },
  { key: "glass", label: "Vidro (translúcido)" },
  { key: "glow", label: "Brilho (neon)" },
];

/** Ajustes da empresa sobre o tema: qualquer cor, fonte, canto ou estilo de painel. */
export type ThemeCustom = Partial<Pick<ThemePreset, "bg" | "card" | "text" | "nav" | "btn" | "display" | "body" | "radius" | "look">>;

const HEX = /^#[0-9a-f]{6}$/i;
const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);
const isRef = (v: unknown): v is string => isHex(v) || v === "p" || v === "a";

/** Valida ajustes vindos do formulário, do banco ou de um arquivo de tema (nada fora do esperado chega ao CSS). */
export function sanitizeCustom(raw: unknown): ThemeCustom | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const out: ThemeCustom = {};
  for (const k of ["bg", "card", "text"] as const) if (isHex(r[k])) out[k] = (r[k] as string).toLowerCase();
  if (Array.isArray(r.nav) && r.nav.length === 4 && r.nav.every(isRef)) out.nav = r.nav as ThemePreset["nav"];
  if (Array.isArray(r.btn) && r.btn.length === 2 && r.btn.every(isRef)) out.btn = r.btn as ThemePreset["btn"];
  for (const k of ["display", "body"] as const) if (typeof r[k] === "string" && FONT_NAMES.includes(r[k] as string)) out[k] = r[k] as string;
  if (typeof r.radius === "number" && Number.isFinite(r.radius)) out.radius = Math.max(0, Math.min(28, Math.round(r.radius)));
  if (LOOKS.some((l) => l.key === r.look)) out.look = r.look as Look;
  return Object.keys(out).length ? out : undefined;
}

/** Tema efetivo da empresa: tema pronto (ou base neutra) com os ajustes aplicados. `undefined` = visual padrão. */
export function resolveTheme(t: { preset?: string | null; custom?: unknown }): ThemePreset | undefined {
  const preset = findPresetByKey(t.preset);
  const custom = sanitizeCustom(t.custom);
  if (!preset && !custom) return undefined;
  const s: ThemePreset = { ...(preset ?? BASE_PRESET), ...custom };
  if (custom?.bg || custom?.card || custom?.text) {
    // cores de base trocadas: o modo acompanha o fundo e os efeitos presos à paleta original saem
    s.dark = contrast("#ffffff", s.bg) > contrast("#000000", s.bg);
    s.bgImage = undefined;
    s.line = undefined;
  }
  return s;
}

export const PRESET_KEYS = THEME_PRESETS.map((p) => p.key);
export const findPreset = (key?: string | null) => findPresetByKey(key);
function findPresetByKey(key?: string | null) {
  return key ? THEME_PRESETS.find((p) => p.key === key) : undefined;
}

/* ----------------------------- Derivação ----------------------------- */

const INK = "#0a0a0a";
const PAPER = "#ffffff";
const bestOn = (bg: string) => (contrast(PAPER, bg) >= contrast(INK, bg) ? PAPER : INK);
const alpha = (c: string, pct: number) => `color-mix(in oklab, ${c} ${pct}%, transparent)`;

/** Aproxima `fg` de `toward` até atingir o contraste mínimo sobre todos os fundos. */
function readable(fg: string, on: string[], toward: string, min = 4.5) {
  let c = fg;
  for (let i = 1; i <= 20 && on.some((b) => contrast(c, b) < min); i++) c = mix(fg, toward, i / 20);
  return c;
}

/** Ajusta o fundo (escurece ou clareia) até o texto ficar legível sobre ele. */
function readableBg(bg: string, fg: string, min = 4.5) {
  const toward = contrast(fg, INK) > contrast(fg, PAPER) ? "#000000" : PAPER;
  let c = bg;
  for (let i = 1; i <= 20 && contrast(fg, c) < min; i++) c = mix(bg, toward, i / 20);
  return c;
}

const fontCss = (name: string) => `${FONTS[name]?.css ?? `'${name}'`}, ${SERIFS.has(name) ? "Georgia, serif" : name === "JetBrains Mono" ? "monospace" : "system-ui, -apple-system, 'Segoe UI', sans-serif"}`;

export type PresetStyle = {
  /** Tokens globais (página e painéis). */
  vars: Record<string, string>;
  /** Tokens aplicados somente dentro da navegação lateral. */
  nav: Record<string, string>;
  /** Regras de tipografia e superfície que não cabem em variáveis. */
  rules: string;
  mode: "light" | "dark";
};

/** Calcula todos os tokens do tema; `primary`/`accent` substituem as cores sugeridas. */
export function presetStyle(s: ThemePreset, primary?: string | null, accent?: string | null): PresetStyle {
  const p = primary || s.primary;
  const a = accent || s.accent;
  const pick = (v: string) => (v === "p" ? p : v === "a" ? a : v);
  const { bg, card } = s;
  const dark = !!s.dark;
  // texto escolhido pela empresa nunca fica ilegível: aproxima do preto/branco até 7:1
  const text = readable(s.text, [card, bg], bestOn(bg), 7);
  const surfaces = [card, bg];

  const dim = readable(mix(text, card, 0.28), surfaces, text);
  const mute = readable(mix(text, card, 0.45), surfaces, text);
  const pText = readable(p, surfaces, text);
  const aText = readable(a, surfaces, text);
  const ok = readable(dark ? "#5ee6a8" : "#147d53", surfaces, text);
  const err = readable(dark ? "#ff6b81" : "#c53752", surfaces, text);
  const warn = readable(dark ? "#f0b860" : "#966319", surfaces, text);

  const lineC = s.line ?? text;
  const lineA = s.lineA ?? (dark ? 14 : 12);
  const btnFg = pick(s.btn[1]);
  const btnBg = readableBg(pick(s.btn[0]), btnFg);
  const r = s.radius;
  const shadowC = dark ? "rgba(0,0,0,.85)" : alpha(text, 26);

  const cardLook: Record<Look, { border: string; w: string; shadow: string; bg: string; blur: string }> = {
    soft: { border: alpha(lineC, lineA), w: "1px", shadow: `0 1px 2px ${alpha(text, 5)}, 0 16px 36px -24px ${shadowC}`, bg: card, blur: "none" },
    flat: { border: alpha(lineC, lineA + 8), w: "1px", shadow: "none", bg: card, blur: "none" },
    hard: { border: text, w: "2px", shadow: `5px 5px 0 ${text}`, bg: card, blur: "none" },
    lift: { border: alpha(lineC, lineA + 6), w: "1px", shadow: `3px 4px 0 ${alpha(text, 14)}`, bg: card, blur: "none" },
    glass: {
      border: dark ? alpha("#ffffff", 16) : alpha("#ffffff", 85),
      w: "1px",
      shadow: `inset 0 1px 0 ${alpha("#ffffff", dark ? 10 : 80)}, 0 18px 44px -26px ${dark ? "rgba(0,0,0,.9)" : alpha(p, 45)}`,
      bg: alpha(card, dark ? 62 : 72),
      blur: "blur(18px) saturate(140%)",
    },
    glow: { border: alpha(p, 30), w: "1px", shadow: `inset 0 1px 0 ${alpha("#ffffff", 8)}, 0 24px 60px -34px ${alpha(p, 70)}`, bg: alpha(card, 78), blur: "blur(14px)" },
  };
  const look = cardLook[s.look];
  const atmospheric = s.look === "glass" || s.look === "glow";

  const vars: Record<string, string> = {
    "color-scheme": dark ? "dark" : "light",
    "--bg": bg,
    "--surface-1": card,
    "--surface-2": mix(card, bg, 0.5),
    "--surface-3": mix(bg, text, dark ? 0.16 : 0.1),
    "--card-bg": look.bg,
    "--card-border": look.border,
    "--card-border-w": look.w,
    "--card-shadow": look.shadow,
    "--card-blur": look.blur,
    "--card-grid": "0",
    "--line": alpha(lineC, lineA),
    "--line-strong": alpha(lineC, lineA + 12),
    "--text": text,
    "--text-dim": dim,
    "--text-mute": mute,
    // preenchimentos (gráficos, barras, marcadores): mínimo de 3:1 sobre os painéis
    "--accent": readable(p, [card], text, 3),
    "--accent-text": pText,
    "--accent-2": readable(a, [card], text, 3),
    "--accent-2-text": aText,
    "--grad": `linear-gradient(100deg, ${pText} 0%, ${mix(pText, aText, 0.5)} 55%, ${aText} 100%)`,
    "--on-accent": bestOn(pText),
    "--brand": pText,
    "--on-brand": bestOn(pText),
    "--tint-1": alpha(text, 3),
    "--tint-2": alpha(text, dark ? 7 : 5),
    "--well": dark ? "rgba(0,0,0,.22)" : alpha(text, 4),
    "--field-bg": dark ? mix(card, "#000000", 0.25) : mix(card, PAPER, 0.6),
    "--field-bg-focus": dark ? mix(card, "#000000", 0.35) : PAPER,
    "--nav-bg": alpha(bg, 80),
    "--menu-bg": bg,
    "--glass": alpha(card, 92),
    "--shadow": shadowC,
    "--shadow-strong": dark ? "#000" : alpha(text, 34),
    "--term-shadow": dark ? "#000" : alpha(text, 50),
    "--btn-bg": btnBg,
    "--btn-fg": btnFg,
    "--btn-icon-bg": alpha(btnFg, 16),
    "--btn-icon-fg": btnFg,
    "--btn-corner": btnFg,
    "--btn-shadow": s.look === "hard" ? `0 0 0 2px ${text}, 4px 4px 0 ${text}` : s.look === "flat" ? "none" : `0 10px 24px -14px ${alpha(btnBg, 85)}, inset 0 1px 0 ${alpha("#ffffff", 22)}`,
    "--btn-shadow-hover": s.look === "hard" ? `0 0 0 2px ${text}, 6px 6px 0 ${text}` : `0 0 0 1px ${alpha(btnFg, 30)}, 0 16px 34px -14px ${alpha(btnBg, 80)}`,
    "--btn-sheen": alpha("#ffffff", 22),
    "--ok": ok,
    "--err": err,
    "--warn": warn,
    "--chip-active-bg": text,
    "--chip-active-fg": bg,
    "--grid-opacity": String(s.grid ?? 0),
    "--glow-opacity": atmospheric ? ".2" : "0",
    "--noise-opacity": String(s.noise ?? 0),
    "--c-glow": dark ? ".55" : ".28",
    "--orb-opacity": atmospheric ? (dark ? ".22" : ".16") : "0",
    "--orb-1": p,
    "--orb-2": a,
    "--orb-3": a,
    "--orb-4": p,
    "--radius": `${r}px`,
    "--radius-sm": `${Math.round(r * 0.6)}px`,
    "--radius-btn": `${Math.min(r, 12)}px`,
    "--app-font": fontCss(s.body),
    "--app-display": fontCss(s.display),
    "--app-serif": fontCss(s.display),
    "--drap-mark": dark ? "#FBF7F2" : "#024C5E",
    "--bg-image": s.bgImage ?? "none",
  };

  const navBg = pick(s.nav[0]);
  const navFg = readable(pick(s.nav[1]), [navBg], bestOn(navBg));
  const activeFg = pick(s.nav[3]);
  const activeBg = readableBg(pick(s.nav[2]), activeFg);
  const nav: Record<string, string> = {
    "--nav-bg": navBg,
    "--menu-bg": navBg,
    "--text": navFg,
    "--text-dim": readable(mix(navFg, navBg, 0.18), [navBg], navFg),
    "--text-mute": readable(mix(navFg, navBg, 0.36), [navBg], navFg),
    "--line": alpha(navFg, 14),
    "--line-strong": alpha(navFg, 24),
    "--tint-1": alpha(navFg, 6),
    "--tint-2": alpha(navFg, 10),
    "--accent-text": readable(p, [navBg], navFg),
    "--nav-active-bg": activeBg,
    "--nav-active-fg": activeFg,
    "--nav-active-num": activeFg,
    "--nav-active-shadow": s.look === "hard" ? `0 0 0 2px ${INK}` : "none",
  };

  const h = s.head ?? {};
  const rules = [
    `h1,h2,h3,.font-display{font-family:var(--app-display);font-weight:${h.w ?? 600};font-style:${h.italic ? "italic" : "normal"};text-transform:${h.upper ? "uppercase" : "none"};letter-spacing:${h.track ?? "-0.02em"}}`,
    `.serif-i{font-family:var(--app-display);font-style:${s.hl || h.italic ? "italic" : "inherit"};font-weight:inherit;letter-spacing:inherit}`,
    s.mono ? `.stat-value{font-family:var(--font-jetbrains),ui-monospace,monospace;letter-spacing:-0.04em}` : `.eyebrow,.mono-label{font-family:var(--app-font);letter-spacing:.06em}`,
  ].join("");

  return { vars, nav, rules, mode: dark ? "dark" : "light" };
}

/** Somente as variáveis CSS (para uso em `style` de prévias). */
export const cssVarsOnly = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([k]) => k.startsWith("--"))) as React.CSSProperties;

const decl = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(";");

/** CSS completo do tema (vale para o modo claro e escuro: o tema define o próprio modo). */
export function presetCss(s: ThemePreset, primary?: string | null, accent?: string | null) {
  const st = presetStyle(s, primary, accent);
  return (
    `:root:root:root,.theme-base{${decl(st.vars)}}` +
    `.theme-base{color:var(--text)}` +
    `.nav-scope{${decl(st.nav)};color:var(--text)}` +
    `body{background-image:var(--bg-image);background-attachment:fixed}` +
    st.rules
  );
}

/** URL do Google Fonts com as fontes dos temas informados. */
export function presetFontsHref(presets: ThemePreset[]) {
  const fams = [...new Set(presets.flatMap((s) => [FONTS[s.display]?.google, FONTS[s.body]?.google]).filter(Boolean))];
  return fams.length ? `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${f}`).join("&")}&display=swap` : null;
}
