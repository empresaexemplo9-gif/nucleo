import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireContext } from "@/lib/auth";
import { assignableRoles, canManageUsers } from "@/lib/roles";
import { UsersManager } from "./users-manager";

export const metadata = { title: "Usuários" };

export default async function UsersPage() {
  const ctx = await requireContext();
  // superadmin, administradores e gestores gerenciam acessos
  if (!canManageUsers(ctx.role, ctx.superadmin)) redirect("/settings/profile");
  const [members, invites] = await Promise.all([
    db.membership.findMany({ where: { orgId: ctx.org.id }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    db.invite.findMany({ where: { orgId: ctx.org.id, acceptedAt: null }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <UsersManager
      me={ctx.user.id}
      assignable={assignableRoles(ctx.role, ctx.superadmin)}
      superadmin={ctx.superadmin}
      members={members.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, email: m.user.email, color: m.user.avatarColor, role: m.role, active: m.active, requested: !m.active && !!m.requestedAt }))}
      invites={invites.map((i) => ({ id: i.id, email: i.email, role: i.role, token: i.token }))}
    />
  );
}
