import { BarChart3, CheckCircle2, KanbanSquare, Sparkles, Users } from "lucide-react";

const FEATURES = [
  [KanbanSquare, "Funis visuais com arrastar e soltar"],
  [Users, "Contatos, empresas e histórico completo"],
  [BarChart3, "Relatórios, metas e previsão de receita"],
  [Sparkles, "Automações e personalização total"],
] as const;

/** Mini prévia ilustrativa do funil, apenas decorativa. */
function BoardPreview() {
  const cols = [
    { name: "Qualificação", color: "#60a5fa", cards: [["Projeto Atlas", "R$ 18 mil"], ["Renovação anual", "R$ 9,4 mil"]] },
    { name: "Proposta", color: "#fbbf24", cards: [["Expansão filiais", "R$ 42 mil"]] },
    { name: "Negociação", color: "#34d399", cards: [["Contrato 24 meses", "R$ 76 mil"], ["Licenças extras", "R$ 6 mil"]] },
  ];
  return (
    <div className="relative grid grid-cols-3 gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-md" aria-hidden>
      {cols.map((c, i) => (
        <div key={c.name} className="space-y-2">
          <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold text-white/90">
            <span className="size-1.5 rounded-full" style={{ background: c.color }} /> {c.name}
          </div>
          {c.cards.map(([t, v], j) => (
            <div
              key={t}
              className="rounded-xl bg-white p-2.5 text-slate-800 shadow-lg"
              style={{ transform: i === 1 && j === 0 ? "rotate(-3deg) translateY(4px)" : undefined }}
            >
              <p className="truncate text-[11px] font-semibold">{t}</p>
              <p className="mt-1 text-[11px] font-bold" style={{ color: "#334155" }}>{v}</p>
              <div className="mt-1.5 h-1 rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${40 + i * 25}%`, background: c.color }} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

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
  return (
    <div
      className="grid min-h-screen bg-bg lg:grid-cols-[1.05fr_1fr]"
      style={{ ["--brand" as string]: brand.primaryColor, ["--accent" as string]: brand.accentColor }}
    >
      <div
        className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between"
        style={{ background: `linear-gradient(150deg, ${brand.primaryColor} 0%, color-mix(in oklab, ${brand.primaryColor} 60%, ${brand.accentColor}) 55%, ${brand.accentColor} 100%)` }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.45)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-black/15 blur-3xl" />

        <div className="relative flex items-center gap-3 text-lg font-bold">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.name} className="h-11 max-w-44 rounded-xl bg-white/95 object-contain p-1.5 shadow-lg" />
          ) : (
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20 text-lg font-extrabold shadow-lg ring-1 ring-white/30 backdrop-blur">{brand.name[0]}</span>
          )}
          <span className="font-display">{brand.name}</span>
        </div>

        <div className="relative max-w-lg space-y-8">
          <div>
            <h2 className="font-display text-[40px] font-extrabold leading-[1.1] tracking-tight">
              Venda mais com um processo comercial organizado.
            </h2>
            <p className="mt-4 text-base text-white/80">Pipeline, contatos, atividades e relatórios em um só lugar — com a cara da sua empresa.</p>
          </div>
          <BoardPreview />
          <ul className="grid grid-cols-2 gap-3 text-sm text-white/90">
            {FEATURES.map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-sm text-white/70">
          <CheckCircle2 className="size-4" /> Seus dados protegidos · © {new Date().getFullYear()} {brand.name}
        </p>
      </div>

      <div className="relative flex items-center justify-center p-6">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 text-lg font-bold lg:hidden">
            <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-2xl font-extrabold text-white shadow-lift">{brand.name[0]}</span>
            <span className="font-display">{brand.name}</span>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-7 shadow-lift sm:p-8">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mb-7 mt-1.5 text-sm text-muted">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
