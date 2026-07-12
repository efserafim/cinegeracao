const crypto = require("crypto");
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function gerarCodigo(length = 10) {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}
function gerarCodigoInscricao() {
  return `INS-${gerarCodigo(8)}`;
}
function gerarCodigoIngresso() {
  return `TKT-${gerarCodigo(10)}`;
}
module.exports = { gerarCodigo, gerarCodigoInscricao, gerarCodigoIngresso };
