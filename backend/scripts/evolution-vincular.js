/**
 * Cria/conecta instância Baileys na Evolution API e salva o QR code.
 *
 *   node scripts/evolution-vincular.js
 *   node scripts/evolution-vincular.js --recreate   # apaga e recria instância travada
 *
 * Requer no .env (ou Render):
 *   WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_API_INSTANCE_NAME
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const baseUrl = (process.env.WHATSAPP_API_URL || "").trim().replace(/\/$/, "");
const apiKey = (process.env.WHATSAPP_API_KEY || "").trim();
const instanceName = (process.env.WHATSAPP_API_INSTANCE_NAME || "default").trim();
const forceRecreate = process.argv.includes("--recreate");

function fail(msg) {
  console.error(`\n[evolution] ${msg}`);
  process.exit(1);
}

const REQUEST_TIMEOUT_MS = 60000;

async function request(method, route, body, timeoutMs = REQUEST_TIMEOUT_MS) {
  const url = `${baseUrl}${route}`;
  const label = `${method} ${route}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    let data = null;
    const raw = await res.text();
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { raw };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (/timeout|aborted/i.test(String(err.message || err))) {
      fail(`Timeout (${timeoutMs / 1000}s) em ${label}. Evolution no Render pode estar lenta — abra ${baseUrl} no navegador e tente de novo.`);
    }
    throw err;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractQrBase64(data) {
  const raw =
    data?.qrcode?.base64 ||
    data?.base64 ||
    null;
  if (!raw) return null;
  const cleaned = String(raw).replace(/^data:image\/[a-z]+;base64,/, "");
  return cleaned.length > 100 ? cleaned : null;
}

function extractQrPayload(data) {
  const code = data?.code;
  if (typeof code === "string" && code.length > 20 && !code.startsWith("data:image")) {
    return code;
  }
  return null;
}

async function readConnectionState() {
  const state = await request(
    "GET",
    `/instance/connectionState/${encodeURIComponent(instanceName)}`
  );
  return (
    state.data?.instance?.state ||
    state.data?.state ||
    state.data?.status ||
    "desconhecido"
  );
}

async function solicitarConnect() {
  return request("GET", `/instance/connect/${encodeURIComponent(instanceName)}`);
}

async function logoutInstancia() {
  console.log("[evolution] Logout da instância (desbloqueia state=connecting)…");
  const res = await request("DELETE", `/instance/logout/${encodeURIComponent(instanceName)}`);
  console.log(`[evolution] Logout: HTTP ${res.status}`);
  await sleep(3000);
}

async function reiniciarInstancia() {
  console.log("[evolution] Reiniciando instância…");
  const res = await request("POST", `/instance/restart/${encodeURIComponent(instanceName)}`);
  console.log(`[evolution] Restart: HTTP ${res.status}`);
  await sleep(5000);
}

async function recriarInstancia() {
  console.log("[evolution] Removendo instância travada…");
  await request("DELETE", `/instance/delete/${encodeURIComponent(instanceName)}`);
  await sleep(2000);
  console.log("[evolution] Criando instância nova (WHATSAPP-BAILEYS)…");
  const created = await request("POST", "/instance/create", {
    instanceName,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  });
  if (!created.ok) {
    fail(`create falhou (${created.status}): ${JSON.stringify(created.data)}`);
  }
  await sleep(3000);
}

async function instanciaExiste() {
  const list = await request("GET", "/instance/fetchInstances");
  if (!list.ok) {
    fail(`fetchInstances falhou (${list.status}): ${JSON.stringify(list.data)}`);
  }
  const instances = Array.isArray(list.data) ? list.data : list.data?.instances || [];
  return instances.some(
    (i) =>
      i?.instance?.instanceName === instanceName ||
      i?.instanceName === instanceName ||
      i?.name === instanceName
  );
}

async function salvarQr(connectData, outPath) {
  const base64 = extractQrBase64(connectData);
  if (base64) {
    fs.writeFileSync(outPath, Buffer.from(base64, "base64"));
    return true;
  }

  const payload = extractQrPayload(connectData);
  if (payload) {
    await QRCode.toFile(outPath, payload, { width: 512, margin: 2 });
    return true;
  }

  return false;
}

async function temQr(connectData) {
  return Boolean(extractQrBase64(connectData) || extractQrPayload(connectData));
}

async function obterQrComDesbloqueio() {
  let connect = await solicitarConnect();
  if (await temQr(connect.data)) {
    return connect;
  }

  const connection = await readConnectionState();
  console.log(`[evolution] Sem QR (state=${connection}). Resposta: ${JSON.stringify(connect.data)}`);

  if (forceRecreate) {
    await recriarInstancia();
    connect = await solicitarConnect();
    return connect;
  }

  if (connection === "connecting" || connection === "close") {
    await logoutInstancia();
    connect = await solicitarConnect();
    if (await temQr(connect.data)) {
      return connect;
    }

    await reiniciarInstancia();
    connect = await solicitarConnect();
    if (await temQr(connect.data)) {
      return connect;
    }
  }

  for (let i = 0; i < 4; i += 1) {
    console.log(`[evolution] Aguardando QR… ${i + 1}/4`);
    await sleep(5000);
    connect = await solicitarConnect();
    if (await temQr(connect.data)) {
      return connect;
    }
  }

  console.log("[evolution] Instância ainda travada — recriando automaticamente…");
  await recriarInstancia();
  return solicitarConnect();
}

async function aguardarConexao(maxSeconds = 90) {
  console.log(`[evolution] Aguardando conexão (até ${maxSeconds}s) — escaneie o QR agora…`);
  const deadline = Date.now() + maxSeconds * 1000;
  while (Date.now() < deadline) {
    const connection = await readConnectionState();
    if (connection === "open") {
      console.log("[evolution] WhatsApp conectado com sucesso (state=open).");
      return true;
    }
    process.stdout.write(`\r[evolution] Estado: ${connection}…`);
    await sleep(3000);
  }
  console.log("");
  return false;
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
    fail(
      `Evolution API inacessível (${health.status}). Abra a URL no navegador e aguarde 1 min.`
    );
  }

  if (forceRecreate) {
    const connection = await readConnectionState();
    if (connection === "open" && !process.argv.includes("--force")) {
      console.log("[evolution] Instância já está conectada (state=open).");
      console.log("[evolution] NÃO use --recreate — isso apaga a sessão que funciona.");
      console.log("[evolution] Teste envio: node scripts/evolution-test-envio.js SEU_NUMERO");
      console.log("[evolution] Se insistir: node scripts/evolution-vincular.js --recreate --force");
      return;
    }
    await recriarInstancia();
  } else {
    const exists = await instanciaExiste();
    if (!exists) {
      await recriarInstancia();
    } else {
      console.log("[evolution] Instância já existe.");
    }
  }

  const connection = await readConnectionState();
  console.log(`[evolution] Estado: ${connection}`);

  if (connection === "open") {
    console.log("[evolution] WhatsApp já vinculado e conectado.");
    return;
  }

  const connect = await obterQrComDesbloqueio();
  if (!connect.ok) {
    fail(`connect falhou (${connect.status}): ${JSON.stringify(connect.data)}`);
  }

  const out = path.join(__dirname, "..", "uploads", `evolution-qr-${instanceName}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const saved = await salvarQr(connect.data, out);
  if (!saved) {
    console.log("[evolution] Resposta connect:", JSON.stringify(connect.data, null, 2));
    fail(
      'QR não retornado. Tente: node scripts/evolution-vincular.js --recreate\nOu abra o Manager: ' +
        `${baseUrl}/manager`
    );
  }

  console.log(`\n[evolution] QR salvo em: ${out}`);
  console.log("[evolution] WhatsApp → Aparelhos conectados → Conectar aparelho → escaneie o QR.");
  console.log("[evolution] QR expira em ~60s.");

  const conectou = await aguardarConexao(90);
  if (!conectou) {
    console.log("[evolution] Ainda não conectou. Rode de novo e escaneie assim que o QR aparecer.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[evolution] Erro:", err.message || err);
  process.exit(1);
});
