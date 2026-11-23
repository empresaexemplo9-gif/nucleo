"use client";
import { useState } from "react";
import { Copy, Link2, UserPlus, X } from "lucide-react";
import { Avatar, Badge, Button, Card, Field, Input, Modal, Select, Tabs } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { useToast } from "@/components/toast";
import { answerAccessRequest, createUserDirect, inviteUser, revokeInvite, updateMember } from "@/actions/settings";
import { ROLE_INFO, ROLE_ORDER, roleLabel, type Role } from "@/lib/roles";

type M = { id: string; userId: string; name: string; email: string; color: string; role: string; active: boolean; requested: boolean };

export function UsersManager({ me, assignable, superadmin, members, invites }: { me: string; assignable: Role[]; superadmin: boolean; members: M[]; invites: { id: string; email: string; role: string; token: string }[] }) {
  const { run, pending } = useAction();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"invite" | "direct">("invite");
  const roles = ROLE_ORDER.filter((r) => assignable.includes(r));
  const requests = members.filter((m) => m.requested);
  const team = members.filter((m) => !m.requested);
  const [grant, setGrant] = useState<Record<string, Role>>({});
  const canEdit = (m: M) => m.userId !== me && (superadmin || assignable.includes(m.role as Role));
  const copy = (token: string) => {
    navigator.clipboard.writeText(`${location.origin}/invite/${token}`);
    toast("Link copiado!");
  };

  return (
    <div className="space-y-4">
      {requests.length > 0 && (
        <Card className="border-[color-mix(in_oklab,var(--warn)_45%,transparent)] p-5">
          <h2 className="text-base font-semibold">Pedidos de acesso</h2>
          <p className="mb-3 text-sm text-muted">Pessoas que se cadastraram com o nome desta empresa. Confira se fazem parte da equipe, escolha o perfil e aprove.</p>
          <div className="divide-y divide-line">
            {requests.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar name={m.name} color={m.color} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted">{m.email}</p>
                </div>
                <Select className="w-44" aria-label={`Perfil de ${m.name}`} value={grant[m.id] ?? roles[roles.length - 1]} onChange={(e) => setGrant((g) => ({ ...g, [m.id]: e.target.value as Role }))}>
                  {roles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </Select>
                <Button size="sm" onClick={() => run(() => answerAccessRequest(m.id, true, grant[m.id] ?? roles[roles.length - 1]))}>Aprovar</Button>
                <Button size="sm" variant="ghost" onClick={() => confirm(`Recusar o pedido de ${m.name}?`) && run(() => answerAccessRequest(m.id, false))}>Recusar</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Equipe</h2>
            <p className="text-sm text-muted">{team.filter((m) => m.active).length} usuário(s) ativo(s)</p>
            <p className="mt-1 max-w-xl text-xs text-muted">
              {superadmin
                ? "Como superadmin, você cadastra todos os níveis, inclusive administradores, financeiro e gestores."
                : "Você cadastra consultores e acessos de visualização. Administradores, financeiro e gestores são cadastrados pela DRAP."}
            </p>
          </div>
          <Button onClick={() => setOpen(true)}><UserPlus className="size-4" /> Adicionar usuário</Button>
        </div>
        <div className="divide-y divide-line">
          {team.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={m.name} color={m.color} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.name} {m.userId === me && <span className="text-xs text-muted">(você)</span>}</p>
                <p className="text-xs text-muted">{m.email}</p>
              </div>
              {!m.active && <Badge color="var(--err)">Desativado</Badge>}
              {canEdit(m) ? (
                <Select className="w-48" value={m.role} onChange={(e) => run(() => updateMember(m.id, { role: e.target.value as never }))}>
                  {m.role === "OWNER" && <option value="OWNER">{roleLabel("OWNER")}</option>}
                  {roles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </Select>
              ) : (
                <Badge>{roleLabel(m.role)}</Badge>
              )}
              {canEdit(m) && (
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
          <h2 className="mb-3 text-base font-semibold">Convites pendentes</h2>
          <div className="divide-y divide-line">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Link2 className="size-4 text-muted" />
                <span className="flex-1">{i.email}</span>
                <Badge>{roleLabel(i.role)}</Badge>
                <Button size="sm" variant="secondary" onClick={() => copy(i.token)}><Copy className="size-3.5" /> Copiar link</Button>
                {assignable.includes(i.role as Role) && <Button size="icon" variant="ghost" onClick={() => run(() => revokeInvite(i.id))} aria-label="Revogar"><X className="size-4" /></Button>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-3 text-base font-semibold">Perfis de acesso</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLE_ORDER.map((k) => (
            <div key={k} className="rounded-lg border border-line p-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                {ROLE_INFO[k].label}
                {!["SALES", "VIEWER"].includes(k) && <Badge>Cadastro pela DRAP</Badge>}
              </p>
              <p className="text-xs text-muted">{ROLE_INFO[k].desc}</p>
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
              {roles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
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
