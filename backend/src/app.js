/**
 * Aplicação Express – middlewares, rotas e segurança.
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const swaggerSpec = require('./docs/swagger');
const { xssSanitize } = require('./middlewares/xss');
const { notFound, errorHandler } = require('./middlewares/error');

const authRoutes = require('./routes/authRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const inscricaoRoutes = require('./routes/inscricaoRoutes');
const ingressoRoutes = require('./routes/ingressoRoutes');

const app = express();

// Segurança HTTP
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin(origin, callback) {
      // Requests sem Origin (healthcheck, curl, mobile)
      if (!origin) return callback(null, true);
      if (config.frontendOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS bloqueado para origem: ${origin}`));
    },
    credentials: true,
  }),
);

// Rate limit geral + mais restrito no login
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: 'Muitas tentativas de login. Tente novamente mais tarde.' },
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(xssSanitize);

// Arquivos estáticos (banners e comprovantes)
app.use('/uploads', express.static(path.resolve(process.cwd(), config.upload.dir)));

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'OK', env: config.env });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/inscricoes', inscricaoRoutes);
app.use('/api/ingressos', ingressoRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
