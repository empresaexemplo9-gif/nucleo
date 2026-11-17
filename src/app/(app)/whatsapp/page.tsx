import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { hasRole, ownerScope, requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button, Card, EmptyState } from "@/components/ui";
import { Inbox } from "./inbox";

export const metadata = { title: "WhatsApp" };

export default async function WhatsappPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const ctx = await requireContext();
  const { c } = await searchParams;
  const orgId = ctx.org.id;
  const account = await db.whatsappAccount.findUnique({ where: { orgId }, select: { active: true, botEnabled: true } });
  if (!account) {
    return (
      <div className="w-full px-4 pb-16 pt-8 lg:px-8">
        <Card>
          <EmptyState
            icon={<MessageCircle className="size-6" />}
            title="WhatsApp ainda não conectado"
            description="Conecte o número da empresa para conversar com clientes, enviar lembretes e ativar o chatbot."
            action={hasRole(ctx, "ADMIN") ? <Link href="/settings/whatsapp"><Button>Conectar WhatsApp</Button></Link> : <p className="text-sm text-muted">Peça a um administrador para fazer a conexão.</p>}
          />
        </Card>
      </div>
    );
  }
  const own = ownerScope(ctx);
  const where = { orgId, ...(own.ownerId ? { contact: { ownerId: own.ownerId } } : {}) };
  const conversations = await db.whatsappConversation.findMany({ where, orderBy: { lastMessageAt: "desc" }, take: 80, include: { contact: { select: { id: true, name: true } } } });
  const current = c ? (conversations.find((x) => x.id === c) ?? (await db.whatsappConversation.findFirst({ where: { ...where, id: c }, include: { contact: { select: { id: true, name: true } } } }))) : null;
  const messages = current ? (await db.whatsappMessage.findMany({ where: { conversationId: current.id }, orderBy: { createdAt: "desc" }, take: 120 })).reverse() : [];
  const list = current && !conversations.some((x) => x.id === current.id) ? [current, ...conversations] : conversations;
  return (
    <Inbox
      canSend={hasRole(ctx, "SALES")}
      botEnabled={account.botEnabled}
      conversations={list.map((x) => ({ id: x.id, name: x.contact?.name ?? x.name ?? x.phone, phone: x.phone, preview: x.lastPreview, at: x.lastMessageAt.toISOString(), unread: x.unread, botPaused: x.botPaused, optedOut: x.optedOut }))}
      current={
        current && {
          id: current.id,
          contactId: current.contact?.id ?? null,
          lastInboundAt: current.lastInboundAt?.toISOString() ?? null,
          messages: messages.map((m) => ({ id: m.id, out: m.direction === "OUT", body: m.body, status: m.status, source: m.source, error: m.error, at: (m.sentAt ?? m.scheduledAt ?? m.createdAt).toISOString() })),
        }
      }
    />
  );
}
