/**
 * Recover from failed Prisma migrations (P3009), then start the API.
 * Render keeps a failed row in `_prisma_migrations` until it is cleared.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const schema = path.join(root, "prisma", "schema.prisma");

const FAILED = [
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
      console.warn(`[start] command failed (continuing): ${command}`);
      return false;
    }
    console.error(`[start] command failed: ${command}`);
    process.exit(err.status || 1);
  }
}

function dbExecute(sql) {
  const file = path.join(os.tmpdir(), `cinegeracao-migrate-fix-${Date.now()}.sql`);
  fs.writeFileSync(file, sql, "utf8");
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

console.log("[start] clearing failed pre-inscricao migration rows (if any)…");
dbExecute(`
DELETE FROM "_prisma_migrations"
WHERE migration_name IN (
  '${FAILED.join("',\n  '")}'
)
AND finished_at IS NULL;
`);

for (const name of FAILED) {
  sh(`npx prisma migrate resolve --rolled-back "${name}"`, { allowFail: true });
}

let ok = sh("npx prisma migrate deploy", { allowFail: true });

if (!ok) {
  console.warn("[start] migrate deploy failed — ensuring enum values exist, then marking applied…");

  dbExecute(`
DO $$ BEGIN
  ALTER TYPE "StatusEvento" ADD VALUE 'PRE_INSCRICAO';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`);

  dbExecute(`
DO $$ BEGIN
  ALTER TYPE "StatusInscricao" ADD VALUE 'PRE_INSCRITA';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`);

  dbExecute(`
UPDATE "eventos" SET status = 'PRE_INSCRICAO' WHERE status = 'ABERTO';
`);

  for (const name of FAILED) {
    sh(`npx prisma migrate resolve --applied "${name}"`, { allowFail: true });
  }

  ok = sh("npx prisma migrate deploy", { allowFail: true });
}

if (!ok) {
  console.error("[start] prisma migrate deploy still failing after recovery");
  process.exit(1);
}

sh("npx prisma generate");
require("../src/server");
