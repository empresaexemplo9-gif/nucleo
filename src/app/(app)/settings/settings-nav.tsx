"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Palette, KanbanSquare, SlidersHorizontal, Users, Sparkles, Target, Tags, User } from "lucide-react";
import { cn } from "@/components/ui";
import { useOrg } from "@/components/org-context";

type Item = { href: string; label: string; desc: string; icon: typeof User; color: string };

export function SettingsNav() {
  const pathname = usePathname();
  const { can, settings } = useOrg();
  const groups: { title: string; items: (Item | false)[] }[] = [
    {
      title: "Empresa",
      items: [
        can("ADMIN") && { href: "/settings", label: "Marca e geral", desc: "Logo, cores, nomes", icon: Palette, color: "#8b5cf6" },
        can("ADMIN") && { href: "/settings/users", label: "Usuários", desc: "Equipe e permissões", icon: Users, color: "#0ea5e9" },
      ],
    },
    {
      title: "Processo de vendas",
      items: [
        can("ADMIN") && { href: "/settings/pipelines", label: "Funis e etapas", desc: "Fases da negociação", icon: KanbanSquare, color: "#6366f1" },
        can("ADMIN") && { href: "/settings/fields", label: "Campos", desc: "Dados personalizados", icon: SlidersHorizontal, color: "#14b8a6" },
        can("ADMIN") && settings.modules.automations && { href: "/settings/automations", label: "Automações", desc: "Regras automáticas", icon: Sparkles, color: "#f59e0b" },
        can("MANAGER") && settings.modules.goals && { href: "/settings/goals", label: "Metas", desc: "Objetivos mensais", icon: Target, color: "#10b981" },
        can("MANAGER") && { href: "/settings/tags", label: "Etiquetas e motivos", desc: "Segmentação e perdas", icon: Tags, color: "#ec4899" },
      ],
    },
    { title: "Pessoal", items: [{ href: "/settings/profile", label: "Meu perfil", desc: "Nome, senha, avatar", icon: User, color: "#64748b" }] },
  ];
  return (
    <nav className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-2 shadow-card md:sticky md:top-20">
      {groups.map((g) => {
        const items = g.items.filter(Boolean) as Item[];
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{g.title}</p>
            <div className="flex gap-1 overflow-x-auto md:flex-col">
              {items.map((i) => {
                const active = pathname === i.href;
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    className={cn(
                      "group flex shrink-0 items-center gap-2.5 rounded-xl px-2 py-1.5 transition",
                      active ? "bg-surface-2 ring-1 ring-line" : "hover:bg-surface-2",
                    )}
                  >
                    <span
                      className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg transition group-hover:scale-105", active && "text-white shadow-sm")}
                      style={active ? { background: `linear-gradient(140deg, color-mix(in oklab, ${i.color} 70%, white), ${i.color})` } : { background: `color-mix(in oklab, ${i.color} 13%, transparent)`, color: i.color }}
                    >
                      <i.icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm font-semibold", active ? "text-fg" : "text-fg-2")}>{i.label}</span>
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
