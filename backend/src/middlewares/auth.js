/**
 * Middleware: Bearer = Firebase ID token.
 */
const { fail } = require('../utils/response');
const { resolverAdminDoToken } = require('../services/authService');

async function authAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, 'Token não informado', 401);
  }

  const token = header.slice(7);
  try {
    req.admin = await resolverAdminDoToken(token);
    return next();
  } catch (err) {
    const status = err.status || 401;
    return fail(res, err.message || 'Token inválido ou expirado', status);
  }
}

module.exports = { authAdmin };
