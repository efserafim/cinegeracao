const { Router } = require("express");
const { body } = require("express-validator");
const ingressoController = require("../controllers/ingressoController");
const { validate } = require("../middlewares/validate");
const { authAdmin, requireAdmin } = require("../middlewares/auth");

const router = Router();
router.get("/inscricao/:codigoInscricao", ingressoController.obterPublico);
router.get("/validacoes", authAdmin, ingressoController.historico);
router.post(
  "/validar",
  authAdmin,
  body("codigo").notEmpty().withMessage("Código obrigatório"),
  body("aparelho").optional({ values: "falsy" }).isString().isLength({ max: 120 }),
  body("observacao").optional({ values: "falsy" }).isString().isLength({ max: 500 }),
  validate,
  ingressoController.validar
);
router.post(
  "/chamada",
  authAdmin,
  requireAdmin,
  body("codigo").notEmpty().withMessage("Código obrigatório"),
  validate,
  ingressoController.chamada
);
module.exports = router;
