import { getPublicBrand } from "@/lib/brand";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "../forms";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; org?: string }> }) {
  const sp = await searchParams;
  const brand = await getPublicBrand(sp.org);
  return (
    <AuthShell brand={brand} title="Bem-vindo de volta" subtitle={`Acesse sua conta ${brand.name}`}>
      <LoginForm next={sp.next} org={brand.orgId} allowSignup={process.env.ALLOW_SIGNUP !== "false"} />
    </AuthShell>
  );
}
