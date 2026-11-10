"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Info, ArrowLeft, Building2, Mail, MessageCircle, Pencil, Phone, Trash2 } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, Modal } from "@/components/ui";
import { CustomFieldValues, InfoRow } from "@/components/custom-fields";
import { TagList } from "@/components/pickers";
import { Feed, type FeedActivity, type FeedEvent, type FeedNote } from "@/components/feed";
import { ContactForm, type ContactFormValues } from "@/components/forms/contact-form";
import { RelatedDeals, type RelatedDeal } from "@/components/related-deals";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { deleteContacts } from "@/actions/crm";
import { LIFECYCLES } from "@/lib/defaults";
import { date } from "@/lib/format";

export function ContactDetail({
  contact,
  deals,
  feed,
}: {
  contact: ContactFormValues & { createdAt: string };
  deals: RelatedDeal[];
  feed: { activities: FeedActivity[]; notes: FeedNote[]; events: FeedEvent[] };
}) {
  const { labels, member, can } = useOrg();
  const [editing, setEditing] = useState(false);
  const { run } = useAction();
  const router = useRouter();
  const owner = member(contact.ownerId);
  const wa = (contact.whatsapp || contact.phone)?.replace(/\D/g, "");
  const self = { id: contact.id, label: contact.name };

  return (
    <div className="w-full px-4 pb-16 pt-8 lg:px-8">
      <Link href="/contacts" className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface hover:text-fg">
        <ArrowLeft className="size-4" /> {labels.contact.plural}
      </Link>
      <Card grid className="relative flex flex-wrap items-center gap-5 overflow-hidden p-6">
        <span className="relative rounded-full p-1 ring-1 ring-line"><Avatar name={contact.name} size={64} /></span>
        <div className="relative min-w-0 flex-1">
          <h1 className="text-[clamp(28px,3vw,40px)] font-medium leading-[1.05] tracking-[-0.04em]">{contact.name}</h1>
          <p className="text-sm text-muted">
            {[contact.position, contact.company?.label].filter(Boolean).join(" · ") || "—"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge color="var(--accent-2)" dot>{LIFECYCLES.find((l) => l.value === contact.lifecycle)?.label}</Badge>
            <TagList tags={contact.tags} />
          </div>
        </div>
        <div className="relative flex flex-wrap gap-2">
          {contact.email && (
            <a href={`mailto:${contact.email}`}><Button variant="secondary"><Mail className="size-4" /> E-mail</Button></a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`}><Button variant="secondary"><Phone className="size-4" /> Ligar</Button></a>
          )}
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><Button variant="secondary"><MessageCircle className="size-4 text-ok" /> WhatsApp</Button></a>
          )}
          {can("SALES") && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="size-4" /> Editar</Button>}
          {can("MANAGER") && (
            <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => confirm("Excluir este contato?") && run(() => deleteContacts([contact.id]), { onSuccess: () => router.push("/contacts") })}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr] 2xl:grid-cols-[440px_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader icon={<Info />} title="Informações" />
            <InfoRow label="E-mail" value={contact.email} />
            <InfoRow label="Telefone" value={contact.phone} />
            <InfoRow label="WhatsApp" value={contact.whatsapp} />
            <InfoRow
              label={labels.company.singular}
              value={contact.company && <Link href={`/companies/${contact.company.id}`} className="inline-flex items-center gap-1 text-accent-text underline-offset-4 hover:underline"><Building2 className="size-3.5" />{contact.company.label}</Link>}
            />
            <InfoRow label="Responsável" value={owner?.name} />
            <InfoRow label="Origem" value={contact.source} />
            <InfoRow label="Aniversário" value={contact.birthday ? date(contact.birthday, "pt-BR", { day: "2-digit", month: "long" }) : null} />
            <InfoRow label="Criado em" value={date(contact.createdAt)} />
            <CustomFieldValues entity="CONTACT" values={contact.customFields} />
          </Card>
          <RelatedDeals deals={deals} defaults={{ contact: self, company: contact.company }} />
        </div>
        <Feed {...feed} link={{ contact: self, company: contact.company }} />
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={`Editar ${labels.contact.singular.toLowerCase()}`} wide>
        <ContactForm contact={contact} onDone={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
