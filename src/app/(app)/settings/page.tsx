import { guard } from "./guard";
import { BrandingForm } from "./branding-form";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const ctx = await guard("ADMIN");
  const o = ctx.org;
  return (
    <BrandingForm
      org={{ name: o.name, slug: o.slug, logoUrl: o.logoUrl, primaryColor: o.primaryColor, accentColor: o.accentColor, currency: o.currency, locale: o.locale, timezone: o.timezone, customDomain: o.customDomain }}
      labels={ctx.labels}
      settings={ctx.settings}
    />
  );
}
