/**
 * Assinatura da desenvolvedora (DRAP). Cores fixas da marca DRAP — não variam com o tema do cliente.
 */
export const DRAP_URL = "https://drap-softwerehouse.vercel.app/";

export function DrapMark({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden"
      style={{ width: size, height: size, borderRadius: Math.max(3, size * 0.24), background: "var(--drap-ink)", boxShadow: "0 0 0 1px rgba(0,0,0,.25)" }}
    >
      <span className="absolute h-[140%] rounded-full" style={{ width: Math.max(1.5, size * 0.09), transform: "rotate(32deg)", background: "var(--drap-gold)" }} />
    </span>
  );
}

export function DrapSignature({ className = "" }: { className?: string }) {
  return (
    <a
      href={DRAP_URL}
      target="_blank"
      rel="noreferrer"
      className={`group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition hover:text-fg ${className}`}
      title="DRAP SoftwareHouse & Business"
    >
      Desenvolvido por
      <DrapMark />
      <span className="font-sans text-[12px] font-bold normal-case tracking-[0.02em] text-fg-2 group-hover:text-fg">DRAP</span>
    </a>
  );
}
