"use client";
import { Button, Field, Input, Select } from "@/components/ui";
import { MemberSelect } from "@/components/pickers";
import { RecordFieldInput, type Refs } from "@/components/record-fields";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { createRecord, updateRecord } from "@/actions/modules";
import type { ModInfo } from "./module-view";

export type RecordValues = { id: string; title: string; statusId: string | null; assigneeId: string | null; data: Record<string, unknown> };

/** Formulário de criação/edição de registro de módulo. */
export function RecordForm({ mod, record, refs, onDone }: { mod: ModInfo; record?: RecordValues; refs: Refs; onDone: (id?: string) => void }) {
  const { user } = useOrg();
  const { run, pending } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => (record ? updateRecord(record.id, fd) : createRecord(mod.id, fd)), { onSuccess: (r) => onDone(r.id) });
      }}
      className="space-y-4"
    >
      <Field label="Título *">
        <Input name="title" required autoFocus defaultValue={record?.title} placeholder={`Ex.: ${mod.singular} para cliente X`} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {!record && (
          <Field label="Status inicial">
            <Select name="statusId" defaultValue={mod.statuses[0]?.id}>
              {mod.statuses.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Responsável">
          <MemberSelect name="assigneeId" defaultValue={record ? record.assigneeId : user.id} allowEmpty />
        </Field>
      </div>
      {mod.fields.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {mod.fields.map((f) => (
            <RecordFieldInput key={f.id} f={f} value={record?.data[f.key]} refs={refs} />
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={() => onDone()}>Cancelar</Button>
        <Button trail loading={pending}>Salvar</Button>
      </div>
    </form>
  );
}
