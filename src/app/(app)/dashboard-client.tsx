"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, KanbanSquare, Palette, Rocket, Sparkles, Users, X } from "lucide-react";
import { Select } from "@/components/ui";
import { useParamSetter } from "@/components/list-toolbar";

export function PeriodSelect({ value, options }: { value: string; options: Record<string, string> }) {
  const set = useParamSetter();
  return (
    <Select value={value} onChange={(e) => set("period", e.target.value === "month" ? "" : e.target.value)} className="w-auto min-w-44 font-medium">
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
    { href: "/settings/pipelines", icon: KanbanSquare, title: "Ajuste seu funil", text: "Etapas, probabilidades e alertas." },
    { href: "/settings/users", icon: Users, title: "Convide sua equipe", text: "Perfis de acesso por função." },
    { href: "/settings/automations", icon: Sparkles, title: "Crie automações", text: "Follow-ups automáticos por etapa." },
  ];
  return (
    <div className="bg-brand-gradient relative mb-6 overflow-hidden rounded-3xl p-6 text-white shadow-lift lg:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
      <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Fechar">
        <X className="size-4" />
      </button>
      <div className="relative flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
          <Rocket className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-bold">Seu CRM está pronto!</h2>
          <p className="text-sm text-white/80">Funil, etapas e motivos de perda já foram configurados. Dê os próximos passos:</p>
        </div>
      </div>
      <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Link key={s.href} href={s.href} className="group rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur transition hover:bg-white/20">
            <div className="flex items-center justify-between">
              <s.icon className="size-5" />
              <span className="text-xs font-semibold text-white/60">0{i + 1}</span>
            </div>
            <p className="mt-3 text-sm font-semibold">{s.title}</p>
            <p className="mt-0.5 text-xs text-white/75">{s.text}</p>
            <ArrowRight className="mt-2 size-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}
