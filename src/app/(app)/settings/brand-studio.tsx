"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, ImageUp, Link2, Moon, Palette, RotateCcw, Sparkles, Sun, Trash2, Upload, Wand2 } from "lucide-react";
import { Badge, Button, Card, cn, EditorialTitle, Eyebrow, Field, Input, Select, Tabs } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { useToast } from "@/components/toast";
import { updateBranding } from "@/actions/settings";
import { DRAP_PRIMARY, DRAP_SECONDARY } from "@/lib/brand-colors";
import { contrast, extractAesthetic, extractPalette, fileToLogoDataUrl, loadImage, mix, suggestPair } from "@/lib/color-tools";
import { initials } from "@/lib/format";
import { findSans, findSerif, RADII, SANS_FONTS, SERIF_FONTS, SURFACES, type BrandTheme } from "@/lib/theme-options";
import { BASE_PRESET, cssVarsOnly, findPreset, FONT_NAMES, LOOKS, PRESET_GROUPS, presetFontsHref, presetStyle, resolveTheme, sanitizeCustom, THEME_PRESETS, type PresetGroup, type ThemeCustom, type ThemePreset } from "@/lib/theme-presets";
import { ensureFontLink, LogoGenerator } from "./logo-generator";

const CURRENCIES = [["BRL", "Real (R$)"], ["USD", "Dólar (US$)"], ["EUR", "Euro (€)"], ["GBP", "Libra (£)"], ["ARS", "Peso argentino"], ["MXN", "Peso mexicano"], ["CLP", "Peso chileno"], ["COP", "Peso colombiano"], ["PYG", "Guarani"], ["UYU", "Peso uruguaio"], ["AOA", "Kwanza"], ["MZN", "Metical"]];
const LOCALES = [["pt-BR", "Português (Brasil)"], ["pt-PT", "Português (Portugal)"], ["en-US", "English (US)"], ["es-ES", "Español"]];
const TIMEZONES = ["America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "America/Recife", "America/Cuiaba", "America/Rio_Branco", "America/Noronha", "Europe/Lisbon", "America/New_York", "America/Mexico_City", "America/Argentina/Buenos_Aires", "UTC"];

/** Combinações prontas (principal, destaque). */
const PALETTES: [string, string, string][] = [
  ["Padrão", DRAP_PRIMARY, DRAP_SECONDARY],
  ["Oceano", "#0f5f8c", "#22b8cf"],
  ["Floresta", "#2f6b3a", "#9bbf4d"],
  ["Agro", "#486b3a", "#7a5c38"],
  ["Vinho", "#7a2341", "#d08770"],
  ["Grafite", "#2b2f36", "#8b95a5"],
  ["Coral", "#d4573d", "#f2a65a"],
  ["Lavanda", "#5b4bb7", "#c084fc"],
  ["Petróleo", "#1f4e5a", "#c97b54"],
  ["Royal", "#1e3a8a", "#f59e0b"],
];

type Org = { name: string; slug: string; logoUrl: string | null; primaryColor: string; accentColor: string; currency: string; locale: string; timezone: string; customDomain: string | null };

function Contrast({ fg, bg, label }: { fg: string; bg: string; label: string }) {
  const r = contrast(fg, bg);
  const ok = r >= 4.5;
  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="flex h-6 w-9 items-center justify-center rounded-[5px] border border-line font-medium" style={{ background: bg, color: fg }}>
        Aa
      </span>
      <span className="text-fg-2">{label}</span>
      <Badge color={ok ? "var(--ok)" : "var(--warn)"}>{r.toFixed(1)}:1 {ok ? "AA" : "baixo"}</Badge>
    </span>
  );
}

const headStyle = (s: ThemePreset): React.CSSProperties => ({
  fontFamily: "var(--app-display)",
  fontWeight: s.head?.w ?? 600,
  fontStyle: s.head?.italic ? "italic" : "normal",
  textTransform: s.head?.upper ? "uppercase" : "none",
  letterSpacing: s.head?.track ?? "-0.02em",
});

/** Miniatura fiel do tema: usa os mesmos tokens que serão aplicados na plataforma. */
function PresetThumb({ s }: { s: ThemePreset }) {
  const st = useMemo(() => presetStyle(s), [s]);
  const r = Math.min(s.radius, 12) * 0.5;
  const panel: React.CSSProperties = { background: "var(--card-bg)", border: "var(--card-border-w) solid var(--card-border)", boxShadow: s.look === "hard" ? `2px 2px 0 ${s.text}` : s.look === "lift" ? "1.5px 2px 0 var(--line-strong)" : "none", borderRadius: r };
  return (
    <div aria-hidden className="grid aspect-[16/10] grid-cols-[28%_1fr] overflow-hidden text-left" style={{ ...cssVarsOnly(st.vars), background: s.bgImage ? `${s.bgImage}, ${s.bg}` : s.bg, color: "var(--text)", fontFamily: "var(--app-font)" }}>
      <div className="flex flex-col gap-[5px] p-2" style={{ ...cssVarsOnly(st.nav), background: "var(--nav-bg)", color: "var(--text)" }}>
        <span className="mb-1 flex items-center gap-1 text-[7px] font-semibold">
          <span className="size-2 rounded-[2px]" style={{ background: "var(--nav-active-bg)" }} /> Workspace
        </span>
        {["Início", "Contatos", "Negócios", "Agenda"].map((n, i) => (
          <span key={n} className="px-1.5 py-[3px] text-[6.5px] leading-none" style={i === 0 ? { background: "var(--nav-active-bg)", color: "var(--nav-active-fg)", borderRadius: r, fontWeight: 600 } : { color: "var(--text-dim)" }}>
            {n}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 p-2.5">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-[15px] leading-none" style={headStyle(s)}>Visão geral</span>
          <span className="shrink-0 px-1.5 py-[3px] text-[6.5px] font-semibold leading-none" style={{ background: "var(--btn-bg)", color: "var(--btn-fg)", borderRadius: r, boxShadow: s.look === "hard" ? `1.5px 1.5px 0 ${s.text}` : "none" }}>
            + Novo
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {["R$ 84.500", "48", "32%"].map((v, i) => (
            <span key={v} className="px-1.5 py-1" style={panel}>
              <span className="block h-[3px] w-4 rounded-full" style={{ background: i === 1 ? "var(--accent-2)" : "var(--accent)" }} />
              <span className="mt-1 block truncate text-[8px] font-semibold leading-none">{v}</span>
            </span>
          ))}
        </div>
        <span className="flex flex-1 items-end gap-[3px] px-1.5 pb-1 pt-1.5" style={panel}>
          {[38, 52, 46, 64, 58, 76, 70, 92].map((h, i) => (
            <span key={i} className="flex-1" style={{ height: `${h}%`, background: i === 7 ? "var(--accent-2)" : "var(--accent)", opacity: i === 7 ? 1 : 0.55 + i * 0.05, borderRadius: Math.min(r, 2) }} />
          ))}
        </span>
      </div>
    </div>
  );
}

export function BrandStudio({ org, theme }: { org: Org; theme: BrandTheme }) {
  const { run, pending } = useAction();
  const toast = useToast();
  const [name, setName] = useState(org.name);
  const [primary, setPrimary] = useState(org.primaryColor);
  const [accent, setAccent] = useState(org.accentColor);
  const [logo, setLogo] = useState(org.logoUrl ?? "");
  const [font, setFont] = useState(theme.font ?? SANS_FONTS[0]!.key);
  const [serifFont, setSerifFont] = useState(theme.serifFont ?? SERIF_FONTS[0]!.key);
  const [surface, setSurface] = useState(theme.surface ?? "paper");
  const [radius, setRadius] = useState(theme.radius ?? "soft");
  const [preset, setPreset] = useState(findPreset(theme.preset)?.key ?? "");
  const active = findPreset(preset);
  const [group, setGroup] = useState<PresetGroup>(active?.group ?? "classicos");
  /** Ajustes da empresa sobre o tema (ou sobre a base neutra): cores, fontes, cantos, painéis. */
  const [custom, setCustom] = useState<ThemeCustom>(() => sanitizeCustom(theme.custom) ?? {});
  const hasCustom = Object.keys(custom).length > 0;
  const spec = useMemo(() => resolveTheme({ preset, custom }), [preset, custom]);
  const eff = spec ?? BASE_PRESET;
  const [fullLook, setFullLook] = useState(true);
  const [logoTab, setLogoTab] = useState<"upload" | "generate" | "link">("upload");
  const [source, setSource] = useState<{ url: string; palette: string[]; name: string } | null>(null);
  const [useAsLogo, setUseAsLogo] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const sans = findSans(font);
  const serif = findSerif(serifFont);
  useEffect(() => {
    ensureFontLink(sans);
    ensureFontLink(serif);
  }, [sans, serif]);

  // Carrega as fontes dos temas da aba aberta (e do tema escolhido) para as miniaturas e a prévia.
  useEffect(() => {
    const href = presetFontsHref([...THEME_PRESETS.filter((s) => s.group === group), ...(spec ? [spec] : [])]);
    if (!href) return;
    const id = "gf-presets-" + group + (spec ? spec.display + spec.body : "").replace(/\s/g, "");
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id;
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }, [group, spec]);

  const applyPreset = (s: ThemePreset) => {
    setPreset(s.key);
    setCustom({});
    setPrimary(s.primary);
    setAccent(s.accent);
    toast(`Tema “${s.name}” na prévia — salve para aplicar`);
  };
  const activeStyle = useMemo(() => (spec ? presetStyle(spec, primary, accent) : null), [spec, primary, accent]);
  const setC = (patch: ThemeCustom) => setCustom((c) => ({ ...c, ...patch }));
  const refColor = (v: string) => (v === "p" ? primary : v === "a" ? accent : v);
  const setNav = (i: number, v: string) => setC({ nav: eff.nav.map((x, j) => (j === i ? v : x)) as ThemePreset["nav"] });
  const setBtn = (i: number, v: string) => setC({ btn: eff.btn.map((x, j) => (j === i ? v : x)) as ThemePreset["btn"] });

  /** Arquivo de tema (.json): leva o visual completo de uma empresa para outra. */
  const exportTheme = () => {
    const blob = new Blob([JSON.stringify({ tipo: "tema-crm", versao: 1, preset: preset || null, custom, primaryColor: primary, accentColor: accent }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tema-${org.slug}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  async function importTheme(file: File) {
    try {
      const data = JSON.parse(await file.text()) as Record<string, unknown>;
      const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null);
      const p = findPreset(typeof data.preset === "string" ? data.preset : null);
      const c = sanitizeCustom(data.custom);
      if (!p && !c && !hex(data.primaryColor)) throw new Error("Arquivo de tema inválido");
      setPreset(p?.key ?? "");
      setCustom(c ?? {});
      setPrimary(hex(data.primaryColor) ?? p?.primary ?? primary);
      setAccent(hex(data.accentColor) ?? p?.accent ?? accent);
      toast("Tema importado na prévia — salve para aplicar");
    } catch (e) {
      toast(e instanceof Error && e.message === "Arquivo de tema inválido" ? e.message : "Não foi possível ler o arquivo de tema", "error");
    }
  }
  async function useLogoColors() {
    try {
      const pair = suggestPair(extractPalette(await loadImage(logo), 8));
      if (!pair) return toast("Não encontramos cores marcantes no logotipo", "error");
      setPrimary(pair.primary);
      setAccent(pair.accent);
      toast("Cores do logotipo aplicadas — salve para manter");
    } catch {
      toast("Não foi possível ler as cores deste logotipo (envie o arquivo em vez do link)", "error");
    }
  }

  async function analyze(file: File) {
    if (file.type === "application/json" || file.name.toLowerCase().endsWith(".json")) return importTheme(file);
    if (!file.type.startsWith("image/")) {
      toast("Envie uma imagem (PNG, JPG, WebP ou SVG). Para manual de marca em PDF, exporte a página das cores como imagem.", "error");
      return;
    }
    try {
      const url = await fileToLogoDataUrl(file);
      const img = await loadImage(url);
      const palette = extractPalette(img, 8);
      setSource({ url, palette, name: file.name });
      const look = fullLook ? extractAesthetic(img) : null;
      const pair = suggestPair(palette);
      if (look) {
        // estética completa: fundo, painéis, texto, menu e botões seguem a imagem
        setCustom((c) => ({ ...c, bg: look.bg, card: look.card, text: look.text, nav: look.nav, btn: look.btn }));
        setPrimary(look.primary);
        setAccent(look.accent);
      } else if (pair) {
        setPrimary(pair.primary);
        setAccent(pair.accent);
      }
      if (useAsLogo) setLogo(await fileToLogoDataUrl(file, 2400));
      toast(look ? "Estética da imagem aplicada na prévia — ajuste o que quiser e salve" : palette.length ? `${palette.length} cores encontradas — sugestão aplicada` : "Não encontramos cores marcantes nesta imagem");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Falha ao ler a imagem", "error");
    }
  }

  async function uploadLogo(file: File) {
    try {
      setLogo(await fileToLogoDataUrl(file, 2400));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Falha ao ler a imagem", "error");
    }
  }

  // Variáveis aplicadas apenas na pré-visualização
  const previewVars = useMemo(() => {
    if (activeStyle && spec) return { ...cssVarsOnly(activeStyle.vars), fontFamily: "var(--app-font)", color: "var(--text)", background: spec.bgImage ? `${spec.bgImage}, ${spec.bg}` : spec.bg } as React.CSSProperties;
    const sv = SURFACES.find((s) => s.key === surface)?.vars ?? {};
    const r = RADII.find((x) => x.key === radius) ?? RADII[0]!;
    return {
      ...sv,
      "--accent": primary,
      "--accent-text": mix(primary, "#000000", 0.18),
      "--accent-2": accent,
      "--grad": `linear-gradient(100deg, ${primary} 0%, ${mix(primary, accent, 0.5)} 50%, ${accent} 100%)`,
      "--btn-icon-bg": `linear-gradient(135deg, ${mix(primary, "#ffffff", 0.3)}, ${primary})`,
      "--app-font": sans.key === "inter-tight" ? undefined : `${sans.family}, system-ui, sans-serif`,
      "--app-serif": serif.key === "same" ? "var(--app-font)" : serif.key === "instrument" ? undefined : `${serif.family}, Georgia, serif`,
      "--radius": r.radius,
      "--radius-sm": r.sm,
      fontFamily: "var(--app-font)",
    } as React.CSSProperties;
  }, [primary, accent, sans, serif, surface, radius, activeStyle, spec]);
  const previewNav = activeStyle ? ({ ...cssVarsOnly(activeStyle.nav), color: "var(--text)" } as React.CSSProperties) : undefined;

  const reset = () => {
    setPreset("");
    setCustom({});
    setPrimary(DRAP_PRIMARY);
    setAccent(DRAP_SECONDARY);
    setFont(SANS_FONTS[0]!.key);
    setSerifFont(SERIF_FONTS[0]!.key);
    setSurface("paper");
    setRadius("soft");
    toast("Visual padrão restaurado na prévia — salve para aplicar");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateBranding(new FormData(e.currentTarget)), { success: "Identidade visual salva e aplicada" });
      }}
    >
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="primaryColor" value={primary} />
      <input type="hidden" name="accentColor" value={accent} />
      <input type="hidden" name="logoUrl" value={logo} />
      <input type="hidden" name="font" value={font} />
      <input type="hidden" name="serifFont" value={serifFont} />
      <input type="hidden" name="surface" value={surface} />
      <input type="hidden" name="radius" value={radius} />
      <input type="hidden" name="preset" value={preset} />
      <input type="hidden" name="custom" value={JSON.stringify(custom)} />

      <div className="grid gap-6 2xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-6">
          {/* Temas prontos */}
          <Card className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Eyebrow>00 / Temas prontos</Eyebrow>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">
                  <EditorialTitle text="Escolha um visual completo" highlight="completo" />
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-fg-2">
                  50 identidades com paleta, tipografia, cantos e navegação próprios. Clique para ver na prévia e salve para aplicar a toda a equipe — depois ajuste as cores e o logotipo abaixo.
                </p>
              </div>
              <Tabs value={group} onChange={setGroup} items={PRESET_GROUPS.map((g) => ({ value: g.key, label: g.label }))} />
            </div>
            <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
              {THEME_PRESETS.filter((s) => s.group === group).map((s) => {
                const on = preset === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => applyPreset(s)}
                    aria-pressed={on}
                    title={s.note}
                    className={cn("group overflow-hidden rounded-[var(--radius)] border bg-surface text-left transition duration-300 hover:-translate-y-0.5", on ? "border-[var(--text)] ring-2 ring-[var(--accent)]" : "border-line-strong hover:border-[var(--text-mute)]")}
                  >
                    <PresetThumb s={s} />
                    <span className="flex items-center gap-2 border-t border-line px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{s.name}</span>
                        <span className="mono-label flex items-center gap-1 text-[9.5px] text-muted">
                          {s.dark ? <Moon className="size-2.5" /> : <Sun className="size-2.5" />} {s.dark ? "Escuro" : "Claro"}
                        </span>
                      </span>
                      {on && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--chip-active-bg)] text-[var(--chip-active-fg)]">
                          <Check className="size-3" />
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              {active ? (
                <>
                  <span className="text-fg-2">
                    Tema selecionado: <strong className="font-medium text-fg">{active.name}</strong> — {active.note.toLowerCase()}.{hasCustom && " Com ajustes seus."}
                  </span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setPreset(""); setCustom({}); }}>
                    Usar visual personalizado
                  </Button>
                </>
              ) : (
                <span className="text-muted">Nenhum tema pronto selecionado: vale o visual personalizado das seções abaixo{hasCustom ? " (com a sua paleta completa)" : ""}.</span>
              )}
            </div>
          </Card>

          {/* 01 — Identidade oficial */}
          <Card grid className="p-6">
            <Eyebrow className="relative">01 / Identidade oficial</Eyebrow>
            <h2 className="relative mt-2 text-2xl font-medium tracking-[-0.03em]">
              <EditorialTitle text="Comece pela sua marca" highlight="marca" />
            </h2>
            <p className="relative mt-1 text-sm text-fg-2">
              Envie o logotipo, uma imagem da identidade visual (manual de marca, paleta, papelaria, uma tela de referência) ou um arquivo de tema exportado daqui. A plataforma inteira se adapta às cores da imagem, e você ajusta o que quiser depois.
            </p>
            <div className="relative mt-5 grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) void analyze(f);
                }}
                className="group flex min-h-48 flex-col items-center justify-center gap-3 rounded-[var(--radius)] border-2 border-dashed border-line-strong bg-well p-5 text-center transition hover:border-[var(--accent)]"
              >
                {source ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={source.url} alt="Imagem enviada" className="max-h-32 max-w-full rounded-[var(--radius-sm)] object-contain" />
                ) : (
                  <ImageUp className="size-8 text-muted transition group-hover:text-accent-text" />
                )}
                <span className="text-sm font-medium">{source ? "Trocar imagem" : "Arraste ou clique para enviar"}</span>
                <span className="mono-label text-[10px] text-muted">PNG · JPG · WebP · SVG · tema .json</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void analyze(f);
                  e.target.value = "";
                }}
              />
              <div className="min-w-0">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={useAsLogo} onChange={(e) => setUseAsLogo(e.target.checked)} className="size-4 accent-[var(--accent)]" />
                  Usar esta imagem também como logotipo
                </label>
                <label className="mt-2 flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={fullLook} onChange={(e) => setFullLook(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
                  <span>
                    Adaptar toda a estética à imagem
                    <span className="block text-xs text-muted">Fundo, painéis, texto, menu e botões seguem as cores da imagem. Desmarque para aproveitar só as duas cores da marca.</span>
                  </span>
                </label>
                {source ? (
                  <>
                    <p className="mono-label mt-4 text-[10.5px] text-muted">Cores encontradas · clique para aplicar</p>
                    <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2">
                      {source.palette.map((c) => (
                        <div key={c} className="overflow-hidden rounded-[var(--radius-sm)] border border-line bg-[var(--surface-1)]">
                          <div className="h-12" style={{ background: c }} />
                          <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                            <span className="font-mono text-[10.5px] uppercase">{c}</span>
                          </div>
                          <div className="grid grid-cols-2 border-t border-line text-[10px]">
                            <button type="button" onClick={() => setPrimary(c)} className={cn("mono-label py-1.5 transition hover:bg-tint", primary === c && "bg-[var(--chip-active-bg)] text-[var(--chip-active-fg)]")}>
                              Principal
                            </button>
                            <button type="button" onClick={() => setAccent(c)} className={cn("mono-label border-l border-line py-1.5 transition hover:bg-tint", accent === c && "bg-[var(--chip-active-bg)] text-[var(--chip-active-fg)]")}>
                              Destaque
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {source.palette.length > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        trail={<Sparkles className="size-3.5" />}
                        onClick={() => {
                          const p = suggestPair(source.palette);
                          if (p) {
                            setPrimary(p.primary);
                            setAccent(p.accent);
                          }
                        }}
                      >
                        Aplicar sugestão automática
                      </Button>
                    )}
                  </>
                ) : (
                  <ul className="mt-4 space-y-2 text-sm text-fg-2">
                    <li><span className="mr-2 font-mono text-[11px] text-accent-text">01</span>Envie a imagem oficial da marca</li>
                    <li><span className="mr-2 font-mono text-[11px] text-accent-text">02</span>Revise as cores sugeridas</li>
                    <li><span className="mr-2 font-mono text-[11px] text-accent-text">03</span>Ajuste fontes e salve — tudo é aplicado para a equipe</li>
                  </ul>
                )}
              </div>
            </div>
          </Card>

          {/* 02 — Paleta */}
          <Card className="p-6">
            <Eyebrow>02 / Paleta e superfície</Eyebrow>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">
              <EditorialTitle text="Cores livres" highlight="livres" />
            </h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {(
                [
                  ["Cor principal", primary, setPrimary, "Botões, itens ativos e destaques"],
                  ["Cor de destaque", accent, setAccent, "Gradientes, gráficos e detalhes"],
                ] as const
              ).map(([l, v, set, hint]) => (
                <Field key={l} label={l} hint={hint}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={v} onChange={(e) => set(e.target.value)} className="h-10 w-14 cursor-pointer" aria-label={l} />
                    <Input value={v} onChange={(e) => set(e.target.value)} className="font-mono uppercase" maxLength={7} />
                  </div>
                </Field>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <Contrast fg="#ffffff" bg={primary} label="Texto branco sobre a principal" />
              <Contrast fg={mix(primary, "#000000", 0.18)} bg="#f5f3ee" label="Principal como texto" />
            </div>
            <p className="mono-label mt-6 text-[10.5px] text-muted">Paletas prontas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PALETTES.map(([n, p, a]) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setPrimary(p);
                    setAccent(a);
                  }}
                  className={cn("flex items-center gap-2 rounded-[var(--radius-sm)] border bg-surface px-2.5 py-1.5 text-xs transition hover:-translate-y-px", primary === p && accent === a ? "border-[var(--text)]" : "border-line-strong")}
                >
                  <span className="flex">
                    <span className="size-4 rounded-full border border-line" style={{ background: p }} />
                    <span className="-ml-1.5 size-4 rounded-full border border-line" style={{ background: a }} />
                  </span>
                  {n}
                </button>
              ))}
            </div>
            {logo && (
              <Button type="button" variant="secondary" size="sm" className="mt-4" trail={<Palette className="size-3.5" />} onClick={useLogoColors}>
                Usar as cores do logotipo
              </Button>
            )}

            <div className="mt-7 border-t border-line pt-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em]">Paleta completa</p>
                  <p className="mt-0.5 max-w-xl text-xs text-muted">
                    Troque qualquer cor{active ? ` do tema “${active.name}”` : ""}: a prévia responde na hora e o contraste dos textos é corrigido automaticamente.
                  </p>
                </div>
                {hasCustom && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCustom({})}>
                    <RotateCcw className="size-3.5" /> {active ? "Voltar às cores do tema" : "Desfazer ajustes"}
                  </Button>
                )}
              </div>
              <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                {(
                  [
                    ["Fundo da página", eff.bg, (v: string) => setC({ bg: v })],
                    ["Painéis", eff.card, (v: string) => setC({ card: v })],
                    ["Texto", eff.text, (v: string) => setC({ text: v })],
                    ["Menu · fundo", refColor(eff.nav[0]), (v: string) => setNav(0, v)],
                    ["Menu · texto", refColor(eff.nav[1]), (v: string) => setNav(1, v)],
                    ["Item ativo · fundo", refColor(eff.nav[2]), (v: string) => setNav(2, v)],
                    ["Item ativo · texto", refColor(eff.nav[3]), (v: string) => setNav(3, v)],
                    ["Botão · fundo", refColor(eff.btn[0]), (v: string) => setBtn(0, v)],
                    ["Botão · texto", refColor(eff.btn[1]), (v: string) => setBtn(1, v)],
                  ] as const
                ).map(([l, v, set]) => (
                  <label key={l} className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] border border-line bg-surface p-2">
                    <input type="color" value={v} onChange={(e) => set(e.target.value)} className="h-9 w-10 shrink-0 cursor-pointer" aria-label={l} />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{l}</span>
                      <span className="block font-mono text-[10px] uppercase text-muted">{v}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Field label={`Cantos · ${eff.radius}px`} hint="De retos a bem arredondados">
                  <input type="range" min={0} max={24} value={eff.radius} onChange={(e) => setC({ radius: Number(e.target.value) })} className="w-full accent-[var(--accent)]" aria-label="Arredondamento dos cantos" />
                </Field>
                <Field label="Estilo dos painéis" hint="Sombra, contorno ou vidro">
                  <Select value={eff.look} onChange={(e) => setC({ look: e.target.value as ThemePreset["look"] })}>
                    {LOOKS.map((l) => (
                      <option key={l.key} value={l.key}>{l.label}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

          </Card>

          {/* 03 — Tipografia */}
          <Card className="p-6">
            <Eyebrow>03 / Tipografia</Eyebrow>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">
              <EditorialTitle text="Fontes da marca" highlight="marca" />
            </h2>
            {spec && (
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Field label="Fonte dos títulos" hint="Títulos de página e de seções">
                  <Select value={eff.display} onChange={(e) => setC({ display: e.target.value })}>
                    {FONT_NAMES.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Fonte dos textos" hint="Textos, menus e números">
                  <Select value={eff.body} onChange={(e) => setC({ body: e.target.value })}>
                    {FONT_NAMES.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
            <div className={cn("mt-5 grid gap-5 lg:grid-cols-2", spec && "hidden")}>
              <Field label="Fonte principal" hint="Textos, títulos e números">
                <Select value={font} onChange={(e) => setFont(e.target.value)}>
                  {SANS_FONTS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Fonte de destaque" hint="Palavra em itálico nos títulos">
                <Select value={serifFont} onChange={(e) => setSerifFont(e.target.value)}>
                  {SERIF_FONTS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-5 rounded-[var(--radius)] border border-line bg-well p-5" style={previewVars}>
              <p className="text-[clamp(28px,3vw,40px)] font-medium leading-[1.05] tracking-[-0.035em]" style={spec ? headStyle(spec) : undefined}>
                Vendas com <span className={spec ? undefined : "serif-i"} style={{ color: "var(--accent-text)", fontStyle: spec?.hl ? "italic" : undefined }}>propósito</span>
              </p>
              <p className="mt-2 max-w-xl text-[15px] font-light leading-relaxed text-fg-2">
                Pipeline, contatos e relatórios com a identidade da sua empresa. 0123456789 · R$ 48.250,00
              </p>
            </div>
          </Card>

          {/* 04 — Logotipo */}
          <Card className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Eyebrow>04 / Logotipo</Eyebrow>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">
                  <EditorialTitle text="Logo da plataforma" highlight="Logo" />
                </h2>
              </div>
              <Tabs
                value={logoTab}
                onChange={setLogoTab}
                items={[
                  { value: "upload", label: <span className="flex items-center gap-1.5"><Upload className="size-3" /> Enviar</span> },
                  { value: "generate", label: <span className="flex items-center gap-1.5"><Wand2 className="size-3" /> Gerar</span> },
                  { value: "link", label: <span className="flex items-center gap-1.5"><Link2 className="size-3" /> Link</span> },
                ]}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-[var(--radius)] border border-line bg-well p-4">
              <span className="flex size-16 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-line bg-[var(--surface-1)]">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="Logotipo atual" className="size-full object-contain p-1" />
                ) : (
                  <span className="flex size-full items-center justify-center text-xl font-semibold" style={{ background: `linear-gradient(100deg, ${primary}, ${accent})`, color: "#fff" }}>
                    {initials(name)}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{logo ? "Logotipo personalizado" : "Monograma com as iniciais (sem logotipo)"}</p>
                <p className="text-xs text-muted">Aparece no menu, na tela de login e nos convites.</p>
              </div>
              {logo && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setLogo("")}>
                  <Trash2 className="size-3.5" /> Remover
                </Button>
              )}
            </div>
            <div className="mt-5">
              {logoTab === "upload" && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="secondary" trail={<Upload className="size-3.5" />} onClick={() => logoFileRef.current?.click()}>
                    Escolher arquivo
                  </Button>
                  <span className="text-xs text-muted">Quadrado, fundo transparente, até ~500 KB. Imagens grandes são reduzidas automaticamente.</span>
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadLogo(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
              {logoTab === "generate" && <LogoGenerator companyName={name} primary={primary} accent={accent} onUse={(url) => { setLogo(url); toast("Logotipo gerado — salve para aplicar"); }} />}
              {logoTab === "link" && (
                <Field label="URL do logotipo" hint="Link https público de uma imagem">
                  <Input value={logo.startsWith("data:") ? "" : logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…/logo.png" />
                </Field>
              )}
            </div>
          </Card>

          {/* 05 — Regional e domínio */}
          <Card className="p-6">
            <Eyebrow>05 / Nome, região e domínio</Eyebrow>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field label="Nome exibido">
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Domínio próprio (opcional)" hint={`Aponte o domínio para a Vercel (Settings → Domains). Alternativa: /login?org=${org.slug}`}>
                <Input name="customDomain" defaultValue={org.customDomain ?? ""} placeholder="crm.suaempresa.com.br" />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Moeda">
                <Select name="currency" defaultValue={org.currency}>
                  {CURRENCIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Idioma/formato">
                <Select name="locale" defaultValue={org.locale}>
                  {LOCALES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Fuso horário">
                <Select name="timezone" defaultValue={org.timezone}>
                  {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
            </div>
          </Card>
        </div>

        {/* Prévia ao vivo */}
        <div className="2xl:sticky 2xl:top-20 2xl:self-start">
          <Eyebrow className="mb-2">Prévia ao vivo</Eyebrow>
          <div className="card-drap overflow-hidden" style={previewVars}>
            <div className="grid grid-cols-[120px_1fr]" style={spec ? undefined : { background: "var(--bg)" }}>
              <div className="border-r border-line p-3" style={{ ...previewNav, background: "var(--nav-bg)" }}>
                <div className="flex items-center gap-2">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="size-7 rounded-[var(--radius-sm)] border border-line bg-[var(--surface-1)] object-contain" />
                  ) : (
                    <span className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-[11px] font-semibold" style={{ background: "var(--grad)", color: "#fff" }}>
                      {initials(name)}
                    </span>
                  )}
                  <span className="truncate text-[11px] font-semibold">{name}</span>
                </div>
                <div className="mt-3 space-y-1 text-[10px]">
                  {["Painel", "Negócios", "Contatos"].map((n, i) => (
                    <div key={n} className={cn("flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1.5 py-1", i === 1 && "bg-[var(--nav-active-bg,var(--surface-1))] text-[var(--nav-active-fg,var(--text))] shadow-[0_0_0_1px_var(--line)]")}>
                      <span className="font-mono" style={{ color: i === 1 ? "var(--nav-active-num,var(--accent-text))" : "var(--text-mute)" }}>0{i + 1}</span> {n}
                    </div>
                  ))}
                </div>
              </div>
              <div className="min-w-0 p-4">
                <p className="eyebrow text-[9px]">01 / Pipeline</p>
                <p className="mt-1 text-2xl font-medium leading-tight tracking-[-0.04em]" style={spec ? headStyle(spec) : undefined}>
                  Bom dia, <span className={cn("text-grad pr-1", !spec && "serif-i")} style={{ fontStyle: spec?.hl ? "italic" : undefined }}>equipe.</span>
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="btn-drap inline-flex items-center gap-1.5 rounded-[var(--radius-btn,10px)] py-1.5 pl-3 pr-1.5 text-[11px]">
                    Novo negócio <span className="btn-icon size-5 text-[10px]">→</span>
                  </span>
                </div>
                <div className="card-drap mt-3 p-3">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-[8.5px]">Receita</span>
                    <span className="size-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                  </div>
                  <p className="mt-1 text-lg font-medium tracking-[-0.03em]">R$ 48,2 mil</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full w-2/3 rounded-full" style={{ background: "var(--grad)" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[primary, mix(primary, "#000000", 0.18), accent, mix(accent, "#ffffff", 0.4)].map((c, i) => (
              <span key={i} className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1 font-mono text-[10px] uppercase">
                <span className="size-3 rounded-full" style={{ background: c }} /> {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-nav sticky bottom-0 z-10 -mx-1 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-line px-4 py-3">
        <p className="text-xs text-muted">Sua marca aparece em toda a plataforma: menu, telas, login e convites.</p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" trail={<Download className="size-3.5" />} onClick={exportTheme}>
            Exportar tema
          </Button>
          <Button type="button" variant="secondary" trail={<RotateCcw className="size-3.5" />} onClick={reset}>
            Restaurar padrão
          </Button>
          <Button trail loading={pending}>
            Salvar identidade
          </Button>
        </div>
      </div>
    </form>
  );
}
