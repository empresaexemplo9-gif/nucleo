import "server-only";
import { db } from "./db";
import type { FeedActivity, FeedEvent, FeedNote } from "@/components/feed";

/** Carrega atividades, notas e eventos de um registro, já serializados. */
export async function loadFeed(where: { dealId?: string; contactId?: string; companyId?: string; recordId?: string }) {
  const [activities, notes, events] = await Promise.all([
    db.activity.findMany({
      where,
      orderBy: { dueAt: "asc" },
      include: { deal: { select: { id: true, title: true } }, contact: { select: { id: true, name: true } }, company: { select: { id: true, name: true } } },
    }),
    db.note.findMany({ where, orderBy: { createdAt: "desc" } }),
    db.timelineEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  return {
    activities: activities.map(serializeActivity),
    notes: notes.map<FeedNote>((n) => ({ id: n.id, content: n.content, pinned: n.pinned, createdAt: n.createdAt.toISOString(), authorId: n.authorId })),
    events: events.map<FeedEvent>((e) => ({ id: e.id, type: e.type, data: (e.data ?? {}) as Record<string, string>, createdAt: e.createdAt.toISOString(), userId: e.userId })),
  };
}

type ActivityWithLinks = Awaited<ReturnType<typeof db.activity.findMany<{ include: { deal: { select: { id: true; title: true } }; contact: { select: { id: true; name: true } }; company: { select: { id: true; name: true } } } }>>>[number];

export function serializeActivity(a: ActivityWithLinks): FeedActivity {
  return {
    id: a.id,
    type: a.type,
    title: a.title,
    description: a.description,
    dueAt: a.dueAt?.toISOString() ?? null,
    duration: a.duration,
    assigneeId: a.assigneeId,
    done: a.done,
    doneAt: a.doneAt?.toISOString() ?? null,
    deal: a.deal ? { id: a.deal.id, label: a.deal.title } : null,
    contact: a.contact ? { id: a.contact.id, label: a.contact.name } : null,
    company: a.company ? { id: a.company.id, label: a.company.name } : null,
  };
}
