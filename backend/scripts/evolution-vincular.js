/**
 * Cria/conecta instância Baileys na Evolution API e salva o QR code.
 *
 *   node scripts/evolution-vincular.js
 *
 * Requer no .env (ou Render):
 *   WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_API_INSTANCE_NAME
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const baseUrl = (process.env.WHATSAPP_API_URL || "").trim().replace(/\/$/, "");
const apiKey = (process.env.WHATSAPP_API_KEY || "").trim();
const instanceName = (process.env.WHATSAPP_API_INSTANCE_NAME || "default").trim();

function fail(msg) {
  console.error(`\n[evolution] ${msg}`);
  process.exit(1);
}

async function request(method, route, body) {
  const url = `${baseUrl}${route}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const raw = await res.text();
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }
  return { ok: res.ok, status: res.status, data };
}

function extractQr(data) {
  const base64 =
    data?.qrcode?.base64 ||
    data?.base64 ||
    data?.code ||
    data?.pairingCode ||
    null;
  if (!base64) return null;
  const cleaned = String(base64).replace(/^data:image\/[a-z]+;base64,/, "");
  return cleaned;
}

async function main() {
  if (!baseUrl || baseUrl.includes("example.com") || !apiKey || apiKey.includes("coloque_aqui")) {
    fail(
      "Configure WHATSAPP_API_URL e WHATSAPP_API_KEY no .env (valores reais da Evolution no Render)."
    );
  }
  if (!instanceName) fail("WHATSAPP_API_INSTANCE_NAME vazio.");

  console.log(`[evolution] URL: ${baseUrl}`);
  console.log(`[evolution] Instância: ${instanceName}`);

  const health = await request("GET", "/");
  if (!health.ok && health.status >= 500) {
    fail(`Evolution API inacessível (${health.status}). Serviço no Render pode estar dormindo — abra a URL no navegador e aguarde 1 min.`);
  }

  const list = await request("GET", "/instance/fetchInstances");
  if (!list.ok) {
    fail(`fetchInstances falhou (${list.status}): ${JSON.stringify(list.data)}`);
  }

  const instances = Array.isArray(list.data) ? list.data : list.data?.instances || [];
  const exists = instances.some(
    (i) =>
      i?.instance?.instanceName === instanceName ||
      i?.instanceName === instanceName ||
      i?.name === instanceName
  );

  if (!exists) {
    console.log("[evolution] Instância não existe — criando (WHATSAPP-BAILEYS)…");
    const created = await request("POST", "/instance/create", {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    });
    if (!created.ok) {
      fail(`create falhou (${created.status}): ${JSON.stringify(created.data)}`);
    }
    console.log("[evolution] Instância criada.");
  } else {
    console.log("[evolution] Instância já existe.");
  }

  const connect = await request("GET", `/instance/connect/${encodeURIComponent(instanceName)}`);
  if (!connect.ok) {
    fail(`connect falhou (${connect.status}): ${JSON.stringify(connect.data)}`);
  }

  const state = await request(
    "GET",
    `/instance/connectionState/${encodeURIComponent(instanceName)}`
  );
  const connection =
    state.data?.instance?.state ||
    state.data?.state ||
    state.data?.status ||
    "desconhecido";
  console.log(`[evolution] Estado: ${connection}`);

  if (connection === "open") {
    console.log("[evolution] WhatsApp já vinculado e conectado.");
    return;
  }

  const qrBase64 = extractQr(connect.data);
  if (!qrBase64) {
    console.log("[evolution] Resposta connect:", JSON.stringify(connect.data, null, 2));
    fail("QR code não retornado. Tente de novo em 30s ou abra o Evolution Manager.");
  }

  const out = path.join(__dirname, "..", "uploads", `evolution-qr-${instanceName}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(qrBase64, "base64"));
  console.log(`\n[evolution] QR salvo em: ${out}`);
  console.log("[evolution] WhatsApp → Aparelhos conectados → Conectar aparelho → escaneie o QR.");
  console.log("[evolution] QR expira em ~60s. Rode o script de novo se precisar.");
}

main().catch((err) => {
  console.error("[evolution] Erro:", err.message || err);
  process.exit(1);
});
