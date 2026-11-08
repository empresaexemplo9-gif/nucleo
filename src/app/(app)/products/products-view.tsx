"use client";
import { useState } from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, IconTile, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { deleteProduct, saveProduct } from "@/actions/crm";

type P = { id: string; name: string; sku: string | null; description: string | null; unit: string | null; price: number; active: boolean; uses: number };

export function ProductsView({ products }: { products: P[] }) {
  const { labels, fmt, can } = useOrg();
  const [edit, setEdit] = useState<P | "new" | null>(null);
  const { run, pending } = useAction();
  const cur = edit === "new" ? null : edit;
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 lg:px-8">
      <PageHeader eyebrow="05 / Catálogo"
        icon={<Package />}
        title={labels.product.plural}
        description={`Catálogo de produtos e serviços para compor o valor dos ${labels.deal.plural.toLowerCase()}.`}
        actions={can("MANAGER") && <Button onClick={() => setEdit("new")}><Plus className="size-4" /> {labels.product.singular}</Button>}
      />
      <Card className="overflow-x-auto">
        {products.length ? (
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-left text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Código</th>
                <th className="px-4 py-2.5 text-right font-medium">Preço</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Usos</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-surface-2/60">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <IconTile size={34} className="[&>svg]:size-4"><Package /></IconTile>
                      <div className="min-w-0">
                        <p className="font-medium">{p.name}</p>
                        {p.description && <p className="line-clamp-1 text-xs text-muted">{p.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">{p.sku ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-display font-semibold">{fmt(p.price)}{p.unit && <span className="text-xs font-normal text-muted"> /{p.unit}</span>}</td>
                  <td className="px-4 py-2.5">{p.active ? <Badge color="var(--ok)" dot>Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                  <td className="px-4 py-2.5 text-muted">{p.uses}</td>
                  <td className="px-4 py-2.5 text-right">
                    {can("MANAGER") && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEdit(p)} aria-label="Editar"><Pencil className="size-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => confirm("Excluir produto?") && run(() => deleteProduct(p.id))} aria-label="Excluir"><Trash2 className="size-3.5" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={<Package className="size-6" />} title="Nenhum item cadastrado" description="Cadastre seus produtos ou serviços com preço de tabela." />
        )}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={cur ? "Editar item" : "Novo item"}>
        <form
          key={cur?.id ?? "new"}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => saveProduct(cur?.id ?? null, fd), { onSuccess: () => setEdit(null) });
          }}
          className="space-y-3"
        >
          <Field label="Nome *"><Input name="name" required defaultValue={cur?.name} autoFocus /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Preço"><Input name="price" inputMode="decimal" defaultValue={cur?.price ?? ""} /></Field>
            <Field label="Unidade"><Input name="unit" defaultValue={cur?.unit ?? ""} placeholder="mês, un, h" /></Field>
            <Field label="Código / SKU"><Input name="sku" defaultValue={cur?.sku ?? ""} /></Field>
          </div>
          <Field label="Descrição"><Textarea name="description" defaultValue={cur?.description ?? ""} /></Field>
          <Field label="Status">
            <Select name="active" defaultValue={cur?.active === false ? "false" : "true"}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button loading={pending}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
