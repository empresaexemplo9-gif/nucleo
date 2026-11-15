/** Estilo final da empresa: tema pronto (quando escolhido) ou cores/fontes personalizadas. */
import { brandOverrideCss, hasCustomBrand } from "./brand-colors";
import { googleFontsHref, themeCss, type BrandTheme } from "./theme-options";
import { presetCss, presetFontsHref, resolveTheme } from "./theme-presets";

export function brandStyle(primary: string | null | undefined, accent: string | null | undefined, theme: BrandTheme = {}) {
  const preset = resolveTheme(theme);
  if (preset) {
    const custom = hasCustomBrand(primary, accent);
    return {
      css: presetCss(preset, custom ? primary : null, custom ? accent : null),
      fontsHref: presetFontsHref([preset]),
      /** O tema pronto fixa o modo (claro ou escuro). */
      mode: (preset.dark ? "dark" : "light") as "light" | "dark",
    };
  }
  return { css: brandOverrideCss(primary, accent) + themeCss(theme), fontsHref: googleFontsHref(theme), mode: null };
}
