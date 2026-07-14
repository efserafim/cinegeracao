const QRCode = require("qrcode");
const prisma = require("../config/prisma");
const { gerarCodigoInscricao } = require("../utils/codes");
const { onlyDigits, normalizarWhatsApp } = require("../utils/sanitize");
const { gerarLinkWhatsApp } = require("../utils/whatsapp");
const { processarComprovante } = require("./ocrService");
const { criarIngressos } = require("./ingressoService");
const { enviarConfirmacaoInscricao } = require("./emailService");
const { registrarLog } = require("./logService");
const { contarOcupadas, STATUS_OCUPAM_VAGA } = require("./eventoService");
const { salvarComprovante } = require("./storageService");
const { notifyAdmins } = require("./pushService");

const MAX_INGRESSOS = 10;

const includeInscricao = {
  participante: true,
  evento: true,
  pagamento: { include: { comprovante: true } },
  pessoas: { orderBy: { ordem: "asc" }, include: { ingresso: true } },
  ingressos: { include: { pessoa: true }, orderBy: { criadoEm: "asc" } }
};

function parseQuantidadeEPessoas(dados) {
  const quantidade = Math.max(1, Math.min(MAX_INGRESSOS, Number(dados.quantidade) || 1));
  let pessoas = Array.isArray(dados.pessoas)
    ? dados.pessoas.map((p) => String(p || "").trim())
    : [];
  if (pessoas.length === 0 && dados.nome) {
    pessoas = [String(dados.nome).trim()];
  }
  if (pessoas.length !== quantidade || pessoas.some((p) => !p)) {
    const err = new Error(`Informe o nome completo de cada uma das ${quantidade} pessoa(s)`);
    err.status = 400;
    throw err;
  }
  return { quantidade, pessoas };
}

async function criarInscricao(eventoId, dados) {
  const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!evento || evento.status !== "ABERTO") {
    const err = new Error("Evento não disponível para inscrição");
    err.status = 400;
    throw err;
  }
  const { quantidade, pessoas } = parseQuantidadeEPessoas(dados);
  const ocupadas = await contarOcupadas(eventoId);
  if (ocupadas + quantidade > evento.vagasMaximas) {
    const err = new Error(
      ocupadas >= evento.vagasMaximas
        ? "Vagas esgotadas"
        : `Restam apenas ${evento.vagasMaximas - ocupadas} vaga(s)`
    );
    err.status = 409;
    throw err;
  }
  const telefone = normalizarWhatsApp(dados.telefone);
  if (!telefone || telefone.length < 10) {
    const err = new Error("Informe um WhatsApp válido com DDD");
    err.status = 400;
    throw err;
  }
  const sufixo = telefone.slice(-11);
  const existente = await prisma.inscricao.findFirst({
    where: {
      eventoId,
      status: { not: "CANCELADA" },
      participante: {
        OR: [
          { telefone },
          { telefone: { endsWith: sufixo } },
          ...telefone.length >= 10 ? [{ telefone: { endsWith: telefone.slice(-10) } }] : []
        ]
      }
    },
    include: includeInscricao,
    orderBy: { criadoEm: "desc" }
  });
  if (existente) {
    const err = new Error(
      "Já existe uma inscrição com este WhatsApp neste evento. Use o código abaixo ou fale com Eduardo/Lavínia se precisar de ajuda."
    );
    err.status = 409;
    err.data = {
      duplicada: true,
      codigo: existente.codigo,
      status: existente.status,
      nome: existente.participante?.nome,
      inscricao: formatInscricao(existente)
    };
    throw err;
  }
  const nomeResponsavel = String(dados.nome || pessoas[0]).trim();
  const valorTotal = Number(evento.valor) * quantidade;
  const chavePixDevolucao = String(dados.chavePixDevolucao || "").trim();
  if (!chavePixDevolucao) {
    const err = new Error("Informe uma chave PIX para devolução, caso seja necessário");
    err.status = 400;
    throw err;
  }
  const participante = await prisma.participante.create({
    data: {
      nome: nomeResponsavel,
      telefone,
      email: dados.email || null,
      paroquia: dados.paroquia,
      cidade: dados.cidade,
      chavePixDevolucao
    }
  });
  const metodo = String(dados.metodoPagamento || dados.metodo || "PIX").toUpperCase() === "DINHEIRO" ? "DINHEIRO" : "PIX";
  const statusInicial = metodo === "DINHEIRO" ? "AGUARDANDO_CONFIRMACAO" : "AGUARDANDO_PAGAMENTO";
  const inscricao = await prisma.inscricao.create({
    data: {
      codigo: gerarCodigoInscricao(),
      eventoId,
      participanteId: participante.id,
      status: statusInicial,
      valor: valorTotal,
      quantidade,
      observacao: metodo === "DINHEIRO" ? "Pagamento em dinheiro — aguardando confirmação do organizador." : null,
      pagamento: {
        create: {
          valorEsperado: valorTotal,
          metodo,
          alerta: metodo === "DINHEIRO" ? "NECESSITA_CONFERENCIA" : "NENHUM"
        }
      },
      pessoas: {
        create: pessoas.map((nome, ordem) => ({ nome, ordem }))
      }
    },
    include: includeInscricao
  });
  const pixPayload = [
    `PIX: ${evento.chavePix}`,
    `Favorecido: ${evento.nomeFavorecido}`,
    `Valor: R$ ${valorTotal.toFixed(2).replace(".", ",")}`,
    `Ref: ${inscricao.codigo}`,
    quantidade > 1 ? `Ingressos: ${quantidade}` : null
  ].filter(Boolean).join("\n");
  const qrCodeDataUrl = await QRCode.toDataURL(evento.chavePix, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280
  });
  if (metodo === "DINHEIRO") {
    notifyAdmins({
      title: "Pagamento em dinheiro",
      body: `${participante.nome} se inscreveu — ${inscricao.codigo}`,
      url: `/admin/inscricoes/${inscricao.id}`,
    }).catch(() => {});
  }
  return {
    inscricao: formatInscricao(inscricao),
    pagamento: {
      metodo,
      chavePix: evento.chavePix,
      nomeFavorecido: evento.nomeFavorecido,
      valor: valorTotal,
      qrCodeDataUrl,
      pixPayload
    }
  };
}
async function buscarPorCodigo(codigo) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { codigo },
    include: includeInscricao
  });
  if (!inscricao) {
    const err = new Error("Inscrição não encontrada");
    err.status = 404;
    throw err;
  }
  return formatInscricao(inscricao);
}

async function buscarPorWhatsApp(telefoneRaw) {
  const telefone = normalizarWhatsApp(telefoneRaw);
  if (!telefone || telefone.length < 10) {
    const err = new Error("Informe o WhatsApp com DDD (10 ou 11 dígitos)");
    err.status = 400;
    throw err;
  }
  const sufixo11 = telefone.slice(-11);
  const sufixo10 = telefone.slice(-10);
  const list = await prisma.inscricao.findMany({
    where: {
      participante: {
        OR: [
          { telefone },
          { telefone: { endsWith: sufixo11 } },
          { telefone: { endsWith: sufixo10 } }
        ]
      }
    },
    include: includeInscricao,
    orderBy: { criadoEm: "desc" },
    take: 20
  });
  return list.map(formatInscricao);
}
function valorOcrConfere(valorDetectado, valorEsperado) {
  if (valorDetectado == null || valorEsperado == null) return false;
  return Math.abs(Number(valorDetectado) - Number(valorEsperado)) <= 0.01;
}

async function tentarAutoConfirmacaoPorOcr(inscricaoId, ocr, valorEsperado) {
  if (!valorOcrConfere(ocr?.valor, valorEsperado)) {
    return { auto: false };
  }
  try {
    const result = await confirmarPagamento(inscricaoId, null, null, { automatico: true });
    return { auto: true, result };
  } catch (err) {
    console.error("[autoConfirmacao OCR]", err.message || err);
    return { auto: false, error: err.message };
  }
}

async function enviarComprovante(codigo, file) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { codigo },
    include: { pagamento: { include: { comprovante: true } }, evento: true, participante: true }
  });
  if (!inscricao) {
    const err = new Error("Inscrição não encontrada");
    err.status = 404;
    throw err;
  }
  if (["CANCELADA", "PAGAMENTO_CONFIRMADO", "INGRESSO_LIBERADO"].includes(inscricao.status)) {
    const err = new Error("Não é possível enviar comprovante neste status");
    err.status = 400;
    throw err;
  }
  if (!inscricao.pagamento) {
    const err = new Error("Pagamento não encontrado");
    err.status = 400;
    throw err;
  }
  if (inscricao.pagamento.metodo === "DINHEIRO") {
    const err = new Error("Esta inscrição é pagamento em dinheiro — não precisa de comprovante PIX");
    err.status = 400;
    throw err;
  }
  const arquivoUrl = await salvarComprovante(file);
  if (inscricao.pagamento.comprovante) {
    await prisma.comprovante.update({
      where: { id: inscricao.pagamento.comprovante.id },
      data: {
        arquivoUrl,
        mimeType: file.mimetype,
        tamanhoBytes: file.size
      }
    });
  } else {
    await prisma.comprovante.create({
      data: {
        pagamentoId: inscricao.pagamento.id,
        arquivoUrl,
        mimeType: file.mimetype,
        tamanhoBytes: file.size
      }
    });
  }
  await prisma.inscricao.update({
    where: { id: inscricao.id },
    data: { status: "COMPROVANTE_ENVIADO" }
  });
  const ocr = await processarComprovante(
    file.path,
    file.mimetype,
    Number(inscricao.pagamento.valorEsperado)
  );
  await prisma.pagamento.update({
    where: { id: inscricao.pagamento.id },
    data: {
      valorDetectado: ocr.valor,
      dataDetectada: ocr.data,
      horaDetectada: ocr.hora,
      nomeRecebedor: ocr.nomeRecebedor,
      instituicao: ocr.instituicao,
      idTransacao: ocr.idTransacao,
      textoOcr: ocr.textoOcr,
      alerta: ocr.alerta
    }
  });
  await prisma.inscricao.update({
    where: { id: inscricao.id },
    data: { status: "AGUARDANDO_CONFIRMACAO" }
  });

  const nome = inscricao.participante?.nome || "Participante";
  const auto = await tentarAutoConfirmacaoPorOcr(
    inscricao.id,
    ocr,
    Number(inscricao.pagamento.valorEsperado)
  );

  if (auto.auto) {
    notifyAdmins({
      title: "PIX liberado automaticamente",
      body: `${nome} — valor confere · ${inscricao.codigo}`,
      url: `/admin/inscricoes/${inscricao.id}`,
    }).catch(() => {});
    const dados = await buscarPorCodigo(codigo);
    return { ...dados, autoConfirmado: true, emailResult: auto.result?.emailResult };
  }

  notifyAdmins({
    title: "Comprovante pendente",
    body: `${nome} enviou comprovante — ${inscricao.codigo}`,
    url: `/admin/inscricoes/${inscricao.id}`,
  }).catch(() => {});
  return buscarPorCodigo(codigo);
}
async function reprocessarOcr(id) {
  const path = require("path");
  const fs = require("fs");
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: {
      pagamento: { include: { comprovante: true } },
      evento: true
    }
  });
  if (!inscricao) {
    const err = new Error("Inscrição não encontrada");
    err.status = 404;
    throw err;
  }
  const comprovante = inscricao.pagamento?.comprovante;
  if (!comprovante?.arquivoUrl) {
    const err = new Error("Nenhum comprovante para processar");
    err.status = 400;
    throw err;
  }
  const relative = comprovante.arquivoUrl.replace(/^\//, "");
  const resolved = path.resolve(process.cwd(), relative);
  if (!fs.existsSync(resolved)) {
    const err = new Error("Arquivo do comprovante não encontrado no servidor");
    err.status = 404;
    throw err;
  }
  const ocr = await processarComprovante(
    resolved,
    comprovante.mimeType,
    Number(inscricao.pagamento.valorEsperado)
  );
  await prisma.pagamento.update({
    where: { id: inscricao.pagamento.id },
    data: {
      valorDetectado: ocr.valor,
      dataDetectada: ocr.data,
      horaDetectada: ocr.hora,
      nomeRecebedor: ocr.nomeRecebedor,
      instituicao: ocr.instituicao,
      idTransacao: ocr.idTransacao,
      textoOcr: ocr.textoOcr,
      alerta: ocr.alerta
    }
  });
  if (["COMPROVANTE_ENVIADO", "OCR_PROCESSADO", "AGUARDANDO_CONFIRMACAO"].includes(inscricao.status)) {
    await prisma.inscricao.update({
      where: { id: inscricao.id },
      data: { status: "AGUARDANDO_CONFIRMACAO" }
    });
  }

  if (["AGUARDANDO_CONFIRMACAO", "COMPROVANTE_ENVIADO", "OCR_PROCESSADO"].includes(inscricao.status)) {
    const auto = await tentarAutoConfirmacaoPorOcr(
      inscricao.id,
      ocr,
      Number(inscricao.pagamento.valorEsperado)
    );
    if (auto.auto) {
      const dados = await buscarAdmin(id);
      return { ...dados, autoConfirmado: true, emailResult: auto.result?.emailResult };
    }
  }

  return buscarAdmin(id);
}
async function listarPorEvento(eventoId, filtros = {}) {
  const where = { eventoId };
  if (filtros.status) where.status = filtros.status;
  if (filtros.q || filtros.nome || filtros.telefone || filtros.cidade) {
    const and = [];
    if (filtros.nome || filtros.q) {
      const termo = filtros.nome || filtros.q;
      and.push({
        OR: [
          { participante: { nome: { contains: termo, mode: "insensitive" } } },
          { pessoas: { some: { nome: { contains: termo, mode: "insensitive" } } } }
        ]
      });
    }
    if (filtros.telefone) {
      and.push({ participante: { telefone: { contains: onlyDigits(filtros.telefone) } } });
    }
    if (filtros.cidade) {
      and.push({ participante: { cidade: { contains: filtros.cidade, mode: "insensitive" } } });
    }
    where.AND = and;
  }
  const items = await prisma.inscricao.findMany({
    where,
    include: includeInscricao,
    orderBy: { criadoEm: "desc" }
  });
  return items.map(formatInscricao);
}
async function buscarAdmin(id) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: includeInscricao
  });
  if (!inscricao) {
    const err = new Error("Inscrição não encontrada");
    err.status = 404;
    throw err;
  }
  return formatInscricao(inscricao);
}
async function confirmarPagamento(id, adminId, ip, opcoes = {}) {
  const automatico = Boolean(opcoes.automatico);
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: { participante: true, evento: true, pagamento: true, pessoas: true }
  });
  if (!inscricao) {
    const err = new Error("Inscrição não encontrada");
    err.status = 404;
    throw err;
  }
  if (!inscricao.pagamento) {
    const err = new Error("Pagamento não encontrado para esta inscrição");
    err.status = 400;
    throw err;
  }
  if (["CANCELADA"].includes(inscricao.status)) {
    const err = new Error("Não é possível confirmar uma inscrição cancelada");
    err.status = 400;
    throw err;
  }
  if (["INGRESSO_LIBERADO", "PAGAMENTO_CONFIRMADO"].includes(inscricao.status) && inscricao.pagamento.confirmadoEm) {
    const atual = await buscarAdmin(id);
    return { ...atual, emailResult: { sent: false, reason: "Já estava confirmado" }, jaConfirmado: true };
  }

  await prisma.$transaction([
    prisma.pagamento.update({
      where: { inscricaoId: id },
      data: {
        confirmadoEm: new Date(),
        recusadoEm: null,
        liberacaoAutomatica: automatico
      }
    }),
    prisma.inscricao.update({
      where: { id },
      data: { status: "PAGAMENTO_CONFIRMADO" }
    })
  ]);

  let ingressos;
  try {
    ingressos = await criarIngressos(id);
  } catch (err) {
    console.error("[confirmarPagamento] criarIngressos:", err);
    const wrapped = new Error(
      err?.code === "P2021" || /does not exist|Unknown arg|Unknown field/i.test(String(err.message))
        ? "Banco desatualizado. Reinicie o serviço no Render para aplicar as migrations."
        : err.message || "Falha ao gerar ingressos"
    );
    wrapped.status = 500;
    wrapped.expose = true;
    throw wrapped;
  }

  if (!Array.isArray(ingressos) || ingressos.length === 0) {
    const err = new Error("Não foi possível gerar o(s) ingresso(s)");
    err.status = 500;
    err.expose = true;
    throw err;
  }

  await prisma.inscricao.update({
    where: { id },
    data: { status: "INGRESSO_LIBERADO" }
  });
  const dataEvt = new Date(inscricao.evento.data);
  const dataFmt = `${String(dataEvt.getUTCDate()).padStart(2, "0")}/${String(dataEvt.getUTCMonth() + 1).padStart(2, "0")}/${dataEvt.getUTCFullYear()}`;
  const pessoasPorId = Object.fromEntries((inscricao.pessoas || []).map((p) => [p.id, p]));
  const ticketsEmail = ingressos.map((ig, idx) => ({
    codigo: ig.codigo,
    nome: pessoasPorId[ig.pessoaId]?.nome || inscricao.pessoas?.[idx]?.nome || inscricao.participante.nome
  }));
  const codigosIngresso = ticketsEmail.map((t) => t.codigo).filter(Boolean).join(", ");
  const ingresso = ingressos[0];
  const emailPayload = inscricao.participante.email
    ? {
        para: inscricao.participante.email,
        nome: inscricao.participante.nome,
        evento: inscricao.evento.nome,
        data: dataFmt,
        horario: inscricao.evento.horario,
        local: inscricao.evento.local,
        cidade: inscricao.evento.cidade,
        codigoIngresso: codigosIngresso,
        codigoInscricao: inscricao.codigo,
        chegada: "17h10",
        tickets: ticketsEmail,
        quantidade: ticketsEmail.length || inscricao.quantidade || 1
      }
    : null;

  // Envia e-mail na confirmação (aguarda resultado para feedback correto no painel)
  let emailResult = emailPayload
    ? null
    : { sent: false, reason: "Participante sem e-mail" };

  if (emailPayload) {
    try {
      emailResult = await enviarConfirmacaoInscricao(emailPayload);
      console.log("[confirmarPagamento] email:", emailResult);
      await registrarLog({
        adminId,
        acao: "EMAIL_CONFIRMACAO",
        entidade: "Inscricao",
        entidadeId: id,
        detalhes: emailResult,
        ip
      }).catch((logErr) => console.error("[confirmarPagamento] log email:", logErr.message));
    } catch (emailErr) {
      console.error("[confirmarPagamento] email:", emailErr.message || emailErr);
      emailResult = {
        sent: false,
        to: emailPayload.para,
        reason: emailErr.message || "Falha ao enviar e-mail"
      };
      await registrarLog({
        adminId,
        acao: "EMAIL_CONFIRMACAO",
        entidade: "Inscricao",
        entidadeId: id,
        detalhes: emailResult,
        ip
      }).catch(() => {});
    }
  } else {
    await registrarLog({
      adminId,
      acao: "EMAIL_CONFIRMACAO",
      entidade: "Inscricao",
      entidadeId: id,
      detalhes: emailResult,
      ip
    });
  }

  const whatsappLink = gerarLinkWhatsApp({
    telefone: inscricao.participante.telefone,
    nome: inscricao.participante.nome,
    evento: inscricao.evento.nome,
    data: dataFmt,
    horario: inscricao.evento.horario,
    local: inscricao.evento.local,
    cidade: inscricao.evento.cidade,
    codigoIngresso: codigosIngresso,
    codigoInscricao: inscricao.codigo,
    chegada: "17h10",
    tickets: ticketsEmail,
    quantidade: ticketsEmail.length || inscricao.quantidade || 1
  });
  await registrarLog({
    adminId: adminId || null,
    acao: automatico ? "PAGAMENTO_AUTO_CONFIRMADO_OCR" : "PAGAMENTO_CONFIRMADO",
    entidade: "Inscricao",
    entidadeId: id,
    detalhes: automatico
      ? { origem: "ocr_valor", valorDetectado: inscricao.pagamento.valorDetectado }
      : undefined,
    ip: ip || null
  });
  const result = await buscarAdmin(id).catch((err) => {
    console.error("[confirmarPagamento] buscarAdmin:", err);
    return {
      id: inscricao.id,
      codigo: inscricao.codigo,
      status: "INGRESSO_LIBERADO",
      quantidade: ingressos.length,
      participante: inscricao.participante,
      evento: inscricao.evento,
      ingressos: ingressos.map((ig) => ({
        id: ig.id,
        codigo: ig.codigo,
        status: ig.status
      })),
      ingresso: {
        id: ingresso.id,
        codigo: ingresso.codigo,
        status: ingresso.status
      }
    };
  });
  return { ...result, whatsappLink, emailResult, ingresso, autoConfirmado: automatico };
}

async function liberarIngressosFaltantes(id, adminId, ip) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: {
      pessoas: { include: { ingresso: true } },
      ingressos: true,
      participante: true,
      evento: true
    }
  });
  if (!inscricao) {
    const err = new Error("Inscrição não encontrada");
    err.status = 404;
    throw err;
  }
  if (["CANCELADA", "PAGAMENTO_RECUSADO"].includes(inscricao.status)) {
    const err = new Error("Não é possível liberar ingressos nesta inscrição");
    err.status = 400;
    throw err;
  }

  let ingressos;
  try {
    ingressos = await criarIngressos(id);
  } catch (err) {
    console.error("[liberarIngressosFaltantes]", err);
    const wrapped = new Error(err.message || "Falha ao gerar ingressos faltantes");
    wrapped.status = 500;
    wrapped.expose = true;
    throw wrapped;
  }

  if (!ingressos?.length) {
    const err = new Error("Nenhum ingresso foi gerado");
    err.status = 500;
    err.expose = true;
    throw err;
  }

  await prisma.inscricao.update({
    where: { id },
    data: { status: "INGRESSO_LIBERADO" }
  });

  await registrarLog({
    adminId,
    acao: "INGRESSOS_LIBERADOS",
    entidade: "Inscricao",
    entidadeId: id,
    detalhes: {
      quantidade: ingressos.length,
      codigos: ingressos.map((ig) => ig.codigo)
    },
    ip
  });

  return buscarAdmin(id);
}
async function recusarPagamento(id, observacao, adminId, ip) {
  await prisma.$transaction([
    prisma.pagamento.update({
      where: { inscricaoId: id },
      data: { recusadoEm: new Date() }
    }),
    prisma.inscricao.update({
      where: { id },
      data: {
        status: "PAGAMENTO_RECUSADO",
        observacao: observacao || null
      }
    })
  ]);
  await registrarLog({
    adminId,
    acao: "PAGAMENTO_RECUSADO",
    entidade: "Inscricao",
    entidadeId: id,
    detalhes: { observacao },
    ip
  });
  return buscarAdmin(id);
}
async function cancelar(id, observacao, adminId, ip) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: { ingressos: true }
  });
  if (!inscricao) {
    const err = new Error("Inscrição não encontrada");
    err.status = 404;
    throw err;
  }
  await prisma.inscricao.update({
    where: { id },
    data: { status: "CANCELADA", observacao: observacao || null }
  });
  if (inscricao.ingressos?.length) {
    await prisma.ingresso.updateMany({
      where: { inscricaoId: id },
      data: { status: "CANCELADO" }
    });
  }
  await registrarLog({
    adminId,
    acao: "INSCRICAO_CANCELADA",
    entidade: "Inscricao",
    entidadeId: id,
    detalhes: { observacao },
    ip
  });
  return buscarAdmin(id);
}
async function excluir(id, adminId, ip) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: { participante: true }
  });
  if (!inscricao) {
    const err = new Error("Inscrição não encontrada");
    err.status = 404;
    throw err;
  }
  const participanteId = inscricao.participanteId;
  await prisma.inscricao.delete({ where: { id } });
  const outras = await prisma.inscricao.count({ where: { participanteId } });
  if (outras === 0) {
    await prisma.participante.delete({ where: { id: participanteId } }).catch(() => {
    });
  }
  await registrarLog({
    adminId,
    acao: "INSCRICAO_EXCLUIDA",
    entidade: "Inscricao",
    entidadeId: id,
    detalhes: {
      codigo: inscricao.codigo,
      participante: inscricao.participante?.nome
    },
    ip
  });
  return { id, excluida: true };
}
async function atualizarObservacao(id, observacao, adminId, ip) {
  await prisma.inscricao.update({
    where: { id },
    data: { observacao }
  });
  await registrarLog({
    adminId,
    acao: "OBSERVACAO_ATUALIZADA",
    entidade: "Inscricao",
    entidadeId: id,
    ip
  });
  return buscarAdmin(id);
}
async function dashboard(eventoId) {
  const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!evento) {
    const err = new Error("Evento não encontrado");
    err.status = 404;
    throw err;
  }
  const [total, confirmadas, pendentes, canceladas, arrecadado] = await Promise.all([
    prisma.inscricao.count({ where: { eventoId } }),
    prisma.inscricao.count({
      where: { eventoId, status: { in: ["PAGAMENTO_CONFIRMADO", "INGRESSO_LIBERADO"] } }
    }),
    prisma.inscricao.count({
      where: {
        eventoId,
        status: {
          in: [
            "AGUARDANDO_PAGAMENTO",
            "COMPROVANTE_ENVIADO",
            "OCR_PROCESSADO",
            "AGUARDANDO_CONFIRMACAO",
            "PAGAMENTO_RECUSADO"
          ]
        }
      }
    }),
    prisma.inscricao.count({ where: { eventoId, status: "CANCELADA" } }),
    prisma.inscricao.aggregate({
      where: { eventoId, status: { in: ["PAGAMENTO_CONFIRMADO", "INGRESSO_LIBERADO"] } },
      _sum: { valor: true }
    })
  ]);
  const ocupadas = await contarOcupadas(eventoId);
  return {
    inscritos: total,
    confirmadas,
    pendentes,
    canceladas,
    valorArrecadado: Number(arrecadado._sum.valor || 0),
    vagasRestantes: Math.max(0, evento.vagasMaximas - ocupadas),
    vagasMaximas: evento.vagasMaximas
  };
}
async function dashboardGlobal() {
  const statusPendentes = ["AGUARDANDO_CONFIRMACAO", "COMPROVANTE_ENVIADO", "OCR_PROCESSADO"];
  const [
    eventos,
    inscritos,
    confirmadas,
    pendentes,
    valor,
    presentes,
    pendentesRaw,
    conferirExtratoRaw
  ] = await Promise.all([
    prisma.evento.count(),
    prisma.inscricao.count(),
    prisma.inscricao.count({
      where: { status: { in: ["PAGAMENTO_CONFIRMADO", "INGRESSO_LIBERADO"] } }
    }),
    prisma.inscricao.count({
      where: { status: { in: statusPendentes } }
    }),
    prisma.inscricao.aggregate({
      where: { status: { in: ["PAGAMENTO_CONFIRMADO", "INGRESSO_LIBERADO"] } },
      _sum: { valor: true }
    }),
    prisma.ingresso.count({
      where: { presenteEm: { not: null } }
    }),
    prisma.inscricao.findMany({
      where: { status: { in: statusPendentes } },
      orderBy: { atualizadoEm: "desc" },
      take: 5,
      include: {
        participante: { select: { nome: true } },
        evento: { select: { nome: true } },
        pagamento: { select: { alerta: true, valorDetectado: true, valorEsperado: true } }
      }
    }),
    prisma.inscricao.findMany({
      where: {
        status: { in: ["INGRESSO_LIBERADO", "PAGAMENTO_CONFIRMADO"] },
        pagamento: {
          metodo: "PIX",
          conferidoExtratoEm: null
        }
      },
      orderBy: { atualizadoEm: "desc" },
      take: 8,
      include: {
        participante: { select: { nome: true, telefone: true } },
        evento: { select: { nome: true } },
        pagamento: {
          select: {
            valorEsperado: true,
            valorDetectado: true,
            idTransacao: true,
            liberacaoAutomatica: true
          }
        }
      }
    })
  ]);
  const pendentesRecentes = pendentesRaw.map((i) => ({
    id: i.id,
    codigo: i.codigo,
    nome: i.participante?.nome || "—",
    eventoNome: i.evento?.nome || "—",
    status: i.status,
    alerta: i.pagamento?.alerta || null,
    criadoEm: i.criadoEm
  }));
  const conferirExtrato = conferirExtratoRaw.map((i) => ({
    id: i.id,
    codigo: i.codigo,
    nome: i.participante?.nome || "—",
    telefone: i.participante?.telefone || null,
    eventoNome: i.evento?.nome || "—",
    valor: Number(i.pagamento?.valorEsperado || i.valor || 0),
    valorDetectado:
      i.pagamento?.valorDetectado != null ? Number(i.pagamento.valorDetectado) : null,
    idTransacao: i.pagamento?.idTransacao || null,
    liberacaoAutomatica: Boolean(i.pagamento?.liberacaoAutomatica)
  }));
  return {
    eventos,
    inscritos,
    confirmadas,
    pendentes,
    presentes,
    valorArrecadado: Number(valor._sum.valor || 0),
    pendentesRecentes,
    conferirExtrato
  };
}

async function marcarConferidoExtrato(id, adminId, ip) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: { pagamento: true }
  });
  if (!inscricao) {
    const err = new Error("Inscrição não encontrada");
    err.status = 404;
    throw err;
  }
  if (!inscricao.pagamento) {
    const err = new Error("Pagamento não encontrado");
    err.status = 400;
    throw err;
  }
  if (!["INGRESSO_LIBERADO", "PAGAMENTO_CONFIRMADO"].includes(inscricao.status)) {
    const err = new Error("Só é possível conferir extrato após liberar o ingresso");
    err.status = 400;
    throw err;
  }
  await prisma.pagamento.update({
    where: { id: inscricao.pagamento.id },
    data: { conferidoExtratoEm: new Date() }
  });
  await registrarLog({
    adminId,
    acao: "CONFERIDO_EXTRATO_BANCO",
    entidade: "Inscricao",
    entidadeId: id,
    ip
  });
  return buscarAdmin(id);
}
function formatInscricao(i) {
  const pessoas = (i.pessoas || []).map((p) => ({
    id: p.id,
    nome: p.nome,
    ordem: p.ordem,
    ingresso: p.ingresso
      ? {
          id: p.ingresso.id,
          codigo: p.ingresso.codigo,
          status: p.ingresso.status,
          presenteEm: p.ingresso.presenteEm || null
        }
      : null
  }));
  const ingressos = (i.ingressos || []).map((ig) => ({
    id: ig.id,
    codigo: ig.codigo,
    status: ig.status,
    liberadoEm: ig.liberadoEm,
    utilizadoEm: ig.utilizadoEm,
    presenteEm: ig.presenteEm || null,
    pessoaId: ig.pessoaId || ig.pessoa?.id || null,
    nome: ig.pessoa?.nome || null
  }));
  const ingresso = ingressos[0]
    ? {
        id: ingressos[0].id,
        codigo: ingressos[0].codigo,
        status: ingressos[0].status,
        liberadoEm: ingressos[0].liberadoEm,
        utilizadoEm: ingressos[0].utilizadoEm,
        presenteEm: ingressos[0].presenteEm
      }
    : null;
  return {
    id: i.id,
    codigo: i.codigo,
    status: i.status,
    valor: Number(i.valor),
    quantidade: i.quantidade || 1,
    observacao: i.observacao,
    criadoEm: i.criadoEm,
    atualizadoEm: i.atualizadoEm,
    pessoas,
    participante: i.participante ? {
      id: i.participante.id,
      nome: i.participante.nome,
      telefone: i.participante.telefone,
      email: i.participante.email,
      paroquia: i.participante.paroquia,
      cidade: i.participante.cidade,
      chavePixDevolucao: i.participante.chavePixDevolucao || null
    } : void 0,
    evento: i.evento ? {
      id: i.evento.id,
      nome: i.evento.nome,
      data: i.evento.data,
      horario: i.evento.horario,
      local: i.evento.local,
      cidade: i.evento.cidade,
      chavePix: i.evento.chavePix,
      nomeFavorecido: i.evento.nomeFavorecido,
      valor: Number(i.evento.valor),
      bannerUrl: i.evento.bannerUrl
    } : void 0,
    pagamento: i.pagamento ? {
      id: i.pagamento.id,
      metodo: i.pagamento.metodo || "PIX",
      valorEsperado: Number(i.pagamento.valorEsperado),
      valorDetectado: i.pagamento.valorDetectado != null ? Number(i.pagamento.valorDetectado) : null,
      dataDetectada: i.pagamento.dataDetectada,
      horaDetectada: i.pagamento.horaDetectada,
      nomeRecebedor: i.pagamento.nomeRecebedor,
      instituicao: i.pagamento.instituicao,
      idTransacao: i.pagamento.idTransacao,
      textoOcr: i.pagamento.textoOcr,
      alerta: i.pagamento.alerta,
      confirmadoEm: i.pagamento.confirmadoEm,
      recusadoEm: i.pagamento.recusadoEm,
      liberacaoAutomatica: Boolean(i.pagamento.liberacaoAutomatica),
      conferidoExtratoEm: i.pagamento.conferidoExtratoEm || null,
      comprovante: i.pagamento.comprovante || null
    } : null,
    ingresso,
    ingressos
  };
}
async function reenviarEmailConfirmacao(id, adminId, ip) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: {
      participante: true,
      evento: true,
      pessoas: { orderBy: { ordem: "asc" } },
      ingressos: { include: { pessoa: true }, orderBy: { criadoEm: "asc" } }
    }
  });
  if (!inscricao) {
    const err = new Error("Inscrição não encontrada");
    err.status = 404;
    throw err;
  }
  if (!["INGRESSO_LIBERADO", "PAGAMENTO_CONFIRMADO"].includes(inscricao.status)) {
    const err = new Error("Só é possível reenviar e-mail após confirmar o pagamento");
    err.status = 400;
    throw err;
  }
  if (!inscricao.participante?.email) {
    return { sent: false, reason: "Participante sem e-mail cadastrado" };
  }
  let ingressos = inscricao.ingressos || [];
  if (!ingressos.length) {
    ingressos = await criarIngressos(id);
  }
  const pessoasPorId = Object.fromEntries((inscricao.pessoas || []).map((p) => [p.id, p]));
  const ticketsEmail = ingressos.map((ig, idx) => ({
    codigo: ig.codigo,
    nome:
      ig.pessoa?.nome ||
      pessoasPorId[ig.pessoaId]?.nome ||
      inscricao.pessoas?.[idx]?.nome ||
      inscricao.participante.nome
  }));
  const dataEvt = new Date(inscricao.evento.data);
  const dataFmt = `${String(dataEvt.getUTCDate()).padStart(2, "0")}/${String(dataEvt.getUTCMonth() + 1).padStart(2, "0")}/${dataEvt.getUTCFullYear()}`;
  const emailResult = await enviarConfirmacaoInscricao({
    para: inscricao.participante.email,
    nome: inscricao.participante.nome,
    evento: inscricao.evento.nome,
    data: dataFmt,
    horario: inscricao.evento.horario,
    local: inscricao.evento.local,
    cidade: inscricao.evento.cidade,
    codigoIngresso: ticketsEmail.map((t) => t.codigo).join(", "),
    codigoInscricao: inscricao.codigo,
    chegada: "17h10",
    tickets: ticketsEmail,
    quantidade: ticketsEmail.length || inscricao.quantidade || 1
  });
  await registrarLog({
    adminId,
    acao: "EMAIL_REENVIO",
    entidade: "Inscricao",
    entidadeId: id,
    detalhes: emailResult,
    ip
  });
  return emailResult;
}

module.exports = {
  criarInscricao,
  buscarPorCodigo,
  buscarPorWhatsApp,
  enviarComprovante,
  reprocessarOcr,
  listarPorEvento,
  buscarAdmin,
  confirmarPagamento,
  liberarIngressosFaltantes,
  reenviarEmailConfirmacao,
  recusarPagamento,
  cancelar,
  excluir,
  atualizarObservacao,
  marcarConferidoExtrato,
  dashboard,
  dashboardGlobal,
  STATUS_OCUPAM_VAGA
};
