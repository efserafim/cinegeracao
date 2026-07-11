/**
 * Ponto de entrada do servidor HTTP.
 */
const app = require('./app');
const config = require('./config');
const prisma = require('./config/prisma');

async function start() {
  try {
    await prisma.$connect();
    app.listen(config.port, () => {
      console.log(`API rodando em http://localhost:${config.port}`);
      console.log(`Swagger: http://localhost:${config.port}/api/docs`);
    });
  } catch (err) {
    console.error('Falha ao iniciar servidor:', err);
    process.exit(1);
  }
}

start();

// Evita que falhas de workers (ex.: OCR) derrubem o processo inteiro
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
