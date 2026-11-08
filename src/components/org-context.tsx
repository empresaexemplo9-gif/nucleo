"use client";
import { createContext, useContext } from "react";
import type { Labels, OrgSettings } from "@/lib/labels";
import { money, setTimeZone } from "@/lib/format";

export type Member = { id: string; name: string; avatarColor: string };
export type TagDef = { name: string; color: string };
export type FieldDef = { id: string; entity: "DEAL" | "CONTACT" | "COMPANY"; key: string; label: string; type: string; options: string[]; required: boolean };
export type PipelineDef = { id: string; name: string; isDefault: boolean; stages: { id: string; name: string; color: string; type: string; probability: number }[] };

export type OrgCtx = {
  org: { id: string; name: string; currency: string; locale: string; logoUrl: string | null; timezone: string };
  user: { id: string; name: string; email: string; avatarColor: string };
  role: "OWNER" | "ADMIN" | "MANAGER" | "SALES" | "VIEWER";
  labels: Labels;
  settings: OrgSettings;
  members: Member[];
  tags: TagDef[];
  fields: FieldDef[];
  pipelines: PipelineDef[];
  lostReasons: string[];
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
  const can = (min: OrgCtx["role"]) => {
    const r = { VIEWER: 0, SALES: 1, MANAGER: 2, ADMIN: 3, OWNER: 4 };
    return r[v.role] >= r[min];
  };
  const tagColor = (name: string) => v.tags.find((t) => t.name === name)?.color ?? "var(--text-mute)";
  const member = (id?: string | null) => v.members.find((m) => m.id === id);
  return { ...v, fmt, can, tagColor, member };
}
