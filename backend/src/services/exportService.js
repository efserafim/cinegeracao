const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const prisma = require("../config/prisma");

const STATUS_LABELS = {
  PRE_INSCRITA: "Pré-inscrito(a)",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  COMPROVANTE_ENVIADO: "Comprovante enviado",
  OCR_PROCESSADO: "OCR processado",
  AGUARDANDO_CONFIRMACAO: "Aguardando confirmação",
  PAGAMENTO_CONFIRMADO: "Pagamento confirmado",
  INGRESSO_LIBERADO: "Ingresso liberado",
  PAGAMENTO_RECUSADO: "Pagamento recusado",
  CANCELADA: "Cancelada",
};

const COLUMNS = [
  { key: "codigo", header: "Código inscrição", width: 16 },
  { key: "nome", header: "Responsável", width: 28 },
  { key: "pessoas", header: "Pessoas", width: 36 },
  { key: "quantidade", header: "Qtd", width: 8 },
  { key: "telefone", header: "WhatsApp", width: 16 },
  { key: "email", header: "E-mail", width: 28 },
  { key: "paroquia", header: "Organização / Paróquia", width: 28 },
  { key: "cidade", header: "Cidade", width: 18 },
  { key: "chavePixDevolucao", header: "PIX devolução", width: 28 },
  { key: "status", header: "Status", width: 24 },
  { key: "valor", header: "Valor (R$)", width: 12 },
  { key: "dataInscricao", header: "Data inscrição", width: 18 },
  { key: "ingresso", header: "Códigos ingresso", width: 28 },
];

function labelStatus(status) {
  return STATUS_LABELS[status] || status || "";
}

function formatDateTime(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "0,00";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function obterEvento(eventoId) {
  return prisma.evento.findUnique({ where: { id: eventoId } });
}

async function obterLinhas(eventoId) {
  const items = await prisma.inscricao.findMany({
    where: { eventoId },
    include: {
      participante: true,
      pessoas: { orderBy: { ordem: "asc" }, include: { ingresso: true } },
      ingressos: true,
    },
    orderBy: { criadoEm: "asc" },
  });
  return items.map((i) => {
    const nomes = (i.pessoas || []).map((p) => p.nome).join("; ") || i.participante.nome;
    const codigos =
      (i.pessoas || [])
        .map((p) => p.ingresso?.codigo)
        .filter(Boolean)
        .join("; ") ||
      (i.ingressos || []).map((ig) => ig.codigo).join("; ");
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
      statusRaw: i.status,
      status: labelStatus(i.status),
      valorNum: Number(i.valor),
      valor: formatMoney(i.valor),
      dataInscricao: formatDateTime(i.criadoEm),
      ingresso: codigos,
    };
  });
}

function resumoLinhas(linhas) {
  const ativos = linhas.filter((l) => l.statusRaw !== "CANCELADA");
  const confirmadas = linhas.filter((l) =>
    ["PAGAMENTO_CONFIRMADO", "INGRESSO_LIBERADO"].includes(l.statusRaw)
  );
  const pre = linhas.filter((l) => l.statusRaw === "PRE_INSCRITA");
  const sumQtd = (arr) => arr.reduce((s, l) => s + (Number(l.quantidade) || 1), 0);
  const receita = confirmadas.reduce((s, l) => s + (Number(l.valorNum) || 0), 0);
  return {
    cadastros: linhas.length,
    pessoas: sumQtd(ativos),
    preInscritos: sumQtd(pre),
    confirmadas: sumQtd(confirmadas),
    canceladas: linhas.filter((l) => l.statusRaw === "CANCELADA").length,
    receita,
  };
}

function eventoMeta(evento) {
  if (!evento) return {};
  return {
    nome: evento.nome,
    data: formatDateOnly(evento.data),
    horario: evento.horario || "",
    local: evento.local || "",
    cidade: evento.cidade || "",
    valorUnitario: formatMoney(evento.valor),
  };
}

async function exportarExcel(eventoId) {
  const evento = await obterEvento(eventoId);
  const linhas = await obterLinhas(eventoId);
  const meta = eventoMeta(evento);
  const resumo = resumoLinhas(linhas);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema de Inscrições";
  wb.created = new Date();

  const wsResumo = wb.addWorksheet("Resumo", {
    properties: { tabColor: { argb: "FF1E3A5F" } },
  });
  wsResumo.columns = [
    { header: "Campo", key: "campo", width: 28 },
    { header: "Valor", key: "valor", width: 48 },
  ];
  wsResumo.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  wsResumo.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  };

  const resumoRows = [
    ["Evento", meta.nome || eventoId],
    ["Data", meta.data],
    ["Horário", meta.horario],
    ["Local", [meta.local, meta.cidade].filter(Boolean).join(" — ")],
    ["Valor unitário", `R$ ${meta.valorUnitario}`],
    ["Emitido em", formatDateTime(new Date())],
    ["", ""],
    ["Cadastros", resumo.cadastros],
    ["Pessoas (ativas)", resumo.pessoas],
    ["Pré-inscritos (pessoas)", resumo.preInscritos],
    ["Confirmados (pessoas)", resumo.confirmadas],
    ["Canceladas", resumo.canceladas],
    ["Receita confirmada", `R$ ${formatMoney(resumo.receita)}`],
  ];
  resumoRows.forEach(([campo, valor]) => {
    const row = wsResumo.addRow({ campo, valor });
    if (campo) row.getCell(1).font = { bold: true };
  });

  const ws = wb.addWorksheet("Inscritos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 22;

  linhas.forEach((l, idx) => {
    const row = ws.addRow({
      codigo: l.codigo,
      nome: l.nome,
      pessoas: l.pessoas,
      quantidade: l.quantidade,
      telefone: l.telefone,
      email: l.email,
      paroquia: l.paroquia,
      cidade: l.cidade,
      chavePixDevolucao: l.chavePixDevolucao,
      status: l.status,
      valor: l.valor,
      dataInscricao: l.dataInscricao,
      ingresso: l.ingresso,
    });
    if (idx % 2 === 1) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
    }
    if (l.statusRaw === "CANCELADA") {
      row.font = { color: { argb: "FF94A3B8" }, italic: true };
    }
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  return wb.xlsx.writeBuffer();
}

async function exportarCsv(eventoId) {
  const evento = await obterEvento(eventoId);
  const linhas = await obterLinhas(eventoId);
  const meta = eventoMeta(evento);
  const resumo = resumoLinhas(linhas);
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const preamble = [
    `# Evento: ${meta.nome || eventoId}`,
    `# Data: ${meta.data} ${meta.horario}`.trim(),
    `# Local: ${[meta.local, meta.cidade].filter(Boolean).join(" — ")}`,
    `# Cadastros: ${resumo.cadastros} | Pessoas: ${resumo.pessoas} | Confirmados: ${resumo.confirmadas} | Receita: R$ ${formatMoney(resumo.receita)}`,
    `# Emitido em: ${formatDateTime(new Date())}`,
  ];

  const headers = COLUMNS.map((c) => c.header);
  const keys = COLUMNS.map((c) => c.key);
  const rows = [
    ...preamble,
    headers.map(escape).join(";"),
    ...linhas.map((l) => keys.map((k) => escape(l[k])).join(";")),
  ];

  // BOM + UTF-8 para Excel abrir acentos corretamente
  return Buffer.from(`\uFEFF${rows.join("\n")}`, "utf-8");
}

async function exportarPdf(eventoId) {
  const evento = await obterEvento(eventoId);
  const linhas = await obterLinhas(eventoId);
  const meta = eventoMeta(evento);
  const resumo = resumoLinhas(linhas);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 36,
      size: "A4",
      layout: "landscape",
      bufferPages: true,
      info: {
        Title: `Lista de inscritos – ${meta.nome || eventoId}`,
        Author: "Sistema de Inscrições",
      },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    let y = doc.page.margins.top;

    function drawHeader() {
      doc.rect(doc.page.margins.left, y, pageWidth, 52).fill("#1E3A5F");
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(14);
      doc.text(meta.nome || "Lista de inscritos", doc.page.margins.left + 12, y + 10, {
        width: pageWidth - 24,
      });
      doc.font("Helvetica").fontSize(9);
      const sub = [
        meta.data && `Data: ${meta.data}`,
        meta.horario && `Horário: ${meta.horario}`,
        (meta.local || meta.cidade) && `Local: ${[meta.local, meta.cidade].filter(Boolean).join(" — ")}`,
      ]
        .filter(Boolean)
        .join("   ·   ");
      doc.text(sub || "Relatório de inscritos", doc.page.margins.left + 12, y + 30, {
        width: pageWidth - 24,
      });
      y += 64;

      doc.fillColor("#334155").fontSize(9);
      doc.text(
        `Cadastros: ${resumo.cadastros}   |   Pessoas: ${resumo.pessoas}   |   Pré: ${resumo.preInscritos}   |   Confirmados: ${resumo.confirmadas}   |   Receita: R$ ${formatMoney(resumo.receita)}   |   Emitido: ${formatDateTime(new Date())}`,
        doc.page.margins.left,
        y,
        { width: pageWidth }
      );
      y += 18;
    }

    const cols = [
      { key: "codigo", label: "Código", w: 78 },
      { key: "nome", label: "Responsável", w: 110 },
      { key: "pessoas", label: "Pessoas", w: 140 },
      { key: "quantidade", label: "Qtd", w: 28 },
      { key: "telefone", label: "WhatsApp", w: 78 },
      { key: "cidade", label: "Cidade", w: 70 },
      { key: "status", label: "Status", w: 100 },
      { key: "valor", label: "Valor", w: 48 },
      { key: "ingresso", label: "Ingressos", w: 118 },
    ];

    function drawTableHeader() {
      let x = doc.page.margins.left;
      doc.rect(x, y, pageWidth, 18).fill("#0F172A");
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8);
      cols.forEach((c) => {
        doc.text(c.label, x + 3, y + 5, { width: c.w - 6, ellipsis: true });
        x += c.w;
      });
      y += 20;
    }

    function ensureSpace(rowH) {
      if (y + rowH > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
        drawTableHeader();
      }
    }

    drawHeader();
    drawTableHeader();

    doc.font("Helvetica").fontSize(7.5);

    linhas.forEach((l, idx) => {
      const rowH = 16;
      ensureSpace(rowH);
      let x = doc.page.margins.left;
      if (idx % 2 === 0) {
        doc.rect(x, y - 2, pageWidth, rowH).fill("#F1F5F9");
      }
      doc.fillColor(l.statusRaw === "CANCELADA" ? "#94A3B8" : "#0F172A");
      cols.forEach((c) => {
        const val = c.key === "quantidade" ? String(l.quantidade) : String(l[c.key] ?? "");
        doc.text(val, x + 3, y + 2, { width: c.w - 6, height: rowH - 2, ellipsis: true });
        x += c.w;
      });
      y += rowH;
    });

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor("#64748B").fontSize(8).font("Helvetica");
      doc.text(
        `Página ${i + 1} de ${range.count}`,
        doc.page.margins.left,
        doc.page.height - 28,
        { width: pageWidth, align: "center" }
      );
    }

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
    include: { participante: true },
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
      data: i.atualizadoEm,
    })),
  };
}

module.exports = {
  exportarExcel,
  exportarCsv,
  exportarPdf,
  relatorioFinanceiro,
};
