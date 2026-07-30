const config = require("../config");
const { onlyDigits } = require("../utils/sanitize");

const WHATSAPP_FETCH_TIMEOUT_MS = 15000;

function whatsappConfigurado() {
  return Boolean(
    config.whatsappApiUrl &&
    config.whatsappApiKey &&
    config.whatsappApiInstanceName
  );
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
  const payload = {
    number,
    text,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.whatsappApiKey
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WHATSAPP_FETCH_TIMEOUT_MS)
    });

    let body;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      const message = body?.error?.message || body?.error || body?.message || `WhatsApp HTTP ${res.status}`;
      return { sent: false, reason: message };
    }

    return { sent: true, provider: "evolution-api", result: body };
  } catch (err) {
    console.error("[WHATSAPP] Falha ao enviar lembrete:", err.message || err);
    return { sent: false, reason: err.message || "Falha ao enviar mensagem WhatsApp" };
  }
}

module.exports = {
  whatsappConfigurado,
  enviarLembretePagamentoWhatsApp,
  buildLembretePagamentoWhatsAppText,
  formatWhatsAppNumber
};
