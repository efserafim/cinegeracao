const swaggerJsdoc = require("swagger-jsdoc");
const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "CineGeração – API de Inscrições",
      version: "1.0.0",
      description: "API para gerenciamento de inscrições de eventos com pagamento via PIX (chave + comprovante + OCR)."
    },
    servers: [{ url: "http://localhost:3001", description: "Desenvolvimento" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    tags: [
      { name: "Auth" },
      { name: "Eventos" },
      { name: "Inscrições" },
      { name: "Ingressos" }
    ]
  },
  apis: ["./src/routes/*.js", "./src/docs/*.js"]
};
const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
