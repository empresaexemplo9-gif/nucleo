/**
 * Assinatura da desenvolvedora (DRAP). Cores fixas da marca DRAP — não variam com o tema do cliente.
 */
export const DRAP_URL = "https://drap-softwerehouse.vercel.app/";

/** Marca oficial DRAP (vetor do site oficial). Cor fixa da marca, independente do tema do cliente. */
export function DrapMark({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 778 781" width={size} height={size} className="shrink-0 text-[#024C5E] dark:text-[#FBF7F2]" fill="currentColor">
      <path d="M0 0H533L212 781H0Z" />
      <path d="M581 2C601 2 777 60 777 290V480C777 675 652 781 512 781H219Z" />
    </svg>
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
