/**
 * Tratamento centralizado de erros.
 */
const { fail } = require('../utils/response');

function notFound(_req, res) {
  return fail(res, 'Rota não encontrada', 404);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  console.error('[ERROR]', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return fail(res, 'Arquivo excede o limite de 15 MB', 413);
  }

  if (err.name === 'MulterError') {
    return fail(res, err.message, 400);
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500 || err.expose ? err.message : 'Erro interno do servidor';
  return fail(res, message, status);
}

module.exports = { notFound, errorHandler };
