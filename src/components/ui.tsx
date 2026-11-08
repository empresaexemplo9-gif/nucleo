"use client";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { forwardRef, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { initials } from "@/lib/format";

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

/* ------------------------------------------------------------------ */
/* Botões                                                              */
/* ------------------------------------------------------------------ */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "soft";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] font-medium transition-all duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        size === "sm" && "h-8 px-2.5 text-xs",
        size === "md" && "h-9 px-3.5 text-sm",
        size === "lg" && "h-11 px-5 text-sm",
        size === "icon" && "size-8 text-sm",
        variant === "primary" &&
          "bg-brand text-white shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset,0_1px_2px_rgba(0,0,0,0.12),0_4px_12px_-2px_color-mix(in_oklab,var(--brand)_45%,transparent)] hover:brightness-[1.08]",
        variant === "secondary" && "border border-line bg-surface text-fg shadow-soft hover:border-line-strong hover:bg-surface-2",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
        variant === "soft" && "bg-brand/10 text-brand hover:bg-brand/15",
        variant === "danger" && "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
        variant === "success" && "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Campos                                                              */
/* ------------------------------------------------------------------ */

const field =
  "w-full rounded-[10px] border border-line bg-surface px-3 text-sm text-fg shadow-soft outline-none transition placeholder:text-muted/60 hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/12 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(field, "h-9", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(field, "min-h-20 py-2 leading-relaxed", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(field, "h-9 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
});

export function Label({ children, className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1.5 block text-xs font-medium text-fg-2", className)} {...p}>
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
/* Superfícies                                                         */
/* ------------------------------------------------------------------ */

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface shadow-card", className)} {...p}>
      {children}
    </div>
  );
}

/** Cabeçalho de seção dentro de um Card. */
export function CardHeader({ title, icon, description, action, className }: { title: React.ReactNode; icon?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand [&>svg]:size-3.5">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Ícone em "azulejo" colorido. */
export function IconTile({ children, color, size = 36, className }: { children: React.ReactNode; color?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-xl", !color && "bg-brand/10 text-brand", className)}
      style={{
        width: size,
        height: size,
        ...(color ? { background: `color-mix(in oklab, ${color} 13%, transparent)`, color } : {}),
      }}
    >
      {children}
    </span>
  );
}

/** Cabeçalho padrão de página. */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          {icon && (
            <span className="bg-brand-gradient flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_8px_20px_-6px_color-mix(in_oklab,var(--brand)_60%,transparent)] [&>svg]:size-5">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-bold leading-tight text-fg">{title}</h1>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
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
  className,
  style,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
  delta?: number | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Card className={cn("group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-lift", className)} style={style}>
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-60 blur-2xl transition group-hover:opacity-100"
        style={{ background: `color-mix(in oklab, ${color ?? "var(--brand)"} 18%, transparent)` }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <p className="truncate pt-1 text-xs font-medium text-muted" title={label}>{label}</p>
        {icon && (
          <IconTile color={color} size={30} className="[&>svg]:size-4">
            {icon}
          </IconTile>
        )}
      </div>
      <p className="font-display relative mt-2 truncate text-[22px] font-bold tracking-tight text-fg">{value}</p>
      <div className="relative mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted">
        {delta != null && Number.isFinite(delta) && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              delta > 0 ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : delta < 0 ? "bg-rose-500/12 text-rose-600 dark:text-rose-400" : "bg-surface-2 text-muted",
            )}
          >
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(Math.round(delta))}%
          </span>
        )}
        <span className="truncate">{sub}</span>
      </div>
    </Card>
  );
}

export function Badge({ children, color, className, dot }: { children: React.ReactNode; color?: string; className?: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4",
        !color && "bg-surface-2 text-muted ring-1 ring-inset ring-line",
        className,
      )}
      style={color ? { background: `color-mix(in oklab, ${color} 13%, transparent)`, color, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 22%, transparent)` } : undefined}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ background: color ?? "currentColor" }} />}
      {children}
    </span>
  );
}

const AVATAR_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#3b82f6"];

/** Cor estável derivada do nome. */
export function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

export function Avatar({ name, color, size = 28, ring }: { name: string; color?: string; size?: number; ring?: boolean }) {
  const c = color || colorFor(name || "?");
  return (
    <span
      title={name}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", ring && "ring-2 ring-surface")}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, color-mix(in oklab, ${c} 82%, white), ${c})`,
        fontSize: Math.max(9, size * 0.38),
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
  icon,
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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 pt-[7vh] backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className={cn("animate-in w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-pop", wide ? "max-w-3xl" : "max-w-lg")}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line bg-gradient-to-b from-surface-2/60 to-transparent px-5 py-4">
          <div className="flex items-center gap-3">
            {icon && <IconTile size={34} className="[&>svg]:size-4">{icon}</IconTile>}
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              {description && <p className="text-xs text-muted">{description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Estados e navegação                                                 */
/* ------------------------------------------------------------------ */

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(260px_160px_at_center,black,transparent)]" />
      {icon && (
        <div className="relative mb-4">
          <div className="absolute inset-0 scale-150 rounded-full bg-brand/10 blur-xl" />
          <div className="relative flex size-14 items-center justify-center rounded-2xl border border-line bg-surface text-brand shadow-card [&>svg]:size-6">{icon}</div>
        </div>
      )}
      <p className="relative font-display text-base font-semibold">{title}</p>
      {description && <p className="relative mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: React.ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-[10px] border border-line bg-surface-2 p-0.5">
      {items.map((i) => (
        <button
          key={i.value}
          type="button"
          onClick={() => onChange(i.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            value === i.value ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

/** Barra de progresso. */
export function Progress({ value, color, className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? "linear-gradient(90deg, var(--brand), var(--accent))" }}
      />
    </div>
  );
}
