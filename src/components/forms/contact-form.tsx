"use client";
import { saveContact } from "@/actions/crm";
import { Button, Field, Input, Select } from "../ui";
import { EntityPicker, MemberSelect, TagInput, type Option } from "../pickers";
import { CustomFieldInputs } from "../custom-fields";
import { useOrg } from "../org-context";
import { useAction } from "../use-action";
import { LIFECYCLES, SOURCES } from "@/lib/defaults";
import { toDateInput } from "@/lib/format";

export type ContactFormValues = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  position: string | null;
  ownerId: string | null;
  source: string | null;
  lifecycle: string;
  birthday: Date | string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  company: Option | null;
};

export function ContactForm({ contact, defaults, onDone }: { contact?: ContactFormValues; defaults?: { company?: Option | null }; onDone: (id?: string) => void }) {
  const { labels, user } = useOrg();
  const { pending, run } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => saveContact(contact?.id ?? null, fd), { onSuccess: (r) => onDone(r.id) });
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome *" className="sm:col-span-2">
          <Input name="name" required autoFocus defaultValue={contact?.name} />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" defaultValue={contact?.email ?? ""} />
        </Field>
        <Field label="Telefone">
          <Input name="phone" type="tel" defaultValue={contact?.phone ?? ""} />
        </Field>
        <Field label="WhatsApp">
          <Input name="whatsapp" type="tel" defaultValue={contact?.whatsapp ?? ""} placeholder="5511999999999" />
        </Field>
        <Field label="Cargo">
          <Input name="position" defaultValue={contact?.position ?? ""} />
        </Field>
        <Field label={labels.company.singular}>
          <EntityPicker type="company" name="companyId" defaultValue={contact?.company ?? defaults?.company} allowCreateName="newCompany" />
        </Field>
        <Field label="Ciclo de vida">
          <Select name="lifecycle" defaultValue={contact?.lifecycle ?? "lead"}>
            {LIFECYCLES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Responsável">
          <MemberSelect name="ownerId" defaultValue={contact ? contact.ownerId : user.id} allowEmpty />
        </Field>
        <Field label="Origem">
          <Select name="source" defaultValue={contact?.source ?? ""}>
            <option value="">—</option>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Aniversário">
          <Input name="birthday" type="date" defaultValue={toDateInput(contact?.birthday)} />
        </Field>
      </div>
      <Field label="Etiquetas">
        <TagInput defaultValue={contact?.tags} />
      </Field>
      <CustomFieldInputs entity="CONTACT" values={contact?.customFields} />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={() => onDone()}>
          Cancelar
        </Button>
        <Button loading={pending}>Salvar</Button>
      </div>
    </form>
  );
}
