import "server-only";
import { headers } from "next/headers";
import { db } from "./db";
import { DRAP_PRIMARY, DRAP_SECONDARY } from "./brand-colors";
import { resolveSettings } from "./labels";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Núcleo CRM";

/** Identifica a marca exibida antes do login: domínio personalizado ou ?org=slug. */
export async function getPublicBrand(slug?: string | null) {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  const org =
    (slug ? await db.organization.findUnique({ where: { slug } }) : null) ??
    (host ? await db.organization.findUnique({ where: { customDomain: host } }) : null);
  return {
    orgId: org?.id ?? null,
    name: org?.name ?? APP_NAME,
    logoUrl: org?.logoUrl ?? null,
    primaryColor: org?.primaryColor ?? DRAP_PRIMARY,
    accentColor: org?.accentColor ?? DRAP_SECONDARY,
    theme: resolveSettings(org?.settings).brand,
  };
}
