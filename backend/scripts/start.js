/**
 * Soft-recover failed Prisma enum migrations on Render, then start the API.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

function run(command, args, { allowFail = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0 && !allowFail) {
    return false;
  }
  return result.status === 0;
}

const maybeFailed = [
  "20260714190000_pre_inscricao",
  "20260714190001_pre_inscricao_status",
  "20260714190100_ativar_pre_inscricao",
];

let ok = run("npx", ["prisma", "migrate", "deploy"], { allowFail: true });
if (!ok) {
  console.warn("[start] migrate deploy failed — attempting recovery of pre-inscricao migrations…");
  for (const name of maybeFailed) {
    run("npx", ["prisma", "migrate", "resolve", "--rolled-back", name], { allowFail: true });
  }
  ok = run("npx", ["prisma", "migrate", "deploy"], { allowFail: true });
}

if (!ok) {
  console.error("[start] prisma migrate deploy still failing");
  process.exit(1);
}

if (!run("npx", ["prisma", "generate"])) {
  process.exit(1);
}

require("../src/server");
