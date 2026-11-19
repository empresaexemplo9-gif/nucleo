/** Tipos de campo que o cliente pode preencher no formulário público de um módulo. */
export const PUBLIC_TYPES = ["TEXT", "TEXTAREA", "NUMBER", "CURRENCY", "DATE", "DATETIME", "SELECT", "MULTISELECT", "BOOLEAN", "URL", "EMAIL", "PHONE"];

export type FormSettings = { title: string; intro: string; success: string; fields: string[] };

export function formSettings(raw: unknown): FormSettings {
  const f = ((raw && typeof raw === "object" ? (raw as Record<string, unknown>).form : null) ?? {}) as Partial<FormSettings>;
  return {
    title: typeof f.title === "string" ? f.title : "",
    intro: typeof f.intro === "string" ? f.intro : "",
    success: typeof f.success === "string" ? f.success : "",
    fields: Array.isArray(f.fields) ? f.fields.filter((x): x is string => typeof x === "string") : [],
  };
}
