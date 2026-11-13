"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Building2, CalendarCheck, Check, ChevronsUpDown, KanbanSquare, LogOut, Menu, Moon, Plus, Search, Sun, User, X } from "lucide-react";
import { Avatar, Badge, Button, cn } from "./ui";
import { BrandMark } from "./brand-mark";
import { DrapSignature } from "./drap-signature";
import { useOrg } from "./org-context";
import { ModuleIcon } from "./module-icon";
import { QuickCreateProvider, useQuickCreate } from "./quick-create";
import { logout, setTheme, switchOrg } from "@/actions/auth";

export function AppShell({ children, orgs, overdue, dark }: { children: React.ReactNode; orgs: { id: string; name: string }[]; overdue: number; dark: boolean }) {
  const [mobile, setMobile] = useState(false);
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMobile(false);
  }
  return (
    <QuickCreateProvider>
      <div aria-hidden className="bg-grid" />
      <div aria-hidden className="bg-orbs">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden className="bg-noise" />
      <div className="relative flex min-h-screen">
        <aside
          className={cn(
            "glass-nav fixed inset-y-0 left-0 z-40 w-[264px] shrink-0 border-r border-line transition-transform duration-300 ease-[var(--ease)] lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            mobile ? "translate-x-0 bg-[var(--menu-bg)] shadow-pop" : "-translate-x-full",
          )}
        >
          <Sidebar orgs={orgs} overdue={overdue} onClose={() => setMobile(false)} />
        </aside>
        {mobile && <div className="fixed inset-0 z-30 bg-[color-mix(in_oklab,var(--bg)_60%,transparent)] backdrop-blur-sm lg:hidden" onClick={() => setMobile(false)} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMobile(true)} initialDark={dark} />
          <main className="min-w-0 flex-1">{children}</main>
          <AppFooter />
        </div>
      </div>
      <CommandPalette />
    </QuickCreateProvider>
  );
}

function AppFooter() {
  const { org } = useOrg();
  return (
    <footer className="flex h-11 flex-wrap items-center justify-between gap-2 border-t border-line px-4 lg:px-8">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        © {new Date().getFullYear()} {org.name}
      </span>
      <DrapSignature />
    </footer>
  );
}

type NavItem = { href: string; label: string; badge?: number; dot?: string };

function Sidebar({ orgs, overdue, onClose }: { orgs: { id: string; name: string }[]; overdue: number; onClose: () => void }) {
  const { org, labels, settings, can, user, role, modules } = useOrg();
  const pathname = usePathname();
  const quick = useQuickCreate();
  const [switcher, setSwitcher] = useState(false);
  const moduleGroups = new Map<string, NavItem[]>();
  for (const m of modules) moduleGroups.set(m.group, [...(moduleGroups.get(m.group) ?? []), { href: `/m/${m.key}`, label: m.name, dot: m.color }]);
  const groups: { title: string; items: (NavItem | false)[] }[] = [
    { title: "Visão geral", items: [{ href: "/", label: "Painel" }] },
    {
      title: "Vendas",
      items: [
        { href: "/deals", label: labels.deal.plural },
        { href: "/activities", label: labels.activity.plural, badge: overdue },
        settings.modules.products && { href: "/products", label: labels.product.plural },
      ],
    },
    {
      title: "Relacionamento",
      items: [
        { href: "/contacts", label: labels.contact.plural },
        settings.modules.companies && { href: "/companies", label: labels.company.plural },
      ],
    },
    ...[...moduleGroups.entries()].map(([title, items]) => ({ title, items })),
    ...(can("ADMIN") && !modules.length ? [{ title: "Controle interno", items: [{ href: "/settings/modules", label: "Ativar módulos" }] }] : []),
    {
      title: "Análise",
      items: [{ href: "/reports", label: "Relatórios" }, can("MANAGER") && { href: "/settings", label: "Configurações" }],
    },
  ];
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : href === "/settings" ? pathname.startsWith("/settings") && !pathname.startsWith("/settings/profile") && !pathname.startsWith("/settings/modules") : pathname === href || pathname.startsWith(href + "/");
  const roleLabel = { OWNER: "Proprietário", ADMIN: "Administrador", MANAGER: "Gestor", SALES: "Vendedor", VIEWER: "Leitura" }[role];
  let n = 0;

  return (
    <div className="flex h-full flex-col">
      <div className="relative border-b border-line px-4 py-4">
        <button onClick={() => setSwitcher((s) => !s)} className="flex w-full items-center gap-3 rounded-[10px] p-1 text-left transition hover:bg-tint">
          <BrandMark logoUrl={org.logoUrl} name={org.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold tracking-[-0.02em]">{org.name}</span>
            <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">Gestão · CRM</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted" />
        </button>
        <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-1 text-muted lg:hidden" aria-label="Fechar menu">
          <X className="size-4" />
        </button>
        {switcher && (
          <div className="card-drap animate-in absolute left-4 right-4 top-full z-50 mt-1 p-1.5 shadow-pop">
            <p className="eyebrow px-2 pb-1 pt-1 text-[10px]">Suas empresas</p>
            {orgs.map((o) => (
              <button
                key={o.id}
                onClick={() => switchOrg(o.id)}
                className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-tint", o.id === org.id && "font-medium text-accent-text")}
              >
                <span className="truncate">{o.name}</span>
                {o.id === org.id && <Check className="ml-auto size-3.5" />}
              </button>
            ))}
            <div className="my-1 border-t border-line" />
            <Link href="/register" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-fg-2 hover:bg-tint">
              <Plus className="size-3.5" /> Criar nova empresa
            </Link>
          </div>
        )}
      </div>

      {can("SALES") && (
        <div className="px-4 pt-4">
          <Button className="w-full justify-between" trail={<Plus className="size-3.5" />} onClick={() => quick("deal")}>
            Novo {labels.deal.singular.toLowerCase()}
          </Button>
        </div>
      )}

      <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {groups.map((g) => {
          const items = g.items.filter(Boolean) as NavItem[];
          if (!items.length) return null;
          return (
            <div key={g.title}>
              <p className="eyebrow mb-1.5 px-2 text-[10px]">{g.title}</p>
              <div className="space-y-px">
                {items.map((it) => {
                  n += 1;
                  const active = isActive(it.href);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-sm transition duration-300",
                        active ? "bg-[var(--surface-1)] text-fg shadow-[0_0_0_1px_var(--line),0_8px_20px_-14px_var(--shadow)]" : "text-fg-2 hover:bg-tint hover:text-fg",
                      )}
                    >
                      <span className={cn("w-5 font-mono text-[10.5px] tabular-nums", active ? "text-accent-text" : "text-muted")}>{String(n).padStart(2, "0")}</span>
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.dot && !active && <span className="size-1.5 rounded-full opacity-70" style={{ background: it.dot }} />}
                      {active && <span className="size-1.5 rounded-full bg-[var(--accent)]" />}
                      {!!it.badge && (
                        <span className="rounded-[6px] border border-[color-mix(in_oklab,var(--err)_40%,transparent)] bg-[color-mix(in_oklab,var(--err)_10%,transparent)] px-1.5 font-mono text-[10px] text-err">
                          {String(it.badge).padStart(2, "0")}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line p-4">
        <Link href="/settings/profile" className="flex items-center gap-3 rounded-[10px] p-1.5 transition hover:bg-tint">
          <Avatar name={user.name} color={user.avatarColor} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{roleLabel}</span>
          </span>
        </Link>
      </div>
    </div>
  );
}

function Topbar({ onMenu, initialDark }: { onMenu: () => void; initialDark: boolean }) {
  const { user, labels, can, modules } = useOrg();
  const quick = useQuickCreate();
  const [menu, setMenu] = useState<"new" | "user" | null>(null);
  const [dark, setDark] = useState(initialDark);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMenu(null);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const applyTheme = (next: boolean) => {
    setDark(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    root.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setTheme(next ? "dark" : "light");
  };

  return (
    <header className="glass-nav sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line px-4 lg:px-8" ref={ref}>
      <button onClick={onMenu} className="rounded-md p-1.5 text-fg-2 hover:bg-tint lg:hidden" aria-label="Menu">
        <Menu className="size-5" />
      </button>
      <button
        onClick={() => window.dispatchEvent(new Event("open-palette"))}
        className="flex h-10 min-w-0 w-full max-w-sm items-center gap-2.5 rounded-[10px] border border-line-strong bg-[var(--field-bg)] px-3 text-sm text-muted transition hover:border-[var(--text-mute)]"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">Buscar em tudo…</span>
        <kbd className="hidden rounded-[6px] border border-line px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <span className="mono-label hidden items-center gap-2 text-[10px] text-muted xl:flex">
          <span className="dot-ok" /> Todos os sistemas operacionais
        </span>
        <div className="flex items-center rounded-full border border-line-strong bg-surface p-0.5" role="group" aria-label="Tema">
          <button
            onClick={() => applyTheme(false)}
            aria-label="Tema claro"
            aria-pressed={!dark}
            className={cn("flex size-7 items-center justify-center rounded-full transition", !dark ? "bg-[var(--chip-active-bg)] text-[var(--chip-active-fg)]" : "text-muted hover:text-fg")}
          >
            <Sun className="size-3.5" />
          </button>
          <button
            onClick={() => applyTheme(true)}
            aria-label="Tema escuro"
            aria-pressed={dark}
            className={cn("flex size-7 items-center justify-center rounded-full transition", dark ? "bg-[var(--chip-active-bg)] text-[var(--chip-active-fg)]" : "text-muted hover:text-fg")}
          >
            <Moon className="size-3.5" />
          </button>
        </div>
        {can("SALES") && (
          <div className="relative">
            <Button onClick={() => setMenu(menu === "new" ? null : "new")} trail={<Plus className="size-3.5" />}>
              <span className="hidden sm:inline">Criar</span>
            </Button>
            {menu === "new" && (
              <div className="card-drap animate-in absolute right-0 mt-2 w-72 p-1.5 shadow-pop">
                <p className="eyebrow px-2.5 pb-1.5 pt-1.5 text-[10px]">Criar novo</p>
                {(
                  [
                    ["deal", labels.deal.singular, KanbanSquare, "Oportunidade no funil"],
                    ["contact", labels.contact.singular, User, "Pessoa de contato"],
                    ["company", labels.company.singular, Building2, "Organização cliente"],
                    ["activity", labels.activity.singular, CalendarCheck, "Ligação, reunião, tarefa…"],
                  ] as const
                ).map(([k, l, I, d], i) => (
                  <button
                    key={k}
                    onClick={() => {
                      setMenu(null);
                      quick(k);
                    }}
                    className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition hover:bg-tint"
                  >
                    <span className="w-5 font-mono text-[10.5px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <I className="size-4 text-accent-text" />
                    <span>
                      <span className="block text-sm font-medium">{l}</span>
                      <span className="block text-xs text-muted">{d}</span>
                    </span>
                  </button>
                ))}
                {modules.some((m) => m.canEdit) && (
                  <>
                    <p className="eyebrow mt-1 border-t border-line px-2.5 pb-1.5 pt-2.5 text-[10px]">Controle interno</p>
                    <div className="scroll-thin max-h-56 overflow-y-auto">
                      {modules
                        .filter((m) => m.canEdit)
                        .map((m) => (
                          <Link
                            key={m.key}
                            href={`/m/${m.key}?new=1`}
                            onClick={() => setMenu(null)}
                            className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition hover:bg-tint"
                          >
                            <span className="w-5" />
                            <span style={{ color: m.color }}><ModuleIcon name={m.icon} className="size-4" /></span>
                            <span className="text-sm font-medium">{m.singular}</span>
                          </Link>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        <div className="relative">
          <button onClick={() => setMenu(menu === "user" ? null : "user")} className="rounded-full" aria-label="Menu do usuário">
            <Avatar name={user.name} color={user.avatarColor} size={36} />
          </button>
          {menu === "user" && (
            <div className="card-drap animate-in absolute right-0 mt-2 w-64 p-1.5 shadow-pop">
              <div className="flex items-center gap-2.5 border-b border-line px-2.5 pb-2.5 pt-1.5">
                <Avatar name={user.name} color={user.avatarColor} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
              </div>
              <Link href="/settings/profile" onClick={() => setMenu(null)} className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-tint">
                <User className="size-4 text-muted" /> Meu perfil
              </Link>
              <button onClick={() => logout()} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-err hover:bg-tint">
                <LogOut className="size-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

type Hit = { type: string; id: string; label: string; sub?: string | null; href?: string; kind?: string };

function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const { labels, modules } = useOrg();
  const quick = useQuickCreate();

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const o = () => setOpen(true);
    window.addEventListener("keydown", k);
    window.addEventListener("open-palette", o);
    return () => {
      window.removeEventListener("keydown", k);
      window.removeEventListener("open-palette", o);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/lookup?q=${encodeURIComponent(q)}`);
      if (r.ok) {
        setHits(await r.json());
        setIdx(0);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!open) return null;
  const typeLabel: Record<string, string> = { deal: labels.deal.singular, contact: labels.contact.singular, company: labels.company.singular };
  const actions = [
    { label: `Criar ${labels.deal.singular.toLowerCase()}`, run: () => quick("deal") },
    { label: `Criar ${labels.contact.singular.toLowerCase()}`, run: () => quick("contact") },
    { label: `Agendar ${labels.activity.singular.toLowerCase()}`, run: () => quick("activity") },
    ...modules.filter((m) => m.canEdit).slice(0, 4).map((m) => ({ label: `Novo(a) ${m.singular.toLowerCase()}`, run: () => router.push(`/m/${m.key}?new=1`) })),
  ];
  const go = (h: Hit) => {
    setOpen(false);
    setQ("");
    router.push(h.href ?? `/${h.type === "company" ? "companies" : h.type + "s"}/${h.id}`);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] p-4 pt-[12vh] backdrop-blur-md" onMouseDown={() => setOpen(false)}>
      <div className="card-drap animate-in w-full max-w-xl overflow-hidden shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="size-4 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown") setIdx((i) => Math.min(i + 1, hits.length - 1));
              if (e.key === "ArrowUp") setIdx((i) => Math.max(i - 1, 0));
              if (e.key === "Enter" && hits[idx]) go(hits[idx]!);
            }}
            placeholder="Buscar em todo o sistema…"
            className="h-12 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="scroll-thin max-h-[50vh] overflow-y-auto p-2">
          {hits.map((h, i) => (
            <button
              key={h.type + h.id}
              onMouseEnter={() => setIdx(i)}
              onClick={() => go(h)}
              className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition", i === idx && "bg-tint ring-1 ring-line-strong")}
            >
              <span className="w-24 shrink-0"><Badge>{h.kind ?? typeLabel[h.type]}</Badge></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{h.label}</span>
                {h.sub && <span className="block truncate text-xs text-muted">{h.sub}</span>}
              </span>
            </button>
          ))}
          {!hits.length && <p className="px-3 py-4 text-center text-sm text-muted">Nenhum resultado</p>}
          <div className="mt-2 border-t border-line pt-2">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  setOpen(false);
                  a.run();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg-2 hover:bg-tint hover:text-fg"
              >
                <Plus className="size-4" /> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
