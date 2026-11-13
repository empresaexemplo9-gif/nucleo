import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import type { Ctx } from "@/lib/auth";
import { hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordScope, visibleModules } from "@/lib/modules";
import { Card, EmptyState, SectionTitle } from "@/components/ui";
import { ModuleIcon } from "@/components/module-icon";

/** Seção do painel com indicadores de cada módulo de controle interno. */
export async function ModulesOverview({ ctx, index, fmt }: { ctx: Ctx; index: number; fmt: (v: number, compact?: boolean) => string }) {
  const mods = await visibleModules(ctx);
  if (!mods.length && !hasRole(ctx, "ADMIN")) return null;
  const now = new Date();
  const scope = recordScope(ctx);
  const finals = mods.length
    ? await db.moduleStatus.findMany({ where: { moduleId: { in: mods.map((m) => m.id) }, isFinal: true }, select: { id: true } })
    : [];
  const finalIds = finals.map((f) => f.id);
  const open = { orgId: ctx.org.id, ...scope, OR: [{ statusId: null }, { statusId: { notIn: finalIds } }] };
  const [openBy, lateBy, sumBy] = mods.length
    ? await Promise.all([
        db.moduleRecord.groupBy({ by: ["moduleId"], where: open, _count: { _all: true } }),
        db.moduleRecord.groupBy({ by: ["moduleId"], where: { ...open, dueAt: { lt: now } }, _count: { _all: true } }),
        db.moduleRecord.groupBy({ by: ["moduleId"], where: open, _sum: { amount: true } }),
      ])
    : [[], [], []];

  return (
    <>
      <SectionTitle
        index={index}
        title="Controle interno"
        highlight="interno"
        description="Módulos da operação"
        action={
          hasRole(ctx, "ADMIN") && (
            <Link href="/settings/modules" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
              Gerenciar módulos <ArrowRight className="size-3" />
            </Link>
          )
        }
      />
      {mods.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {mods.map((m) => {
            const o = openBy.find((x) => x.moduleId === m.id)?._count._all ?? 0;
            const l = lateBy.find((x) => x.moduleId === m.id)?._count._all ?? 0;
            const s = Number(sumBy.find((x) => x.moduleId === m.id)?._sum.amount ?? 0);
            return (
              <Link key={m.id} href={`/m/${m.key}`} className="group">
                <Card className="relative h-full overflow-hidden p-4 transition group-hover:-translate-y-0.5 group-hover:border-line-strong">
                  <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: m.color }} />
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-9 items-center justify-center rounded-[8px] border border-line bg-surface-2" style={{ color: m.color }}>
                      <ModuleIcon name={m.icon} className="size-4" />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</p>
                    <ArrowRight className="size-3.5 text-muted transition group-hover:translate-x-0.5 group-hover:text-fg" />
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[30px] font-medium leading-none tracking-[-0.04em]">{String(o).padStart(2, "0")}</p>
                      <p className="mono-label mt-1 text-[10px] text-muted">em aberto</p>
                    </div>
                    <div className="text-right text-xs">
                      {l > 0 ? <p className="font-medium text-err">{l} vencido(s)</p> : <p className="text-muted">em dia</p>}
                      {m.amountFieldKey && <p className="mt-0.5 text-fg-2">{fmt(s, s >= 1e6)}</p>}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Package />}
            title="Monte o controle interno da sua empresa"
            description="Ordens de serviço, estoque, compras, frota, contratos, chamados e muito mais — ou crie módulos do zero."
            action={
              <Link href="/settings/modules" className="btn-drap inline-flex h-10 items-center rounded-[10px] px-4 text-sm font-medium">
                Ativar módulos
              </Link>
            }
          />
        </Card>
      )}
    </>
  );
}
