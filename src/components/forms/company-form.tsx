"use client";
import { saveCompany } from "@/actions/crm";
import { Button, Field, Input, Select } from "../ui";
import { MemberSelect, TagInput } from "../pickers";
import { CustomFieldInputs } from "../custom-fields";
import { useOrg } from "../org-context";
import { useAction } from "../use-action";

export type CompanyFormValues = {
  id: string;
  name: string;
  document: string | null;
  domain: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  ownerId: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
};

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export function CompanyForm({ company, onDone }: { company?: CompanyFormValues; onDone: (id?: string) => void }) {
  const { user } = useOrg();
  const { pending, run } = useAction();
  const c = company;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => saveCompany(c?.id ?? null, fd), { onSuccess: (r) => onDone(r.id) });
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome *" className="sm:col-span-2">
          <Input name="name" required autoFocus defaultValue={c?.name} />
        </Field>
        <Field label="CNPJ / Documento">
          <Input name="document" defaultValue={c?.document ?? ""} />
        </Field>
        <Field label="Segmento">
          <Input name="industry" defaultValue={c?.industry ?? ""} />
        </Field>
        <Field label="Porte (funcionários)">
          <Select name="size" defaultValue={c?.size ?? ""}>
            <option value="">—</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Responsável">
          <MemberSelect name="ownerId" defaultValue={c ? c.ownerId : user.id} allowEmpty />
        </Field>
        <Field label="Telefone">
          <Input name="phone" defaultValue={c?.phone ?? ""} />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" defaultValue={c?.email ?? ""} />
        </Field>
        <Field label="Site">
          <Input name="website" defaultValue={c?.website ?? ""} placeholder="https://" />
        </Field>
        <Field label="Domínio">
          <Input name="domain" defaultValue={c?.domain ?? ""} placeholder="empresa.com.br" />
        </Field>
        <Field label="Endereço" className="sm:col-span-2">
          <Input name="address" defaultValue={c?.address ?? ""} />
        </Field>
        <Field label="Cidade">
          <Input name="city" defaultValue={c?.city ?? ""} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="UF">
            <Input name="state" defaultValue={c?.state ?? ""} maxLength={30} />
          </Field>
          <Field label="País">
            <Input name="country" defaultValue={c?.country ?? "Brasil"} />
          </Field>
        </div>
      </div>
      <Field label="Etiquetas">
        <TagInput defaultValue={c?.tags} />
      </Field>
      <CustomFieldInputs entity="COMPANY" values={c?.customFields} />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={() => onDone()}>
          Cancelar
        </Button>
        <Button loading={pending}>Salvar</Button>
      </div>
    </form>
  );
}
