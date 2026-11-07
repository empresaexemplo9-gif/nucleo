"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Palette, KanbanSquare, SlidersHorizontal, Users, Sparkles, Target, Tags, User } from "lucide-react";
import { cn } from "@/components/ui";
import { useOrg } from "@/components/org-context";

export function SettingsNav() {
  const pathname = usePathname();
  const { can, settings } = useOrg();
  const items = [
    can("ADMIN") && { href: "/settings", label: "Marca e geral", icon: Palette },
    can("ADMIN") && { href: "/settings/pipelines", label: "Funis e etapas", icon: KanbanSquare },
    can("ADMIN") && { href: "/settings/fields", label: "Campos personalizados", icon: SlidersHorizontal },
    can("ADMIN") && { href: "/settings/users", label: "Usuários e permissões", icon: Users },
    can("ADMIN") && settings.modules.automations && { href: "/settings/automations", label: "Automações", icon: Sparkles },
    can("MANAGER") && settings.modules.goals && { href: "/settings/goals", label: "Metas", icon: Target },
    can("MANAGER") && { href: "/settings/tags", label: "Etiquetas e motivos", icon: Tags },
    { href: "/settings/profile", label: "Meu perfil", icon: User },
  ].filter(Boolean) as { href: string; label: string; icon: typeof User }[];
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
            pathname === i.href ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <i.icon className="size-4" /> {i.label}
        </Link>
      ))}
    </nav>
  );
}
