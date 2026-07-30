const config = require("../config");
const { onlyDigits } = require("../utils/sanitize");

const WHATSAPP_SEND_TIMEOUT_MS = 30000;
const WHATSAPP_WAKE_TIMEOUT_MS = 90000;
const WHATSAPP_MAX_RETRIES = 2;
const WHATSAPP_RETRY_DELAY_MS = 3000;
const WHATSAPP_BAILEYS_TIMEOUT_HINT =
  "Evolution/Baileys não respondeu ao enviar. No serviço Evolution no Render, atualize CONFIG_SESSION_PHONE_VERSION, reinicie o serviço e escaneie o QR de novo (veja backend/EVOLUTION_README.md).";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function whatsappConfigurado() {
  return Boolean(
    config.whatsappApiUrl &&
    config.whatsappApiKey &&
    config.whatsappApiInstanceName
  );
}

function maskPhone(number) {
  const digits = String(number || "");
  if (digits.length <= 4) return "****";
  return `***${digits.slice(-4)}`;
}

function formatWhatsAppNumber(raw) {
  const digits = onlyDigits(raw || "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function buildLembretePagamentoWhatsAppText({
  nome,
  evento,
  data,
  horario,
  local,
  cidade,
  valor,
  codigoInscricao,
  linkPagamento,
  prazo = "hoje"
}) {
  const primeiroNome = String(nome || "").trim().split(/\s+/)[0] || "amigo";
  const valorFmt = Number(valor);
  const valorTexto = Number.isFinite(valorFmt)
    ? `R$ ${valorFmt.toFixed(2).replace(".", ",")}`
    : "valor não informado";
  const localTexto = String(local || "").trim();
  const cidadeTexto = String(cidade || "").trim();
  const localCompleto = cidadeTexto ? `${localTexto} – ${cidadeTexto}` : localTexto;
  const codigoTexto = codigoInscricao ? `Código: ${codigoInscricao}` : "";
  return [
    "🕷️ CineGeração — lembrete de pagamento",
    "",
    `Olá, ${primeiroNome}!`,
    "",
    `O prazo foi estendido até ${prazo} às 23h59.`,
    "Quanto mais rápido você confirmar o pagamento, melhores assentos conseguimos reservar para você!",
    "",
    `Evento: ${evento || "CineGeração"}`,
    `Data: ${data || "—"}`,
    `Sessão: ${horario || "—"}`,
    `Local: ${localCompleto || "—"}`,
    `Valor: ${valorTexto}`,
    codigoTexto,
    "",
    `Acesse e confirme sua inscrição: ${linkPagamento}`,
    "",
    "Qualquer dúvida, entre em contato com Lavínia: (22) 99818-7602.",
    "",
    "Que Deus abençoe este encontro. — Coordenação Grupo Jovem Geração Eucarística"
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");
}

function evolutionHeaders(extra = {}) {
  return {
    apikey: config.whatsappApiKey,
    ...extra
  };
}

async function garantirEvolutionDisponivel() {
  if (!whatsappConfigurado()) {
    return { ok: false, reason: "WhatsApp API não configurada." };
  }

  const base = config.whatsappApiUrl.replace(/\/$/, "");
  const instance = encodeURIComponent(config.whatsappApiInstanceName);

  try {
    console.log("[WHATSAPP] Acordando Evolution API...");
    await fetch(`${base}/`, {
      headers: evolutionHeaders(),
      signal: AbortSignal.timeout(WHATSAPP_WAKE_TIMEOUT_MS)
    });
  } catch (err) {
    console.warn("[WHATSAPP] Evolution demorou ao acordar:", err.message || err);
  }

  try {
    const res = await fetch(`${base}/instance/connectionState/${instance}`, {
      headers: evolutionHeaders(),
      signal: AbortSignal.timeout(30000)
    });
    const body = await res.json().catch(() => null);
    const state = body?.instance?.state || body?.state || null;

    if (state && state !== "open") {
      const reason = `Instância WhatsApp desconectada (${state}). Escaneie o QR novamente.`;
      console.error(`[WHATSAPP] ${reason}`);
      return { ok: false, reason, state };
    }

    console.log(`[WHATSAPP] Evolution disponível${state ? ` (state=${state})` : ""}.`);
    return { ok: true, state: state || "unknown" };
  } catch (err) {
    console.warn("[WHATSAPP] Não foi possível verificar conexão:", err.message || err);
    return { ok: true, state: "unknown" };
  }
}

async function enviarLembretePagamentoWhatsApp({ telefone, text }) {
  if (!whatsappConfigurado()) {
    return { sent: false, reason: "WhatsApp API não configurada." };
  }

  const number = formatWhatsAppNumber(telefone);
  if (!number) {
    return { sent: false, reason: "Telefone WhatsApp inválido." };
  }

  const url = `${config.whatsappApiUrl.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(
    config.whatsappApiInstanceName
  )}`;
  const payload = { number, text, linkPreview: false };

  let lastReason = "Falha ao enviar mensagem WhatsApp";

  for (let attempt = 1; attempt <= WHATSAPP_MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: evolutionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(WHATSAPP_SEND_TIMEOUT_MS)
      });

      let body;
      try {
        body = await res.json();
      } catch {
        body = null;
      }

      if (res.ok) {
        console.log(`[WHATSAPP] Enviado para ${maskPhone(number)}`);
        return { sent: true, provider: "evolution-api", result: body };
      }

      lastReason = body?.error?.message || body?.error || body?.message || `WhatsApp HTTP ${res.status}`;
      if (typeof lastReason === "object") {
        lastReason = JSON.stringify(lastReason);
      }
      const retryable = res.status >= 500 || res.status === 408 || res.status === 429;
      if (!retryable || attempt === WHATSAPP_MAX_RETRIES) {
        return { sent: false, reason: lastReason };
      }
    } catch (err) {
      lastReason = err.message || "Falha ao enviar mensagem WhatsApp";
      const isTimeout = /timeout|aborted/i.test(lastReason);
      if (isTimeout) {
        lastReason = WHATSAPP_BAILEYS_TIMEOUT_HINT;
      }
      if (attempt === WHATSAPP_MAX_RETRIES) {
        console.error(`[WHATSAPP] Falha ao enviar lembrete (${maskPhone(number)}):`, lastReason);
        return { sent: false, reason: lastReason };
      }
      console.warn(
        `[WHATSAPP] Tentativa ${attempt}/${WHATSAPP_MAX_RETRIES} falhou para ${maskPhone(number)} (${err.message || lastReason}), repetindo...`
      );
      if (attempt === 1) {
        await garantirEvolutionDisponivel();
      }
      await sleep(WHATSAPP_RETRY_DELAY_MS);
    }
  }

  return { sent: false, reason: lastReason };
}

module.exports = {
  whatsappConfigurado,
  garantirEvolutionDisponivel,
  enviarLembretePagamentoWhatsApp,
  buildLembretePagamentoWhatsAppText,
  formatWhatsAppNumber
};
