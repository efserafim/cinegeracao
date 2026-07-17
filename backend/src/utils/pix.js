function campo(id, valor) {
  const texto = String(valor ?? "");
  return `${id}${String(Buffer.byteLength(texto, "utf8")).padStart(2, "0")}${texto}`;
}

function textoPix(valor, limite) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, limite);
}

function normalizarChave(chave) {
  const texto = String(chave || "").trim();
  if (/^[\d./-]+$/.test(texto)) return texto.replace(/\D/g, "");
  return texto;
}

function crc16Ccitt(texto) {
  let crc = 0xffff;
  for (const byte of Buffer.from(texto, "utf8")) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function gerarPixCopiaECola({ chave, nome, cidade, valor, txid }) {
  const chaveNormalizada = normalizarChave(chave);
  const valorNumerico = Number(valor);
  if (!chaveNormalizada) throw new Error("Chave PIX obrigatória");
  if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
    throw new Error("Valor PIX inválido");
  }

  const contaPix = campo("00", "BR.GOV.BCB.PIX") + campo("01", chaveNormalizada);
  const referencia = textoPix(txid, 25).replace(/[^A-Z0-9]/g, "") || "***";
  const payloadSemCrc = [
    campo("00", "01"),
    campo("26", contaPix),
    campo("52", "0000"),
    campo("53", "986"),
    campo("54", valorNumerico.toFixed(2)),
    campo("58", "BR"),
    campo("59", textoPix(nome, 25) || "CINEGERACAO"),
    campo("60", textoPix(cidade, 15) || "SAQUAREMA"),
    campo("62", campo("05", referencia)),
    "6304",
  ].join("");

  return payloadSemCrc + crc16Ccitt(payloadSemCrc);
}

module.exports = { gerarPixCopiaECola };
