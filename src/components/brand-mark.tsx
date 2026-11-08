/** Marca DRAP: quadrado com barra diagonal. Usa o logotipo da empresa quando houver. */
export function BrandMark({ logoUrl, size = 34 }: { logoUrl?: string | null; size?: number }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-[var(--radius-sm)] border border-line bg-[var(--surface-1)] object-contain p-0.5" />;
  }
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)]"
      style={{ width: size, height: size, background: "var(--btn-bg)", boxShadow: "var(--btn-shadow)" }}
    >
      <span className="absolute h-[140%] w-[3px] rotate-[32deg] rounded-full" style={{ background: "var(--btn-icon-bg)" }} />
    </span>
  );
}
