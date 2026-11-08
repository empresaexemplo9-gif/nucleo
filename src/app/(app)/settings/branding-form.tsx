"use client";
import { useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { updateBranding, updateLabels, updateOrgSettings } from "@/actions/settings";
import type { Labels, OrgSettings } from "@/lib/labels";

const CURRENCIES = [["BRL", "Real (R$)"], ["USD", "Dólar (US$)"], ["EUR", "Euro (€)"], ["GBP", "Libra (£)"], ["ARS", "Peso argentino"], ["MXN", "Peso mexicano"], ["CLP", "Peso chileno"], ["COP", "Peso colombiano"], ["PYG", "Guarani"], ["UYU", "Peso uruguaio"], ["AOA", "Kwanza"], ["MZN", "Metical"]];
const LOCALES = [["pt-BR", "Português (Brasil)"], ["pt-PT", "Português (Portugal)"], ["en-US", "English (US)"], ["es-ES", "Español"]];
const TIMEZONES = ["America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "America/Recife", "America/Cuiaba", "America/Rio_Branco", "America/Noronha", "Europe/Lisbon", "America/New_York", "America/Mexico_City", "America/Argentina/Buenos_Aires", "UTC"];
const PRESETS = ["#b48a4f", "#3c78c0", "#4f46e5", "#2563eb", "#0891b2", "#059669", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#9333ea", "#0f172a"];

export function BrandingForm({
  org,
  labels,
  settings,
}: {
  org: { name: string; slug: string; logoUrl: string | null; primaryColor: string; accentColor: string; currency: string; locale: string; timezone: string; customDomain: string | null };
  labels: Labels;
  settings: OrgSettings;
}) {
  const { run, pending } = useAction();
  const [primary, setPrimary] = useState(org.primaryColor);
  const [accent, setAccent] = useState(org.accentColor);
  const [logo, setLogo] = useState(org.logoUrl ?? "");
  const [name, setName] = useState(org.name);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="text-base font-semibold">Marca (whitelabel)</h2>
        <p className="mb-4 text-sm text-muted">Deixe o CRM com a cara da sua empresa. Tudo é aplicado instantaneamente para toda a equipe.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => updateBranding(fd));
          }}
          className="grid gap-5 lg:grid-cols-[1fr_260px]"
        >
          <div className="space-y-4">
            <Field label="Nome exibido">
              <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="URL do logotipo" hint="Cole o link de uma imagem (PNG/SVG). Recomendado: fundo transparente, quadrado.">
              <Input name="logoUrl" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…/logo.png" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cor principal">
                <div className="flex items-center gap-2">
                  <input type="color" name="primaryColor" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-12 cursor-pointer" />
                  <Input value={primary} onChange={(e) => setPrimary(e.target.value)} className="font-mono" />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {PRESETS.map((c) => (
                    <button type="button" key={c} onClick={() => setPrimary(c)} className="size-5 rounded-full ring-offset-2 ring-offset-surface hover:ring-2" style={{ background: c, ["--tw-ring-color" as string]: c }} aria-label={c} />
                  ))}
                </div>
              </Field>
              <Field label="Cor de destaque">
                <div className="flex items-center gap-2">
                  <input type="color" name="accentColor" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 cursor-pointer" />
                  <Input value={accent} onChange={(e) => setAccent(e.target.value)} className="font-mono" />
                </div>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Moeda">
                <Select name="currency" defaultValue={org.currency}>
                  {CURRENCIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Idioma/formato">
                <Select name="locale" defaultValue={org.locale}>
                  {LOCALES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Fuso horário">
                <Select name="timezone" defaultValue={org.timezone}>
                  {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Domínio próprio (opcional)" hint={`Aponte o domínio para a Vercel (Settings → Domains) e informe aqui. A tela de login exibirá sua marca. Alternativa: /login?org=${org.slug}`}>
              <Input name="customDomain" defaultValue={org.customDomain ?? ""} placeholder="crm.suaempresa.com.br" />
            </Field>
            <Button trail loading={pending}>Salvar marca</Button>
          </div>
          <div>
            <p className="eyebrow mb-2 text-[10px]">Pré-visualização</p>
            <div className="card-drap overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-line p-3">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="size-8 rounded-[var(--radius-sm)] border border-line bg-[var(--surface-1)] object-contain p-0.5" />
                ) : (
                  <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-[var(--radius-sm)]" style={{ background: "var(--btn-bg)" }}>
                    <span className="absolute h-[140%] w-[3px] rotate-[32deg] rounded-full" style={{ background: primary }} />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{name}</span>
                  <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-muted">CRM · Business</span>
                </span>
              </div>
              <div className="space-y-1.5 p-3">
                <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-[var(--surface-1)] px-2 py-1.5 text-xs">
                  <span className="font-mono text-[10px]" style={{ color: primary }}>01</span> Item ativo
                  <span className="ml-auto size-1.5 rounded-full" style={{ background: primary }} />
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-fg-2">
                  <span className="font-mono text-[10px] text-muted">02</span> Item do menu
                </div>
                <p className="px-2 pt-1 text-lg font-medium tracking-[-0.03em]">
                  Título com <span className="serif-i" style={{ color: primary }}>destaque</span>
                </p>
                <div className="h-1 rounded-full" style={{ background: `linear-gradient(100deg, ${primary}, ${accent})` }} />
              </div>
            </div>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Nomenclatura</h2>
        <p className="mb-4 text-sm text-muted">Adapte os termos ao seu negócio — ex.: “Negócios” → “Oportunidades”, “Imóveis”, “Matrículas”, “Projetos”.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => updateLabels(fd));
          }}
          className="space-y-3"
        >
          {(Object.keys(labels) as (keyof Labels)[]).map((k) => (
            <div key={k} className="grid grid-cols-2 gap-3">
              <Field label={`Singular (${k})`}>
                <Input name={`${k}.singular`} defaultValue={labels[k].singular} />
              </Field>
              <Field label="Plural">
                <Input name={`${k}.plural`} defaultValue={labels[k].plural} />
              </Field>
            </div>
          ))}
          <Button loading={pending}>Salvar nomenclatura</Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Preferências e módulos</h2>
        <p className="mb-4 text-sm text-muted">Ative apenas o que sua operação usa para manter o CRM simples.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => updateOrgSettings(fd));
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visibilidade para vendedores">
              <Select name="visibility" defaultValue={settings.visibility}>
                <option value="ALL">Veem todos os registros</option>
                <option value="OWN">Veem apenas os próprios registros</option>
              </Select>
            </Field>
            <Field label="Semana começa em">
              <Select name="weekStartsOn" defaultValue={String(settings.weekStartsOn)}>
                <option value="1">Segunda-feira</option>
                <option value="0">Domingo</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["mod_companies", "Empresas (B2B)", settings.modules.companies],
              ["mod_products", "Produtos e serviços", settings.modules.products],
              ["mod_goals", "Metas", settings.modules.goals],
              ["mod_automations", "Automações", settings.modules.automations],
              ["requireLostReason", "Exigir motivo ao marcar como perdido", settings.requireLostReason],
            ].map(([n, l, v]) => (
              <label key={n as string} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm">
                <input type="checkbox" name={n as string} defaultChecked={v as boolean} className="size-4 accent-brand" /> {l}
              </label>
            ))}
          </div>
          <Button loading={pending}>Salvar preferências</Button>
        </form>
      </Card>
    </div>
  );
}
