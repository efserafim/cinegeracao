require("dotenv").config();

function splitUrls(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function resolveFrontendOrigins() {
  const fromEnv = splitUrls(process.env.FRONTEND_URL || process.env.FRONTEND_ORIGINS);
  if (fromEnv.length) return fromEnv;
  return [
    "https://geucaristica.com.br",
    "https://www.geucaristica.com.br",
    "https://cinegeracao.netlify.app",
    "http://localhost:5173",
  ];
}

/** URL pública do site (e-mail / WhatsApp) — prioriza o domínio próprio. */
function resolvePublicSiteUrl() {
  const explicit = String(process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const origins = resolveFrontendOrigins();
  const preferred =
    origins.find((o) => /geucaristica\.com\.br/i.test(o)) ||
    origins.find((o) => !/localhost|127\.0\.0\.1/i.test(o)) ||
    origins[0];
  return preferred || "https://geucaristica.com.br";
}

const frontendOrigins = resolveFrontendOrigins();
const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3001,
  frontendUrl: resolvePublicSiteUrl(),
  frontendOrigins,
  jwt: {
    secret: process.env.JWT_SECRET || "dev_secret_change_me",
    expiresIn: process.env.JWT_EXPIRES_IN || "8h"
  },
  upload: {
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 15,
    dir: process.env.UPLOAD_DIR || "uploads"
  },
  ocr: {
    provider: process.env.OCR_PROVIDER || "tesseract",
    googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY || ""
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: (process.env.SMTP_USER || "").trim(),
    // Gmail app passwords are often copied with spaces
    pass: String(process.env.SMTP_PASS || "").replace(/\s+/g, ""),
    from: process.env.SMTP_FROM || "CineGeração <noreply@geucaristica.com.br>"
  },
  // HTTPS — recomendado no Render (SMTP Gmail costuma dar Connection timeout)
  // Prioridade no envio: Brevo → Resend → SendGrid → SMTP
  sendgridApiKey: (process.env.SENDGRID_API_KEY || "").trim(),
  brevoApiKey: (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || "").trim(),
  resendApiKey: (process.env.RESEND_API_KEY || "").trim(),
  vapid: {
    publicKey: (process.env.VAPID_PUBLIC_KEY || "").trim(),
    privateKey: (process.env.VAPID_PRIVATE_KEY || "").trim(),
    subject: (process.env.VAPID_SUBJECT || "mailto:setorjuventude.bacaxa@gmail.com").trim()
  }
};
module.exports = config;
