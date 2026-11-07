"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button, Input } from "./ui";

export function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  };
}

export function SearchBox({ initial, placeholder = "Buscar…" }: { initial: string; placeholder?: string }) {
  const set = useParamSetter();
  const [q, setQ] = useState(initial);
  useEffect(() => {
    if (q === initial) return;
    const t = setTimeout(() => set("q", q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="w-56 pl-8" />
    </div>
  );
}

export function Pagination({ page, total, pageSize }: { page: number; total: number; pageSize: number }) {
  const set = useParamSetter();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="text-xs text-muted">{total} registro(s)</p>;
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span>
        {total} registros · página {page} de {pages}
      </span>
      <Button size="icon" variant="secondary" disabled={page <= 1} onClick={() => set("page", String(page - 1))} aria-label="Anterior">
        <ChevronLeft className="size-4" />
      </Button>
      <Button size="icon" variant="secondary" disabled={page >= pages} onClick={() => set("page", String(page + 1))} aria-label="Próxima">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
