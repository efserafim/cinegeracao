const app = require("./app");
const config = require("./config");
const prisma = require("./config/prisma");

async function connectWithRetry(maxAttempts = 8, delayMs = 4000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$connect();
      return;
    } catch (err) {
      const retryable = /max clients reached|EMAXCONNSESSION|too many connections/i.test(
        String(err?.message || err)
      );
      if (!retryable || attempt === maxAttempts) throw err;
      console.warn(
        `[boot] Pool ocupado (tentativa ${attempt}/${maxAttempts}) — aguardando ${delayMs}ms…`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function start() {
  try {
    await connectWithRetry();
    app.listen(config.port, () => {
      console.log(`API rodando em http://localhost:${config.port}`);
      console.log(`Swagger: http://localhost:${config.port}/api/docs`);
      const { emailConfigurado, smtpConfigurado } = require("./services/emailService");
      if (config.brevoApiKey) {
        console.log(`[boot] E-mail: Brevo API configurada (from: ${config.smtp.from})`);
      } else if (config.resendApiKey) {
        console.log(`[boot] E-mail: Resend API configurada (from: ${config.smtp.from})`);
      } else if (config.sendgridApiKey) {
        console.log("[boot] E-mail: SendGrid API configurada");
      } else if (smtpConfigurado()) {
        console.log(`[boot] E-mail: SMTP → ${config.smtp.host}:${config.smtp.port} (${config.smtp.user})`);
        console.warn("[boot] No Render, SMTP Gmail costuma dar timeout. Prefira BREVO_API_KEY.");
      } else if (!emailConfigurado()) {
        console.warn("[boot] E-mail NÃO configurado (BREVO_API_KEY / RESEND_API_KEY / SENDGRID_API_KEY / SMTP_*)");
      }
    });
  } catch (err) {
    console.error("Falha ao iniciar servidor:", err);
    process.exit(1);
  }
}

start();
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
