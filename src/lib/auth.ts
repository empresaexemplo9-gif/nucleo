import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { SESSION_COOKIE, signSession, verifySession } from "./session";
import { resolveLabels, resolveSettings } from "./labels";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function checkPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function startSession(uid: string, oid: string) {
  const token = await signSession({ uid, oid });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const getContext = cache(async () => {
  const jar = await cookies();
  const s = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: s.uid, orgId: s.oid } },
    include: { user: true, org: true },
  });
  if (!membership || !membership.active) return null;
  const { user, org } = membership;
  return {
    user: { id: user.id, name: user.name, email: user.email, avatarColor: user.avatarColor },
    org,
    role: membership.role,
    labels: resolveLabels(org.labels),
    settings: resolveSettings(org.settings),
  };
});

export type Ctx = NonNullable<Awaited<ReturnType<typeof getContext>>>;

export async function requireContext(): Promise<Ctx> {
  const ctx = await getContext();
  if (!ctx) redirect("/api/logout");
  return ctx;
}

const RANK: Record<Role, number> = { VIEWER: 0, SALES: 1, MANAGER: 2, ADMIN: 3, OWNER: 4 };

export function hasRole(ctx: Ctx, min: Role) {
  return RANK[ctx.role] >= RANK[min];
}

export async function requireRole(min: Role) {
  const ctx = await requireContext();
  if (!hasRole(ctx, min)) throw new Error("Você não tem permissão para esta ação.");
  return ctx;
}

/** Filtro de visibilidade: vendedores podem ver apenas os próprios registros, conforme configuração. */
export function ownerScope(ctx: Ctx): { ownerId?: string } {
  if (ctx.settings.visibility === "OWN" && ctx.role === "SALES") return { ownerId: ctx.user.id };
  return {};
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  SALES: "Vendedor",
  VIEWER: "Somente leitura",
};
