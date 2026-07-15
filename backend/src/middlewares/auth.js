const { fail } = require("../utils/response");
const { resolverAdminDoToken, carregarAdminAuth } = require("../services/authService");

async function authAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return fail(res, "Token não informado", 401);
  }
  const token = header.slice(7);
  try {
    const base = await resolverAdminDoToken(token);
    const admin = await carregarAdminAuth(base.id);
    if (!admin) {
      return fail(res, "Administrador não encontrado", 401);
    }
    if (!admin.ativo) {
      return fail(res, "Administrador desativado", 403);
    }
    req.admin = admin;
    return next();
  } catch (err) {
    const status = err.status || 401;
    return fail(res, err.message || "Token inválido ou expirado", status);
  }
}

/** Só ADMIN completo (Lavínia / Eduardo). */
function requireAdmin(req, res, next) {
  const perfil = req.admin?.perfil || "ADMIN";
  if (perfil !== "ADMIN") {
    return fail(res, "Sem permissão para esta ação", 403);
  }
  return next();
}

module.exports = { authAdmin, requireAdmin };
