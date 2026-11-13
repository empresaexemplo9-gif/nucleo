"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, Info, ListChecks, Pencil, Trash2 } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, cn, Eyebrow, Modal } from "@/components/ui";
import { InfoRow } from "@/components/custom-fields";
import { Feed, type FeedActivity, type FeedEvent, type FeedNote } from "@/components/feed";
import { ModuleIcon } from "@/components/module-icon";
import { RecordFieldValue, type Refs } from "@/components/record-fields";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { deleteRecords, setRecordStatus } from "@/actions/modules";
import { date } from "@/lib/format";
import { code, DueBadge, type ModInfo } from "../module-view";
import { RecordForm, type RecordValues } from "../record-form";

type Opt = { id: string; label: string };

export function RecordDetail({
  mod,
  record,
  refs,
  feed,
}: {
  mod: ModInfo;
  record: RecordValues & {
    number: number;
    dueAt: string | null;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    createdBy: string | null;
    contact: Opt | null;
    company: Opt | null;
    canDelete: boolean;
  };
  refs: Refs;
  feed: { activities: FeedActivity[]; notes: FeedNote[]; events: FeedEvent[] };
}) {
  const { member } = useOrg();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const { run, pending } = useAction();
  const owner = member(record.assigneeId);
  const current = mod.statuses.find((s) => s.id === record.statusId);
  const idx = mod.statuses.findIndex((s) => s.id === record.statusId);
  const label = `${code(mod.prefix, record.number)} · ${record.title}`;

  return (
    <div className="w-full px-4 pb-16 pt-8 lg:px-8">
      <Link href={`/m/${mod.key}`} className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface hover:text-fg">
        <ArrowLeft className="size-4" /> {mod.name}
      </Link>

      <Card grid className="relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: current?.color ?? mod.color }} />
        <div className="relative flex flex-wrap items-start gap-5">
          <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-[12px] border border-line bg-surface-2" style={{ color: mod.color }}>
            <ModuleIcon name={mod.icon} className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <Eyebrow className="mb-1.5">{mod.singular} · {code(mod.prefix, record.number)}</Eyebrow>
            <h1 className="text-[clamp(26px,3vw,40px)] font-medium leading-[1.05] tracking-[-0.04em]">{record.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {current && <Badge color={current.color} dot>{current.name}</Badge>}
              <DueBadge dueAt={record.dueAt} isFinal={!!current?.isFinal} />
              {owner && (
                <span className="inline-flex items-center gap-1.5 text-sm text-fg-2">
                  <Avatar name={owner.name} color={owner.avatarColor} size={20} /> {owner.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {mod.canEdit && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="size-4" /> Editar</Button>}
            {record.canDelete && mod.canEdit && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir"
                onClick={() => confirm("Excluir este registro?") && run(() => deleteRecords([record.id]), { onSuccess: () => router.push(`/m/${mod.key}`) })}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* trilha de status */}
        <div className="relative mt-6 flex gap-1.5 overflow-x-auto pb-1">
          {mod.statuses.map((s, i) => {
            const passed = idx >= 0 && i < idx;
            const active = s.id === record.statusId;
            return (
              <button
                key={s.id}
                disabled={!mod.canEdit || pending || active}
                onClick={() => run(() => setRecordStatus(record.id, s.id))}
                className={cn(
                  "group flex min-w-[120px] flex-1 items-center gap-2 rounded-[8px] border px-3 py-2 text-left text-[12.5px] transition",
                  active ? "border-transparent text-white" : passed ? "border-line bg-surface-2 text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg",
                  mod.canEdit && !active && "cursor-pointer",
                )}
                style={active ? { background: s.color } : undefined}
              >
                <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", active ? "border-white/70" : "border-line")} style={passed ? { background: s.color, borderColor: s.color } : undefined}>
                  {(passed || active) && <Check className="size-2.5 text-white" />}
                </span>
                <span className="truncate font-medium">{s.name}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[380px_1fr] 2xl:grid-cols-[460px_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader icon={<ListChecks />} title="Dados do registro" />
            {mod.fields.length ? (
              mod.fields.map((f) => <InfoRow key={f.id} label={f.label} value={<RecordFieldValue f={f} value={record.data[f.key]} refs={refs} />} />)
            ) : (
              <p className="text-sm text-muted">Este módulo ainda não tem campos. {mod.canEdit && "Configure-os em Configurações → Módulos."}</p>
            )}
          </Card>
          <Card className="p-5">
            <CardHeader icon={<Info />} title="Informações" />
            <InfoRow label="Código" value={<span className="font-mono text-xs">{code(mod.prefix, record.number)}</span>} />
            <InfoRow label="Responsável" value={owner?.name} />
            <InfoRow label="Criado por" value={record.createdBy} />
            <InfoRow label="Criado em" value={date(record.createdAt)} />
            <InfoRow label="Atualizado em" value={date(record.updatedAt)} />
            {record.closedAt && <InfoRow label="Concluído em" value={date(record.closedAt)} />}
          </Card>
        </div>
        <Feed {...feed} link={{ record: { id: record.id, label }, contact: record.contact, company: record.company }} />
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={`Editar ${mod.singular.toLowerCase()}`} wide>
        <RecordForm mod={mod} record={record} refs={refs} onDone={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
