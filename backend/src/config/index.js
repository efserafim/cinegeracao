require("dotenv").config();
const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3001,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  frontendOrigins: (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map((s) => s.trim()).filter(Boolean),
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
  // Prioridade no envio: Resend → SendGrid → Brevo → SMTP
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
