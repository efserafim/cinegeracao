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
    const { codigo } = req.body;
    const data = await ingressoService.validarEntrada({
      codigoOuPayload: codigo,
      adminId: req.admin?.id,
      ip: req.ip
    });
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
module.exports = { obterPublico, validar };
