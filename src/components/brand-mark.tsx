import { initials } from "@/lib/format";

/**
 * Marca da empresa cliente (whitelabel): usa o logotipo enviado ou, na falta dele,
 * um monograma com as iniciais na cor da marca. Não exibe a marca da plataforma.
 */
export function BrandMark({ logoUrl, name, size = 34 }: { logoUrl?: string | null; name: string; size?: number }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} style={{ width: size, height: size }} className="shrink-0 rounded-[var(--radius-sm)] border border-line bg-[var(--surface-1)] object-contain p-0.5" />;
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] font-semibold tracking-[-0.03em]"
      style={{ width: size, height: size, background: "var(--grad)", color: "var(--on-accent)", fontSize: size * 0.4 }}
    >
      {initials(name || "?")}
    </span>
  );
}
