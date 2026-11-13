"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Package, Plus, Settings2, Sparkles, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHeader, cn, EmptyState, Field, Input, Modal, Textarea } from "@/components/ui";
import { MODULE_ICONS, ModuleIcon } from "@/components/module-icon";
import { useAction } from "@/components/use-action";
import { createModule, deleteModule, installModuleTemplates, moveModule } from "@/actions/modules";
import { MODULE_TEMPLATES, packForSegment, SEGMENT_PACKS } from "@/lib/module-templates";

type Installed = { id: string; key: string; name: string; icon: string; color: string; group: string; prefix: string; templateKey: string | null; records: number; fields: number };

const SWATCHES = ["#b48a4f", "#3c78c0", "#2d63a3", "#17905f", "#cf3a56", "#b7791f", "#7d5bbe", "#0f8b8d", "#7d828c", "#141414"];

export function ModulesGallery({ installed, segment }: { installed: Installed[]; segment: string | null }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [icon, setIcon] = useState("folder");
  const [color, setColor] = useState(SWATCHES[0]!);
  const has = (k: string) => installed.some((m) => m.templateKey === k);
  const suggested = packForSegment(segment);

  const toggle = (k: string) => {
    const n = new Set(picked);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setPicked(n);
  };
  const install = (keys: string[]) => run(() => installModuleTemplates(keys), { onSuccess: () => setPicked(new Set()) });

  return (
    <div className="space-y-4">
      <Card grid className="relative overflow-hidden p-6">
        <p className="eyebrow mb-2">Construtor de controle interno</p>
        <h2 className="text-[clamp(24px,2.6vw,34px)] font-medium leading-[1.1] tracking-[-0.03em]">
          Monte o sistema da sua empresa <span className="font-serif italic text-accent-text">módulo a módulo</span>
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] font-light text-fg-2">
          Cada módulo é um cadastro com campos livres, fluxo de status, quadro Kanban, prazos, valores, permissões e histórico. Use um modelo pronto, um pacote do seu segmento ou crie do zero.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button trail={<Plus className="size-3.5" />} onClick={() => setCreating(true)}>Criar do zero</Button>
          <Button variant="secondary" loading={pending} trail={<Sparkles className="size-3.5" />} onClick={() => install(suggested.modules.filter((k) => !has(k)))} disabled={suggested.modules.every(has)}>
            Instalar pacote sugerido · {suggested.label}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader icon={<Package />} title={`Módulos instalados · ${String(installed.length).padStart(2, "0")}`} />
        {installed.length ? (
          <div className="divide-y divide-line rounded-[10px] border border-line">
            {installed.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-line bg-surface-2" style={{ color: m.color }}>
                  <ModuleIcon name={m.icon} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/m/${m.key}`} className="text-sm font-medium hover:text-accent-text">{m.name}</Link>
                  <p className="truncate text-xs text-muted">
                    {m.group} · {m.prefix} · {m.fields} campos · {m.records} registros
                  </p>
                </div>
                <div className="flex">
                  <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => run(() => moveModule(m.id, -1))} aria-label="Subir"><ArrowUp className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" disabled={i === installed.length - 1} onClick={() => run(() => moveModule(m.id, 1))} aria-label="Descer"><ArrowDown className="size-3.5" /></Button>
                  <Link href={`/settings/modules/${m.id}`}><Button size="icon" variant="ghost" aria-label="Configurar"><Settings2 className="size-3.5" /></Button></Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir"
                    onClick={() => confirm(`Excluir o módulo "${m.name}" e seus ${m.records} registros? Esta ação não pode ser desfeita.`) && run(() => deleteModule(m.id))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Package />} title="Nenhum módulo instalado" description="Escolha modelos abaixo ou instale o pacote do seu segmento." />
        )}
      </Card>

      <Card className="p-5">
        <CardHeader icon={<Sparkles />} title="Pacotes por segmento" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SEGMENT_PACKS.map((p) => {
            const missing = p.modules.filter((k) => !has(k));
            return (
              <div key={p.key} className={cn("rounded-[10px] border p-3", p.key === suggested.key ? "border-[var(--accent)]" : "border-line")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{p.label}</p>
                  {p.key === suggested.key && <Badge color="var(--accent)">Sugerido</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted">{p.modules.map((k) => MODULE_TEMPLATES.find((t) => t.key === k)?.name).join(" · ")}</p>
                <Button size="sm" variant="soft" className="mt-2" disabled={!missing.length || pending} onClick={() => install(missing)}>
                  {missing.length ? `Instalar ${missing.length} módulo(s)` : "Tudo instalado"}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardHeader icon={<Package />} title="Galeria de modelos" />
          {picked.size > 0 && (
            <Button loading={pending} onClick={() => install([...picked])}>Instalar {picked.size} selecionado(s)</Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {MODULE_TEMPLATES.map((t) => {
            const on = picked.has(t.key);
            const inst = has(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => toggle(t.key)}
                className={cn("relative flex flex-col rounded-[12px] border p-4 text-left transition hover:-translate-y-0.5", on ? "border-[var(--accent)] bg-tint" : "border-line hover:border-line-strong")}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex size-10 items-center justify-center rounded-[10px] border border-line bg-surface-2" style={{ color: t.color }}>
                    <ModuleIcon name={t.icon} className="size-5" />
                  </span>
                  <span className={cn("flex size-5 items-center justify-center rounded-full border", on ? "border-transparent bg-[var(--accent)] text-white" : "border-line")}>{on && <Check className="size-3" />}</span>
                </div>
                <p className="mt-3 font-medium">{t.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-fg-2">{t.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.statuses.slice(0, 4).map((s) => (
                    <span key={s.name} className="inline-flex items-center gap-1 rounded-[5px] border border-line px-1.5 py-0.5 text-[10px] text-muted">
                      <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                  ))}
                </div>
                <p className="mono-label mt-3 text-[10px] text-muted">{t.fields.length} campos · {t.prefix}{inst && " · já instalado"}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Novo módulo" wide>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("icon", icon);
            fd.set("color", color);
            run(() => createModule(fd), {
              onSuccess: (r) => {
                setCreating(false);
                if (r.id) router.push(`/settings/modules/${r.id}`);
              },
            });
          }}
          className="space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome (plural) *"><Input name="name" required autoFocus placeholder="Ex.: Vistorias" /></Field>
            <Field label="Nome (singular) *"><Input name="singular" required placeholder="Ex.: Vistoria" /></Field>
            <Field label="Prefixo do código" hint="Até 5 letras, ex.: VIS → VIS-0001"><Input name="prefix" maxLength={5} placeholder="VIS" /></Field>
          </div>
          <Field label="Descrição"><Textarea name="description" rows={2} placeholder="Para que serve este controle?" /></Field>
          <IconColorPicker icon={icon} color={color} onIcon={setIcon} onColor={setColor} />
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button trail loading={pending}>Criar módulo</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function IconColorPicker({ icon, color, onIcon, onColor }: { icon: string; color: string; onIcon: (v: string) => void; onColor: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[13px] font-medium">Ícone</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(MODULE_ICONS).map((k) => (
            <button
              key={k}
              type="button"
              aria-label={k}
              onClick={() => onIcon(k)}
              className={cn("inline-flex size-9 items-center justify-center rounded-[8px] border transition", icon === k ? "border-[var(--accent)] bg-tint" : "border-line hover:border-line-strong")}
              style={{ color: icon === k ? color : undefined }}
            >
              <ModuleIcon name={k} className="size-4" />
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[13px] font-medium">Cor</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {SWATCHES.map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => onColor(c)} className={cn("size-7 rounded-full border-2 transition", color === c ? "border-fg" : "border-transparent")} style={{ background: c }} />
          ))}
          <input type="color" value={color} onChange={(e) => onColor(e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-line bg-transparent" aria-label="Cor personalizada" />
        </div>
      </div>
    </div>
  );
}
