/**
 * Boot da API. No Render (RENDER=true), sobe direto — migrate/generate ficam no build.
 */
require("dotenv").config();
const { applyDatabasePoolLimitToEnv } = require("../src/config/databaseUrl");

applyDatabasePoolLimitToEnv();

if (process.env.RENDER) {
  console.log("[start] Render: boot mínimo (sem migrate/sync extra)");
  require("../src/server");
} else {
  require("./start-local");
}
