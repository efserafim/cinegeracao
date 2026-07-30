/**
 * Testa envio de mensagem via Evolution API (diagnóstico de timeout Baileys).
 *
 *   node scripts/evolution-test-envio.js 5522999999999
 *
 * Requer no .env: WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_API_INSTANCE_NAME
 */
require("dotenv").config();

const { formatWhatsAppNumber } = require("../src/services/whatsappService");

const baseUrl = (process.env.WHATSAPP_API_URL || "").trim().replace(/\/$/, "");
const apiKey = (process.env.WHATSAPP_API_KEY || "").trim();
const instanceName = (process.env.WHATSAPP_API_INSTANCE_NAME || "default").trim();
const rawPhone = process.argv[2];

function fail(msg) {
  const err = new Error(msg);
  err.isUserError = true;
  throw err;
}

async function main() {
  if (!baseUrl || !apiKey) {
    fail("Configure WHATSAPP_API_URL e WHATSAPP_API_KEY no .env.");
  }
  if (!rawPhone) {
    fail("Informe o número: node scripts/evolution-test-envio.js 5522999999999");
  }

  const number = formatWhatsAppNumber(rawPhone);
  if (!number) fail(`Telefone inválido: ${rawPhone}`);

  console.log(`[evolution-test] URL: ${baseUrl}`);
  console.log(`[evolution-test] Instância: ${instanceName}`);
  console.log(`[evolution-test] Número: ${number}`);

  const stateRes = await fetch(
    `${baseUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`,
    { headers: { apikey: apiKey }, signal: AbortSignal.timeout(30000) }
  );
  const stateBody = await stateRes.json().catch(() => null);
  const state = stateBody?.instance?.state || stateBody?.state || "desconhecido";
  console.log(`[evolution-test] Estado da instância: ${state}`);

  if (state !== "open") {
    fail(
      `Instância não conectada (state=${state}). Rode "node scripts/evolution-vincular.js", escaneie o QR e aguarde state=open antes de testar envio.`
    );
  }

  const url = `${baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
  const payload = {
    number,
    text: "Teste CineGeração — se recebeu, o envio está OK.",
    linkPreview: false
  };

  console.log("[evolution-test] Enviando… (timeout 60s)");
  const started = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000)
  });
  const elapsed = Date.now() - started;
  const text = await res.text();

  console.log(`[evolution-test] HTTP ${res.status} em ${elapsed}ms`);
  console.log(text);

  if (res.status === 400 && /exists":false/i.test(text)) {
    console.error(
      "\n[evolution-test] A API respondeu rápido, mas o número não existe no WhatsApp (exists:false)."
    );
    console.error("[evolution-test] Confira o DDD e dígitos. Ex.: Lavínia (22) 99818-7602 → 5522998187602");
    process.exitCode = 1;
    return;
  }

  if (!res.ok) {
    process.exitCode = 1;
    return;
  }

  console.log("\n[evolution-test] Mensagem enviada com sucesso.");
}

main().catch((err) => {
  console.error(`\n[evolution-test] ${err.message || err}`);
  if (/timeout|aborted/i.test(String(err.message || err))) {
    console.error(
      "\n[evolution-test] Timeout no sendText com state=open indica Baileys desatualizado."
    );
    console.error(
      "No Render da Evolution, atualize CONFIG_SESSION_PHONE_VERSION, reinicie e escaneie o QR."
    );
    console.error("Veja backend/EVOLUTION_README.md seção «sendText trava».");
  }
  process.exitCode = 1;
});
