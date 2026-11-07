"use client";
import { useState } from "react";
import { Avatar, Badge, Button, Card, Field, Input } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { updateProfile } from "@/actions/settings";

export function ProfileForm({ user, role }: { user: { name: string; email: string; phone: string | null; avatarColor: string }; role: string }) {
  const { run, pending } = useAction();
  const [name, setName] = useState(user.name);
  const [color, setColor] = useState(user.avatarColor);
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <Avatar name={name} color={color} size={48} />
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted">{user.email} · <Badge>{role}</Badge></p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          run(() => updateProfile(new FormData(form)), { onSuccess: () => { (form.elements.namedItem("currentPassword") as HTMLInputElement).value = ""; (form.elements.namedItem("newPassword") as HTMLInputElement).value = ""; } });
        }}
        className="max-w-md space-y-3"
      >
        <Field label="Nome"><Input name="name" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Telefone"><Input name="phone" defaultValue={user.phone ?? ""} /></Field>
        <Field label="Cor do avatar"><input type="color" name="avatarColor" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14 cursor-pointer" /></Field>
        <div className="border-t border-line pt-3">
          <p className="mb-2 text-sm font-medium">Alterar senha</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Senha atual"><Input name="currentPassword" type="password" autoComplete="current-password" /></Field>
            <Field label="Nova senha"><Input name="newPassword" type="password" minLength={8} autoComplete="new-password" /></Field>
          </div>
        </div>
        <Button loading={pending}>Salvar</Button>
      </form>
    </Card>
  );
}
