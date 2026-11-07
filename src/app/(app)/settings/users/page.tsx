import { db } from "@/lib/db";
import { guard } from "../guard";
import { UsersManager } from "./users-manager";

export const metadata = { title: "Usuários" };

export default async function UsersPage() {
  const ctx = await guard("ADMIN");
  const [members, invites] = await Promise.all([
    db.membership.findMany({ where: { orgId: ctx.org.id }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    db.invite.findMany({ where: { orgId: ctx.org.id, acceptedAt: null }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <UsersManager
      me={ctx.user.id}
      myRole={ctx.role}
      members={members.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, email: m.user.email, color: m.user.avatarColor, role: m.role, active: m.active }))}
      invites={invites.map((i) => ({ id: i.id, email: i.email, role: i.role, token: i.token }))}
    />
  );
}
