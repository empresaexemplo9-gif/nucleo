import { guard } from "./guard";
import { BrandingForm } from "./branding-form";
import { BrandStudio } from "./brand-studio";
import { DRAP_PRIMARY, DRAP_SECONDARY, hasCustomBrand } from "@/lib/brand-colors";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const ctx = await guard("ADMIN");
  const o = ctx.org;
  const custom = hasCustomBrand(o.primaryColor, o.accentColor);
  const orgView = { name: o.name, slug: o.slug, logoUrl: o.logoUrl, primaryColor: custom ? o.primaryColor : DRAP_PRIMARY, accentColor: custom ? o.accentColor : DRAP_SECONDARY, currency: o.currency, locale: o.locale, timezone: o.timezone, customDomain: o.customDomain };
  return (
    <div className="space-y-10">
      <BrandStudio org={orgView} theme={ctx.settings.brand} />
      <BrandingForm org={orgView} labels={ctx.labels} settings={ctx.settings} />
    </div>
  );
}
