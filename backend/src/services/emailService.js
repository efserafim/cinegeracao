const nodemailer = require("nodemailer");
const config = require("../config");
let transporter = null;
function smtpConfigurado() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}
function getTransporter() {
  if (!smtpConfigurado()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    });
  }
  return transporter;
}
async function enviarConfirmacaoInscricao({
  para,
  nome,
  evento,
  data,
  horario,
  local,
  cidade,
  codigoIngresso,
  codigoInscricao,
  chegada
}) {
  if (!para) {
    return { sent: false, reason: "Participante sem e-mail" };
  }
  const baseUrl = (config.frontendUrl || "http://localhost:5173").replace(/\/$/, "");
  const linkIngresso = `${baseUrl}/ingresso/${codigoInscricao}`;
  const subject = `Ingresso confirmado – ${evento}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#070a12;padding:24px;text-align:center;border-radius:12px 12px 0 0">
        <p style="color:#f5c542;margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase">CineGeração</p>
        <h1 style="color:#fff;margin:8px 0 0;font-size:22px">Inscrição confirmada!</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 12px 12px">
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu pagamento foi confirmado. Seguem os dados do evento:</p>
        <ul style="line-height:1.7;padding-left:18px">
          <li><strong>Filme / evento:</strong> ${evento}</li>
          <li><strong>Data:</strong> ${data}</li>
          <li><strong>Sessão:</strong> ${horario}${chegada ? ` · Chegada ${chegada}` : ""}</li>
          <li><strong>Local:</strong> ${local}${cidade ? ` – ${cidade}` : ""}</li>
          <li><strong>Código do ingresso:</strong> ${codigoIngresso}</li>
        </ul>
        <p style="margin:24px 0">
          <a href="${linkIngresso}"
             style="display:inline-block;background:#e11d2e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">
            Ver meu ingresso (QR Code)
          </a>
        </p>
        <p style="font-size:13px;color:#555">Apresente o QR Code na entrada. Até lá!</p>
      </div>
    </div>
  `;
  const tx = getTransporter();
  if (!tx) {
    console.warn(`[EMAIL] SMTP não configurado – não enviado para ${para}`);
    return { sent: false, reason: "SMTP não configurado no servidor" };
  }
  try {
    await tx.sendMail({
      from: config.smtp.from,
      to: para,
      subject,
      html
    });
    console.log(`[EMAIL] Confirmação enviada para ${para}`);
    return { sent: true, to: para };
  } catch (err) {
    console.error("[EMAIL] Falha ao enviar:", err.message);
    return { sent: false, reason: err.message };
  }
}
module.exports = { enviarConfirmacaoInscricao, smtpConfigurado };
