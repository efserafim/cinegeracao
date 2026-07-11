/**
 * Sanitização XSS e helpers de limpeza de strings.
 */
const xss = require('xss');

function sanitizeString(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  return xss(value.trim());
}

/**
 * Sanitiza recursivamente objetos/arrays de entrada.
 */
function sanitizeObject(obj) {
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      clean[key] = sanitizeObject(value);
    }
    return clean;
  }
  return sanitizeString(obj);
}

/** Remove máscara de telefone/CPF, mantendo apenas dígitos. */
function onlyDigits(value) {
  if (!value) return value;
  return String(value).replace(/\D/g, '');
}

module.exports = { sanitizeString, sanitizeObject, onlyDigits };
