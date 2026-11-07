"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  ChevronsUpDown,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Plus,
  Search,
  Settings,
  Sun,
  User,
  Users,
  X,
  Briefcase,
} from "lucide-react";
import { Avatar, cn } from "./ui";
import { useOrg } from "./org-context";
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
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-60 shrink-0 border-r border-line bg-surface transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            mobile ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar orgs={orgs} overdue={overdue} onClose={() => setMobile(false)} />
        </aside>
        {mobile && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobile(false)} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMobile(true)} initialDark={dark} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
      <CommandPalette />
    </QuickCreateProvider>
  );
}

function Sidebar({ orgs, overdue, onClose }: { orgs: { id: string; name: string }[]; overdue: number; onClose: () => void }) {
  const { org, labels, settings, can } = useOrg();
  const pathname = usePathname();
  const [switcher, setSwitcher] = useState(false);
  const nav = [
    { href: "/", label: "Painel", icon: LayoutDashboard },
    { href: "/deals", label: labels.deal.plural, icon: KanbanSquare },
    { href: "/contacts", label: labels.contact.plural, icon: Users },
    settings.modules.companies && { href: "/companies", label: labels.company.plural, icon: Building2 },
    { href: "/activities", label: labels.activity.plural, icon: CalendarCheck, badge: overdue },
    settings.modules.products && { href: "/products", label: labels.product.plural, icon: Package },
    { href: "/reports", label: "Relatórios", icon: BarChart3 },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Users; badge?: number }[];

  return (
    <div className="flex h-full flex-col">
      <div className="relative border-b border-line p-3">
        <button onClick={() => setSwitcher((s) => !s)} className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-surface-2">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt="" className="size-8 rounded-lg object-contain" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">{org.name[0]}</span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{org.name}</span>
          <ChevronsUpDown className="size-4 text-muted" />
        </button>
        <button onClick={onClose} className="absolute right-2 top-2 rounded p-1 text-muted lg:hidden" aria-label="Fechar menu">
          <X className="size-4" />
        </button>
        {switcher && (
          <div className="animate-in absolute left-3 right-3 top-full z-50 mt-1 rounded-lg border border-line bg-surface p-1 shadow-xl">
            <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">Suas empresas</p>
            {orgs.map((o) => (
              <button
                key={o.id}
                onClick={() => switchOrg(o.id)}
                className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2", o.id === org.id && "font-semibold text-brand")}
              >
                <Briefcase className="size-3.5" /> {o.name}
              </button>
            ))}
            <Link href="/register" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface-2">
              <Plus className="size-3.5" /> Criar nova empresa
            </Link>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition",
                active ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <n.icon className="size-4" />
              <span className="flex-1">{n.label}</span>
              {!!n.badge && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">{n.badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        {can("MANAGER") && (
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium",
              pathname.startsWith("/settings") ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Settings className="size-4" /> Configurações
          </Link>
        )}
      </div>
    </div>
  );
}

function Topbar({ onMenu, initialDark }: { onMenu: () => void; initialDark: boolean }) {
  const { user, labels, can } = useOrg();
  const quick = useQuickCreate();
  const [menu, setMenu] = useState<"new" | "user" | null>(null);
  const [dark, setDark] = useState(initialDark);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMenu(null);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    setTheme(next ? "dark" : "light");
  };
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur" ref={ref}>
      <button onClick={onMenu} className="rounded-md p-1.5 text-muted hover:bg-surface-2 lg:hidden" aria-label="Menu">
        <Menu className="size-5" />
      </button>
      <button
        onClick={() => window.dispatchEvent(new Event("open-palette"))}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 text-sm text-muted hover:border-brand/40"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">Buscar {labels.deal.plural.toLowerCase()}, {labels.contact.plural.toLowerCase()}…</span>
        <kbd className="hidden rounded border border-line bg-surface px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1.5">
        {can("SALES") && (
          <div className="relative">
            <button
              onClick={() => setMenu(menu === "new" ? null : "new")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-medium text-white shadow-sm hover:brightness-110"
            >
              <Plus className="size-4" /> <span className="hidden sm:inline">Novo</span>
            </button>
            {menu === "new" && (
              <div className="animate-in absolute right-0 mt-1 w-52 rounded-lg border border-line bg-surface p-1 shadow-xl">
                {(
                  [
                    ["deal", labels.deal.singular, KanbanSquare],
                    ["contact", labels.contact.singular, User],
                    ["company", labels.company.singular, Building2],
                    ["activity", labels.activity.singular, CalendarCheck],
                  ] as const
                ).map(([k, l, I]) => (
                  <button
                    key={k}
                    onClick={() => {
                      setMenu(null);
                      quick(k);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface-2"
                  >
                    <I className="size-4 text-muted" /> {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button onClick={toggleTheme} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Alternar tema">
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <div className="relative">
          <button onClick={() => setMenu(menu === "user" ? null : "user")} className="rounded-full" aria-label="Menu do usuário">
            <Avatar name={user.name} color={user.avatarColor} size={32} />
          </button>
          {menu === "user" && (
            <div className="animate-in absolute right-0 mt-1 w-56 rounded-lg border border-line bg-surface p-1 shadow-xl">
              <div className="border-b border-line px-2.5 py-2">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <Link href="/settings/profile" onClick={() => setMenu(null)} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-surface-2">
                <User className="size-4 text-muted" /> Meu perfil
              </Link>
              <button onClick={() => logout()} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-red-600 hover:bg-surface-2">
                <LogOut className="size-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

type Hit = { type: string; id: string; label: string; sub?: string | null };

function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const { labels } = useOrg();
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
  ];
  const go = (h: Hit) => {
    setOpen(false);
    setQ("");
    router.push(`/${h.type === "company" ? "companies" : h.type + "s"}/${h.id}`);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div className="animate-in w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
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
            placeholder="Buscar em todo o CRM…"
            className="h-12 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="scroll-thin max-h-[50vh] overflow-y-auto p-2">
          {hits.map((h, i) => (
            <button
              key={h.type + h.id}
              onMouseEnter={() => setIdx(i)}
              onClick={() => go(h)}
              className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", i === idx && "bg-surface-2")}
            >
              <span className="w-20 shrink-0 text-[11px] font-medium uppercase text-muted">{typeLabel[h.type]}</span>
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
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg"
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
