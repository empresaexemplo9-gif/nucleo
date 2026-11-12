import Link from "next/link";
import { resolveSettings } from "@/lib/labels";
import { DRAP_PRIMARY, DRAP_SECONDARY } from "@/lib/brand-colors";
import { db } from "@/lib/db";
import { AuthShell } from "../../auth-shell";
import { InviteForm } from "../../forms";

export const metadata = { title: "Convite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.invite.findUnique({ where: { token }, include: { org: true } });
  if (!invite || invite.acceptedAt) {
    return (
      <AuthShell brand={{ name: "Convite", logoUrl: null, primaryColor: DRAP_PRIMARY, accentColor: DRAP_SECONDARY }} title="Convite inválido" subtitle="Este convite expirou ou já foi utilizado.">
        <Link href="/login" className="text-sm font-medium text-accent-text">Ir para o login</Link>
      </AuthShell>
    );
  }
  const existing = !!(await db.user.findUnique({ where: { email: invite.email } }));
  return (
    <AuthShell brand={{ ...invite.org, theme: resolveSettings(invite.org.settings).brand }} title={`Entrar em ${invite.org.name}`} subtitle="Você foi convidado para fazer parte da equipe.">
      <InviteForm token={token} email={invite.email} existing={existing} />
    </AuthShell>
  );
}
