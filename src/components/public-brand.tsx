import { brandOverrideCss } from "@/lib/brand-colors";
import { googleFontsHref, themeCss } from "@/lib/theme-options";
import { resolveSettings } from "@/lib/labels";
import { DrapSignature } from "./drap-signature";

type Org = { name: string; logoUrl: string | null; primaryColor: string; accentColor: string; settings: unknown };

/** Aplica a identidade visual da empresa (cores, fontes) nas páginas públicas. */
export function PublicBrandStyles({ org }: { org: Org }) {
  const brand = resolveSettings(org.settings).brand;
  const css = brandOverrideCss(org.primaryColor, org.accentColor) + themeCss(brand);
  const fonts = googleFontsHref(brand);
  return (
    <>
      {fonts && <link rel="stylesheet" href={fonts} precedence="default" />}
      {css && <style>{css}</style>}
    </>
  );
}

/** Logotipo em alta resolução (ou monograma) da empresa. */
export function PublicLogo({ org, height = 56 }: { org: Org; height?: number }) {
  if (org.logoUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={org.logoUrl} alt={org.name} style={{ height, maxWidth: height * 4.5 }} className="w-auto object-contain" />;
  return (
    <span className="inline-flex items-center gap-3">
      <span className="inline-flex items-center justify-center rounded-[12px] text-lg font-semibold text-white" style={{ width: height, height, background: "var(--grad)" }}>
        {org.name
          .split(/\s+/)
          .filter((w) => /[a-z0-9]/i.test(w))
          .slice(0, 2)
          .map((w) => w[0]!.toUpperCase())
          .join("")}
      </span>
      <span className="text-xl font-semibold tracking-[-0.03em]">{org.name}</span>
    </span>
  );
}

export function PublicFooter({ org }: { org: Org }) {
  return (
    <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs text-muted print:hidden">
      <span className="mono-label text-[10px]">© {new Date().getFullYear()} {org.name}</span>
      <DrapSignature />
    </footer>
  );
}
