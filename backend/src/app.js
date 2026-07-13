const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const config = require("./config");
const swaggerSpec = require("./docs/swagger");
const { xssSanitize } = require("./middlewares/xss");
const { notFound, errorHandler } = require("./middlewares/error");
const authRoutes = require("./routes/authRoutes");
const eventoRoutes = require("./routes/eventoRoutes");
const inscricaoRoutes = require("./routes/inscricaoRoutes");
const ingressoRoutes = require("./routes/ingressoRoutes");
const pushRoutes = require("./routes/pushRoutes");
const app = express();
// Render (e outros proxies) enviam X-Forwarded-For; necessário para o rate-limit
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const allowedOrigins = new Set(
  config.frontendOrigins
    .map((o) => o.replace(/\/$/, ""))
    .concat([
      "https://cinegeracao.netlify.app",
      "https://geucaristica.com.br",
      "https://www.geucaristica.com.br",
      "http://localhost:5173",
    ])
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, "");
      if (allowedOrigins.has(normalized)) return callback(null, normalized);
      console.warn("[CORS] origem não permitida:", origin, "| permitidas:", [...allowedOrigins]);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1e3,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1e3,
    max: 30,
    message: { success: false, message: "Muitas tentativas de login. Tente novamente mais tarde." }
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(xssSanitize);
app.use("/uploads", express.static(path.resolve(process.cwd(), config.upload.dir)));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "OK", env: config.env });
});
app.use("/api/auth", authRoutes);
app.use("/api/eventos", eventoRoutes);
app.use("/api/inscricoes", inscricaoRoutes);
app.use("/api/ingressos", ingressoRoutes);
app.use("/api/admin/push", pushRoutes);
app.use(notFound);
app.use(errorHandler);
module.exports = app;
