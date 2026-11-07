import { BarChart3, KanbanSquare, Sparkles, Users } from "lucide-react";

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
      className="grid min-h-screen lg:grid-cols-2"
      style={{ ["--brand" as string]: brand.primaryColor, ["--accent" as string]: brand.accentColor }}
    >
      <div
        className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between"
        style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})` }}
      >
        <div className="flex items-center gap-3 text-lg font-semibold">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.name} className="h-10 max-w-40 rounded-lg bg-white/90 object-contain p-1" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/20 font-bold">{brand.name[0]}</span>
          )}
          {brand.name}
        </div>
        <div className="max-w-md space-y-6">
          <h2 className="text-4xl font-semibold leading-tight">Venda mais com um processo comercial organizado.</h2>
          <ul className="space-y-3 text-white/90">
            {[
              [KanbanSquare, "Funis de vendas visuais com arrastar e soltar"],
              [Users, "Contatos, empresas e histórico completo"],
              [BarChart3, "Relatórios, metas e previsão de receita"],
              [Sparkles, "Automações e personalização total"],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof Users;
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="rounded-lg bg-white/15 p-2">
                    <I className="size-4" />
                  </span>
                  {text as string}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-sm text-white/70">© {new Date().getFullYear()} {brand.name}</p>
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-2xl" />
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand font-bold text-white">{brand.name[0]}</span>
              {brand.name}
            </div>
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
