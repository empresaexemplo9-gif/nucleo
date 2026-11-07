import { db } from "@/lib/db";
import { requireContext, ROLE_LABELS } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const ctx = await requireContext();
  const user = await db.user.findUniqueOrThrow({ where: { id: ctx.user.id } });
  return <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone, avatarColor: user.avatarColor }} role={ROLE_LABELS[ctx.role]} />;
}
