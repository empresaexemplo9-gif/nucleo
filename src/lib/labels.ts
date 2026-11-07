export type EntityLabel = { singular: string; plural: string };
export type Labels = {
  deal: EntityLabel;
  contact: EntityLabel;
  company: EntityLabel;
  activity: EntityLabel;
  product: EntityLabel;
  pipeline: EntityLabel;
};

export const DEFAULT_LABELS: Labels = {
  deal: { singular: "Negócio", plural: "Negócios" },
  contact: { singular: "Contato", plural: "Contatos" },
  company: { singular: "Empresa", plural: "Empresas" },
  activity: { singular: "Atividade", plural: "Atividades" },
  product: { singular: "Produto", plural: "Produtos" },
  pipeline: { singular: "Funil", plural: "Funis" },
};

export function resolveLabels(raw: unknown): Labels {
  const out = structuredClone(DEFAULT_LABELS);
  if (raw && typeof raw === "object") {
    for (const key of Object.keys(out) as (keyof Labels)[]) {
      const v = (raw as Record<string, Partial<EntityLabel>>)[key];
      if (v?.singular) out[key].singular = v.singular;
      if (v?.plural) out[key].plural = v.plural;
    }
  }
  return out;
}

export type OrgSettings = {
  visibility: "ALL" | "OWN";
  modules: { products: boolean; goals: boolean; automations: boolean; companies: boolean };
  requireLostReason: boolean;
  weekStartsOn: 0 | 1;
};

export const DEFAULT_SETTINGS: OrgSettings = {
  visibility: "ALL",
  modules: { products: true, goals: true, automations: true, companies: true },
  requireLostReason: true,
  weekStartsOn: 1,
};

export function resolveSettings(raw: unknown): OrgSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<OrgSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...r,
    modules: { ...DEFAULT_SETTINGS.modules, ...(r.modules ?? {}) },
  };
}
