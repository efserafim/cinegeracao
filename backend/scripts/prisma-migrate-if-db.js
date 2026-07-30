const { execSync } = require("child_process");
const path = require("path");
const {
  applyDatabasePoolLimitToEnv,
  resolveMigrateDatabaseUrl,
} = require("../src/config/databaseUrl");

const root = path.join(__dirname, "..");
const schemaPath = path.join(root, "prisma", "schema.prisma");

function sh(command, env, { allowFail = false, timeoutMs = 90000 } = {}) {
  try {
    console.log(`[prisma-migrate-if-db] $ ${command}`);
    execSync(command, {
      cwd: root,
      stdio: "inherit",
      env,
      shell: true,
      timeout: timeoutMs,
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

applyDatabasePoolLimitToEnv();

if (!process.env.DATABASE_URL) {
  console.warn("[prisma-migrate-if-db] DATABASE_URL is not configured. Skipping Prisma migrate deploy.");
  process.exit(0);
}

const migrateUrl = resolveMigrateDatabaseUrl();
if (!migrateUrl) {
  console.warn("[prisma-migrate-if-db] Could not resolve migrate URL. Skipping.");
  process.exit(0);
}

const migrateEnv = { ...process.env, DATABASE_URL: migrateUrl };
const migrateHost = migrateUrl.replace(/:[^:@/]+@/, ":***@");
console.log(`[prisma-migrate-if-db] Migrate via session pooler: ${migrateHost}`);

console.log("[prisma-migrate-if-db] Checking database connectivity...");
const canConnect = sh(
  `npx prisma db execute --execute "SELECT 1" --schema "${schemaPath}"`,
  migrateEnv,
  { allowFail: true }
);

if (!canConnect) {
  console.warn("[prisma-migrate-if-db] Database is unreachable. Skipping Prisma migrate deploy.");
  process.exit(0);
}

console.log("[prisma-migrate-if-db] Database reachable. Running Prisma migrate deploy...");
sh(`npx prisma migrate deploy --schema "${schemaPath}"`, migrateEnv, { timeoutMs: 120000 });
console.log("[prisma-migrate-if-db] Prisma migrate deploy finished.");
