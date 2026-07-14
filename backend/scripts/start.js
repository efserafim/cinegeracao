/**
 * Unblock Prisma P3009 and ensure pré-inscrição schema, then start the API.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const schema = path.join(root, "prisma", "schema.prisma");

const PRE_MIGRATIONS = [
  "20260714190000_pre_inscricao",
  "20260714190001_pre_inscricao_status",
  "20260714190100_ativar_pre_inscricao",
];

function sh(command, { allowFail = false } = {}) {
  try {
    console.log(`[start] $ ${command}`);
    execSync(command, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
    return true;
  } catch (err) {
    if (allowFail) {
      console.warn(`[start] continue after failure: ${command}`);
      return false;
    }
    console.error(`[start] fatal: ${command}`);
    process.exit(err.status || 1);
  }
}

function dbExecute(sql) {
  const file = path.join(os.tmpdir(), `cg-sql-${crypto.randomBytes(6).toString("hex")}.sql`);
  fs.writeFileSync(file, `${sql.trim()}\n`, "utf8");
  try {
    return sh(
      `npx prisma db execute --file "${file}" --schema "${schema}"`,
      { allowFail: true }
    );
  } finally {
    try {
      fs.unlinkSync(file);
    } catch (_) {
      /* ignore */
    }
  }
}

function checksumOf(migrationName) {
  const file = path.join(root, "prisma", "migrations", migrationName, "migration.sql");
  if (!fs.existsSync(file)) return "";
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

console.log("[start] fixing pré-inscrição migrations if stuck…");

dbExecute(`
DELETE FROM "_prisma_migrations"
WHERE migration_name IN (
  '${PRE_MIGRATIONS.join("',\n  '")}'
);
`);

dbExecute(`ALTER TYPE "StatusEvento" ADD VALUE IF NOT EXISTS 'PRE_INSCRICAO';`);
dbExecute(`ALTER TYPE "StatusInscricao" ADD VALUE IF NOT EXISTS 'PRE_INSCRITA';`);
dbExecute(`UPDATE "eventos" SET status = 'PRE_INSCRICAO' WHERE status = 'ABERTO';`);

for (const name of PRE_MIGRATIONS) {
  const checksum = checksumOf(name);
  dbExecute(`
INSERT INTO "_prisma_migrations" (
  id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
) VALUES (
  '${crypto.randomUUID()}',
  '${checksum}',
  NOW(),
  '${name}',
  NULL,
  NULL,
  NOW(),
  1
);
`);
}

if (!sh("npx prisma migrate deploy", { allowFail: true })) {
  console.error("[start] prisma migrate deploy failed after recovery");
  process.exit(1);
}

sh("npx prisma generate");
require("../src/server");
