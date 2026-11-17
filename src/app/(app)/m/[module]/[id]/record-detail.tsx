"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, Download, FileText, Image as ImageIcon, Info, Link2, ListChecks, Paperclip, Pencil, Plus, Repeat, Star, Trash2, Upload } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, cn, Eyebrow, Modal } from "@/components/ui";
import { InfoRow } from "@/components/custom-fields";
import { Feed, type FeedActivity, type FeedEvent, type FeedNote } from "@/components/feed";
import { ModuleIcon } from "@/components/module-icon";
import { RecordFieldValue, type Refs } from "@/components/record-fields";
import { useOrg } from "@/components/org-context";
import { useAction } from "@/components/use-action";
import { deleteRecordFile, deleteRecords, setRecordCover, setRecordStatus, toggleChecklistItem, uploadRecordFiles } from "@/actions/modules";
import { date } from "@/lib/format";
import { useToast } from "@/components/toast";
import { code, DueBadge, type ModInfo } from "../module-view";
import { RecordForm, type RecordValues } from "../record-form";

type Opt = { id: string; label: string };
export type Backlink = {
  module: { key: string; name: string; singular: string; icon: string; color: string; prefix: string };
  fieldKey: string;
  fieldLabel: string;
  records: { id: string; number: number; title: string; status: { name: string; color: string } | null; dueAt: string | null; amount: number | null; isFinal: boolean }[];
};
type FileInfo = { id: string; name: string; mime: string; size: number };

export function RecordDetail({
  mod,
  record,
  refs,
  feed,
  backlinks,
  files,
  next,
}: {
  backlinks: Backlink[];
  files: FileInfo[];
  next: { id: string; number: number } | null;
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
  const { member, fmt } = useOrg();
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
              mod.fields.filter((f) => f.type !== "CHECKLIST").map((f) => <InfoRow key={f.id} label={f.label} value={<RecordFieldValue f={f} value={record.data[f.key]} refs={refs} />} />)
            ) : (
              <p className="text-sm text-muted">Este módulo ainda não tem campos. {mod.canEdit && "Configure-os em Configurações → Módulos."}</p>
            )}
          </Card>
          {mod.fields.filter((f) => f.type === "CHECKLIST").map((f) => (
            <Checklist key={f.id} recordId={record.id} fieldKey={f.key} label={f.label} items={f.options} done={Array.isArray(record.data[f.key]) ? (record.data[f.key] as string[]) : []} canEdit={mod.canEdit} />
          ))}
          <Attachments recordId={record.id} files={files} canEdit={mod.canEdit} />
          <Card className="p-5">
            <CardHeader icon={<Info />} title="Informações" />
            <InfoRow label="Código" value={<span className="font-mono text-xs">{code(mod.prefix, record.number)}</span>} />
            <InfoRow label="Responsável" value={owner?.name} />
            <InfoRow label="Criado por" value={record.createdBy} />
            <InfoRow label="Criado em" value={date(record.createdAt)} />
            <InfoRow label="Atualizado em" value={date(record.updatedAt)} />
            {record.closedAt && <InfoRow label="Concluído em" value={date(record.closedAt)} />}
            {mod.recurrenceFieldKey && !!record.data[mod.recurrenceFieldKey] && (
              <InfoRow
                label="Repetição"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Repeat className="size-3.5" /> {String(record.data[mod.recurrenceFieldKey])}
                    {next && <Link href={`/m/${mod.key}/${next.id}`} className="text-accent-text hover:underline">→ {code(mod.prefix, next.number)}</Link>}
                  </span>
                }
              />
            )}
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          {backlinks.map((b) => (
            <Card key={b.module.key + b.fieldKey} className="p-5">
              <CardHeader
                icon={<ModuleIcon name={b.module.icon} />}
                title={`${b.module.name} · ${String(b.records.length).padStart(2, "0")}`}
                description={`vinculados por “${b.fieldLabel}”`}
                action={
                  <Link href={`/m/${b.module.key}?new=1&f_${b.fieldKey}=${record.id}`}>
                    <Button size="sm" variant="secondary"><Plus className="size-3.5" /> {b.module.singular}</Button>
                  </Link>
                }
              />
              {b.records.length ? (
                <div className="divide-y divide-line rounded-[10px] border border-line">
                  {b.records.map((r) => (
                    <Link key={r.id} href={`/m/${b.module.key}/${r.id}`} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm transition hover:bg-tint">
                      <span className="font-mono text-[11px] text-muted">{code(b.module.prefix, r.number)}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
                      {r.amount != null && <span className="tabular-nums text-fg-2">{fmt(r.amount)}</span>}
                      <DueBadge dueAt={r.dueAt} isFinal={r.isFinal} />
                      {r.status && <Badge color={r.status.color} dot>{r.status.name}</Badge>}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-muted"><Link2 className="size-3.5" /> Nenhum registro vinculado ainda.</p>
              )}
            </Card>
          ))}
          <Feed {...feed} link={{ record: { id: record.id, label }, contact: record.contact, company: record.company }} />
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={`Editar ${mod.singular.toLowerCase()}`} wide>
        <RecordForm mod={mod} record={record} refs={refs} onDone={() => setEditing(false)} />
      </Modal>
    </div>
  );
}

/** Checklist da ficha: cada item é marcado na hora (sem abrir o formulário). */
function Checklist({ recordId, fieldKey, label, items, done, canEdit }: { recordId: string; fieldKey: string; label: string; items: string[]; done: string[]; canEdit: boolean }) {
  const { run } = useAction();
  const [checked, setChecked] = useState(new Set(done));
  const pct = Math.round((checked.size / Math.max(1, items.length)) * 100);
  return (
    <Card className="p-5">
      <CardHeader icon={<ListChecks />} title={label} description={`${checked.size} de ${items.length} · ${pct}%`} />
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-tint"><div className="h-full rounded-full bg-[var(--ok)] transition-all" style={{ width: `${pct}%` }} /></div>
      <div className="space-y-1">
        {items.map((it) => (
          <label key={it} className={cn("flex items-start gap-2.5 rounded-md px-1.5 py-1 text-sm", canEdit && "cursor-pointer hover:bg-tint")}>
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={checked.has(it)}
              onChange={(e) => {
                const n = new Set(checked);
                if (e.target.checked) n.add(it);
                else n.delete(it);
                setChecked(n);
                run(() => toggleChecklistItem(recordId, fieldKey, it, e.target.checked), { onError: () => setChecked(checked) });
              }}
              className="mt-0.5 accent-[var(--ok)]"
            />
            <span className={cn(checked.has(it) && "text-muted line-through")}>{it}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}

const readAsDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });

/** Fotos e documentos do registro (a primeira imagem é a capa). */
function Attachments({ recordId, files, canEdit }: { recordId: string; files: FileInfo[]; canEdit: boolean }) {
  const { run, pending } = useAction();
  const toast = useToast();
  const images = files.filter((f) => f.mime.startsWith("image/"));
  const docs = files.filter((f) => !f.mime.startsWith("image/"));
  const [view, setView] = useState<string | null>(null);
  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    const big = [...list].find((f) => f.size > 10 * 1024 * 1024);
    if (big) return toast(`${big.name} passa de 10 MB`, "error");
    const payload = await Promise.all([...list].map(async (f) => ({ name: f.name, dataUrl: await readAsDataUrl(f) })));
    run(() => uploadRecordFiles(recordId, payload));
  };
  const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  return (
    <Card className="p-5">
      <CardHeader
        icon={<Paperclip />}
        title={`Fotos e anexos · ${String(files.length).padStart(2, "0")}`}
        action={
          canEdit && (
            <label className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-btn,10px)] border border-line-strong px-2.5 py-1.5 text-xs font-medium transition hover:border-[var(--text-mute)]", pending && "pointer-events-none opacity-60")}>
              <Upload className="size-3.5" /> {pending ? "Enviando…" : "Enviar"}
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            </label>
          )
        }
      />
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((f, i) => (
            <div key={f.id} className="group relative aspect-square overflow-hidden rounded-[8px] border border-line bg-surface-2">
              <button type="button" onClick={() => setView(f.id)} className="block size-full" aria-label={`Ver ${f.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/files/${f.id}`} alt={f.name} loading="lazy" className="size-full object-cover" />
              </button>
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">capa</span>}
              {canEdit && (
                <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
                  {i > 0 && <button type="button" onClick={() => run(() => setRecordCover(f.id))} className="rounded bg-black/60 p-1 text-white" aria-label="Usar como capa"><Star className="size-3" /></button>}
                  <button type="button" onClick={() => confirm("Remover esta foto?") && run(() => deleteRecordFile(f.id))} className="rounded bg-black/60 p-1 text-white" aria-label="Remover"><Trash2 className="size-3" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className={cn("divide-y divide-line rounded-[10px] border border-line", images.length && "mt-3")}>
          {docs.map((f) => (
            <div key={f.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-muted" />
              <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:text-accent-text">{f.name}</a>
              <span className="text-xs text-muted">{kb(f.size)}</span>
              <a href={`/api/files/${f.id}?download=1`} aria-label="Baixar"><Download className="size-3.5 text-muted hover:text-fg" /></a>
              {canEdit && <button type="button" onClick={() => confirm("Remover este anexo?") && run(() => deleteRecordFile(f.id))} aria-label="Remover"><Trash2 className="size-3.5 text-muted hover:text-err" /></button>}
            </div>
          ))}
        </div>
      )}
      {!files.length && <p className="flex items-center gap-1.5 text-sm text-muted"><ImageIcon className="size-3.5" /> Fotos do serviço, laudos, documentos, plantas…</p>}
      <Modal open={!!view} onClose={() => setView(null)} title={files.find((f) => f.id === view)?.name ?? "Foto"} wide>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {view && <img src={`/api/files/${view}`} alt="" className="mx-auto max-h-[70vh] rounded-[8px]" />}
      </Modal>
    </Card>
  );
}
