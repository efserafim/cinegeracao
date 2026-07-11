/**
 * Gera códigos alfanuméricos únicos para inscrições e ingressos.
 */
const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * @param {number} length
 * @returns {string}
 */
function gerarCodigo(length = 10) {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

/**
 * Código de inscrição com prefixo (ex.: INS-A1B2C3D4).
 */
function gerarCodigoInscricao() {
  return `INS-${gerarCodigo(8)}`;
}

/**
 * Código de ingresso (ex.: TKT-A1B2C3D4E5).
 */
function gerarCodigoIngresso() {
  return `TKT-${gerarCodigo(10)}`;
}

module.exports = { gerarCodigo, gerarCodigoInscricao, gerarCodigoIngresso };
