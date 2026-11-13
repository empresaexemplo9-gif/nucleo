"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarPlus, X } from "lucide-react";
import { Button, EditorialTitle, Select } from "@/components/ui";
import { useParamSetter } from "@/components/list-toolbar";
import { useQuickCreate } from "@/components/quick-create";
import { useOrg } from "@/components/org-context";

export function PeriodSelect({ value, options }: { value: string; options: Record<string, string> }) {
  const set = useParamSetter();
  return (
    <Select value={value} onChange={(e) => set("period", e.target.value === "month" ? "" : e.target.value)} className="w-auto min-w-44 font-mono text-xs uppercase tracking-[0.08em]">
      {Object.entries(options).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </Select>
  );
}

export function HeroActions() {
  const quick = useQuickCreate();
  const { labels, can } = useOrg();
  if (!can("SALES")) return null;
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Button size="lg" trail onClick={() => quick("deal")}>
        Novo {labels.deal.singular.toLowerCase()}
      </Button>
      <Button size="lg" variant="secondary" trail={<CalendarPlus className="size-3.5" />} onClick={() => quick("activity")}>
        Agendar {labels.activity.singular.toLowerCase()}
      </Button>
      <Link href="/deals" className="mono-label inline-flex items-center gap-1.5 px-2 text-[11px] text-fg-2 transition hover:text-fg">
        Ver funil <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

export function Welcome() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const steps = [
    { href: "/settings", title: "Personalize sua marca", text: "Logo, cores, moeda e nomes das entidades." },
    { href: "/settings/pipelines", title: "Ajuste seu funil", text: "Etapas, probabilidades e alertas." },
    { href: "/settings/users", title: "Convide sua equipe", text: "Perfis de acesso por função." },
    { href: "/settings/automations", title: "Crie automações", text: "Follow-ups automáticos por etapa." },
  ];
  return (
    <div className="card-drap card-grid-top animate-rise relative mb-10 p-6 lg:p-8">
      <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-[var(--radius-sm)] border border-line p-1.5 text-muted hover:text-fg" aria-label="Fechar">
        <X className="size-4" />
      </button>
      <p className="eyebrow relative">00 / Primeiros passos</p>
      <h2 className="relative mt-2 text-[clamp(26px,3vw,40px)] font-medium tracking-[-0.035em]">
        <EditorialTitle text="Seu sistema está pronto" highlight="pronto" />
      </h2>
      <p className="relative mt-1 text-fg-2">Funil, etapas e motivos de perda já foram configurados. Comece aplicando a identidade da sua empresa.</p>
      <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Link key={s.href} href={s.href} className="group rounded-[var(--radius)] border border-line bg-[var(--surface-1)] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-line-strong">
            <span className="font-mono text-[11px] text-accent-text">{String(i + 1).padStart(2, "0")}</span>
            <p className="mt-2 text-sm font-medium">{s.title}</p>
            <p className="mt-0.5 text-xs text-muted">{s.text}</p>
            <ArrowRight className="mt-3 size-4 text-muted transition group-hover:translate-x-1 group-hover:text-fg" />
          </Link>
        ))}
      </div>
    </div>
  );
}
