import { guard } from "./guard";
import { BrandingForm } from "./branding-form";
import { DRAP_PRIMARY, DRAP_SECONDARY, hasCustomBrand } from "@/lib/brand-colors";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const ctx = await guard("ADMIN");
  const o = ctx.org;
  const custom = hasCustomBrand(o.primaryColor, o.accentColor);
  return (
    <BrandingForm
      org={{ name: o.name, slug: o.slug, logoUrl: o.logoUrl, primaryColor: custom ? o.primaryColor : DRAP_PRIMARY, accentColor: custom ? o.accentColor : DRAP_SECONDARY, currency: o.currency, locale: o.locale, timezone: o.timezone, customDomain: o.customDomain }}
      labels={ctx.labels}
      settings={ctx.settings}
    />
  );
}
