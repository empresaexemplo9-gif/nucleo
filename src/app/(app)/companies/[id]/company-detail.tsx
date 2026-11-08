"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Users, ArrowLeft, Building2, Globe, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { Avatar, Button, Card, CardHeader, colorFor, Modal } from "@/components/ui";
import { CustomFieldValues, InfoRow } from "@/components/custom-fields";
import { TagList } from "@/components/pickers";
import { Feed, type FeedActivity, type FeedEvent, type FeedNote } from "@/components/feed";
import { CompanyForm, type CompanyFormValues } from "@/components/forms/company-form";
import { RelatedDeals, type RelatedDeal } from "@/components/related-deals";
import { useOrg } from "@/components/org-context";
import { useQuickCreate } from "@/components/quick-create";
import { useAction } from "@/components/use-action";
import { deleteCompanies } from "@/actions/crm";
import { date } from "@/lib/format";

export function CompanyDetail({
  company,
  contacts,
  deals,
  feed,
}: {
  company: CompanyFormValues & { createdAt: string };
  contacts: { id: string; name: string; position: string | null; email: string | null; phone: string | null }[];
  deals: RelatedDeal[];
  feed: { activities: FeedActivity[]; notes: FeedNote[]; events: FeedEvent[] };
}) {
  const { labels, member, can } = useOrg();
  const quick = useQuickCreate();
  const [editing, setEditing] = useState(false);
  const { run } = useAction();
  const router = useRouter();
  const self = { id: company.id, label: company.name };
  const site = company.website && (company.website.startsWith("http") ? company.website : `https://${company.website}`);
  return (
    <div className="mx-auto max-w-[1400px] p-4 lg:p-8">
      <Link href="/companies" className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface hover:text-fg">
        <ArrowLeft className="size-4" /> {labels.company.plural}
      </Link>
      <Card className="relative flex flex-wrap items-center gap-5 overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,color-mix(in_oklab,var(--brand)_12%,transparent),color-mix(in_oklab,var(--accent)_5%,transparent)_40%,transparent_65%)]" />
        <span className="relative flex size-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lift" style={{ background: `linear-gradient(140deg, color-mix(in oklab, ${colorFor(company.name)} 80%, white), ${colorFor(company.name)})` }}>
          {company.name[0]}
        </span>
        <div className="relative min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-sm text-muted">{[company.industry, company.city, company.state].filter(Boolean).join(" · ") || "—"}</p>
          <div className="mt-1.5"><TagList tags={company.tags} /></div>
        </div>
        <div className="relative flex flex-wrap gap-2">
          {site && <a href={site} target="_blank" rel="noreferrer"><Button variant="secondary"><Globe className="size-4" /> Site</Button></a>}
          {company.phone && <a href={`tel:${company.phone}`}><Button variant="secondary"><Phone className="size-4" /> Ligar</Button></a>}
          {can("SALES") && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="size-4" /> Editar</Button>}
          {can("MANAGER") && (
            <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => confirm("Excluir esta empresa?") && run(() => deleteCompanies([company.id]), { onSuccess: () => router.push("/companies") })}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader icon={<Building2 />} title="Informações" />
            <InfoRow label="Documento" value={company.document} />
            <InfoRow label="Porte" value={company.size} />
            <InfoRow label="Telefone" value={company.phone} />
            <InfoRow label="E-mail" value={company.email} />
            <InfoRow label="Endereço" value={[company.address, company.city, company.state, company.country].filter(Boolean).join(", ")} />
            <InfoRow label="Responsável" value={member(company.ownerId)?.name} />
            <InfoRow label="Criada em" value={date(company.createdAt)} />
            <CustomFieldValues entity="COMPANY" values={company.customFields} />
          </Card>
          <Card className="p-5">
            <CardHeader
              icon={<Users />}
              title={<>{labels.contact.plural} <span className="font-normal text-muted">({contacts.length})</span></>}
              action={can("SALES") && <Button size="sm" variant="soft" onClick={() => quick("contact", { company: self })}><Plus className="size-3.5" /> Novo</Button>}
            />
            <div className="divide-y divide-line">
              {contacts.map((c) => (
                <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-2 py-2 text-sm hover:text-brand">
                  <Avatar name={c.name} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block truncate text-xs text-muted">{c.position ?? c.email ?? c.phone}</span>
                  </span>
                </Link>
              ))}
              {!contacts.length && <p className="py-2 text-sm text-muted">Nenhum ainda.</p>}
            </div>
          </Card>
          <RelatedDeals deals={deals} defaults={{ company: self }} />
        </div>
        <Feed {...feed} link={{ company: self }} />
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title={`Editar ${labels.company.singular.toLowerCase()}`} wide>
        <CompanyForm company={company} onDone={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
