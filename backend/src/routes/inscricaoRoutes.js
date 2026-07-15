const { Router } = require("express");
const { body } = require("express-validator");
const inscricaoController = require("../controllers/inscricaoController");
const { validate } = require("../middlewares/validate");
const { authAdmin, requireAdmin } = require("../middlewares/auth");
const { uploadComprovante } = require("../middlewares/upload");
const router = Router();
router.post(
  "/evento/:eventoId",
  body("nome").notEmpty().withMessage("Nome obrigatório"),
  body("telefone").notEmpty().withMessage("Telefone obrigatório"),
  body("email").isEmail().withMessage("E-mail obrigatório"),
  body("cidade").notEmpty().withMessage("Cidade obrigatória"),
  body("paroquia").notEmpty().withMessage("Paróquia obrigatória"),
  body("chavePixDevolucao").optional({ values: "falsy" }).trim(),
  body("quantidade").optional().isInt({ min: 1, max: 10 }).withMessage("Quantidade inválida"),
  body("pessoas").optional().isArray({ min: 1, max: 10 }).withMessage("Informe os nomes dos ingressos"),
  body("pessoas.*").optional().isString().notEmpty().withMessage("Nome do ingresso obrigatório"),
  validate,
  inscricaoController.criar
);
router.get("/codigo/:codigo", inscricaoController.obterPorCodigo);
router.post(
  "/consultar",
  body("codigo").trim().notEmpty().withMessage("Código obrigatório"),
  body("email").isEmail().withMessage("E-mail inválido"),
  validate,
  inscricaoController.consultar
);
router.get("/por-whatsapp/:telefone", inscricaoController.obterPorWhatsApp);
router.post(
  "/codigo/:codigo/comprovante",
  uploadComprovante.single("comprovante"),
  inscricaoController.enviarComprovante
);
router.get("/dashboard/global", authAdmin, requireAdmin, inscricaoController.dashboardGlobal);
router.get("/evento/:eventoId/dashboard", authAdmin, requireAdmin, inscricaoController.dashboard);
router.get("/evento/:eventoId", authAdmin, requireAdmin, inscricaoController.listar);
router.get("/evento/:eventoId/export/:formato", authAdmin, requireAdmin, inscricaoController.exportar);
router.get("/evento/:eventoId/relatorio-financeiro", authAdmin, requireAdmin, inscricaoController.relatorioFinanceiro);
router.get("/:id", authAdmin, requireAdmin, inscricaoController.obterAdmin);
router.post("/:id/confirmar", authAdmin, requireAdmin, inscricaoController.confirmar);
router.post("/:id/reenviar-email", authAdmin, requireAdmin, inscricaoController.reenviarEmail);
router.post("/:id/liberar-ingressos", authAdmin, requireAdmin, inscricaoController.liberarIngressos);
router.post("/:id/reprocessar-ocr", authAdmin, requireAdmin, inscricaoController.reprocessarOcr);
router.post("/:id/conferir-extrato", authAdmin, requireAdmin, inscricaoController.conferirExtrato);
router.post("/:id/recusar", authAdmin, requireAdmin, inscricaoController.recusar);
router.post("/:id/cancelar", authAdmin, requireAdmin, inscricaoController.cancelar);
router.delete("/:id", authAdmin, requireAdmin, inscricaoController.excluir);
router.patch("/:id/observacao", authAdmin, requireAdmin, inscricaoController.observacao);
router.patch(
  "/:id/corrigir",
  authAdmin,
  requireAdmin,
  body("nomeResponsavel").optional({ values: "falsy" }).trim().isLength({ min: 1 }).withMessage("Nome inválido"),
  body("valor").optional({ values: "falsy" }),
  body("pessoas").optional().isArray(),
  body("pessoas.*.id").optional().isString(),
  body("pessoas.*.nome").optional().isString(),
  body("removerPessoaIds").optional().isArray(),
  body("removerPessoaIds.*").optional().isString(),
  validate,
  inscricaoController.corrigir
);
module.exports = router;
