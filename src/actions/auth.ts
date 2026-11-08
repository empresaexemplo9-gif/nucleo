"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { checkPassword, endSession, hashPassword, requireContext, startSession } from "@/lib/auth";
import { setupOrganization } from "@/lib/defaults";
import { slugify } from "@/lib/format";
import { str } from "./helpers";

export type FormState = { error?: string } | undefined;

/** Cores de avatar (dados do usuário), na paleta DRAP. */
const COLORS = ["#b48a4f", "#3c78c0", "#17905f", "#8a672f", "#2d63a3", "#4b505a"];
const pickColor = () => COLORS[Math.floor(Math.random() * COLORS.length)]!;

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email")?.toLowerCase();
  const password = str(fd, "password");
  if (!email || !password) return { error: "Preencha e-mail e senha" };
  const user = await db.user.findUnique({
    where: { email },
    include: { memberships: { where: { active: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!user || !(await checkPassword(password, user.passwordHash))) return { error: "E-mail ou senha inválidos" };
  if (!user.memberships.length) return { error: "Seu acesso foi desativado. Fale com o administrador." };
  const orgSlug = str(fd, "org");
  const m = user.memberships.find((x) => x.orgId === orgSlug) ?? user.memberships[0]!;
  await startSession(user.id, m.orgId);
  const next = str(fd, "next");
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || "empresa";
  let slug = base;
  for (let i = 2; await db.organization.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  if (process.env.ALLOW_SIGNUP === "false") return { error: "Cadastro desabilitado nesta instalação." };
  const name = str(fd, "name");
  const company = str(fd, "company");
  const email = str(fd, "email")?.toLowerCase();
  const password = str(fd, "password");
  if (!name || !company || !email || !password) return { error: "Preencha todos os campos" };
  if (password.length < 8) return { error: "A senha deve ter pelo menos 8 caracteres" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "E-mail inválido" };
  const existing = await db.user.findUnique({ where: { email } });
  if (existing && !(await checkPassword(password, existing.passwordHash)))
    return { error: "Este e-mail já está cadastrado. Entre com sua senha para criar outra empresa." };

  const slug = await uniqueSlug(company);
  const { user, org } = await db.$transaction(async (tx) => {
    const user = existing ?? (await tx.user.create({ data: { name, email, passwordHash: await hashPassword(password), avatarColor: pickColor() } }));
    const org = await tx.organization.create({
      data: {
        name: company,
        slug,
        primaryColor: str(fd, "color") ?? "#b48a4f",
        accentColor: "#3c78c0",
        settings: { segment: str(fd, "segment") },
      },
    });
    await tx.membership.create({ data: { userId: user.id, orgId: org.id, role: "OWNER" } });
    await setupOrganization(tx, org.id);
    return { user, org };
  });
  await startSession(user.id, org.id);
  redirect("/?welcome=1");
}

export async function acceptInvite(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, "token");
  const invite = token ? await db.invite.findUnique({ where: { token } }) : null;
  if (!invite || invite.acceptedAt) return { error: "Convite inválido ou já utilizado" };
  const password = str(fd, "password");
  const name = str(fd, "name");
  if (!password || password.length < 8) return { error: "A senha deve ter pelo menos 8 caracteres" };
  let user = await db.user.findUnique({ where: { email: invite.email } });
  if (user) {
    if (!(await checkPassword(password, user.passwordHash))) return { error: "Senha incorreta para este e-mail" };
  } else {
    if (!name) return { error: "Informe seu nome" };
    user = await db.user.create({ data: { name, email: invite.email, passwordHash: await hashPassword(password), avatarColor: pickColor() } });
  }
  await db.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: invite.orgId } },
    create: { userId: user.id, orgId: invite.orgId, role: invite.role },
    update: { active: true, role: invite.role },
  });
  await db.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await startSession(user.id, invite.orgId);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function switchOrg(orgId: string) {
  const ctx = await requireContext();
  const m = await db.membership.findUnique({ where: { userId_orgId: { userId: ctx.user.id, orgId } } });
  if (!m || !m.active) return;
  await startSession(ctx.user.id, orgId);
  redirect("/");
}

export async function setTheme(theme: "light" | "dark") {
  (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
