"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Search, X } from "lucide-react";
import { cn, Input } from "./ui";
import { useOrg } from "./org-context";

export type Option = { id: string; label: string; sub?: string | null; companyId?: string | null };

/** Seletor com busca remota (contatos, empresas, negócios, produtos). */
export function EntityPicker({
  type,
  name,
  defaultValue,
  placeholder = "Buscar…",
  onChange,
  allowCreateName,
}: {
  type: "contact" | "company" | "deal" | "product";
  name: string;
  defaultValue?: Option | null;
  placeholder?: string;
  onChange?: (o: Option | null) => void;
  /** se informado, permite criar novo registro pelo nome (envia o texto neste campo) */
  allowCreateName?: string;
}) {
  const [value, setValue] = useState<Option | null>(defaultValue ?? null);
  const [creating, setCreating] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Option[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/lookup?type=${type}&q=${encodeURIComponent(q)}`);
      if (r.ok) setItems(await r.json());
    }, 150);
    return () => clearTimeout(t);
  }, [q, open, type]);

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (o: Option | null) => {
    setValue(o);
    setCreating(null);
    setOpen(false);
    setQ("");
    onChange?.(o);
  };

  return (
    <div className="relative" ref={ref}>
      <input type="hidden" name={name} value={value?.id ?? ""} />
      {allowCreateName && <input type="hidden" name={allowCreateName} value={creating ?? ""} />}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-left text-sm focus:border-brand"
      >
        <span className={cn("truncate", !value && !creating && "text-muted/70")}>
          {creating ? (
            <span className="inline-flex items-center gap-1"><Plus className="size-3" /> {creating} <em className="text-xs text-muted">(novo)</em></span>
          ) : (
            value?.label ?? placeholder
          )}
        </span>
        {value || creating ? (
          <X
            className="size-4 shrink-0 text-muted hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              pick(null);
            }}
          />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted" />
        )}
      </button>
      {open && (
        <div className="animate-in absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-xl">
          <div className="relative border-b border-line p-1.5">
            <Search className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite para buscar…" className="h-8 pl-7" />
          </div>
          <div className="scroll-thin max-h-56 overflow-y-auto p-1">
            {items.map((o) => (
              <button key={o.id} type="button" onClick={() => pick(o)} className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-2">
                <div className="truncate">{o.label}</div>
                {o.sub && <div className="truncate text-xs text-muted">{o.sub}</div>}
              </button>
            ))}
            {!items.length && !q && <p className="px-2.5 py-2 text-xs text-muted">Nenhum registro</p>}
            {allowCreateName && q && (
              <button
                type="button"
                onClick={() => {
                  setValue(null);
                  setCreating(q);
                  setOpen(false);
                  onChange?.(null);
                }}
                className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-sm text-brand hover:bg-surface-2"
              >
                <Plus className="size-3.5" /> Criar “{q}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MemberSelect({ name, defaultValue, allowEmpty, className }: { name: string; defaultValue?: string | null; allowEmpty?: boolean; className?: string }) {
  const { members } = useOrg();
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      className={cn("h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand", className)}
    >
      {allowEmpty && <option value="">— Ninguém —</option>}
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

/** Etiquetas: escolhe entre as cadastradas ou cria novas. */
export function TagInput({ name = "tags", defaultValue = [] }: { name?: string; defaultValue?: string[] }) {
  const { tags, tagColor } = useOrg();
  const [value, setValue] = useState<string[]>(defaultValue);
  const [text, setText] = useState("");
  const add = (t: string) => {
    const v = t.trim();
    if (v && !value.includes(v)) setValue([...value, v]);
    setText("");
  };
  const suggestions = tags.filter((t) => !value.includes(t.name) && t.name.toLowerCase().includes(text.toLowerCase()));
  return (
    <div>
      {value.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 focus-within:border-brand">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `color-mix(in oklab, ${tagColor(v)} 15%, transparent)`, color: tagColor(v) }}>
            {v}
            <X className="size-3 cursor-pointer" onClick={() => setValue(value.filter((x) => x !== v))} />
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && value.length) setValue(value.slice(0, -1));
          }}
          placeholder={value.length ? "" : "Adicionar etiqueta…"}
          className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {suggestions.slice(0, 8).map((t) => (
            <button key={t.name} type="button" onClick={() => add(t.name)} className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted hover:border-solid" style={{ borderColor: t.color }}>
              + {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TagList({ tags }: { tags: string[] }) {
  const { tagColor } = useOrg();
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="rounded-full px-1.5 py-px text-[10px] font-medium" style={{ background: `color-mix(in oklab, ${tagColor(t)} 15%, transparent)`, color: tagColor(t) }}>
          {t}
        </span>
      ))}
    </div>
  );
}
