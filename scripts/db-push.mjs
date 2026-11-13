// Sincroniza o schema do banco durante o build.
// CRM_DATABASE_URL (opcional) tem prioridade sobre DATABASE_URL — útil quando o projeto
// já tem outro banco conectado pela integração e você quer usar um banco dedicado ao CRM.
import { spawnSync } from "node:child_process";

const env = { ...process.env };
if (env.CRM_DATABASE_URL) {
  env.DATABASE_URL = env.CRM_DATABASE_URL;
  env.DATABASE_URL_UNPOOLED = env.CRM_DATABASE_URL_UNPOOLED || env.CRM_DATABASE_URL;
}
env.DATABASE_URL_UNPOOLED ||= env.DATABASE_URL;

const r = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], { stdio: "inherit", env });
if (r.status !== 0) process.exit(r.status ?? 1);

// Ajuste único: produtos antigos cobrados "por mês" passam a ser recorrentes (mensal).
// Marca cada empresa ajustada para nunca repetir (e não afeta empresas criadas depois).
const backfill = `
UPDATE "Product" p SET billing = 'RECURRING', "interval" = 'MONTHLY'
FROM "Organization" o
WHERE o.id = p."orgId" AND NOT (o.settings ? 'billingBackfilled') AND o."createdAt" < '2026-11-14'
  AND p.billing = 'ONE_TIME' AND p."interval" IS NULL AND p.unit ~* 'm[eê]s$';
UPDATE "Organization" SET settings = settings || '{"billingBackfilled": true}'::jsonb
WHERE NOT (settings ? 'billingBackfilled') AND "createdAt" < '2026-11-14';
`;
const b = spawnSync("npx", ["prisma", "db", "execute", "--stdin", "--schema", "prisma/schema.prisma"], { input: backfill, stdio: ["pipe", "inherit", "inherit"], env });
process.exit(b.status ?? 1);
