"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";
import { useOrg } from "@/components/org-context";

type Item = { href: string; label: string; desc: string };

export function SettingsNav() {
  const pathname = usePathname();
  const { can, settings } = useOrg();
  const groups: { title: string; items: (Item | false)[] }[] = [
    {
      title: "Empresa",
      items: [
        can("ADMIN") && { href: "/settings", label: "Marca e geral", desc: "Logo, cores, nomes" },
        can("ADMIN") && { href: "/settings/users", label: "Usuários", desc: "Equipe e permissões" },
      ],
    },
    {
      title: "Processo de vendas",
      items: [
        can("ADMIN") && { href: "/settings/pipelines", label: "Funis e etapas", desc: "Fases da negociação" },
        can("ADMIN") && { href: "/settings/fields", label: "Campos", desc: "Dados personalizados" },
        can("ADMIN") && settings.modules.automations && { href: "/settings/automations", label: "Automações", desc: "Regras automáticas" },
        can("MANAGER") && settings.modules.goals && { href: "/settings/goals", label: "Metas", desc: "Objetivos mensais" },
        can("MANAGER") && { href: "/settings/tags", label: "Etiquetas e motivos", desc: "Segmentação e perdas" },
        can("ADMIN") && { href: "/settings/contracts", label: "Contratos", desc: "Modelos e PDFs da empresa" },
      ],
    },
    {
      title: "Controle interno",
      items: [can("ADMIN") && { href: "/settings/modules", label: "Módulos", desc: "Ordens, estoque, frota…" }],
    },
    { title: "Pessoal", items: [{ href: "/settings/profile", label: "Meu perfil", desc: "Nome, senha, avatar" }] },
  ];
  let n = 0;
  return (
    <nav className="card-drap h-fit space-y-4 p-2 md:sticky md:top-20">
      {groups.map((g) => {
        const items = g.items.filter(Boolean) as Item[];
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="eyebrow px-2.5 pb-1 pt-1.5 text-[10px]">{g.title}</p>
            <div className="flex gap-1 overflow-x-auto md:flex-col">
              {items.map((i) => {
                n += 1;
                const active = pathname === i.href || (i.href === "/settings/modules" && pathname.startsWith("/settings/modules"));
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    className={cn(
                      "group flex shrink-0 items-start gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 transition duration-300",
                      active ? "bg-[var(--surface-1)] shadow-[0_0_0_1px_var(--line),0_8px_20px_-14px_var(--shadow)]" : "hover:bg-tint",
                    )}
                  >
                    <span className={cn("pt-0.5 font-mono text-[10.5px]", active ? "text-accent-text" : "text-muted")}>{String(n).padStart(2, "0")}</span>
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm", active ? "font-medium text-fg" : "text-fg-2")}>{i.label}</span>
                      <span className="hidden truncate text-[11px] text-muted md:block">{i.desc}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
