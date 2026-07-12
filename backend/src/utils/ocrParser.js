function parseComprovanteOcr(texto) {
  const raw = texto || "";
  const normalized = raw.replace(/\r/g, "\n").replace(/[^\S\n]+/g, " ").trim();
  return {
    valor: extrairValor(normalized),
    data: extrairData(normalized),
    hora: extrairHora(normalized),
    nomeRecebedor: extrairRecebedor(normalized),
    instituicao: extrairInstituicao(normalized),
    idTransacao: extrairIdTransacao(normalized),
    textoOcr: raw
  };
}
function extrairValor(texto) {
  const patterns = [
    /R\$\s*([\d.]+,\d{2})/i,
    /valor(?:\s*(?:pago|transferido|da\s+transfer[eê]ncia))?\s*[:\-]?\s*R?\$?\s*([\d.]+,\d{2})/i,
    /([\d.]+,\d{2})\s*(?:reais)?/i
  ];
  for (const pattern of patterns) {
    const match = texto.match(pattern);
    if (match) {
      const num = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
      if (!Number.isNaN(num) && num > 0 && num < 1e6) return num;
    }
  }
  return null;
}
function extrairData(texto) {
  const patterns = [
    /(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/,
    /(\d{2})[\/\-.](\d{2})[\/\-.](\d{2})/
  ];
  for (const pattern of patterns) {
    const match = texto.match(pattern);
    if (match) {
      let [, d, m, y] = match;
      if (y.length === 2) y = `20${y}`;
      const date = new Date(`${y}-${m}-${d}T12:00:00`);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
}
function extrairHora(texto) {
  const match = texto.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/);
  if (!match) return null;
  const h = match[1].padStart(2, "0");
  const min = match[2];
  return `${h}:${min}`;
}
function extrairRecebedor(texto) {
  const patterns = [
    /(?:recebedor|destinat[aá]rio|favorecido|para)\s*[:\-]?\s*([A-Za-zÀ-ú\s.]{3,60})/i,
    /nome\s*[:\-]?\s*([A-Za-zÀ-ú\s.]{3,60})/i
  ];
  for (const pattern of patterns) {
    const match = texto.match(pattern);
    if (match) {
      return match[1].replace(/\n.*/, "").trim().slice(0, 80);
    }
  }
  return null;
}
function extrairInstituicao(texto) {
  const bancos = [
    "Nubank",
    "Neon",
    "C6",
    "Inter",
    "Ita[uú]",
    "Bradesco",
    "Santander",
    "Banco do Brasil",
    "Caixa",
    "PicPay",
    "Mercado Pago",
    "PagBank",
    "Sicoob",
    "Sicredi",
    "BTG",
    "Original",
    "Next",
    "Will Bank"
  ];
  for (const banco of bancos) {
    const re = new RegExp(banco, "i");
    const match = texto.match(re);
    if (match) return match[0];
  }
  return null;
}
function extrairIdTransacao(texto) {
  const patterns = [
    /(?:ID|E2E|end\s*to\s*end|NSU|autentica[cç][aã]o|c[oó]digo)\s*[:\-]?\s*([A-Z0-9]{8,40})/i,
    /\b([A-Z0-9]{20,35})\b/
  ];
  for (const pattern of patterns) {
    const match = texto.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}
function avaliarAlerta(campos, valorEsperado) {
  if (!campos.valor && !campos.data && !campos.idTransacao) {
    return "OCR_FALHOU";
  }
  if (campos.valor != null) {
    const diff = Math.abs(Number(campos.valor) - Number(valorEsperado));
    if (diff > 0.01) return "VALOR_INCORRETO";
  }
  if (campos.data) {
    const agora = new Date();
    const diffMs = agora.getTime() - campos.data.getTime();
    const dias = diffMs / (1e3 * 60 * 60 * 24);
    if (dias > 7) return "NECESSITA_CONFERENCIA";
  }
  return "NENHUM";
}
module.exports = { parseComprovanteOcr, avaliarAlerta };
