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
  Check,
  ChevronRight,
} from "lucide-react";
import { Avatar, Badge, Button, cn } from "./ui";
import { useOrg } from "./org-context";
import { QuickCreateProvider, useQuickCreate } from "./quick-create";
import { logout, setTheme, switchOrg } from "@/actions/auth";
import { currentHour } from "@/lib/format";

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
      <div className="app-canvas flex min-h-screen">
        <aside
          className={cn(
            "sidebar-vivid fixed inset-y-0 left-0 z-40 w-64 shrink-0 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            mobile ? "translate-x-0 shadow-pop" : "-translate-x-full",
          )}
        >
          <Sidebar orgs={orgs} overdue={overdue} onClose={() => setMobile(false)} />
        </aside>
        {mobile && <div className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={() => setMobile(false)} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMobile(true)} initialDark={dark} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
      <CommandPalette />
    </QuickCreateProvider>
  );
}

type NavItem = { href: string; label: string; icon: typeof Users; badge?: number };

function Sidebar({ orgs, overdue, onClose }: { orgs: { id: string; name: string }[]; overdue: number; onClose: () => void }) {
  const { org, labels, settings, can, user, role } = useOrg();
  const pathname = usePathname();
  const quick = useQuickCreate();
  const [switcher, setSwitcher] = useState(false);
  const groups: { title: string; items: (NavItem | false)[] }[] = [
    { title: "Visão geral", items: [{ href: "/", label: "Painel", icon: LayoutDashboard }] },
    {
      title: "Vendas",
      items: [
        { href: "/deals", label: labels.deal.plural, icon: KanbanSquare },
        { href: "/activities", label: labels.activity.plural, icon: CalendarCheck, badge: overdue },
        settings.modules.products && { href: "/products", label: labels.product.plural, icon: Package },
      ],
    },
    {
      title: "Relacionamento",
      items: [
        { href: "/contacts", label: labels.contact.plural, icon: Users },
        settings.modules.companies && { href: "/companies", label: labels.company.plural, icon: Building2 },
      ],
    },
    { title: "Análise", items: [{ href: "/reports", label: "Relatórios", icon: BarChart3 }] },
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const roleLabel = { OWNER: "Proprietário", ADMIN: "Administrador", MANAGER: "Gestor", SALES: "Vendedor", VIEWER: "Leitura" }[role];

  return (
    <div className="flex h-full flex-col">
      <div className="relative px-3 pb-2 pt-3">
        <button
          onClick={() => setSwitcher((s) => !s)}
          className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition hover:bg-white/10"
        >
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt="" className="size-9 rounded-xl bg-white object-contain p-0.5 shadow-lg" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-brand shadow-lg">
              {org.name[0]}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{org.name}</span>
            <span className="block truncate text-[11px] text-[var(--sb-muted)]">{orgs.length > 1 ? `${orgs.length} empresas` : "Espaço de trabalho"}</span>
          </span>
          <ChevronsUpDown className="size-4 text-[var(--sb-muted)]" />
        </button>
        <button onClick={onClose} className="absolute right-2 top-2 rounded-lg p-1 text-white/70 lg:hidden" aria-label="Fechar menu">
          <X className="size-4" />
        </button>
        {switcher && (
          <div className="animate-in absolute left-3 right-3 top-full z-50 mt-1 rounded-xl border border-line bg-surface p-1.5 text-fg shadow-pop">
            <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Suas empresas</p>
            {orgs.map((o) => (
              <button
                key={o.id}
                onClick={() => switchOrg(o.id)}
                className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2", o.id === org.id && "font-semibold text-brand")}
              >
                <Briefcase className="size-3.5" /> <span className="truncate">{o.name}</span>
                {o.id === org.id && <Check className="ml-auto size-3.5" />}
              </button>
            ))}
            <div className="my-1 border-t border-line" />
            <Link href="/register" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-fg">
              <Plus className="size-3.5" /> Criar nova empresa
            </Link>
          </div>
        )}
      </div>

      {can("SALES") && (
        <div className="px-3 pb-2">
          <button
            onClick={() => quick("deal")}
            className="group flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-brand shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.5)]"
          >
            <span className="flex size-5 items-center justify-center rounded-md bg-brand text-white transition group-hover:rotate-90">
              <Plus className="size-3.5" />
            </span>
            Novo {labels.deal.singular.toLowerCase()}
          </button>
        </div>
      )}

      <nav className="scroll-thin flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {groups.map((g) => {
          const items = g.items.filter(Boolean) as NavItem[];
          if (!items.length) return null;
          return (
            <div key={g.title}>
              <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sb-muted)]">{g.title}</p>
              <div className="space-y-0.5">
                {items.map((n) => {
                  const active = isActive(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition",
                        active ? "bg-white/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" : "text-[var(--sb-fg)] hover:bg-white/8",
                      )}
                    >
                      {active && <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" />}
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-lg transition",
                          active ? "bg-white text-brand shadow-md" : "bg-white/10 text-white/80 group-hover:bg-white/15 group-hover:text-white",
                        )}
                      >
                        <n.icon className="size-[15px]" />
                      </span>
                      <span className="flex-1 truncate">{n.label}</span>
                      {!!n.badge && (
                        <span className="min-w-5 animate-pulse rounded-full bg-rose-500 px-1.5 py-px text-center text-[10px] font-bold text-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]">{n.badge}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        {can("MANAGER") && (
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition",
              pathname.startsWith("/settings") && !pathname.startsWith("/settings/profile") ? "bg-white/16 text-white" : "text-[var(--sb-fg)] hover:bg-white/8",
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-white/80">
              <Settings className="size-[15px]" />
            </span>
            Configurações
          </Link>
        )}
        <Link href="/settings/profile" className="flex items-center gap-2.5 rounded-xl bg-white/8 p-2 ring-1 ring-white/10 transition hover:bg-white/12">
          <span className="rounded-full ring-2 ring-white/40"><Avatar name={user.name} color={user.avatarColor} size={32} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-[11px] text-[var(--sb-muted)]">{roleLabel}</span>
          </span>
        </Link>
      </div>
    </div>
  );
}

const TITLES: [string, string][] = [
  ["/deals/", "Detalhes"],
  ["/contacts/", "Detalhes"],
  ["/companies/", "Detalhes"],
  ["/settings", "Configurações"],
  ["/reports", "Relatórios"],
];

function Topbar({ onMenu, initialDark }: { onMenu: () => void; initialDark: boolean }) {
  const { user, labels, can } = useOrg();
  const pathname = usePathname();
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
  const section =
    pathname === "/"
      ? "Painel"
      : pathname.startsWith("/deals")
        ? labels.deal.plural
        : pathname.startsWith("/contacts")
          ? labels.contact.plural
          : pathname.startsWith("/companies")
            ? labels.company.plural
            : pathname.startsWith("/activities")
              ? labels.activity.plural
              : pathname.startsWith("/products")
                ? labels.product.plural
                : TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "";
  const isDetail = /^\/(deals|contacts|companies)\/[^/]+/.test(pathname);
  const hour = currentHour();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <header className="glass sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line/70 px-4 lg:px-8" ref={ref}>
      <button onClick={onMenu} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 lg:hidden" aria-label="Menu">
        <Menu className="size-5" />
      </button>
      <div className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
        <span className="text-muted">{greeting}, {user.name.split(" ")[0]}</span>
        {section && (
          <>
            <ChevronRight className="size-3.5 text-muted/60" />
            <span className={cn("font-medium", isDetail ? "text-muted" : "text-fg")}>{section}</span>
            {isDetail && (
              <>
                <ChevronRight className="size-3.5 text-muted/60" />
                <span className="font-medium text-fg">Detalhes</span>
              </>
            )}
          </>
        )}
      </div>
      <button
        onClick={() => window.dispatchEvent(new Event("open-palette"))}
        className="group flex h-9 w-full max-w-sm items-center gap-2 rounded-[10px] border border-line bg-surface-2/70 px-3 text-sm text-muted transition hover:border-line-strong hover:bg-surface md:ml-auto"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">Buscar em tudo…</span>
        <kbd className="hidden rounded-md border border-line bg-surface px-1.5 py-0.5 font-sans text-[10px] font-medium shadow-soft sm:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1.5 md:ml-0">
        {can("SALES") && (
          <div className="relative">
            <Button onClick={() => setMenu(menu === "new" ? null : "new")} className="h-9">
              <Plus className="size-4" /> <span className="hidden sm:inline">Criar</span>
            </Button>
            {menu === "new" && (
              <div className="animate-in absolute right-0 mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Criar novo</p>
                {(
                  [
                    ["deal", labels.deal.singular, KanbanSquare, "#6366f1", "Oportunidade no funil"],
                    ["contact", labels.contact.singular, User, "#0ea5e9", "Pessoa de contato"],
                    ["company", labels.company.singular, Building2, "#f59e0b", "Organização cliente"],
                    ["activity", labels.activity.singular, CalendarCheck, "#10b981", "Ligação, reunião, tarefa…"],
                  ] as const
                ).map(([k, l, I, c, d]) => (
                  <button
                    key={k}
                    onClick={() => {
                      setMenu(null);
                      quick(k);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-surface-2"
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklab, ${c} 13%, transparent)`, color: c }}>
                      <I className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{l}</span>
                      <span className="block text-xs text-muted">{d}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button onClick={toggleTheme} className="flex size-9 items-center justify-center rounded-[10px] border border-line bg-surface text-muted shadow-soft transition hover:text-fg" aria-label="Alternar tema">
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <div className="relative">
          <button onClick={() => setMenu(menu === "user" ? null : "user")} className="rounded-full ring-2 ring-transparent transition hover:ring-brand/30" aria-label="Menu do usuário">
            <Avatar name={user.name} color={user.avatarColor} size={34} />
          </button>
          {menu === "user" && (
            <div className="animate-in absolute right-0 mt-2 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-pop">
              <div className="flex items-center gap-2.5 border-b border-line px-2.5 pb-2.5 pt-1.5">
                <Avatar name={user.name} color={user.avatarColor} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
              </div>
              <Link href="/settings/profile" onClick={() => setMenu(null)} className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-surface-2">
                <User className="size-4 text-muted" /> Meu perfil
              </Link>
              <button onClick={() => logout()} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-rose-600 hover:bg-rose-500/10">
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
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/45 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div className="animate-in w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
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
              className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition", i === idx && "bg-brand/8 ring-1 ring-brand/15")}
            >
              <span className="w-20 shrink-0"><Badge>{typeLabel[h.type]}</Badge></span>
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
