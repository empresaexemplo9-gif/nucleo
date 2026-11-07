"use client";
import { useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { updateBranding, updateLabels, updateOrgSettings } from "@/actions/settings";
import type { Labels, OrgSettings } from "@/lib/labels";

const CURRENCIES = [["BRL", "Real (R$)"], ["USD", "Dólar (US$)"], ["EUR", "Euro (€)"], ["GBP", "Libra (£)"], ["ARS", "Peso argentino"], ["MXN", "Peso mexicano"], ["CLP", "Peso chileno"], ["COP", "Peso colombiano"], ["PYG", "Guarani"], ["UYU", "Peso uruguaio"], ["AOA", "Kwanza"], ["MZN", "Metical"]];
const LOCALES = [["pt-BR", "Português (Brasil)"], ["pt-PT", "Português (Portugal)"], ["en-US", "English (US)"], ["es-ES", "Español"]];
const TIMEZONES = ["America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "America/Recife", "America/Cuiaba", "America/Rio_Branco", "America/Noronha", "Europe/Lisbon", "America/New_York", "America/Mexico_City", "America/Argentina/Buenos_Aires", "UTC"];
const PRESETS = ["#4f46e5", "#2563eb", "#0891b2", "#059669", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#9333ea", "#0f172a"];

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
        <h2 className="font-semibold">Marca (whitelabel)</h2>
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
            <Button loading={pending}>Salvar marca</Button>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Pré-visualização</p>
            <div className="overflow-hidden rounded-xl border border-line">
              <div className="flex items-center gap-2 p-3 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="size-8 rounded bg-white/90 object-contain p-0.5" />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-lg bg-white/20 font-bold">{name[0]}</span>
                )}
                <span className="truncate text-sm font-semibold">{name}</span>
              </div>
              <div className="space-y-2 bg-surface p-3">
                <div className="rounded-md px-2 py-1.5 text-xs font-medium" style={{ background: `color-mix(in oklab, ${primary} 12%, transparent)`, color: primary }}>Item ativo do menu</div>
                <div className="rounded-md px-2 py-1.5 text-xs text-muted">Item do menu</div>
                <button type="button" className="w-full rounded-md py-1.5 text-xs font-medium text-white" style={{ background: primary }}>Botão principal</button>
              </div>
            </div>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Nomenclatura</h2>
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
        <h2 className="font-semibold">Preferências e módulos</h2>
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
