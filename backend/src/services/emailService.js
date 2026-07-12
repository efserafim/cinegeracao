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
  const from = config.smtp.from || "CineGeração <onboarding@resend.dev>";
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
          <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px">${nome}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;font-family:Consolas,monospace;color:#e11d2e;font-weight:bold">${codigo}</td>
        </tr>`;
      })
      .join("");
  }
  if (codigoIngresso) {
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px" colspan="2">
        <span style="font-family:Consolas,monospace;color:#e11d2e;font-weight:bold">${escapeHtml(codigoIngresso)}</span>
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
  const eventoSafe = escapeHtml(evento);
  const dataSafe = escapeHtml(data);
  const horarioSafe = escapeHtml(horario);
  const localSafe = escapeHtml(local);
  const cidadeSafe = escapeHtml(cidade);
  const chegadaSafe = escapeHtml(chegada || "17h10");
  const codigoInscSafe = escapeHtml(codigoInscricao);
  const qtd = Number(quantidade) || (Array.isArray(tickets) ? tickets.length : 1) || 1;
  const listaTickets = montarListaTickets(tickets, codigoIngresso);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Georgia,'Times New Roman',serif">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(145deg,#070a12 0%,#1a0a12 55%,#3b0a14 100%);padding:28px 24px;text-align:center">
      <p style="margin:0;color:#f5c542;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif">CineGeração</p>
      <h1 style="margin:10px 0 0;color:#ffffff;font-size:26px;font-weight:normal;letter-spacing:0.5px">Seu ingresso está pronto</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.7);font-size:14px;font-family:Arial,sans-serif">${eventoSafe}</p>
    </div>

    <div style="padding:28px 24px;color:#1f2937;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6">
      <p style="margin:0 0 12px">Olá, <strong style="color:#e11d2e">${nomeSafe}</strong>!</p>
      <p style="margin:0 0 20px">
        Com alegria confirmamos sua inscrição no <strong>CineGeração</strong>.
        ${qtd > 1 ? `Foram liberados <strong>${qtd} ingressos</strong> para o seu grupo.` : "Seu ingresso digital já está disponível."}
      </p>

      <div style="background:#fafafa;border:1px solid #eee;border-radius:12px;padding:16px 18px;margin:0 0 22px">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;font-weight:bold">Evento</p>
        <p style="margin:0 0 6px"><strong>${eventoSafe}</strong></p>
        <p style="margin:0;color:#4b5563;font-size:14px">
          ${dataSafe} · Sessão ${horarioSafe} · Chegada ${chegadaSafe}<br>
          ${localSafe}${cidadeSafe ? ` – ${cidadeSafe}` : ""}
        </p>
        ${codigoInscSafe ? `<p style="margin:10px 0 0;font-size:13px;color:#6b7280">Inscrição: <strong>${codigoInscSafe}</strong></p>` : ""}
      </div>

      <p style="margin:0 0 10px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;font-weight:bold">
        ${qtd > 1 ? "Seus tickets" : "Seu ticket"}
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 22px;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden" cellpadding="0" cellspacing="0">
        <thead>
          <tr style="background:#f9fafb">
            <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af">Nome</th>
            <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af">Código</th>
          </tr>
        </thead>
        <tbody>
          ${listaTickets}
        </tbody>
      </table>

      <p style="margin:0 0 18px;text-align:center">
        <a href="${linkIngresso}"
           style="display:inline-block;background:#e11d2e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold;font-size:15px">
          Abrir meu ingresso digital
        </a>
      </p>
      <p style="margin:0 0 24px;text-align:center;font-size:12px;color:#9ca3af">
        Ou acesse: <a href="${linkIngresso}" style="color:#e11d2e">${linkIngresso}</a>
      </p>

      <div style="border-left:4px solid #f5c542;background:#fffbeb;padding:14px 16px;border-radius:0 10px 10px 0;margin:0 0 22px">
        <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#92400e">Importante — validação e entrada</p>
        <ul style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:1.65">
          <li>O comprovante digital <strong>não substitui o ingresso físico do cinema</strong> e <strong>não autoriza sozinho a entrada na sala</strong>.</li>
          <li>No dia, traga o <strong>ingresso do cinema</strong> e apresente-se a <strong>Lavínia</strong> e <strong>Eduardo</strong>.</li>
          <li>Guarde o link deste e-mail: ele mostra o QR Code e os códigos de cada pessoa do grupo.</li>
          <li>Chegue por volta das <strong>${chegadaSafe}</strong>. Sessão às <strong>${horarioSafe}</strong>.</li>
        </ul>
      </div>

      <p style="margin:0 0 6px;font-size:13px;color:#6b7280">
        Dúvidas? Fale conosco:<br>
        Eduardo · (22) 99247-3724<br>
        Lavínia · (22) 99818-7602
      </p>
    </div>

    <div style="background:#0b1020;padding:22px 24px;text-align:center;color:#e5e7eb">
      <p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#f5c542;font-family:Arial,sans-serif">Palavra do dia</p>
      <p style="margin:0;font-size:16px;line-height:1.55;font-style:italic;color:#fff">
        “${VERSO_BIBLICO.texto}”
      </p>
      <p style="margin:10px 0 0;font-size:13px;color:#f5c542;font-family:Arial,sans-serif">${VERSO_BIBLICO.referencia}</p>
      <p style="margin:16px 0 0;font-size:13px;color:rgba(255,255,255,.65);font-family:Arial,sans-serif;line-height:1.5">
        Que Deus abençoe este encontro e cada um de vocês.<br>
        Com carinho, equipe <strong style="color:#fff">CineGeração</strong>.
      </p>
    </div>
  </div>
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
      ? `CineGeração — ${qtd} ingressos confirmados · ${evento}`
      : `CineGeração — seu ingresso confirmado · ${evento}`;

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
    `Sua inscrição no CineGeração foi confirmada.`,
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
    "Que Deus abençoe este encontro. Equipe CineGeração."
  ].join("\n");

  if (!emailConfigurado()) {
    console.warn(`[EMAIL] Nenhum provedor configurado – não enviado para ${para}`);
    return {
      sent: false,
      reason:
        "E-mail não configurado. No Render, use SENDGRID_API_KEY (recomendado) — o SMTP do Gmail costuma dar timeout."
    };
  }

  try {
    if (config.sendgridApiKey) {
      const result = await withTimeout(
        enviarViaSendGrid({ para, subject, html, text }),
        15000,
        "Tempo esgotado na API SendGrid"
      );
      console.log(`[EMAIL] SendGrid OK → ${para}`);
      return result;
    }
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

    const tx = getTransporter();
    await withTimeout(
      tx.sendMail({
        from: config.smtp.from || "CineGeração <noreply@cinegeracao.local>",
        to: para,
        subject,
        html,
        text
      }),
      12000,
      "Connection timeout no SMTP. Configure SENDGRID_API_KEY no Render."
    );
    console.log(`[EMAIL] SMTP OK → ${para}`);
    return { sent: true, to: para, provider: "smtp" };
  } catch (err) {
    console.error("[EMAIL] Falha ao enviar:", err.message);
    const reason = /timeout|ETIMEDOUT|ECONNREFUSED/i.test(err.message)
      ? `${err.message} — use SENDGRID_API_KEY no Render.`
      : err.message;
    return { sent: false, reason };
  }
}

module.exports = { enviarConfirmacaoInscricao, smtpConfigurado, emailConfigurado };
