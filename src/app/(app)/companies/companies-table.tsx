"use client";
import Link from "next/link";
import { useState } from "react";
import { Building2, Download, Plus, Trash2 } from "lucide-react";
import { Avatar, Button, Card, colorFor, EmptyState, PageHeader, Select } from "@/components/ui";
import { TagList } from "@/components/pickers";
import { Pagination, SearchBox, useParamSetter } from "@/components/list-toolbar";
import { useOrg } from "@/components/org-context";
import { useQuickCreate } from "@/components/quick-create";
import { useAction } from "@/components/use-action";
import { deleteCompanies } from "@/actions/crm";

type Row = { id: string; name: string; industry: string | null; city: string | null; phone: string | null; ownerId: string | null; tags: string[]; contacts: number; openDeals: number };

export function CompaniesTable({ rows, total, page, pageSize, filters }: { rows: Row[]; total: number; page: number; pageSize: number; filters: Record<string, string> }) {
  const { labels, members, member, tags, can } = useOrg();
  const set = useParamSetter();
  const quick = useQuickCreate();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const { run, pending } = useAction();
  const ids = Array.from(sel);
  return (
    <div className="mx-auto max-w-[1400px] p-4 lg:p-8">
      <PageHeader
        icon={<Building2 />}
        title={labels.company.plural}
        description={`${total} ${total === 1 ? "registro" : "registros"} · organizações clientes e prospects`}
        actions={
          <>
            <a href="/api/export/companies" download><Button variant="secondary"><Download className="size-4" /> Exportar</Button></a>
            {can("SALES") && <Button onClick={() => quick("company")}><Plus className="size-4" /> {labels.company.singular}</Button>}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox initial={filters.q!} placeholder="Nome, CNPJ, cidade…" />
        <Select value={filters.owner} onChange={(e) => set("owner", e.target.value)} className="w-auto">
          <option value="">Responsável</option>
          <option value="me">Minhas</option>
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
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2 text-sm">
          <b>{ids.length} selecionada(s)</b>
          <Button size="sm" variant="danger" loading={pending} onClick={() => confirm("Excluir as empresas selecionadas?") && run(() => deleteCompanies(ids), { onSuccess: () => setSel(new Set()) })}>
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
                <th className="px-3 py-3 font-medium">Segmento</th>
                <th className="px-3 py-3 font-medium">Cidade</th>
                <th className="px-3 py-3 font-medium">{labels.contact.plural}</th>
                <th className="px-3 py-3 font-medium">{labels.deal.plural} abertos</th>
                <th className="px-3 py-3 font-medium">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const owner = member(r.ownerId);
                return (
                  <tr key={r.id} className="transition hover:bg-brand/[0.03]">
                    <td className="px-3">
                      <input type="checkbox" className="accent-brand" checked={sel.has(r.id)} onChange={(e) => { const n = new Set(sel); if (e.target.checked) n.add(r.id); else n.delete(r.id); setSel(n); }} />
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/companies/${r.id}`} className="flex items-center gap-2 font-medium hover:text-brand">
                        <span className="flex size-9 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: `linear-gradient(140deg, color-mix(in oklab, ${colorFor(r.name)} 80%, white), ${colorFor(r.name)})` }}>{r.name[0]}</span>
                        {r.name}
                      </Link>
                      <TagList tags={r.tags} />
                    </td>
                    <td className="px-3 py-3 text-muted">{r.industry ?? "—"}</td>
                    <td className="px-3 py-3 text-muted">{r.city ?? "—"}</td>
                    <td className="px-3 py-3 text-center">{r.contacts || "—"}</td>
                    <td className="px-3 py-3 text-center">{r.openDeals || "—"}</td>
                    <td className="px-3 py-3">{owner ? <span className="flex items-center gap-1.5"><Avatar name={owner.name} color={owner.avatarColor} size={20} /> {owner.name}</span> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={<Building2 className="size-6" />} title={`Nenhuma ${labels.company.singular.toLowerCase()} encontrada`} action={can("SALES") && <Button onClick={() => quick("company")}><Plus className="size-4" /> Adicionar</Button>} />
        )}
      </Card>
      <div className="mt-3 flex justify-end">
        <Pagination page={page} total={total} pageSize={pageSize} />
      </div>
    </div>
  );
}
