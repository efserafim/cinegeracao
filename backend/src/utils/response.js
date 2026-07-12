function success(res, data = null, message = "OK", status = 200) {
  return res.status(status).json({ success: true, message, data });
}
function fail(res, message = "Erro", status = 400, errors = null, data = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (data) body.data = data;
  return res.status(status).json(body);
}
module.exports = { success, fail };
