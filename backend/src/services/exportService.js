const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const prisma = require("../config/prisma");
async function obterLinhas(eventoId) {
  const items = await prisma.inscricao.findMany({
    where: { eventoId },
    include: {
      participante: true,
      pessoas: { orderBy: { ordem: "asc" }, include: { ingresso: true } },
      ingressos: true
    },
    orderBy: { criadoEm: "asc" }
  });
  return items.map((i) => {
    const nomes = (i.pessoas || []).map((p) => p.nome).join("; ") || i.participante.nome;
    const codigos = (i.pessoas || [])
      .map((p) => p.ingresso?.codigo)
      .filter(Boolean)
      .join("; ") || (i.ingressos || []).map((ig) => ig.codigo).join("; ");
    return {
      codigo: i.codigo,
      nome: i.participante.nome,
      pessoas: nomes,
      quantidade: i.quantidade || 1,
      telefone: i.participante.telefone,
      email: i.participante.email || "",
      paroquia: i.participante.paroquia || "",
      cidade: i.participante.cidade,
      chavePixDevolucao: i.participante.chavePixDevolucao || "",
      status: i.status,
      valor: Number(i.valor).toFixed(2),
      dataInscricao: i.criadoEm.toISOString(),
      ingresso: codigos
    };
  });
}
async function exportarExcel(eventoId) {
  const linhas = await obterLinhas(eventoId);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inscritos");
  ws.columns = [
    { header: "Código", key: "codigo", width: 16 },
    { header: "Responsável", key: "nome", width: 30 },
    { header: "Pessoas", key: "pessoas", width: 40 },
    { header: "Qtd", key: "quantidade", width: 8 },
    { header: "Telefone", key: "telefone", width: 16 },
    { header: "E-mail", key: "email", width: 28 },
    { header: "Paróquia", key: "paroquia", width: 28 },
    { header: "Cidade", key: "cidade", width: 20 },
    { header: "PIX devolução", key: "chavePixDevolucao", width: 28 },
    { header: "Status", key: "status", width: 24 },
    { header: "Valor", key: "valor", width: 12 },
    { header: "Data inscrição", key: "dataInscricao", width: 24 },
    { header: "Ingresso", key: "ingresso", width: 28 }
  ];
  ws.getRow(1).font = { bold: true };
  linhas.forEach((l) => ws.addRow(l));
  return wb.xlsx.writeBuffer();
}
async function exportarCsv(eventoId) {
  const linhas = await obterLinhas(eventoId);
  const headers = [
    "codigo",
    "nome",
    "pessoas",
    "quantidade",
    "telefone",
    "email",
    "paroquia",
    "cidade",
    "chavePixDevolucao",
    "status",
    "valor",
    "dataInscricao",
    "ingresso"
  ];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [headers.join(",")].concat(
    linhas.map((l) => headers.map((h) => escape(l[h])).join(","))
  );
  return Buffer.from(rows.join("\n"), "utf-8");
}
async function exportarPdf(eventoId) {
  const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
  const linhas = await obterLinhas(eventoId);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(16).text(`Inscritos – ${evento?.nome || eventoId}`, { underline: true });
    doc.moveDown();
    doc.fontSize(9);
    linhas.forEach((l, idx) => {
      doc.text(
        `${idx + 1}. ${l.nome} (${l.quantidade}x) | ${l.pessoas} | ${l.telefone} | ${l.status} | R$ ${l.valor}`
      );
    });
    doc.end();
  });
}
async function relatorioFinanceiro(eventoId) {
  const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!evento) {
    const err = new Error("Evento não encontrado");
    err.status = 404;
    throw err;
  }
  const confirmadas = await prisma.inscricao.findMany({
    where: { eventoId, status: { in: ["PAGAMENTO_CONFIRMADO", "INGRESSO_LIBERADO"] } },
    include: { participante: true }
  });
  const total = confirmadas.reduce((acc, i) => acc + Number(i.valor), 0);
  return {
    evento: evento.nome,
    quantidadeConfirmada: confirmadas.length,
    valorUnitario: Number(evento.valor),
    totalArrecadado: total,
    inscritos: confirmadas.map((i) => ({
      nome: i.participante.nome,
      valor: Number(i.valor),
      data: i.atualizadoEm
    }))
  };
}
module.exports = {
  exportarExcel,
  exportarCsv,
  exportarPdf,
  relatorioFinanceiro
};
