/** Cores padrão antigas (antes da identidade DRAP) e as atuais — ambas usam a paleta DRAP do tema. */
const DEFAULT_PAIRS = new Set(["#4f46e5|#0ea5e9", "#b48a4f|#3c78c0"]);
export const DRAP_PRIMARY = "#b48a4f";
export const DRAP_SECONDARY = "#3c78c0";

const hex = (c: string | null | undefined) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : null);

/** Empresa usa cor própria (whitelabel)? */
export function hasCustomBrand(primary?: string | null, accent?: string | null) {
  const p = hex(primary);
  const a = hex(accent);
  if (!p || !a) return false;
  return !DEFAULT_PAIRS.has(`${p}|${a}`);
}

/**
 * CSS que sobrescreve os destaques do tema com a cor da empresa.
 * Retorna string vazia quando a empresa usa a paleta padrão (DRAP).
 */
export function brandOverrideCss(primary?: string | null, accent?: string | null) {
  if (!hasCustomBrand(primary, accent)) return "";
  const p = hex(primary)!;
  const a = hex(accent)!;
  const vars = `--accent:${p};--accent-text:color-mix(in oklab, ${p} 82%, #000);--accent-2:${a};--accent-2-text:color-mix(in oklab, ${a} 82%, #000);--brand:var(--accent-text);--on-brand:#fff;--grad:linear-gradient(100deg, ${p} 0%, color-mix(in oklab, ${p} 55%, ${a}) 50%, ${a} 100%);--btn-icon-bg:linear-gradient(135deg, color-mix(in oklab, ${p} 70%, #fff), ${p});--btn-shadow-hover:0 0 0 1px ${p},0 18px 40px -14px color-mix(in oklab, ${p} 60%, transparent),inset 0 1px 0 rgba(255,255,255,.15);`;
  const dark = `--accent:color-mix(in oklab, ${p} 70%, #fff);--accent-text:color-mix(in oklab, ${p} 65%, #fff);--accent-2:color-mix(in oklab, ${a} 70%, #fff);--accent-2-text:color-mix(in oklab, ${a} 65%, #fff);--brand:var(--accent);--on-brand:#06070a;--grad:linear-gradient(100deg, color-mix(in oklab, ${p} 70%, #fff) 0%, color-mix(in oklab, ${a} 70%, #fff) 100%);--btn-bg:var(--grad);`;
  return `:root{${vars}}:root[data-theme="dark"],.dark{${dark}}`;
}
