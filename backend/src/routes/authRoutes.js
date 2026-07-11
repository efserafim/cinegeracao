/**
 * Rotas de autenticação.
 */
const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { validate } = require('../middlewares/validate');
const { authAdmin } = require('../middlewares/auth');

const router = Router();

router.post(
  '/login',
  body('accessToken').optional().isString(),
  body('idToken').optional().isString(),
  body('email').optional().isEmail(),
  body('senha').optional().isLength({ min: 6 }),
  validate,
  authController.login,
);

router.get('/me', authAdmin, authController.me);

module.exports = router;
