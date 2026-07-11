/**
 * Utilitários de resposta HTTP padronizada.
 */
function success(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, message = 'Erro', status = 400, errors = null) {
  return res.status(status).json({ success: false, message, errors });
}

module.exports = { success, fail };
