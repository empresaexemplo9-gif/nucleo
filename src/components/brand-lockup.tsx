"use client";
import { useEffect, useState } from "react";
import { BrandMark } from "./brand-mark";

/**
 * Logotipo da empresa com o nome. Logotipos horizontais (assinatura com o nome escrito)
 * aparecem inteiros, sem caixa e sem repetir o nome; os quadrados seguem como selo + nome.
 */
export function BrandLockup({ logoUrl, name, subtitle = "Gestão · CRM" }: { logoUrl?: string | null; name: string; subtitle?: string }) {
  const [wide, setWide] = useState<{ src: string; ratio: number } | null>(null);
  useEffect(() => {
    if (!logoUrl) return;
    // mede a proporção do logotipo para escolher o formato
    const img = new Image();
    img.onload = () => setWide({ src: logoUrl, ratio: img.naturalWidth / Math.max(1, img.naturalHeight) });
    img.src = logoUrl;
  }, [logoUrl]);
  const isWide = !!logoUrl && wide?.src === logoUrl && wide.ratio >= 2.2;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      {isWide ? (
        <span className="min-w-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl!} alt={name} className="block h-8 w-auto max-w-full object-contain object-left mix-blend-multiply dark:mix-blend-normal" />
          <span className="mt-1 block truncate font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">{subtitle}</span>
        </span>
      ) : (
        <>
          <BrandMark logoUrl={logoUrl} name={name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold tracking-[-0.02em]">{name}</span>
            <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">{subtitle}</span>
          </span>
        </>
      )}
    </span>
  );
}
