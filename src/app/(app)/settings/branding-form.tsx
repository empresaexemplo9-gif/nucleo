"use client";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { updateLabels, updateOrgSettings } from "@/actions/settings";
import type { Labels, OrgSettings } from "@/lib/labels";
import { useOrg } from "@/components/org-context";


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
  const { superadmin } = useOrg();
  void org;

  return (
    <div className="space-y-6">
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
        <h2 className="text-base font-semibold">Preferências e funções</h2>
        <p className="mb-4 text-sm text-muted">
          {superadmin
            ? "Ligue só as funções contratadas no plano desta empresa: o que estiver desligado some do menu e das telas."
            : "Ajuste as preferências da equipe. As funções do CRM fazem parte do seu plano e são ativadas pela equipe da plataforma."}
        </p>
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
          <label className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm">
            <input type="checkbox" name="requireLostReason" defaultChecked={settings.requireLostReason} className="size-4 accent-brand" /> Exigir motivo ao marcar como perdido
          </label>
          <div>
            <p className="mono-label mb-2 text-[10.5px] text-muted">Funções do CRM {superadmin ? "· plano da empresa" : "· ativadas pela plataforma"}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["mod_companies", "Empresas (B2B)", "Cadastro de empresas clientes", settings.modules.companies],
                  ["mod_products", "Produtos e serviços", "Catálogo, preços e estoque", settings.modules.products],
                  ["mod_goals", "Metas", "Metas de receita da equipe", settings.modules.goals],
                  ["mod_automations", "Automações", "Regras automáticas no funil", settings.modules.automations],
                ] as const
              ).map(([n, l, d, v]) => (
                <label key={n} className={`flex items-start gap-2 rounded-lg border border-line px-3 py-2.5 text-sm ${superadmin ? "" : "opacity-70"}`}>
                  <input type="checkbox" name={n} defaultChecked={v} disabled={!superadmin} className="mt-0.5 size-4 accent-brand" />
                  <span>
                    {l}
                    <span className="block text-xs text-muted">{superadmin ? d : v ? "Incluída no plano" : "Fora do plano"}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <Button loading={pending}>Salvar preferências</Button>
        </form>
      </Card>
    </div>
  );
}
