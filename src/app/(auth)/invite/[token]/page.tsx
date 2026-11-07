import Link from "next/link";
import { db } from "@/lib/db";
import { AuthShell } from "../../auth-shell";
import { InviteForm } from "../../forms";

export const metadata = { title: "Convite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.invite.findUnique({ where: { token }, include: { org: true } });
  if (!invite || invite.acceptedAt) {
    return (
      <AuthShell brand={{ name: "Convite", logoUrl: null, primaryColor: "#4f46e5", accentColor: "#0ea5e9" }} title="Convite inválido" subtitle="Este convite expirou ou já foi utilizado.">
        <Link href="/login" className="text-sm font-medium text-brand">Ir para o login</Link>
      </AuthShell>
    );
  }
  const existing = !!(await db.user.findUnique({ where: { email: invite.email } }));
  return (
    <AuthShell brand={invite.org} title={`Entrar em ${invite.org.name}`} subtitle="Você foi convidado para fazer parte da equipe.">
      <InviteForm token={token} email={invite.email} existing={existing} />
    </AuthShell>
  );
}
