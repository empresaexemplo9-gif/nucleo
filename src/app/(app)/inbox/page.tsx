import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireContext, requireFeature } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveTemplates } from "@/lib/whatsapp/config";
import { conversationScope } from "@/lib/whatsapp/scope";
import { processScheduled } from "@/lib/whatsapp/service";
import { InboxView, type Filter } from "./inbox-view";

export const metadata = { title: "Atendimento" };

const FILTERS: Filter[] = ["mine", "queue", "bot", "open", "closed"];

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ f?: string; c?: string; q?: string }> }) {
  const ctx = await requireContext();
  requireFeature(ctx, "whatsapp");
  const sp = await searchParams;
  const filter: Filter = FILTERS.includes(sp.f as Filter) ? (sp.f as Filter) : "mine";
  const orgId = ctx.org.id;
  const scope = conversationScope(ctx);
  const byFilter: Record<Filter, Prisma.ConversationWhereInput> = {
    mine: { assigneeId: ctx.user.id, status: { in: ["OPEN", "QUEUE"] } },
    queue: { status: "QUEUE" },
    bot: { status: "BOT" },
    open: { status: { in: ["OPEN", "QUEUE"] } },
    closed: { status: "CLOSED" },
  };
  const q = sp.q?.trim();
  const search: Prisma.ConversationWhereInput = q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { waId: { contains: q.replace(/\D/g, "") || q } }] } : {};
  const base = { orgId, ...scope };
  const [channel, list, counts] = await Promise.all([
    db.whatsAppChannel.findUnique({ where: { orgId }, select: { active: true, templates: true, displayPhone: true } }),
    db.conversation.findMany({ where: { AND: [base, byFilter[filter], search] }, orderBy: { lastMessageAt: "desc" }, take: 100 }),
    Promise.all(FILTERS.map((f) => db.conversation.count({ where: { AND: [base, byFilter[f]] } }))),
  ]);
  const selectedId = sp.c ?? list[0]?.id;
  const selected = selectedId ? await db.conversation.findFirst({ where: { id: selectedId, ...base } }) : null;
  const [messages, contact, deal] = selected
    ? await Promise.all([
        db.whatsAppMessage.findMany({ where: { conversationId: selected.id }, orderBy: { createdAt: "desc" }, take: 200 }).then((m) => m.reverse()),
        selected.contactId ? db.contact.findUnique({ where: { id: selected.contactId }, select: { id: true, name: true, email: true, tags: true, lifecycle: true } }) : null,
        selected.dealId ? db.deal.findUnique({ where: { id: selected.dealId }, select: { id: true, title: true, value: true, status: true, stage: { select: { name: true, color: true } } } }) : null,
      ])
    : [[], null, null];
  // follow-ups vencidos também saem quando a equipe usa a caixa de atendimento
  after(() => processScheduled(10).catch(() => null));
  return (
    <InboxView
      connected={!!channel?.active}
      displayPhone={channel?.displayPhone ?? null}
      templates={resolveTemplates(channel?.templates)}
      filter={filter}
      q={q ?? ""}
      counts={Object.fromEntries(FILTERS.map((f, i) => [f, counts[i]!])) as Record<Filter, number>}
      conversations={list.map((c) => ({
        id: c.id,
        name: c.name,
        waId: c.waId,
        status: c.status,
        assigneeId: c.assigneeId,
        preview: c.preview,
        unread: c.unread,
        lastMessageAt: c.lastMessageAt.toISOString(),
      }))}
      selected={
        selected
          ? {
              id: selected.id,
              name: selected.name,
              waId: selected.waId,
              status: selected.status,
              assigneeId: selected.assigneeId,
              unread: selected.unread,
              lastInboundAt: selected.lastInboundAt?.toISOString() ?? null,
              contact,
              deal: deal ? { id: deal.id, title: deal.title, value: Number(deal.value), status: deal.status, stage: deal.stage.name, color: deal.stage.color } : null,
              messages: messages.map((m) => ({ id: m.id, direction: m.direction, kind: m.kind, body: m.body, status: m.status, error: m.error, authorId: m.authorId, sender: m.sender, at: m.createdAt.toISOString() })),
            }
          : null
      }
    />
  );
}
