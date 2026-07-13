const { Router } = require("express");
const { body } = require("express-validator");
const inscricaoController = require("../controllers/inscricaoController");
const { validate } = require("../middlewares/validate");
const { authAdmin } = require("../middlewares/auth");
const { uploadComprovante } = require("../middlewares/upload");
const router = Router();
router.post(
  "/evento/:eventoId",
  body("nome").notEmpty().withMessage("Nome obrigatório"),
  body("telefone").notEmpty().withMessage("Telefone obrigatório"),
  body("email").isEmail().withMessage("E-mail obrigatório"),
  body("cidade").notEmpty().withMessage("Cidade obrigatória"),
  body("paroquia").notEmpty().withMessage("Paróquia obrigatória"),
  body("quantidade").optional().isInt({ min: 1, max: 10 }).withMessage("Quantidade inválida"),
  body("pessoas").optional().isArray({ min: 1, max: 10 }).withMessage("Informe os nomes dos ingressos"),
  body("pessoas.*").optional().isString().notEmpty().withMessage("Nome do ingresso obrigatório"),
  validate,
  inscricaoController.criar
);
router.get("/codigo/:codigo", inscricaoController.obterPorCodigo);
router.get("/por-whatsapp/:telefone", inscricaoController.obterPorWhatsApp);
router.post(
  "/codigo/:codigo/comprovante",
  uploadComprovante.single("comprovante"),
  inscricaoController.enviarComprovante
);
router.get("/dashboard/global", authAdmin, inscricaoController.dashboardGlobal);
router.get("/evento/:eventoId/dashboard", authAdmin, inscricaoController.dashboard);
router.get("/evento/:eventoId", authAdmin, inscricaoController.listar);
router.get("/evento/:eventoId/export/:formato", authAdmin, inscricaoController.exportar);
router.get("/evento/:eventoId/relatorio-financeiro", authAdmin, inscricaoController.relatorioFinanceiro);
router.get("/:id", authAdmin, inscricaoController.obterAdmin);
router.post("/:id/confirmar", authAdmin, inscricaoController.confirmar);
router.post("/:id/reenviar-email", authAdmin, inscricaoController.reenviarEmail);
router.post("/:id/liberar-ingressos", authAdmin, inscricaoController.liberarIngressos);
router.post("/:id/reprocessar-ocr", authAdmin, inscricaoController.reprocessarOcr);
router.post("/:id/conferir-extrato", authAdmin, inscricaoController.conferirExtrato);
router.post("/:id/recusar", authAdmin, inscricaoController.recusar);
router.post("/:id/cancelar", authAdmin, inscricaoController.cancelar);
router.delete("/:id", authAdmin, inscricaoController.excluir);
router.patch("/:id/observacao", authAdmin, inscricaoController.observacao);
module.exports = router;
