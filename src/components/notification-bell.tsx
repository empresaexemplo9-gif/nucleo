"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "./ui";
import { useToast } from "./toast";
import { markNotificationsRead } from "@/actions/commerce";
import { relative } from "@/lib/format";

type N = { id: string; type: string; title: string; body: string | null; href: string | null; read: boolean; at: string };

/** Sino de avisos (aceites de proposta, assinaturas…), atualizado a cada 30 s. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ unread: number; items: N[] }>({ unread: 0, items: [] });
  const seen = useRef<Set<string> | null>(null);
  const toast = useToast();
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { unread: number; items: N[] };
      if (seen.current) {
        const fresh = d.items.filter((n) => !n.read && !seen.current!.has(n.id));
        if (fresh[0]) {
          toast(fresh[0].title);
          router.refresh();
        }
      }
      seen.current = new Set(d.items.map((n) => n.id));
      setData(d);
    } catch {
      /* rede indisponível */
    }
  }, [toast, router]);

  useEffect(() => {
    const first = setTimeout(load, 300);
    const t = setInterval(() => document.visibilityState === "visible" && load(), 30000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Avisos" className="relative flex size-9 items-center justify-center rounded-full border border-line bg-[var(--surface-1)] text-fg-2 transition hover:text-fg">
        <Bell className="size-4" />
        {data.unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--err)] px-1 font-mono text-[9.5px] text-white">{data.unread > 9 ? "9+" : data.unread}</span>
        )}
      </button>
      {open && (
        <div className="card-drap animate-in absolute right-0 z-50 mt-2 w-[min(92vw,380px)] p-1.5 shadow-pop">
          <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1.5">
            <p className="eyebrow text-[10px]">Avisos</p>
            {data.unread > 0 && (
              <button
                onClick={async () => {
                  await markNotificationsRead();
                  load();
                }}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
              >
                <CheckCheck className="size-3.5" /> Marcar todos como lidos
              </button>
            )}
          </div>
          <div className="scroll-thin max-h-[60vh] overflow-y-auto">
            {data.items.map((n) => (
              <button
                key={n.id}
                onClick={async () => {
                  setOpen(false);
                  if (!n.read) await markNotificationsRead([n.id]);
                  load();
                  if (n.href) router.push(n.href);
                }}
                className={cn("flex w-full gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition hover:bg-tint", !n.read && "bg-tint")}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-[var(--accent)]")} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-snug">{n.title}</span>
                  {n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}
                  <span className="block text-[11px] text-muted" suppressHydrationWarning>{relative(n.at)}</span>
                </span>
              </button>
            ))}
            {!data.items.length && <p className="px-3 py-6 text-center text-sm text-muted">Nenhum aviso por enquanto.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
