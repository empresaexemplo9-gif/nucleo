"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Wand2 } from "lucide-react";
import { Button, cn, Field, Input, Select } from "@/components/ui";
import { SANS_FONTS, SERIF_FONTS, type FontOption } from "@/lib/theme-options";

export const LOGO_STYLES = [
  { key: "drap", label: "Barra diagonal" },
  { key: "square", label: "Quadrado" },
  { key: "circle", label: "Círculo" },
  { key: "hexagon", label: "Hexágono" },
  { key: "outline", label: "Contorno" },
  { key: "seal", label: "Selo" },
] as const;
type StyleKey = (typeof LOGO_STYLES)[number]["key"];
type Fill = "primary" | "accent" | "dark" | "gradient";

const FONT_CHOICES: FontOption[] = [...SANS_FONTS, ...SERIF_FONTS.filter((f) => f.key !== "same")];

/** Nome real da família (para canvas), sem variáveis CSS. */
function canvasFamily(f: FontOption) {
  if (f.key === "inter-tight") return "Inter Tight";
  if (f.key === "instrument") return "Instrument Serif";
  return f.family.replace(/'/g, "");
}

export function ensureFontLink(f: FontOption | undefined) {
  if (!f?.google || typeof document === "undefined") return;
  const id = `gf-${f.key}`;
  if (document.getElementById(id)) return;
  const l = document.createElement("link");
  l.id = id;
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`;
  document.head.appendChild(l);
}

function initialsOf(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "A";
  return (words.length === 1 ? words[0]!.slice(0, 2) : words.slice(0, 2).map((w) => w[0]).join("")).toUpperCase();
}

function polygon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sides: number, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * 2 * Math.PI) / sides;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

/** Gerador de logotipo genérico: desenha em canvas e exporta PNG. */
export function LogoGenerator({ companyName, primary, accent, onUse }: { companyName: string; primary: string; accent: string; onUse: (dataUrl: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState(initialsOf(companyName));
  const [style, setStyle] = useState<StyleKey>("drap");
  const [fill, setFill] = useState<Fill>("dark");
  const [fontKey, setFontKey] = useState("inter-tight");
  const [italic, setItalic] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const draw = useCallback(async () => {
    const c = canvas.current;
    if (!c) return;
    const font = FONT_CHOICES.find((f) => f.key === fontKey) ?? FONT_CHOICES[0]!;
    ensureFontLink(font);
    const fam = canvasFamily(font);
    const weight = font.kind === "serif" ? 400 : 600;
    try {
      await document.fonts.load(`${italic ? "italic " : ""}${weight} 200px "${fam}"`, text);
    } catch {}
    const S = 512;
    c.width = S;
    c.height = S;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, S, S);
    const dark = "#15171c";
    let bg: string | CanvasGradient = fill === "primary" ? primary : fill === "accent" ? accent : dark;
    if (fill === "gradient") {
      const g = ctx.createLinearGradient(0, 0, S, S);
      g.addColorStop(0, primary);
      g.addColorStop(1, accent);
      bg = g;
    }
    const fg = "#ffffff";
    const pad = 24;
    ctx.save();
    if (style === "circle" || style === "seal") {
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S / 2 - pad, 0, Math.PI * 2);
    } else if (style === "hexagon") {
      polygon(ctx, S / 2, S / 2, S / 2 - pad + 8, 6, Math.PI / 6);
    } else {
      const r = style === "square" ? 72 : style === "outline" ? 96 : 88;
      ctx.beginPath();
      ctx.roundRect(pad, pad, S - pad * 2, S - pad * 2, r);
    }
    if (style === "outline") {
      ctx.lineWidth = 28;
      ctx.strokeStyle = bg;
      ctx.stroke();
    } else {
      ctx.fillStyle = bg;
      ctx.fill();
    }
    ctx.clip();
    if (style === "drap") {
      ctx.save();
      ctx.translate(S / 2, S / 2);
      ctx.rotate((32 * Math.PI) / 180);
      const g = ctx.createLinearGradient(0, -S, 0, S);
      g.addColorStop(0, fill === "dark" ? primary : "#ffffff");
      g.addColorStop(1, fill === "dark" ? accent : "rgba(255,255,255,.6)");
      ctx.fillStyle = g;
      ctx.globalAlpha = text ? 0.35 : 1;
      ctx.fillRect(-14, -S, 28, S * 2);
      ctx.restore();
    }
    ctx.restore();
    if (style === "seal") {
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S / 2 - pad - 34, 0, Math.PI * 2);
      ctx.lineWidth = 8;
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.stroke();
    }
    if (text) {
      const len = text.length;
      const size = len <= 1 ? 300 : len === 2 ? 230 : 170;
      ctx.font = `${italic ? "italic " : ""}${weight} ${size}px "${fam}", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = style === "outline" ? (fill === "gradient" ? primary : (bg as string)) : fg;
      const m = ctx.measureText(text);
      ctx.textBaseline = "alphabetic";
      ctx.fillText(text, S / 2, S / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
    }
    setPreview(c.toDataURL("image/png"));
  }, [text, style, fill, fontKey, italic, primary, accent]);

  useEffect(() => {
    void draw();
  }, [draw]);

  return (
    <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
      <div>
        <div className="flex aspect-square items-center justify-center rounded-[var(--radius)] border border-line bg-[repeating-conic-gradient(var(--tint-2)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] p-3">
          <canvas ref={canvas} className="size-full" aria-label="Pré-visualização do logotipo" />
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          {preview &&
            [40, 28, 20].map((s) => (
              <span key={s} className="flex items-center justify-center rounded-[var(--radius-sm)] border border-line bg-[var(--surface-1)] p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" style={{ width: s, height: s }} />
              </span>
            ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Texto (monograma)" hint="Até 3 caracteres funcionam melhor">
            <Input value={text} maxLength={4} onChange={(e) => setText(e.target.value.toUpperCase())} />
          </Field>
          <Field label="Fonte do logo">
            <Select value={fontKey} onChange={(e) => setFontKey(e.target.value)}>
              {FONT_CHOICES.map((f) => (
                <option key={f.key} value={f.key}>{f.label.replace(" (DRAP)", "")}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div>
          <p className="mono-label mb-1.5 text-[10.5px] text-muted">Formato</p>
          <div className="flex flex-wrap gap-1.5">
            {LOGO_STYLES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStyle(s.key)}
                className={cn(
                  "mono-label rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-[10.5px] transition",
                  style === s.key ? "border-transparent bg-[var(--chip-active-bg)] text-[var(--chip-active-fg)]" : "border-line-strong bg-surface text-fg-2 hover:border-[var(--text-mute)]",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mono-label mb-1.5 text-[10.5px] text-muted">Cor</p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["dark", "Escuro", "#15171c"],
                ["primary", "Principal", primary],
                ["accent", "Destaque", accent],
                ["gradient", "Gradiente", `linear-gradient(135deg, ${primary}, ${accent})`],
              ] as const
            ).map(([k, l, c]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFill(k)}
                className={cn(
                  "mono-label flex items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-[10.5px] transition",
                  fill === k ? "border-transparent bg-[var(--chip-active-bg)] text-[var(--chip-active-fg)]" : "border-line-strong bg-surface text-fg-2 hover:border-[var(--text-mute)]",
                )}
              >
                <span className="size-3 rounded-full border border-line" style={{ background: c }} /> {l}
              </button>
            ))}
            <label className="mono-label flex items-center gap-2 rounded-[var(--radius-sm)] border border-line-strong bg-surface px-2.5 py-1.5 text-[10.5px] text-fg-2">
              <input type="checkbox" checked={italic} onChange={(e) => setItalic(e.target.checked)} className="accent-[var(--accent)]" /> Itálico
            </label>
          </div>
        </div>
        <Button type="button" trail={<Wand2 className="size-3.5" />} onClick={() => preview && onUse(preview)}>
          Usar este logotipo
        </Button>
      </div>
    </div>
  );
}
