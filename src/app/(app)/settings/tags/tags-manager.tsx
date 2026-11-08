"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { addLostReason, deleteLostReason, deleteTag, saveTag } from "@/actions/settings";

export function TagsManager({ tags, reasons }: { tags: { id: string; name: string; color: string }[]; reasons: { id: string; label: string }[] }) {
  const { run, pending } = useAction();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-base font-bold">Etiquetas</h2>
        <p className="mb-4 text-sm text-muted">Use para segmentar e filtrar negócios, contatos e empresas.</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-sm font-medium" style={{ background: `color-mix(in oklab, ${t.color} 15%, transparent)`, color: t.color }}>
              <input type="color" value={t.color} onChange={(e) => run(() => saveTag(t.name, e.target.value))} className="size-4 cursor-pointer rounded-full" title="Alterar cor" />
              {t.name}
              <button onClick={() => run(() => deleteTag(t.id))} className="rounded-full p-0.5 hover:bg-black/10" aria-label="Remover"><X className="size-3" /></button>
            </span>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => saveTag(name, color), { onSuccess: () => setName("") }); }}>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova etiqueta" className="max-w-xs" />
          <Button variant="secondary" loading={pending} disabled={!name.trim()}>Adicionar</Button>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="text-base font-bold">Motivos de perda</h2>
        <p className="mb-4 text-sm text-muted">Padronize os motivos para descobrir por que os negócios são perdidos.</p>
        <div className="mb-4 divide-y divide-line rounded-lg border border-line">
          {reasons.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
              {r.label}
              <button onClick={() => run(() => deleteLostReason(r.id))} className="text-muted hover:text-red-600" aria-label="Remover"><X className="size-4" /></button>
            </div>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => addLostReason(reason), { onSuccess: () => setReason("") }); }}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Novo motivo" className="max-w-xs" />
          <Button variant="secondary" loading={pending} disabled={!reason.trim()}>Adicionar</Button>
        </form>
      </Card>
    </div>
  );
}
