"use client";
import { useState } from "react";
import { Copy, Link2, UserPlus, X } from "lucide-react";
import { Avatar, Badge, Button, Card, Field, Input, Modal, Select, Tabs } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { useToast } from "@/components/toast";
import { createUserDirect, inviteUser, revokeInvite, updateMember } from "@/actions/settings";

const ROLES: Record<string, { label: string; desc: string }> = {
  OWNER: { label: "Proprietário", desc: "Acesso total, inclusive gerenciar proprietários." },
  ADMIN: { label: "Administrador", desc: "Configura o CRM, usuários e automações." },
  MANAGER: { label: "Gestor", desc: "Vê tudo, define metas, exclui registros." },
  SALES: { label: "Vendedor", desc: "Cria e edita negócios, contatos e atividades." },
  VIEWER: { label: "Somente leitura", desc: "Apenas visualiza dados e relatórios." },
};

type M = { id: string; userId: string; name: string; email: string; color: string; role: string; active: boolean };

export function UsersManager({ me, myRole, members, invites }: { me: string; myRole: string; members: M[]; invites: { id: string; email: string; role: string; token: string }[] }) {
  const { run, pending } = useAction();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"invite" | "direct">("invite");
  const roles = Object.entries(ROLES).filter(([k]) => k !== "OWNER" || myRole === "OWNER");
  const copy = (token: string) => {
    navigator.clipboard.writeText(`${location.origin}/invite/${token}`);
    toast("Link copiado!");
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Equipe</h2>
            <p className="text-sm text-muted">{members.filter((m) => m.active).length} usuário(s) ativo(s)</p>
          </div>
          <Button onClick={() => setOpen(true)}><UserPlus className="size-4" /> Adicionar usuário</Button>
        </div>
        <div className="divide-y divide-line">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={m.name} color={m.color} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.name} {m.userId === me && <span className="text-xs text-muted">(você)</span>}</p>
                <p className="text-xs text-muted">{m.email}</p>
              </div>
              {!m.active && <Badge color="#dc2626">Desativado</Badge>}
              <Select
                className="w-44"
                value={m.role}
                disabled={m.userId === me || (m.role === "OWNER" && myRole !== "OWNER")}
                onChange={(e) => run(() => updateMember(m.id, { role: e.target.value as never }))}
              >
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k} disabled={k === "OWNER" && myRole !== "OWNER"}>{v.label}</option>)}
              </Select>
              {m.userId !== me && (
                <Button size="sm" variant="ghost" onClick={() => run(() => updateMember(m.id, { active: !m.active }))}>
                  {m.active ? "Desativar" : "Reativar"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {invites.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-base font-bold">Convites pendentes</h2>
          <div className="divide-y divide-line">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Link2 className="size-4 text-muted" />
                <span className="flex-1">{i.email}</span>
                <Badge>{ROLES[i.role]?.label}</Badge>
                <Button size="sm" variant="secondary" onClick={() => copy(i.token)}><Copy className="size-3.5" /> Copiar link</Button>
                <Button size="icon" variant="ghost" onClick={() => run(() => revokeInvite(i.id))} aria-label="Revogar"><X className="size-4" /></Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-3 text-base font-bold">Perfis de acesso</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.values(ROLES).map((r) => (
            <div key={r.label} className="rounded-lg border border-line p-3">
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-xs text-muted">{r.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar usuário">
        <Tabs value={mode} onChange={setMode} items={[{ value: "invite", label: "Enviar convite" }, { value: "direct", label: "Criar com senha" }]} />
        <form
          key={mode}
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            if (mode === "invite")
              run(() => inviteUser(fd), {
                onSuccess: (r) => {
                  const link = (r as { link?: string }).link;
                  if (link) navigator.clipboard?.writeText(location.origin + link).catch(() => {});
                  setOpen(false);
                },
              });
            else run(() => createUserDirect(fd), { onSuccess: () => setOpen(false) });
          }}
        >
          {mode === "direct" && <Field label="Nome"><Input name="name" required /></Field>}
          <Field label="E-mail"><Input name="email" type="email" required autoFocus /></Field>
          {mode === "direct" && <Field label="Senha inicial" hint="Mínimo 8 caracteres. O usuário pode alterar depois."><Input name="password" type="text" minLength={8} required /></Field>}
          <Field label="Perfil">
            <Select name="role" defaultValue="SALES">
              {roles.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          {mode === "invite" && <p className="text-xs text-muted">Um link de convite será gerado e copiado para você enviar por e-mail ou WhatsApp.</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button loading={pending}>{mode === "invite" ? "Gerar convite" : "Criar usuário"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
