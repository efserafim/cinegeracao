const { sanitizeObject } = require("../utils/sanitize");
function xssSanitize(req, _res, next) {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
}
module.exports = { xssSanitize };
