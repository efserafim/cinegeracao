const { Router } = require("express");
const { body } = require("express-validator");
const ingressoController = require("../controllers/ingressoController");
const { validate } = require("../middlewares/validate");
const { authAdmin } = require("../middlewares/auth");
const router = Router();
router.get("/inscricao/:codigoInscricao", ingressoController.obterPublico);
router.post(
  "/validar",
  authAdmin,
  body("codigo").notEmpty().withMessage("Código obrigatório"),
  validate,
  ingressoController.validar
);
router.post(
  "/chamada",
  authAdmin,
  body("codigo").notEmpty().withMessage("Código obrigatório"),
  validate,
  ingressoController.chamada
);
module.exports = router;
