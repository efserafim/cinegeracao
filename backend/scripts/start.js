/**
 * Clear stuck pré-inscrição migrations, then start the API.
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

console.log("[start] clearing failed pré-inscrição migration rows…");
dbExecute(`
DELETE FROM "_prisma_migrations"
WHERE migration_name IN (
  '${PRE_MIGRATIONS.join("',\n  '")}'
);
`);

for (const name of PRE_MIGRATIONS) {
  sh(`npx prisma migrate resolve --rolled-back "${name}"`, { allowFail: true });
}

if (!sh("npx prisma migrate deploy", { allowFail: true })) {
  console.warn("[start] migrate deploy failed — marking pré-inscrição migrations as applied…");
  for (const name of PRE_MIGRATIONS) {
    sh(`npx prisma migrate resolve --applied "${name}"`, { allowFail: true });
  }
  if (!sh("npx prisma migrate deploy", { allowFail: true })) {
    console.error("[start] prisma migrate deploy still failing");
    process.exit(1);
  }
}

sh("npx prisma generate");
require("../src/server");
