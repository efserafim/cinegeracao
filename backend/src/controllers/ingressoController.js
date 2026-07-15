const ingressoService = require("../services/ingressoService");
const { success } = require("../utils/response");

async function obterPublico(req, res, next) {
  try {
    const data = await ingressoService.buscarPorCodigoInscricao(req.params.codigoInscricao);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}

async function validar(req, res, next) {
  try {
    const { codigo, observacao } = req.body;
    const perfil = req.admin?.perfil || "ADMIN";
    const aparelho =
      perfil === "LEITOR" ? undefined : req.body.aparelho;
    const data = await ingressoService.validarEntrada({
      codigoOuPayload: codigo,
      adminId: req.admin?.id,
      ip: req.ip,
      aparelho,
      observacao: perfil === "LEITOR" ? undefined : observacao,
      userAgent: req.get("user-agent"),
      aparelhoPadrao: req.admin?.aparelhoNome,
    });
    if (data.resultado !== "INVALIDO") {
      data.leitor = req.admin?.nome || null;
    }
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}

async function historico(req, res, next) {
  try {
    const data = await ingressoService.listarValidacoes({
      adminId: req.admin?.id,
      perfil: req.admin?.perfil || "ADMIN",
      page: req.query.page,
      limit: req.query.limit,
    });
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}

async function chamada(req, res, next) {
  try {
    const presente = req.body.presente !== false && req.body.presente !== "false";
    const data = await ingressoService.marcarPresencaChamada({
      codigo: req.body.codigo,
      presente,
      adminId: req.admin?.id,
      ip: req.ip,
    });
    return success(res, data, presente ? "Presença confirmada" : "Presença removida");
  } catch (err) {
    return next(err);
  }
}

module.exports = { obterPublico, validar, historico, chamada };
