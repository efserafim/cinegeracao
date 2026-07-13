const nodemailer = require("nodemailer");
const config = require("../config");

let transporter = null;

function smtpConfigurado() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}

function emailConfigurado() {
  return Boolean(
    config.sendgridApiKey || config.brevoApiKey || config.resendApiKey || smtpConfigurado()
  );
}

function parseFrom(fromRaw) {
  const raw = String(fromRaw || "CineGeração <onboarding@resend.dev>").trim();
  const m = raw.match(/^(.*)<([^>]+)>$/);
  if (m) {
    return { name: m[1].trim().replace(/^"|"$/g, "") || "CineGeração", email: m[2].trim() };
  }
  if (raw.includes("@")) return { name: "CineGeração", email: raw };
  return { name: "CineGeração", email: raw };
}

async function enviarViaSendGrid({ para, subject, html, text }) {
  const from = parseFrom(config.smtp.from || config.smtp.user);
  if (!from.email.includes("@")) {
    throw new Error("SMTP_FROM inválido para SendGrid. Use: CineGeração <seu@email.com>");
  }
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.sendgridApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: para }] }],
      from,
      subject,
      content: [
        { type: "text/plain", value: text || " " },
        { type: "text/html", value: html || "<p></p>" }
      ]
    })
  });
  if (res.status === 202 || res.ok) {
    return { sent: true, to: para, provider: "sendgrid" };
  }
  const body = await res.json().catch(() => ({}));
  const errMsg =
    body.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
    body.message ||
    `SendGrid HTTP ${res.status}`;
  throw new Error(errMsg);
}

async function enviarViaBrevo({ para, subject, html, text }) {
  const sender = parseFrom(config.smtp.from || config.smtp.user);
  if (!sender.email.includes("@")) {
    throw new Error("SMTP_FROM inválido para Brevo. Use: CineGeração <seu@email.com>");
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": config.brevoApiKey
    },
    body: JSON.stringify({
      sender,
      to: [{ email: para }],
      subject,
      htmlContent: html,
      textContent: text
    })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || body.error?.message || `Brevo HTTP ${res.status}`);
  }
  return { sent: true, to: para, id: body.messageId, provider: "brevo" };
}

async function enviarViaResend({ para, subject, html, text }) {
  const from = config.smtp.from || "CineGeração <noreply@geucaristica.com.br>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [para],
      subject,
      html,
      text
    })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.message || body.error || `Resend HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return { sent: true, to: para, id: body.id, provider: "resend" };
}

function getTransporter() {
  if (!smtpConfigurado()) return null;
  if (!transporter) {
    const port = config.smtp.port;
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port,
      secure: config.smtp.secure || port === 465,
      requireTLS: !config.smtp.secure && port === 587,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true }
    });
  }
  return transporter;
}

function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    })
  ]);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const VERSO_BIBLICO = {
  texto: "Porque onde estiverem dois ou três reunidos em meu nome, aí estou eu no meio deles.",
  referencia: "Mt 18,20"
};

function montarListaTickets(tickets = [], codigoIngresso) {
  if (Array.isArray(tickets) && tickets.length > 0) {
    return tickets
      .map((t, i) => {
        const nome = escapeHtml(t.nome || `Pessoa ${i + 1}`);
        const codigo = escapeHtml(t.codigo || "—");
        return `<tr>
          <td style="padding:12px 14px;border-bottom:1px solid rgba(225,29,46,.12);font-size:14px;color:#0b1020;background:#ffffff">${nome}</td>
          <td style="padding:12px 14px;border-bottom:1px solid rgba(225,29,46,.12);font-size:13px;font-family:Consolas,'Courier New',monospace;color:#e11d2e;font-weight:bold;letter-spacing:0.5px;background:#ffffff">${codigo}</td>
        </tr>`;
      })
      .join("");
  }
  if (codigoIngresso) {
    return `<tr>
      <td style="padding:12px 14px;border-bottom:1px solid rgba(225,29,46,.12);font-size:14px;background:#ffffff" colspan="2">
        <span style="font-family:Consolas,'Courier New',monospace;color:#e11d2e;font-weight:bold">${escapeHtml(codigoIngresso)}</span>
      </td>
    </tr>`;
  }
  return "";
}

function buildConfirmacaoHtml({
  nome,
  evento,
  data,
  horario,
  local,
  cidade,
  codigoIngresso,
  codigoInscricao,
  chegada,
  tickets,
  quantidade,
  linkIngresso
}) {
  const nomeSafe = escapeHtml(nome);
  const primeiroNome = escapeHtml(String(nome || "").trim().split(/\s+/)[0] || "herói");
  const eventoSafe = escapeHtml(evento);
  const dataSafe = escapeHtml(data);
  const horarioSafe = escapeHtml(horario);
  const localSafe = escapeHtml(local);
  const cidadeSafe = escapeHtml(cidade);
  const chegadaSafe = escapeHtml(chegada || "17h10");
  const codigoInscSafe = escapeHtml(codigoInscricao);
  const qtd = Number(quantidade) || (Array.isArray(tickets) ? tickets.length : 1) || 1;
  const listaTickets = montarListaTickets(tickets, codigoIngresso);
  const linkSafe = escapeHtml(linkIngresso);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CineGeração — ingresso confirmado</title>
</head>
<body style="margin:0;padding:0;background:#070a12;font-family:Arial,Helvetica,sans-serif">
  <!-- preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">
    ${primeiroNome}, seu ingresso do CineGeração · Homem-Aranha: Um novo dia está confirmado!
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070a12;padding:28px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0b1020;border-radius:20px;overflow:hidden;border:1px solid rgba(225,29,46,.35)">

          <!-- barra comic -->
          <tr>
            <td style="height:6px;line-height:6px;font-size:0;background:linear-gradient(90deg,#e11d2e 0%,#1a6cff 50%,#f5c542 100%)">&nbsp;</td>
          </tr>

          <!-- hero -->
          <tr>
            <td style="background:#0a0e1a;padding:32px 24px 28px;text-align:center">
              <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#f5c542;font-weight:bold">
                ★ CineGeração ★
              </p>
              <h1 style="margin:12px 0 0;font-family:Impact,Haettenschweiler,'Arial Black',Arial,sans-serif;font-size:34px;line-height:1.05;letter-spacing:1px;color:#ffffff;text-transform:uppercase">
                Missão confirmada
              </h1>
              <p style="margin:12px 0 0;font-family:Impact,Haettenschweiler,'Arial Black',Arial,sans-serif;font-size:18px;letter-spacing:1px;color:#e11d2e;text-transform:uppercase">
                Homem-Aranha: Um novo dia
              </p>
              <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,.65)">
                ${eventoSafe}
              </p>
            </td>
          </tr>

          <!-- corpo -->
          <tr>
            <td style="padding:28px 24px;background:#ffffff;color:#0b1020">
              <p style="margin:0 0 6px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#e11d2e;font-weight:bold">
                Olá, ${primeiroNome}!
              </p>
              <p style="margin:0 0 18px;font-size:16px;line-height:1.55;color:#1f2937">
                Com grandes poderes… vem um grande cinema 🎬<br>
                Sua inscrição no <strong style="color:#e11d2e">CineGeração</strong> está
                <strong>confirmada</strong>.
                ${
                  qtd > 1
                    ? ` O grupo ficou com <strong style="color:#1a6cff">${qtd} ingressos</strong> prontos.`
                    : " Seu ingresso digital já está na teia."
                }
              </p>

              <!-- card evento -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border-radius:14px;overflow:hidden;border:2px solid #0b1020">
                <tr>
                  <td style="background:#e11d2e;padding:10px 16px">
                    <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#fff;font-weight:bold">
                      Detalhes da missão
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;padding:16px 18px">
                    <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#0b1020">${eventoSafe}</p>
                    <p style="margin:0;font-size:14px;line-height:1.65;color:#374151">
                      <strong style="color:#1a6cff">Data</strong> ${dataSafe}<br>
                      <strong style="color:#1a6cff">Chegada</strong> ${chegadaSafe} · <strong style="color:#1a6cff">Sessão</strong> ${horarioSafe}<br>
                      <strong style="color:#1a6cff">Local</strong> ${localSafe}${cidadeSafe ? ` – ${cidadeSafe}` : ""}
                    </p>
                    ${
                      codigoInscSafe
                        ? `<p style="margin:12px 0 0;font-size:13px;color:#6b7280">Código da inscrição: <strong style="color:#e11d2e;font-family:Consolas,'Courier New',monospace">${codigoInscSafe}</strong></p>`
                        : ""
                    }
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#1a6cff;font-weight:bold">
                ${qtd > 1 ? "Seu time de heróis" : "Seu ticket de herói"}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;border:2px solid #e11d2e;border-radius:12px;overflow:hidden">
                <thead>
                  <tr>
                    <th align="left" style="padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#fff;background:#0b1020">Nome</th>
                    <th align="left" style="padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#f5c542;background:#0b1020">Código</th>
                  </tr>
                </thead>
                <tbody>
                  ${listaTickets}
                </tbody>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px">
                <tr>
                  <td align="center">
                    <a href="${linkIngresso}"
                       style="display:inline-block;background:#e11d2e;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:999px;font-weight:bold;font-size:15px;letter-spacing:0.5px;border:3px solid #0b1020;box-shadow:4px 4px 0 #1a6cff">
                      ABRIR INGRESSO DIGITAL
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;text-align:center;font-size:12px;color:#9ca3af;word-break:break-all">
                Ou copie o link:<br>
                <a href="${linkIngresso}" style="color:#1a6cff">${linkSafe}</a>
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border-radius:12px;overflow:hidden;border-left:6px solid #f5c542;background:#fff8e7">
                <tr>
                  <td style="padding:16px 18px">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#92400e;text-transform:uppercase;letter-spacing:1px">
                      ⚠ Regras da entrada
                    </p>
                    <ul style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:1.7">
                      <li>O comprovante digital <strong>não substitui o ingresso físico do cinema</strong>.</li>
                      <li>No dia, traga o <strong>ingresso do cinema</strong> e fale com <strong>Lavínia</strong> e <strong>Eduardo</strong>.</li>
                      <li>Guarde este e-mail: nele estão o QR e os códigos do grupo.</li>
                      <li>Chegue por volta das <strong>${chegadaSafe}</strong>. Sessão às <strong>${horarioSafe}</strong>.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
                Dúvidas na teia? Chama no WhatsApp:<br>
                <strong style="color:#0b1020">Eduardo</strong> · (22) 99247-3724<br>
                <strong style="color:#0b1020">Lavínia</strong> · (22) 99818-7602
              </p>
            </td>
          </tr>

          <!-- rodapé -->
          <tr>
            <td style="background:#070a12;padding:26px 24px;text-align:center;border-top:3px solid #e11d2e">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#f5c542;font-weight:bold">
                Palavra do dia
              </p>
              <p style="margin:0;font-size:15px;line-height:1.55;font-style:italic;color:#ffffff">
                “${VERSO_BIBLICO.texto}”
              </p>
              <p style="margin:10px 0 0;font-size:13px;color:#f5c542">${VERSO_BIBLICO.referencia}</p>
              <p style="margin:18px 0 0;font-size:13px;color:rgba(255,255,255,.65);line-height:1.55">
                Que Deus abençoe este encontro e cada um de vocês.<br>
                Com carinho, coordenação <strong style="color:#fff">Grupo Jovem Geração Eucarística</strong>.
              </p>
              <p style="margin:18px 0 0;font-family:Impact,Haettenschweiler,'Arial Black',Arial,sans-serif;font-size:14px;letter-spacing:1px;color:#e11d2e;text-transform:uppercase">
                Homem-Aranha: Um novo dia
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
  chegada,
  tickets = [],
  quantidade
}) {
  if (!para) {
    return { sent: false, reason: "Participante sem e-mail" };
  }
  const baseUrl = (config.frontendUrl || "http://localhost:5173").replace(/\/$/, "");
  const linkIngresso = `${baseUrl}/ingresso/${encodeURIComponent(codigoInscricao)}`;
  const qtd = Number(quantidade) || (Array.isArray(tickets) ? tickets.length : 1) || 1;
  const subject =
    qtd > 1
      ? `🕷️ CineGeração — ${qtd} ingressos confirmados · Homem-Aranha: Um novo dia`
      : `🕷️ CineGeração — ingresso confirmado · Homem-Aranha: Um novo dia`;

  const html = buildConfirmacaoHtml({
    nome,
    evento,
    data,
    horario,
    local,
    cidade,
    codigoIngresso,
    codigoInscricao,
    chegada,
    tickets,
    quantidade: qtd,
    linkIngresso
  });

  const text = [
    `Olá, ${nome}!`,
    "",
    `Missão confirmada no CineGeração — Homem-Aranha: Um novo dia.`,
    `Evento: ${evento}`,
    `Data: ${data} · Sessão ${horario} · Chegada ${chegada || "17h10"}`,
    `Local: ${local}${cidade ? ` – ${cidade}` : ""}`,
    "",
    Array.isArray(tickets) && tickets.length
      ? tickets.map((t) => `- ${t.nome || "Participante"}: ${t.codigo}`).join("\n")
      : `Código: ${codigoIngresso || "—"}`,
    "",
    `Abrir ingresso: ${linkIngresso}`,
    "",
    "IMPORTANTE: o comprovante digital não substitui o ingresso físico do cinema.",
    "No dia, traga o ingresso do cinema e apresente-se a Lavínia e Eduardo.",
    "",
    `"${VERSO_BIBLICO.texto}" (${VERSO_BIBLICO.referencia})`,
    "",
    "Que Deus abençoe este encontro. Coordenação Grupo Jovem Geração Eucarística."
  ].join("\n");

  if (!emailConfigurado()) {
    console.warn(`[EMAIL] Nenhum provedor configurado – não enviado para ${para}`);
    return {
      sent: false,
      reason:
        "E-mail não configurado. No Render, use BREVO_API_KEY + SMTP_FROM com domínio autenticado."
    };
  }

  try {
    if (config.brevoApiKey) {
      const result = await withTimeout(
        enviarViaBrevo({ para, subject, html, text }),
        15000,
        "Tempo esgotado na API Brevo"
      );
      console.log(`[EMAIL] Brevo OK → ${para}`);
      return result;
    }
    if (config.resendApiKey) {
      const result = await withTimeout(
        enviarViaResend({ para, subject, html, text }),
        15000,
        "Tempo esgotado na API Resend"
      );
      console.log(`[EMAIL] Resend OK → ${para}`);
      return result;
    }
    if (config.sendgridApiKey) {
      const result = await withTimeout(
        enviarViaSendGrid({ para, subject, html, text }),
        15000,
        "Tempo esgotado na API SendGrid"
      );
      console.log(`[EMAIL] SendGrid OK → ${para}`);
      return result;
    }

    const tx = getTransporter();
    await withTimeout(
      tx.sendMail({
        from: config.smtp.from || "CineGeração <noreply@geucaristica.com.br>",
        to: para,
        subject,
        html,
        text
      }),
      12000,
      "Connection timeout no SMTP. Configure BREVO_API_KEY no Render."
    );
    console.log(`[EMAIL] SMTP OK → ${para}`);
    return { sent: true, to: para, provider: "smtp" };
  } catch (err) {
    console.error("[EMAIL] Falha ao enviar:", err.message);
    const reason = /timeout|ETIMEDOUT|ECONNREFUSED/i.test(err.message)
      ? `${err.message} — use BREVO_API_KEY no Render.`
      : err.message;
    return { sent: false, reason };
  }
}

module.exports = { enviarConfirmacaoInscricao, smtpConfigurado, emailConfigurado };
