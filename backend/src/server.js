const { execSync } = require("child_process");
const path = require("path");
const app = require("./app");
const config = require("./config");
const prisma = require("./config/prisma");

function runMigrations() {
  try {
    console.log("[boot] Aplicando migrations Prisma...");
    execSync("npx prisma migrate deploy", {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
      env: process.env
    });
    console.log("[boot] Migrations OK");
  } catch (err) {
    console.error("[boot] Falha ao aplicar migrations:", err.message);
  }
}

async function start() {
  runMigrations();
  try {
    await prisma.$connect();
    app.listen(config.port, () => {
      console.log(`API rodando em http://localhost:${config.port}`);
      console.log(`Swagger: http://localhost:${config.port}/api/docs`);
    });
  } catch (err) {
    console.error("Falha ao iniciar servidor:", err);
    process.exit(1);
  }
}

start();
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
