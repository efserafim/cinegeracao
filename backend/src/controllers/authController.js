/**
 * Controller de autenticação (Supabase Auth + senha local).
 */
const authService = require('../services/authService');
const { success, fail } = require('../utils/response');

async function login(req, res, next) {
  try {
    const { email, senha, accessToken } = req.body;

    if (accessToken) {
      const data = await authService.loginComSupabase(accessToken, req.ip);
      return success(res, data, 'Login realizado');
    }

    if (!email || !senha) {
      return fail(res, 'Informe e-mail e senha', 400);
    }

    const data = await authService.loginComSenha(email, senha, req.ip);
    return success(res, data, 'Login realizado');
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const data = await authService.me(req.admin.id);
    if (!data) return fail(res, 'Admin não encontrado', 404);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, me };
