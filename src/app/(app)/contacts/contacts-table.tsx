"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Download, Plus, Trash2, Upload, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, EmptyState, FilterChip, Modal, PageHeader, Select } from "@/components/ui";
import { TagList } from "@/components/pickers";
import { Pagination, SearchBox, useParamSetter } from "@/components/list-toolbar";
import { useOrg } from "@/components/org-context";
import { useQuickCreate } from "@/components/quick-create";
import { useAction } from "@/components/use-action";
import { deleteContacts, importContacts } from "@/actions/crm";
import { LIFECYCLES } from "@/lib/defaults";
import { date } from "@/lib/format";
import { parseCsv } from "@/lib/csv";

type Row = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  lifecycle: string;
  ownerId: string | null;
  tags: string[];
  company: { id: string; name: string } | null;
  openDeals: number;
  createdAt: string;
};

const LC_COLORS: Record<string, string> = { lead: "var(--text-mute)", mql: "var(--accent-2)", sql: "var(--accent)", customer: "var(--ok)", evangelist: "var(--accent-text)", churned: "var(--err)" };

export function ContactsTable({ rows, total, page, pageSize, filters, lifecycleCounts }: { rows: Row[]; total: number; page: number; pageSize: number; filters: Record<string, string>; lifecycleCounts: Record<string, number> }) {
  const { labels, members, tags, member, can } = useOrg();
  const set = useParamSetter();
  const quick = useQuickCreate();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const { run, pending } = useAction();
  const ids = Array.from(sel);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-8 lg:px-8">
      <PageHeader eyebrow="02 / Relacionamento"
        icon={<Users />}
        title={labels.contact.plural}
        description={`${total} ${total === 1 ? "registro" : "registros"} · pessoas com quem sua equipe se relaciona`}
        actions={
          <>
            <a href="/api/export/contacts" download>
              <Button variant="secondary"><Download className="size-4" /> Exportar</Button>
            </a>
            {can("SALES") && (
              <>
                <Button variant="secondary" onClick={() => setImporting(true)}><Upload className="size-4" /> Importar</Button>
                <Button onClick={() => quick("contact")}><Plus className="size-4" /> {labels.contact.singular}</Button>
              </>
            )}
          </>
        }
      />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {[{ value: "", label: "Todos" }, ...LIFECYCLES].map((l) => {
          const active = filters.lifecycle === l.value;
          const color = l.value ? LC_COLORS[l.value]! : "var(--brand)";
          const count = l.value ? lifecycleCounts[l.value] ?? 0 : Object.values(lifecycleCounts).reduce((a, b) => a + b, 0);
          return (
            <FilterChip key={l.value || "all"} active={active} onClick={() => set("lifecycle", l.value)} count={count} dot={l.value ? color : undefined}>
              {l.label}
            </FilterChip>
          );
        })}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox initial={filters.q!} placeholder="Nome, e-mail, telefone…" />
        <Select value={filters.owner} onChange={(e) => set("owner", e.target.value)} className="w-auto">
          <option value="">Responsável</option>
          <option value="me">Meus</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </Select>
        {tags.length > 0 && (
          <Select value={filters.tag} onChange={(e) => set("tag", e.target.value)} className="w-auto">
            <option value="">Etiqueta</option>
            {tags.map((t) => (
              <option key={t.name}>{t.name}</option>
            ))}
          </Select>
        )}
      </div>

      {ids.length > 0 && can("MANAGER") && (
        <div className="card-drap mb-3 flex items-center gap-3 px-3 py-2 text-sm">
          <b>{ids.length} selecionado(s)</b>
          <Button size="sm" variant="danger" loading={pending} onClick={() => confirm("Excluir os contatos selecionados?") && run(() => deleteContacts(ids), { onSuccess: () => setSel(new Set()) })}>
            <Trash2 className="size-3.5" /> Excluir
          </Button>
        </div>
      )}

      <Card className="overflow-x-auto">
        {rows.length ? (
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-left text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" className="accent-brand" checked={sel.size === rows.length} onChange={(e) => setSel(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
                </th>
                <th className="px-3 py-3 font-medium">Nome</th>
                <th className="px-3 py-3 font-medium">{labels.company.singular}</th>
                <th className="px-3 py-3 font-medium">Contato</th>
                <th className="px-3 py-3 font-medium">Ciclo</th>
                <th className="px-3 py-3 font-medium">{labels.deal.plural} abertos</th>
                <th className="px-3 py-3 font-medium">Responsável</th>
                <th className="px-3 py-3 font-medium">Criado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const owner = member(r.ownerId);
                const lc = LIFECYCLES.find((l) => l.value === r.lifecycle);
                return (
                  <tr key={r.id} className="transition hover:bg-brand/[0.03]">
                    <td className="px-3">
                      <input
                        type="checkbox"
                        className="accent-brand"
                        checked={sel.has(r.id)}
                        onChange={(e) => {
                          const n = new Set(sel);
                          if (e.target.checked) n.add(r.id);
                          else n.delete(r.id);
                          setSel(n);
                        }}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/contacts/${r.id}`} className="flex items-center gap-2 font-medium hover:text-brand">
                        <Avatar name={r.name} size={34} /> <span>{r.name}{r.position && <span className="block text-xs font-normal text-muted">{r.position}</span>}</span>
                      </Link>
                      <TagList tags={r.tags} />
                    </td>
                    <td className="px-3 py-3">{r.company ? <Link href={`/companies/${r.company.id}`} className="hover:text-brand">{r.company.name}</Link> : <span className="text-muted">—</span>}</td>
                    <td className="px-3 py-3 text-muted">
                      <div>{r.email ?? "—"}</div>
                      <div className="text-xs">{r.phone}</div>
                    </td>
                    <td className="px-3 py-3">{lc && <Badge color={LC_COLORS[r.lifecycle]} dot>{lc.label}</Badge>}</td>
                    <td className="px-3 py-3 text-center">{r.openDeals ? <span className="inline-flex min-w-6 justify-center rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">{r.openDeals}</span> : <span className="text-muted">—</span>}</td>
                    <td className="px-3 py-3">{owner ? <span className="flex items-center gap-1.5"><Avatar name={owner.name} color={owner.avatarColor} size={20} /> {owner.name}</span> : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted">{date(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={<Users className="size-6" />}
            title={`Nenhum ${labels.contact.singular.toLowerCase()} encontrado`}
            description="Cadastre manualmente ou importe uma planilha CSV."
            action={can("SALES") && <Button onClick={() => quick("contact")}><Plus className="size-4" /> Adicionar</Button>}
          />
        )}
      </Card>
      <div className="mt-3 flex justify-end">
        <Pagination page={page} total={total} pageSize={pageSize} />
      </div>
      <ImportModal open={importing} onClose={() => setImporting(false)} onImport={(rows) => run(() => importContacts(rows), { onSuccess: () => setImporting(false) })} pending={pending} />
    </div>
  );
}

function ImportModal({ open, onClose, onImport, pending }: { open: boolean; onClose: () => void; onImport: (rows: Record<string, string>[]) => void; pending: boolean }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Modal open={open} onClose={onClose} title="Importar contatos (CSV)" wide>
      <div className="space-y-4 text-sm">
        <p className="text-muted">
          Use um arquivo CSV com cabeçalho. Colunas reconhecidas: <b>nome</b>, <b>email</b>, <b>telefone</b>, <b>whatsapp</b>, <b>cargo</b>, <b>empresa</b>, <b>origem</b>, <b>etiquetas</b>. Empresas inexistentes são criadas automaticamente.
        </p>
        <a
          className="text-brand underline"
          href={"data:text/csv;charset=utf-8," + encodeURIComponent("nome,email,telefone,cargo,empresa,origem,etiquetas\nMaria Silva,maria@acme.com,11999990000,Diretora,Acme,Site,VIP\n")}
          download="modelo-contatos.csv"
        >
          Baixar planilha modelo
        </a>
        <input
          ref={ref}
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-[var(--chip-active-fg)]"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setRows(parseCsv(await f.text()));
          }}
        />
        {rows.length > 0 && (
          <div className="rounded-lg border border-line">
            <p className="border-b border-line px-3 py-2 font-medium">{rows.length} linha(s) encontradas — prévia:</p>
            <div className="max-h-48 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>{Object.keys(rows[0]!).map((k) => <th key={k} className="px-2 py-1 text-left text-muted">{k}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-line">{Object.values(r).map((v, j) => <td key={j} className="px-2 py-1">{v}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!rows.length} loading={pending} onClick={() => onImport(rows)}>Importar {rows.length || ""}</Button>
        </div>
      </div>
    </Modal>
  );
}
