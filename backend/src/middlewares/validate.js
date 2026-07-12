const { validationResult } = require("express-validator");
const { fail } = require("../utils/response");
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(
      res,
      "Dados inválidos",
      422,
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  return next();
}
module.exports = { validate };
