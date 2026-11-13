import Link from "next/link";
import { Layers } from "lucide-react";
import { Badge, Card, CardHeader } from "./ui";
import { ModuleIcon } from "./module-icon";

export type LinkedRecord = { id: string; href: string; code: string; title: string; module: string; icon: string; color: string; status: { name: string; color: string } | null };

/** Lista de registros de controle interno vinculados (fichas de contato/empresa). */
export function LinkedRecords({ records }: { records: LinkedRecord[] }) {
  if (!records.length) return null;
  return (
    <Card className="p-5">
      <CardHeader icon={<Layers />} title={`Controle interno · ${String(records.length).padStart(2, "0")}`} />
      <ul className="space-y-1">
        {records.map((r) => (
          <li key={r.id}>
            <Link href={r.href} className="-mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2 transition hover:bg-surface-2">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-line bg-surface-2" style={{ color: r.color }}>
                <ModuleIcon name={r.icon} className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{r.title}</span>
                <span className="block truncate font-mono text-[10.5px] text-muted">{r.code} · {r.module}</span>
              </span>
              {r.status && <Badge color={r.status.color} dot>{r.status.name}</Badge>}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
