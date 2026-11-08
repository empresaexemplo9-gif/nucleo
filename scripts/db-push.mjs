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
process.exit(r.status ?? 1);
