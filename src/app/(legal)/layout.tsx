import Link from "next/link";
import { DrapSignature } from "@/components/drap-signature";

/** Páginas legais públicas (exigidas pela Meta para o app do WhatsApp e pela LGPD). */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 text-sm">
          <Link href="/login" className="font-semibold">Gestão &amp; CRM</Link>
          <span className="ml-auto flex flex-wrap gap-4 text-fg-2">
            <Link href="/privacidade" className="hover:text-fg">Privacidade</Link>
            <Link href="/termos" className="hover:text-fg">Termos de uso</Link>
            <Link href="/exclusao-de-dados" className="hover:text-fg">Exclusão de dados</Link>
          </span>
        </nav>
      </header>
      <main className="legal mx-auto max-w-3xl px-4 py-10 text-[15px] leading-relaxed text-fg-2 [&_h1]:mb-2 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-[-0.03em] [&_h1]:text-fg [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-accent-text [&_a]:underline">
        {children}
      </main>
      <footer className="border-t border-line py-6">
        <div className="flex justify-center"><DrapSignature /></div>
      </footer>
    </div>
  );
}
