"use client";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { forwardRef, useEffect } from "react";
import { ArrowRight, X, Loader2 } from "lucide-react";
import { initials } from "@/lib/format";

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

/* ------------------------------------------------------------------ */
/* Botões                                                              */
/* ------------------------------------------------------------------ */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "soft";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  /** Quadradinho de ícone à direita (padrão DRAP). `true` usa a seta →. */
  trail?: React.ReactNode | true;
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, trail, ...props },
  ref,
) {
  const trailing = trail === true ? <ArrowRight className="size-3.5" /> : trail;
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-all duration-300 ease-[var(--ease)] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        size === "sm" && "h-8 px-2.5 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-[15px]",
        size === "icon" && "size-8 text-sm",
        trailing && size !== "icon" && "pr-2",
        variant === "primary" && "btn-drap",
        variant === "secondary" && "border border-line-strong bg-surface text-fg hover:-translate-y-px hover:border-[var(--text-mute)]",
        variant === "ghost" && "text-fg-2 hover:bg-tint hover:text-fg",
        variant === "soft" && "border border-line bg-well text-fg hover:border-line-strong",
        variant === "danger" && "border border-[color-mix(in_oklab,var(--err)_40%,transparent)] bg-[color-mix(in_oklab,var(--err)_10%,transparent)] text-err hover:bg-[color-mix(in_oklab,var(--err)_16%,transparent)]",
        variant === "success" && "border border-[color-mix(in_oklab,var(--ok)_40%,transparent)] bg-[color-mix(in_oklab,var(--ok)_12%,transparent)] text-ok hover:bg-[color-mix(in_oklab,var(--ok)_18%,transparent)]",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
      {trailing && !loading && (
        <span className={variant === "primary" ? "btn-icon" : "inline-flex size-6 items-center justify-center rounded-md bg-tint text-fg-2"}>{trailing}</span>
      )}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Campos                                                              */
/* ------------------------------------------------------------------ */

const field =
  "w-full rounded-[var(--radius-sm)] border border-line-strong bg-[var(--field-bg)] px-3 text-sm text-fg outline-none transition placeholder:text-muted focus:bg-[var(--field-bg-focus)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)] disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(field, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(field, "min-h-20 py-2.5 leading-relaxed", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(field, "h-10 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
});

export function Label({ children, className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mono-label mb-1.5 block text-[10.5px] text-muted", className)} {...p}>
      {children}
    </label>
  );
}

export function Field({ label, children, className, hint }: { label: string; children: React.ReactNode; className?: string; hint?: string }) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tipografia editorial                                                */
/* ------------------------------------------------------------------ */

/** Título com a última palavra (ou `highlight`) em Instrument Serif itálico. */
export function EditorialTitle({ text, highlight, gradient, className }: { text: string; highlight?: string; gradient?: boolean; className?: string }) {
  const words = text.trim().split(/\s+/);
  const hl = highlight ?? (words.length > 1 ? words[words.length - 1]! : null);
  if (!hl || !text.includes(hl)) return <span className={className}>{text}</span>;
  const i = text.lastIndexOf(hl);
  return (
    <span className={className}>
      {text.slice(0, i)}
      <span className={cn("serif-i", gradient ? "text-grad pr-1" : "text-accent-text")}>{hl}</span>
      {text.slice(i + hl.length)}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

/* ------------------------------------------------------------------ */
/* Superfícies                                                         */
/* ------------------------------------------------------------------ */

export function Card({ className, children, grid, ...p }: React.HTMLAttributes<HTMLDivElement> & { grid?: boolean }) {
  return (
    <div className={cn("card-drap", grid && "card-grid-top", className)} {...p}>
      {children}
    </div>
  );
}

/** Cabeçalho de seção dentro de um Card. */
export function CardHeader({ title, icon, description, action, className }: { title: React.ReactNode; icon?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative mb-4 flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-line bg-well text-fg-2 [&>svg]:size-3.5">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-fg">{title}</h3>
          {description && <p className="mono-label mt-0.5 text-[10px] text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Ícone em "azulejo" discreto. */
export function IconTile({ children, color, size = 36, className }: { children: React.ReactNode; color?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-line", !color && "bg-well text-fg-2", className)}
      style={{
        width: size,
        height: size,
        ...(color ? { background: `color-mix(in oklab, ${color} 12%, transparent)`, color } : {}),
      }}
    >
      {children}
    </span>
  );
}

/** Cabeçalho padrão de página: eyebrow mono + título editorial. */
export function PageHeader({
  title,
  description,
  eyebrow,
  highlight,
  actions,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  highlight?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="animate-rise mb-8">
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-[clamp(34px,4.2vw,56px)] font-medium leading-[1.02] tracking-[-0.04em] text-fg">
            <EditorialTitle text={title} highlight={highlight} />
          </h1>
          {description && <p className="mt-3 text-[17px] font-light leading-relaxed text-fg-2">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

/** Cartão de indicador. */
export function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  delta,
  spark,
  index,
  className,
  style,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
  delta?: number | null;
  spark?: React.ReactNode;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const c = color ?? "var(--accent)";
  return (
    <div
      className={cn("card-drap card-grid-top group relative overflow-hidden p-5 transition duration-500 ease-[var(--ease)] hover:-translate-y-1", className)}
      style={{ ...style, ["--c" as string]: c }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[var(--radius)] opacity-0 transition duration-500 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${c} 55%, transparent), 0 20px 50px -24px color-mix(in oklab, ${c} calc(var(--c-glow) * 100%), transparent)` }}
      />
      <div className="relative flex items-center justify-between gap-2">
        <p className="eyebrow truncate" title={label}>
          {index != null && <span className="mr-1.5 text-accent-text">{String(index).padStart(2, "0")}</span>}
          {label}
        </p>
        {icon && <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-line bg-well [&>svg]:size-3.5" style={{ color: c }}>{icon}</span>}
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-2">
        <p className="min-w-0 truncate text-[30px] font-medium leading-none tracking-[-0.04em] text-fg">{value}</p>
        {spark && <div className="shrink-0">{spark}</div>}
      </div>
      <div className="relative mt-3 flex min-w-0 items-center gap-2 text-xs text-muted">
        {delta != null && Number.isFinite(delta) && (
          <span
            className={cn(
              "mono-label inline-flex shrink-0 items-center whitespace-nowrap rounded-[6px] border px-1.5 py-0.5 text-[10px]",
              delta > 0 ? "border-[color-mix(in_oklab,var(--ok)_35%,transparent)] text-ok" : delta < 0 ? "border-[color-mix(in_oklab,var(--err)_35%,transparent)] text-err" : "border-line text-muted",
            )}
          >
            {delta > 0 ? "↑" : delta < 0 ? "↓" : "•"} {Math.abs(Math.round(delta))}%
          </span>
        )}
        <span className="truncate">{sub}</span>
      </div>
    </div>
  );
}

/** Título de seção: eyebrow numerada "01 / SEÇÃO" + título editorial. */
export function SectionTitle({ title, description, index, highlight, action }: { title: string; description?: string; index?: number; highlight?: string; action?: React.ReactNode; emoji?: string }) {
  return (
    <div className="mb-5 mt-14 flex flex-wrap items-end justify-between gap-3 first:mt-0">
      <div>
        <Eyebrow className="mb-2">
          {index != null ? `${String(index).padStart(2, "0")} / ` : ""}
          {description ?? title}
        </Eyebrow>
        <h2 className="text-[clamp(26px,2.6vw,36px)] font-medium leading-[1.05] tracking-[-0.035em]">
          <EditorialTitle text={title} highlight={highlight} />
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, color, className, dot }: { children: React.ReactNode; color?: string; className?: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        "mono-label inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-1.5 py-0.5 text-[10px] leading-4",
        !color && "border-line bg-well text-fg-2",
        className,
      )}
      style={color ? { borderColor: `color-mix(in oklab, ${color} 35%, transparent)`, background: `color-mix(in oklab, ${color} 9%, transparent)`, color: `color-mix(in oklab, ${color} 75%, var(--text))` } : undefined}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ background: color ?? "currentColor" }} />}
      {children}
    </span>
  );
}

const AVATAR_TONES = ["var(--accent)", "var(--accent-2)", "var(--ok)", "var(--text-dim)", "var(--err)"];

/** Tom estável derivado do nome (usa apenas tokens do tema). */
export function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length]!;
}

export function Avatar({ name, color, size = 28, ring }: { name: string; color?: string; size?: number; ring?: boolean }) {
  const c = color || colorFor(name || "?");
  return (
    <span
      title={name}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-mono font-medium", ring && "ring-2 ring-[var(--surface-1)]")}
      style={{
        width: size,
        height: size,
        background: `color-mix(in oklab, ${c} 16%, var(--surface-1))`,
        color: `color-mix(in oklab, ${c} 70%, var(--text))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${c} 30%, transparent)`,
        fontSize: Math.max(9, size * 0.36),
      }}
    >
      {initials(name || "?")}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] p-4 pt-[7vh] backdrop-blur-md" onMouseDown={onClose}>
      <div
        className={cn("card-drap card-grid-top animate-in w-full overflow-hidden shadow-pop", wide ? "max-w-3xl" : "max-w-lg")}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="relative flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div>
            <h2 className="text-xl font-medium tracking-[-0.03em]">
              <EditorialTitle text={title} />
            </h2>
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-[var(--radius-sm)] border border-line p-1.5 text-muted transition hover:text-fg" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
        <div className="relative p-6">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Estados e navegação                                                 */
/* ------------------------------------------------------------------ */

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-14 text-center">
      {icon && <div className="mb-4 flex size-12 items-center justify-center rounded-[var(--radius)] border border-line bg-well text-accent-text [&>svg]:size-5">{icon}</div>}
      <p className="text-lg font-medium tracking-[-0.03em]">
        <EditorialTitle text={title} />
      </p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Seletor segmentado (chips mono). */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: React.ReactNode }[] }) {
  return (
    <div className="inline-flex gap-1 rounded-[10px] border border-line bg-surface p-1">
      {items.map((i) => (
        <button
          key={i.value}
          type="button"
          onClick={() => onChange(i.value)}
          className={cn(
            "mono-label rounded-[6px] px-2.5 py-1.5 text-[10.5px] transition",
            value === i.value ? "bg-[var(--chip-active-bg)] text-[var(--chip-active-fg)]" : "text-fg-2 hover:bg-tint",
          )}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

/** Chip de filtro mono com contador. */
export function FilterChip({ active, onClick, children, count, dot }: { active?: boolean; onClick?: () => void; children: React.ReactNode; count?: number; dot?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mono-label inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-[11px] transition duration-300",
        active ? "border-transparent bg-[var(--chip-active-bg)] text-[var(--chip-active-fg)]" : "border-line-strong bg-surface text-fg hover:border-[var(--text-mute)]",
      )}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ background: dot }} />}
      {children}
      {count != null && <span className={active ? "opacity-60" : "text-muted"}>{String(count).padStart(2, "0")}</span>}
    </button>
  );
}

/** Barra de progresso. */
export function Progress({ value, color, className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-surface-3", className)}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? "var(--grad)" }} />
    </div>
  );
}
