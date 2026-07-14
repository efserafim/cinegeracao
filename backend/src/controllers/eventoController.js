const eventoService = require("../services/eventoService");
const { salvarBanner } = require("../services/storageService");
const { success } = require("../utils/response");
async function listarPublicos(req, res, next) {
  try {
    const data = await eventoService.listarPublicos();
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
async function obterPublico(req, res, next) {
  try {
    const data = await eventoService.buscarPorId(req.params.id, { publico: true });
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
async function listarAdmin(req, res, next) {
  try {
    const data = await eventoService.listarTodos(req.query);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
async function obterAdmin(req, res, next) {
  try {
    const data = await eventoService.buscarPorId(req.params.id);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
async function resolverBanner(req, body) {
  if (!req.file) return body;
  body.bannerUrl = await salvarBanner(req.file);
  return body;
}
async function criar(req, res, next) {
  try {
    const body = { ...req.body };
    await resolverBanner(req, body);
    if (body.valor) body.valor = Number(body.valor);
    if (body.vagasMaximas) body.vagasMaximas = Number(body.vagasMaximas);
    const data = await eventoService.criar(body, req.admin.id, req.ip);
    return success(res, data, "Evento criado", 201);
  } catch (err) {
    return next(err);
  }
}
async function atualizar(req, res, next) {
  try {
    const body = { ...req.body };
    await resolverBanner(req, body);
    if (body.valor) body.valor = Number(body.valor);
    if (body.vagasMaximas) body.vagasMaximas = Number(body.vagasMaximas);
    const data = await eventoService.atualizar(req.params.id, body, req.admin.id, req.ip);
    return success(res, data, "Evento atualizado");
  } catch (err) {
    return next(err);
  }
}
async function encerrar(req, res, next) {
  try {
    const data = await eventoService.encerrar(req.params.id, req.admin.id, req.ip);
    return success(res, data, "Evento encerrado");
  } catch (err) {
    return next(err);
  }
}
async function abrirCobranca(req, res, next) {
  try {
    const data = await eventoService.abrirCobranca(req.params.id, req.admin.id, req.ip);
    const n = data.convertidas || 0;
    return success(
      res,
      data,
      n > 0
        ? `Cobrança liberada. ${n} pré-inscrição(ões) agora aguardam pagamento.`
        : "Cobranções liberadas. O evento está aberto para pagamento."
    );
  } catch (err) {
    return next(err);
  }
}
async function excluir(req, res, next) {
  try {
    await eventoService.excluir(req.params.id, req.admin.id, req.ip);
    return success(res, null, "Evento excluído");
  } catch (err) {
    return next(err);
  }
}
module.exports = {
  listarPublicos,
  obterPublico,
  listarAdmin,
  obterAdmin,
  criar,
  atualizar,
  encerrar,
  abrirCobranca,
  excluir
};
