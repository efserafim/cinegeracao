const { Router } = require("express");
const { body } = require("express-validator");
const eventoController = require("../controllers/eventoController");
const { validate } = require("../middlewares/validate");
const { authAdmin } = require("../middlewares/auth");
const { uploadBanner } = require("../middlewares/upload");
const router = Router();
router.get("/publicos", eventoController.listarPublicos);
router.get("/publicos/:id", eventoController.obterPublico);
router.get("/", authAdmin, eventoController.listarAdmin);
router.get("/:id", authAdmin, eventoController.obterAdmin);
router.post(
  "/",
  authAdmin,
  uploadBanner.single("banner"),
  body("nome").notEmpty().withMessage("Nome obrigatório"),
  body("descricao").notEmpty().withMessage("Descrição obrigatória"),
  body("valor").notEmpty().withMessage("Valor obrigatório"),
  body("data").notEmpty().withMessage("Data obrigatória"),
  body("horario").notEmpty().withMessage("Horário obrigatório"),
  body("local").notEmpty().withMessage("Local obrigatório"),
  body("cidade").notEmpty().withMessage("Cidade obrigatória"),
  body("vagasMaximas").notEmpty().withMessage("Vagas obrigatórias"),
  body("chavePix").notEmpty().withMessage("Chave PIX obrigatória"),
  body("nomeFavorecido").notEmpty().withMessage("Favorecido obrigatório"),
  validate,
  eventoController.criar
);
router.put("/:id", authAdmin, uploadBanner.single("banner"), eventoController.atualizar);
router.patch("/:id/encerrar", authAdmin, eventoController.encerrar);
router.patch("/:id/abrir-cobranca", authAdmin, eventoController.abrirCobranca);
router.delete("/:id", authAdmin, eventoController.excluir);
module.exports = router;
