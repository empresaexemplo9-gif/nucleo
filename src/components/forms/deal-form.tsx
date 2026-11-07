"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDeal, updateDeal } from "@/actions/deals";
import { Button, Field, Input, Select } from "../ui";
import { EntityPicker, MemberSelect, TagInput, type Option } from "../pickers";
import { CustomFieldInputs } from "../custom-fields";
import { useOrg } from "../org-context";
import { useAction } from "../use-action";
import { toDateInput } from "@/lib/format";
import { SOURCES } from "@/lib/defaults";

export type DealFormValues = {
  id: string;
  title: string;
  value: number;
  pipelineId: string;
  stageId: string;
  ownerId: string | null;
  expectedClose: string | Date | null;
  source: string | null;
  probability: number | null;
  tags: string[];
  customFields: Record<string, unknown>;
  contact: Option | null;
  company: Option | null;
};

export function DealForm({
  deal,
  defaults,
  onDone,
}: {
  deal?: DealFormValues;
  defaults?: { pipelineId?: string; stageId?: string; contact?: Option | null; company?: Option | null };
  onDone: () => void;
}) {
  const { pipelines, labels, user } = useOrg();
  const router = useRouter();
  const { pending, run } = useAction();
  const [pipelineId, setPipelineId] = useState(deal?.pipelineId ?? defaults?.pipelineId ?? pipelines.find((p) => p.isDefault)?.id ?? pipelines[0]?.id);
  const pipeline = pipelines.find((p) => p.id === pipelineId);
  const [newContact, setNewContact] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null);
        run(() => (deal ? updateDeal(deal.id, fd) : createDeal(fd)), {
          onSuccess: (r) => {
            onDone();
            if (!deal && r.id && fd.get("_open") === "1") router.push(`/deals/${r.id}`);
          },
        });
      }}
      className="space-y-4"
    >
      <Field label="Título *">
        <Input name="title" required autoFocus defaultValue={deal?.title} placeholder={`Ex.: Proposta para Acme`} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Valor">
          <Input name="value" inputMode="decimal" defaultValue={deal ? String(deal.value) : ""} placeholder="0,00" />
        </Field>
        <Field label="Previsão de fechamento">
          <Input name="expectedClose" type="date" defaultValue={toDateInput(deal?.expectedClose)} />
        </Field>
      </div>
      {!deal && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={labels.pipeline.singular}>
            <Select name="pipelineId" value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Etapa">
            <Select name="stageId" defaultValue={defaults?.stageId} key={pipelineId}>
              {pipeline?.stages
                .filter((s) => s.type === "OPEN")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={labels.contact.singular}>
          <EntityPicker type="contact" name="contactId" defaultValue={deal?.contact ?? defaults?.contact} allowCreateName={deal ? undefined : "newContact"} onChange={(o) => setNewContact(!o)} />
        </Field>
        <Field label={labels.company.singular}>
          <EntityPicker type="company" name="companyId" defaultValue={deal?.company ?? defaults?.company} allowCreateName={deal ? undefined : "newCompany"} />
        </Field>
      </div>
      {!deal && newContact && (
        <p className="-mt-2 text-xs text-muted">Dica: digite um nome novo no seletor para criar o {labels.contact.singular.toLowerCase()} na hora.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Responsável">
          <MemberSelect name="ownerId" defaultValue={deal ? deal.ownerId : user.id} allowEmpty />
        </Field>
        <Field label="Origem">
          <Select name="source" defaultValue={deal?.source ?? ""}>
            <option value="">—</option>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
      {deal && (
        <Field label="Probabilidade (%)" hint="Deixe em branco para usar a probabilidade da etapa">
          <Input name="probability" type="number" min={0} max={100} defaultValue={deal.probability ?? ""} />
        </Field>
      )}
      <Field label="Etiquetas">
        <TagInput defaultValue={deal?.tags} />
      </Field>
      <CustomFieldInputs entity="DEAL" values={deal?.customFields} />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        {!deal && (
          <Button type="submit" variant="secondary" name="_open" value="1" loading={pending}>
            Salvar e abrir
          </Button>
        )}
        <Button loading={pending}>Salvar</Button>
      </div>
    </form>
  );
}
