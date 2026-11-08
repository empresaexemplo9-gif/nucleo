import { brandOverrideCss } from "@/lib/brand-colors";
import { BrandMark } from "@/components/brand-mark";
import { Terminal } from "@/components/terminal";

const FEATURES = ["Funis com arrastar e soltar", "Contatos PF e PJ", "Relatórios e metas", "Automações", "Whitelabel"];

export function AuthShell({
  brand,
  title,
  subtitle,
  children,
}: {
  brand: { name: string; logoUrl: string | null; primaryColor: string; accentColor: string };
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const css = brandOverrideCss(brand.primaryColor, brand.accentColor);
  return (
    <div className="relative min-h-screen">
      {css && <style>{css}</style>}
      <div aria-hidden className="bg-grid" />
      <div aria-hidden className="bg-orbs">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden className="bg-noise" />

      <header className="glass-nav sticky top-0 z-10 border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 lg:px-6">
          <BrandMark logoUrl={brand.logoUrl} />
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-[-0.02em]">{brand.name}</p>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-muted">CRM · Business</p>
          </div>
          <span className="mono-label ml-auto hidden items-center gap-2 text-[10px] text-muted sm:flex">
            <span className="dot-ok" /> Todos os sistemas operacionais
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] items-center gap-12 px-4 py-12 lg:grid-cols-[1.15fr_1fr] lg:px-6 lg:py-20">
        <section className="animate-rise hidden lg:block">
          <span className="glass-pill mono-label inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] text-fg-2">
            <span className="size-1.5 rounded-full bg-[var(--accent)]" /> crm://acesso · v2026.11
          </span>
          <h2 className="mt-6 text-[clamp(48px,6vw,88px)] font-medium leading-[0.98] tracking-[-0.045em]">
            Venda com um processo <span className="serif-i text-grad pr-2">organizado.</span>
          </h2>
          <p className="mt-6 max-w-lg text-[19px] font-light leading-relaxed text-fg-2">
            Pipeline, contatos, atividades e relatórios em um só lugar — com a marca da sua empresa.
          </p>
          <div className="relative mt-10 max-w-xl">
            <Terminal
              title="drap-crm — pipeline"
              lines={[
                { kind: "cmd", text: "crm pipeline --resumo" },
                { kind: "ok", text: "Qualificação · 05 negócios · R$ 114 mil" },
                { kind: "ok", text: "Proposta · 03 negócios · R$ 69 mil" },
                { kind: "ok", text: "Negociação · 04 negócios · R$ 135 mil" },
                { kind: "warn", text: "02 negócios parados há mais de 14 dias" },
              ]}
              footerLeft="region: sa-east-1 · sync: tempo real"
              footerRight="healthy"
            />
            <span className="glass-pill mono-label absolute -top-5 right-24 rounded-[10px] px-3 py-2 text-[10px] text-fg-2 shadow-card">LGPD compliant</span>
            <span className="glass-pill mono-label absolute -bottom-5 left-[40%] rounded-[10px] px-3 py-2 text-[10px] text-fg-2 shadow-card">PF · PJ · Whitelabel</span>
          </div>
          <p className="mono-label mt-12 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
            {FEATURES.map((f, i) => (
              <span key={f}>
                {f}
                {i < FEATURES.length - 1 && <span className="ml-3 text-[var(--accent)]">◇</span>}
              </span>
            ))}
          </p>
        </section>

        <section className="animate-rise mx-auto w-full max-w-[420px] [animation-delay:120ms]">
          <div className="card-drap card-grid-top relative p-7 sm:p-9">
            <p className="eyebrow relative">01 / Acesso</p>
            <h1 className="relative mt-3 text-[34px] font-medium leading-[1.05] tracking-[-0.04em]">{title}</h1>
            <p className="relative mb-7 mt-2 text-sm text-fg-2">{subtitle}</p>
            <div className="relative">{children}</div>
          </div>
          <p className="mono-label mt-5 text-center text-[10px] text-muted">© {new Date().getFullYear()} {brand.name}</p>
        </section>
      </main>
    </div>
  );
}
