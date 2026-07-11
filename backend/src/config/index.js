/**
 * Carrega e valida variáveis de ambiente da aplicação.
 */
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3001,
  /** Uma URL ou várias separadas por vírgula */
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendOrigins: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  upload: {
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 15,
    dir: process.env.UPLOAD_DIR || 'uploads',
  },

  ocr: {
    provider: process.env.OCR_PROVIDER || 'tesseract',
    googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Cine Geração <noreply@cinegeracao.local>',
  },
};

module.exports = config;
