"use client";
import Link from "next/link";
import { useState } from "react";
import { Palette, Sparkles, Users, X, KanbanSquare } from "lucide-react";
import { Card, Select } from "@/components/ui";
import { useParamSetter } from "@/components/list-toolbar";

export function PeriodSelect({ value, options }: { value: string; options: Record<string, string> }) {
  const set = useParamSetter();
  return (
    <Select value={value} onChange={(e) => set("period", e.target.value === "month" ? "" : e.target.value)} className="w-auto">
      {Object.entries(options).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </Select>
  );
}

export function Welcome() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const steps = [
    { href: "/settings", icon: Palette, title: "Personalize sua marca", text: "Logo, cores, moeda e nomes das entidades." },
    { href: "/settings/pipelines", icon: KanbanSquare, title: "Ajuste seu funil", text: "Etapas, probabilidades e alertas de parados." },
    { href: "/settings/users", icon: Users, title: "Convide sua equipe", text: "Defina permissões por perfil." },
    { href: "/settings/automations", icon: Sparkles, title: "Crie automações", text: "Tarefas automáticas ao mudar de etapa." },
  ];
  return (
    <Card className="relative overflow-hidden border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-5">
      <button onClick={() => setOpen(false)} className="absolute right-3 top-3 text-muted hover:text-fg" aria-label="Fechar">
        <X className="size-4" />
      </button>
      <h2 className="text-lg font-semibold">Bem-vindo ao seu novo CRM! 🚀</h2>
      <p className="text-sm text-muted">Seu funil de vendas já está pronto. Comece por aqui:</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <Link key={s.href} href={s.href} className="rounded-xl border border-line bg-surface p-3 transition hover:border-brand">
            <s.icon className="size-5 text-brand" />
            <p className="mt-2 text-sm font-medium">{s.title}</p>
            <p className="text-xs text-muted">{s.text}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
