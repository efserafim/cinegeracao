/**
 * Rotas de ingressos e validação.
 */
const { Router } = require('express');
const { body } = require('express-validator');
const ingressoController = require('../controllers/ingressoController');
const { validate } = require('../middlewares/validate');
const { authAdmin } = require('../middlewares/auth');

const router = Router();

// Público – visualizar ingresso após confirmação
router.get('/inscricao/:codigoInscricao', ingressoController.obterPublico);

// Admin – validar entrada (app do organizador)
router.post(
  '/validar',
  authAdmin,
  body('codigo').notEmpty().withMessage('Código obrigatório'),
  validate,
  ingressoController.validar,
);

module.exports = router;
