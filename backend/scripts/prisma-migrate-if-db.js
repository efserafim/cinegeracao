const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const schemaPath = path.join(root, "prisma", "schema.prisma");

function sh(command, { allowFail = false } = {}) {
  try {
    console.log(`[prisma-migrate-if-db] $ ${command}`);
    execSync(command, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
    return true;
  } catch (err) {
    if (allowFail) {
      return false;
    }
    console.error("[prisma-migrate-if-db] fatal:", err.message || err);
    process.exit(err.status || 1);
  }
}

const { applyDatabasePoolLimitToEnv } = require("../src/config/databaseUrl");

applyDatabasePoolLimitToEnv();

if (!process.env.DATABASE_URL) {
  console.warn("[prisma-migrate-if-db] DATABASE_URL is not configured. Skipping Prisma migrate deploy.");
  process.exit(0);
}

console.log("[prisma-migrate-if-db] Checking database connectivity...");
const canConnect = sh(`npx prisma db execute --execute \"SELECT 1\" --schema \"${schemaPath}\"`, { allowFail: true });

if (!canConnect) {
  console.warn("[prisma-migrate-if-db] Database is unreachable. Skipping Prisma migrate deploy.");
  process.exit(0);
}

console.log("[prisma-migrate-if-db] Database reachable. Running Prisma migrate deploy...");
sh(`npx prisma migrate deploy --schema \"${schemaPath}\"`);
console.log("[prisma-migrate-if-db] Prisma migrate deploy finished.");
