const inscricaoService = require("../services/inscricaoService");
const exportService = require("../services/exportService");
const prisma = require("../config/prisma");
const { success } = require("../utils/response");
async function criar(req, res, next) {
  try {
    const data = await inscricaoService.criarInscricao(req.params.eventoId, req.body);
    return success(res, data, "Inscrição criada", 201);
  } catch (err) {
    return next(err);
  }
}
async function obterPorCodigo(req, res, next) {
  try {
    const data = await inscricaoService.buscarPorCodigo(req.params.codigo);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
async function consultar(req, res, next) {
  try {
    const data = await inscricaoService.buscarPorCodigoEEmail(req.body.codigo, req.body.email);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
async function obterPorWhatsApp(req, res, next) {
  try {
    const data = await inscricaoService.buscarPorWhatsApp(req.params.telefone);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
async function enviarComprovante(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error("Arquivo de comprovante obrigatório");
      err.status = 400;
      throw err;
    }
    const data = await inscricaoService.enviarComprovante(req.params.codigo, req.file);
    return success(
      res,
      data,
      data.autoConfirmado
        ? "Valor do PIX confere — ingresso e e-mail liberados automaticamente"
        : "Comprovante enviado e OCR processado"
    );
  } catch (err) {
    return next(err);
  }
}
async function listar(req, res, next) {
  try {
    const data = await inscricaoService.listarPorEvento(req.params.eventoId, req.query);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
async function obterAdmin(req, res, next) {
  try {
    const data = await inscricaoService.buscarAdmin(req.params.id);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
async function confirmar(req, res, next) {
  try {
    const data = await inscricaoService.confirmarPagamento(req.params.id, req.admin.id, req.ip);
    return success(res, data, "Pagamento confirmado e ingresso liberado");
  } catch (err) {
    err.expose = true;
    return next(err);
  }
}
async function reenviarEmail(req, res, next) {
  try {
    const data = await inscricaoService.reenviarEmailConfirmacao(req.params.id, req.admin.id, req.ip);
    return success(
      res,
      data,
      data.sent ? "E-mail reenviado" : "Não foi possível enviar o e-mail"
    );
  } catch (err) {
    err.expose = true;
    return next(err);
  }
}
async function liberarIngressos(req, res, next) {
  try {
    const data = await inscricaoService.liberarIngressosFaltantes(req.params.id, req.admin.id, req.ip);
    return success(res, data, "Ingressos liberados");
  } catch (err) {
    err.expose = true;
    return next(err);
  }
}
async function reprocessarOcr(req, res, next) {
  try {
    const data = await inscricaoService.reprocessarOcr(req.params.id);
    return success(
      res,
      data,
      data.autoConfirmado
        ? "OCR ok — ingresso e e-mail liberados automaticamente"
        : "OCR reprocessado"
    );
  } catch (err) {
    return next(err);
  }
}
async function conferirExtrato(req, res, next) {
  try {
    const data = await inscricaoService.marcarConferidoExtrato(req.params.id, req.admin.id, req.ip);
    return success(res, data, "Conferência no extrato registrada");
  } catch (err) {
    err.expose = true;
    return next(err);
  }
}
async function recusar(req, res, next) {
  try {
    const data = await inscricaoService.recusarPagamento(
      req.params.id,
      req.body.observacao,
      req.admin.id,
      req.ip
    );
    return success(res, data, "Pagamento recusado");
  } catch (err) {
    return next(err);
  }
}
async function cancelar(req, res, next) {
  try {
    const data = await inscricaoService.cancelar(
      req.params.id,
      req.body.observacao,
      req.admin.id,
      req.ip
    );
    return success(res, data, "Inscrição cancelada");
  } catch (err) {
    return next(err);
  }
}
async function excluir(req, res, next) {
  try {
    const data = await inscricaoService.excluir(req.params.id, req.admin.id, req.ip);
    return success(res, data, "Inscrição excluída");
  } catch (err) {
    return next(err);
  }
}
async function observacao(req, res, next) {
  try {
    const data = await inscricaoService.atualizarObservacao(
      req.params.id,
      req.body.observacao,
      req.admin.id,
      req.ip
    );
    return success(res, data, "Observação atualizada");
  } catch (err) {
    return next(err);
  }
}
async function dashboard(req, res, next) {
  try {
    const data = await inscricaoService.dashboard(req.params.eventoId);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
async function dashboardGlobal(req, res, next) {
  try {
    const data = await inscricaoService.dashboardGlobal();
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
function slugArquivo(nome, fallback) {
  const base = String(nome || fallback || "inscritos")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .toLowerCase();
  return base || "inscritos";
}

async function exportar(req, res, next) {
  try {
    const { formato } = req.params;
    const { eventoId } = req.params;
    const evento = await prisma.evento.findUnique({
      where: { id: eventoId },
      select: { nome: true },
    });
    const stem = `inscritos-${slugArquivo(evento?.nome, eventoId)}`;

    if (formato === "excel") {
      const buf = await exportService.exportarExcel(eventoId);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${stem}.xlsx"`);
      return res.send(Buffer.from(buf));
    }
    if (formato === "csv") {
      const buf = await exportService.exportarCsv(eventoId);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${stem}.csv"`);
      return res.send(buf);
    }
    if (formato === "pdf") {
      const buf = await exportService.exportarPdf(eventoId);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${stem}.pdf"`);
      return res.send(buf);
    }
    const err = new Error("Formato inválido. Use excel, csv ou pdf");
    err.status = 400;
    throw err;
  } catch (err) {
    return next(err);
  }
}
async function relatorioFinanceiro(req, res, next) {
  try {
    const data = await exportService.relatorioFinanceiro(req.params.eventoId);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}
module.exports = {
  criar,
  obterPorCodigo,
  consultar,
  obterPorWhatsApp,
  enviarComprovante,
  listar,
  obterAdmin,
  confirmar,
  liberarIngressos,
  reenviarEmail,
  reprocessarOcr,
  conferirExtrato,
  recusar,
  cancelar,
  excluir,
  observacao,
  dashboard,
  dashboardGlobal,
  exportar,
  relatorioFinanceiro
};
