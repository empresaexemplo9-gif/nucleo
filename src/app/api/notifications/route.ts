import { getContext } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await getContext();
  if (!ctx) return Response.json({ unread: 0, items: [] }, { status: 401 });
  const where = { userId: ctx.user.id, orgId: ctx.org.id };
  const [unread, items] = await Promise.all([
    db.notification.count({ where: { ...where, readAt: null } }),
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return Response.json({ unread, items: items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, href: n.href, read: !!n.readAt, at: n.createdAt.toISOString() })) });
}
