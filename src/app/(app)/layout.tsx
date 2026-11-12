import { cookies } from "next/headers";
import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { setTimeZone } from "@/lib/format";
import { brandOverrideCss } from "@/lib/brand-colors";
import { googleFontsHref, themeCss } from "@/lib/theme-options";
import { OrgProvider } from "@/components/org-context";
import { AppShell } from "@/components/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const orgId = ctx.org.id;
  setTimeZone(ctx.org.timezone);
  const brandCss = brandOverrideCss(ctx.org.primaryColor, ctx.org.accentColor) + themeCss(ctx.settings.brand);
  const fontsHref = googleFontsHref(ctx.settings.brand);
  const [members, tags, fields, pipelines, lostReasons, myOrgs, overdue] = await Promise.all([
    db.membership.findMany({ where: { orgId, active: true }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
    db.tag.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    db.customField.findMany({ where: { orgId }, orderBy: { position: "asc" } }),
    db.pipeline.findMany({ where: { orgId }, orderBy: { position: "asc" }, include: { stages: { orderBy: { position: "asc" } } } }),
    db.lostReason.findMany({ where: { orgId }, orderBy: { label: "asc" } }),
    db.membership.findMany({ where: { userId: ctx.user.id, active: true }, include: { org: true } }),
    db.activity.count({ where: { orgId, done: false, assigneeId: ctx.user.id, dueAt: { lt: new Date() } } }),
  ]);

  return (
    <OrgProvider
      value={{
        org: { id: orgId, name: ctx.org.name, currency: ctx.org.currency, locale: ctx.org.locale, logoUrl: ctx.org.logoUrl, timezone: ctx.org.timezone },
        user: ctx.user,
        role: ctx.role,
        labels: ctx.labels,
        settings: ctx.settings,
        members: members.map((m) => ({ id: m.user.id, name: m.user.name, avatarColor: m.user.avatarColor })),
        tags: tags.map((t) => ({ name: t.name, color: t.color })),
        fields: fields.map((f) => ({ id: f.id, entity: f.entity, key: f.key, label: f.label, type: f.type, options: f.options, required: f.required })),
        pipelines: pipelines.map((p) => ({
          id: p.id,
          name: p.name,
          isDefault: p.isDefault,
          stages: p.stages.map((s) => ({ id: s.id, name: s.name, color: s.color, type: s.type, probability: s.probability })),
        })),
        lostReasons: lostReasons.map((l) => l.label),
      }}
    >
      {fontsHref && <link rel="stylesheet" href={fontsHref} precedence="default" />}
      {brandCss && <style>{brandCss}</style>}
      <AppShell dark={(await cookies()).get("theme")?.value === "dark"} orgs={myOrgs.map((m) => ({ id: m.org.id, name: m.org.name }))} overdue={overdue}>
        {children}
      </AppShell>
    </OrgProvider>
  );
}

