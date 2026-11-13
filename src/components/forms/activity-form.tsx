"use client";
import { useState } from "react";
import { saveActivity } from "@/actions/crm";
import { Button, cn, Field, Input, Textarea } from "../ui";
import { EntityPicker, MemberSelect, type Option } from "../pickers";
import { useAction } from "../use-action";
import { ACTIVITY_TYPES } from "@/lib/defaults";
import { toDateTimeInput } from "@/lib/format";
import { ActivityIcon } from "../activity-icon";
import { useOrg } from "../org-context";

export type ActivityFormValues = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  dueAt: Date | string | null;
  duration: number | null;
  assigneeId: string | null;
  deal: Option | null;
  contact: Option | null;
  company: Option | null;
};

function defaultDue() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

export function ActivityForm({
  activity,
  defaults,
  onDone,
}: {
  activity?: ActivityFormValues;
  defaults?: { deal?: Option | null; contact?: Option | null; company?: Option | null; record?: Option | null; type?: string };
  onDone: () => void;
}) {
  const { labels, user } = useOrg();
  const { pending, run } = useAction();
  const [type, setType] = useState(activity?.type ?? defaults?.type ?? "CALL");
  const [title, setTitle] = useState(activity?.title ?? "");
  const [touched, setTouched] = useState(!!activity);
  const typeLabel = ACTIVITY_TYPES[type as keyof typeof ACTIVITY_TYPES]?.label ?? "";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (!fd.get("title")) fd.set("title", typeLabel);
        run(() => saveActivity(activity?.id ?? null, fd), { onSuccess: onDone });
      }}
      className="space-y-4"
    >
      <input type="hidden" name="type" value={type} />
      {!activity && defaults?.record && <input type="hidden" name="recordId" value={defaults.record.id} />}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
          <button
            type="button"
            key={k}
            onClick={() => {
              setType(k);
              if (!touched) setTitle("");
            }}
            className={cn(
              "mono-label flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-[10.5px] transition",
              type === k ? "border-transparent bg-[var(--chip-active-bg)] text-[var(--chip-active-fg)]" : "border-line-strong bg-surface text-fg-2 hover:border-[var(--text-mute)]",
            )}
          >
            <ActivityIcon type={k} className="size-3.5" /> {v.label}
          </button>
        ))}
      </div>
      <Field label="Assunto">
        <Input
          name="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTouched(true);
          }}
          placeholder={typeLabel}
          autoFocus
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Field label="Data e hora">
          <Input name="dueAt" type="datetime-local" defaultValue={toDateTimeInput(activity ? activity.dueAt : defaultDue())} />
        </Field>
        <Field label="Duração (min)">
          <Input name="duration" type="number" min={0} step={5} defaultValue={activity?.duration ?? ""} placeholder="30" />
        </Field>
      </div>
      <Field label="Responsável">
        <MemberSelect name="assigneeId" defaultValue={activity?.assigneeId ?? user.id} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={labels.deal.singular}>
          <EntityPicker type="deal" name="dealId" defaultValue={activity?.deal ?? defaults?.deal} />
        </Field>
        <Field label={labels.contact.singular}>
          <EntityPicker type="contact" name="contactId" defaultValue={activity?.contact ?? defaults?.contact} />
        </Field>
        <Field label={labels.company.singular}>
          <EntityPicker type="company" name="companyId" defaultValue={activity?.company ?? defaults?.company} />
        </Field>
      </div>
      <Field label="Descrição / pauta">
        <Textarea name="description" defaultValue={activity?.description ?? ""} />
      </Field>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button loading={pending}>{activity ? "Salvar" : "Agendar"}</Button>
      </div>
    </form>
  );
}
