const xss = require("xss");
function sanitizeString(value) {
  if (value === null || value === void 0) return value;
  if (typeof value !== "string") return value;
  return xss(value.trim());
}
function sanitizeObject(obj) {
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === "object") {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      clean[key] = sanitizeObject(value);
    }
    return clean;
  }
  return sanitizeString(obj);
}
function onlyDigits(value) {
  if (!value) return value;
  return String(value).replace(/\D/g, "");
}
function normalizarWhatsApp(value) {
  let d = onlyDigits(value);
  if (!d) return d;
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return d;
}
module.exports = { sanitizeString, sanitizeObject, onlyDigits, normalizarWhatsApp };
