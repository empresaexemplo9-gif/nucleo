"use client";
import { createContext, useContext } from "react";
import type { Labels, OrgSettings } from "@/lib/labels";
import { money, setTimeZone } from "@/lib/format";
import { canFinance, canManageUsers, RANK, type Role } from "@/lib/roles";

export type Member = { id: string; name: string; avatarColor: string };
export type TagDef = { name: string; color: string };
export type FieldDef = { id: string; entity: "DEAL" | "CONTACT" | "COMPANY"; key: string; label: string; type: string; options: string[]; required: boolean };
export type ModuleDef = { key: string; name: string; singular: string; icon: string; color: string; group: string; canEdit: boolean };
export type PipelineDef = { id: string; name: string; isDefault: boolean; stages: { id: string; name: string; color: string; type: string; probability: number }[] };

export type OrgCtx = {
  org: { id: string; name: string; currency: string; locale: string; logoUrl: string | null; timezone: string };
  user: { id: string; name: string; email: string; avatarColor: string };
  role: Role;
  /** Superadmin da plataforma: único que edita a identidade visual e implanta módulos. */
  superadmin: boolean;
  /** Superadmin acessando uma empresa cliente da qual não faz parte. */
  visiting: boolean;
  labels: Labels;
  settings: OrgSettings;
  members: Member[];
  tags: TagDef[];
  fields: FieldDef[];
  pipelines: PipelineDef[];
  lostReasons: string[];
  modules: ModuleDef[];
};

const C = createContext<OrgCtx | null>(null);

export function OrgProvider({ value, children }: { value: OrgCtx; children: React.ReactNode }) {
  setTimeZone(value.org.timezone);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useOrg() {
  const v = useContext(C);
  if (!v) throw new Error("OrgProvider ausente");
  const fmt = (n: unknown, compact = false) => money(n as number, v.org.currency, v.org.locale, compact);
  const can = (min: OrgCtx["role"]) => RANK[v.role] >= RANK[min];
  /** Pode criar e alterar acessos (superadmin, administradores e gestores). */
  const canUsers = canManageUsers(v.role, v.superadmin);
  /** Comanda a parte financeira (administradores e financeiro). */
  const finance = canFinance(v.role, v.superadmin);
  const tagColor = (name: string) => v.tags.find((t) => t.name === name)?.color ?? "var(--text-mute)";
  const member = (id?: string | null) => v.members.find((m) => m.id === id);
  return { ...v, fmt, can, canUsers, finance, tagColor, member };
}
