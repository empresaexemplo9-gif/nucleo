"use client";
import Link from "next/link";
import { useActionState } from "react";
import { acceptInvite, login, register } from "@/actions/auth";
import { Button, Field, Input, Select } from "@/components/ui";

function ErrorBox({ error }: { error?: string }) {
  if (!error) return null;
  return <div className="animate-in rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">{error}</div>;
}

export function LoginForm({ next, org, allowSignup }: { next?: string; org?: string | null; allowSignup: boolean }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="org" value={org ?? ""} />
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" required autoFocus placeholder="voce@empresa.com" className="h-11" />
      </Field>
      <Field label="Senha">
        <Input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" className="h-11" />
      </Field>
      <ErrorBox error={state?.error} />
      <Button size="lg" className="w-full" loading={pending}>Entrar</Button>
      {allowSignup && (
        <p className="text-center text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link href="/register" className="font-medium text-brand hover:underline">
            Criar conta grátis
          </Link>
        </p>
      )}
    </form>
  );
}

const SEGMENTS = ["Serviços", "Software / SaaS", "Imobiliária", "Educação", "Saúde", "Indústria", "Varejo", "Agência / Marketing", "Consultoria", "Financeiro / Seguros", "Outro"];

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Seu nome">
        <Input name="name" required autoFocus placeholder="Maria Silva" />
      </Field>
      <Field label="Nome da empresa">
        <Input name="company" required placeholder="Acme Ltda" />
      </Field>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Segmento">
          <Select name="segment" defaultValue="">
            <option value="">Selecione…</option>
            {SEGMENTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Cor da marca">
          <input type="color" name="color" defaultValue="#4f46e5" className="h-9 w-14 cursor-pointer rounded-lg" />
        </Field>
      </div>
      <Field label="E-mail">
        <Input name="email" type="email" required autoComplete="email" placeholder="voce@empresa.com" />
      </Field>
      <Field label="Senha" hint="Mínimo de 8 caracteres">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <ErrorBox error={state?.error} />
      <Button size="lg" className="w-full" loading={pending}>Criar minha conta</Button>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

export function InviteForm({ token, email, existing }: { token: string; email: string; existing: boolean }) {
  const [state, action, pending] = useActionState(acceptInvite, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="E-mail">
        <Input value={email} disabled readOnly />
      </Field>
      {!existing && (
        <Field label="Seu nome">
          <Input name="name" required autoFocus />
        </Field>
      )}
      <Field label={existing ? "Sua senha atual" : "Crie uma senha"} hint={existing ? undefined : "Mínimo de 8 caracteres"}>
        <Input name="password" type="password" required minLength={8} />
      </Field>
      <ErrorBox error={state?.error} />
      <Button size="lg" className="w-full" loading={pending}>Aceitar convite</Button>
    </form>
  );
}
