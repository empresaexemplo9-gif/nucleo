import { redirect } from "next/navigation";
import { getPublicBrand } from "@/lib/brand";
import { AuthShell } from "../auth-shell";
import { RegisterForm } from "../forms";

export const metadata = { title: "Criar conta" };

export default async function RegisterPage() {
  if (process.env.ALLOW_SIGNUP === "false") redirect("/login");
  const brand = await getPublicBrand();
  return (
    <AuthShell brand={brand} title="Crie sua conta" subtitle="Seu CRM pronto em menos de 1 minuto. Funil, etapas e tudo configurado.">
      <RegisterForm />
    </AuthShell>
  );
}
