/**
 * Serviço de inscrições, comprovantes e confirmação de pagamento.
 */
const QRCode = require('qrcode');
const prisma = require('../config/prisma');
const { gerarCodigoInscricao } = require('../utils/codes');
const { onlyDigits, normalizarWhatsApp } = require('../utils/sanitize');
const { gerarLinkWhatsApp } = require('../utils/whatsapp');
const { processarComprovante } = require('./ocrService');
const { criarIngresso } = require('./ingressoService');
const { enviarConfirmacaoInscricao } = require('./emailService');
const { registrarLog } = require('./logService');
const { contarOcupadas, STATUS_OCUPAM_VAGA } = require('./eventoService');

/**
 * Cria inscrição + registro de pagamento pendente.
 */
async function criarInscricao(eventoId, dados) {
  const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!evento || evento.status !== 'ABERTO') {
    const err = new Error('Evento não disponível para inscrição');
    err.status = 400;
    throw err;
  }

  const ocupadas = await contarOcupadas(eventoId);
  if (ocupadas >= evento.vagasMaximas) {
    const err = new Error('Vagas esgotadas');
    err.status = 409;
    throw err;
  }

  const telefone = normalizarWhatsApp(dados.telefone);
  if (!telefone || telefone.length < 10) {
    const err = new Error('Informe um WhatsApp válido com DDD');
    err.status = 400;
    throw err;
  }

  // Evita duplicar inscrição pelo mesmo WhatsApp no mesmo evento
  const sufixo = telefone.slice(-11);
  const existente = await prisma.inscricao.findFirst({
    where: {
      eventoId,
      status: { not: 'CANCELADA' },
      participante: {
        OR: [
          { telefone },
          { telefone: { endsWith: sufixo } },
          ...(telefone.length >= 10 ? [{ telefone: { endsWith: telefone.slice(-10) } }] : []),
        ],
      },
    },
    include: {
      participante: true,
      evento: true,
      pagamento: { include: { comprovante: true } },
      ingresso: true,
    },
    orderBy: { criadoEm: 'desc' },
  });

  if (existente) {
    const err = new Error(
      'Já existe uma inscrição com este WhatsApp neste evento. Use o código abaixo ou fale com Eduardo/Lavínia se precisar de ajuda.',
    );
    err.status = 409;
    err.data = {
      duplicada: true,
      codigo: existente.codigo,
      status: existente.status,
      nome: existente.participante?.nome,
      inscricao: formatInscricao(existente),
    };
    throw err;
  }

  const participante = await prisma.participante.create({
    data: {
      nome: dados.nome,
      telefone,
      email: dados.email || null,
      paroquia: dados.paroquia,
      cidade: dados.cidade,
    },
  });

  const metodo = String(dados.metodoPagamento || dados.metodo || 'PIX').toUpperCase() === 'DINHEIRO'
    ? 'DINHEIRO'
    : 'PIX';

  const statusInicial = metodo === 'DINHEIRO' ? 'AGUARDANDO_CONFIRMACAO' : 'AGUARDANDO_PAGAMENTO';

  const inscricao = await prisma.inscricao.create({
    data: {
      codigo: gerarCodigoInscricao(),
      eventoId,
      participanteId: participante.id,
      status: statusInicial,
      valor: evento.valor,
      observacao: metodo === 'DINHEIRO' ? 'Pagamento em dinheiro — aguardando confirmação do organizador.' : null,
      pagamento: {
        create: {
          valorEsperado: evento.valor,
          metodo,
          alerta: metodo === 'DINHEIRO' ? 'NECESSITA_CONFERENCIA' : 'NENHUM',
        },
      },
    },
    include: {
      participante: true,
      evento: true,
      pagamento: true,
    },
  });

  // QR Code com a chave PIX (texto da chave – sem EMV dinâmico)
  const pixPayload = [
    `PIX: ${evento.chavePix}`,
    `Favorecido: ${evento.nomeFavorecido}`,
    `Valor: R$ ${Number(evento.valor).toFixed(2).replace('.', ',')}`,
    `Ref: ${inscricao.codigo}`,
  ].join('\n');

  const qrCodeDataUrl = await QRCode.toDataURL(evento.chavePix, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
  });

  return {
    inscricao: formatInscricao(inscricao),
    pagamento: {
      metodo,
      chavePix: evento.chavePix,
      nomeFavorecido: evento.nomeFavorecido,
      valor: Number(evento.valor),
      qrCodeDataUrl,
      pixPayload,
    },
  };
}

async function buscarPorCodigo(codigo) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { codigo },
    include: {
      participante: true,
      evento: true,
      pagamento: { include: { comprovante: true } },
      ingresso: true,
    },
  });
  if (!inscricao) {
    const err = new Error('Inscrição não encontrada');
    err.status = 404;
    throw err;
  }
  return formatInscricao(inscricao);
}

/**
 * Upload de comprovante + OCR automático.
 */
async function enviarComprovante(codigo, file) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { codigo },
    include: { pagamento: { include: { comprovante: true } }, evento: true },
  });

  if (!inscricao) {
    const err = new Error('Inscrição não encontrada');
    err.status = 404;
    throw err;
  }

  if (['CANCELADA', 'PAGAMENTO_CONFIRMADO', 'INGRESSO_LIBERADO'].includes(inscricao.status)) {
    const err = new Error('Não é possível enviar comprovante neste status');
    err.status = 400;
    throw err;
  }

  if (!inscricao.pagamento) {
    const err = new Error('Pagamento não encontrado');
    err.status = 400;
    throw err;
  }

  if (inscricao.pagamento.metodo === 'DINHEIRO') {
    const err = new Error('Esta inscrição é pagamento em dinheiro — não precisa de comprovante PIX');
    err.status = 400;
    throw err;
  }

  const arquivoUrl = `/uploads/comprovantes/${file.filename}`;

  // Atualiza / cria comprovante
  if (inscricao.pagamento.comprovante) {
    await prisma.comprovante.update({
      where: { id: inscricao.pagamento.comprovante.id },
      data: {
        arquivoUrl,
        mimeType: file.mimetype,
        tamanhoBytes: file.size,
      },
    });
  } else {
    await prisma.comprovante.create({
      data: {
        pagamentoId: inscricao.pagamento.id,
        arquivoUrl,
        mimeType: file.mimetype,
        tamanhoBytes: file.size,
      },
    });
  }

  await prisma.inscricao.update({
    where: { id: inscricao.id },
    data: { status: 'COMPROVANTE_ENVIADO' },
  });

  // OCR
  const ocr = await processarComprovante(
    file.path,
    file.mimetype,
    Number(inscricao.pagamento.valorEsperado),
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
      alerta: ocr.alerta,
    },
  });

  await prisma.inscricao.update({
    where: { id: inscricao.id },
    data: { status: 'AGUARDANDO_CONFIRMACAO' },
  });

  return buscarPorCodigo(codigo);
}

/**
 * Reprocessa OCR do comprovante já enviado (útil para PDF / falhas anteriores).
 */
async function reprocessarOcr(id) {
  const path = require('path');
  const fs = require('fs');

  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: {
      pagamento: { include: { comprovante: true } },
      evento: true,
    },
  });

  if (!inscricao) {
    const err = new Error('Inscrição não encontrada');
    err.status = 404;
    throw err;
  }

  const comprovante = inscricao.pagamento?.comprovante;
  if (!comprovante?.arquivoUrl) {
    const err = new Error('Nenhum comprovante para processar');
    err.status = 400;
    throw err;
  }

  const relative = comprovante.arquivoUrl.replace(/^\//, '');
  const resolved = path.resolve(process.cwd(), relative);

  if (!fs.existsSync(resolved)) {
    const err = new Error('Arquivo do comprovante não encontrado no servidor');
    err.status = 404;
    throw err;
  }

  const ocr = await processarComprovante(
    resolved,
    comprovante.mimeType,
    Number(inscricao.pagamento.valorEsperado),
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
      alerta: ocr.alerta,
    },
  });

  if (['COMPROVANTE_ENVIADO', 'OCR_PROCESSADO', 'AGUARDANDO_CONFIRMACAO'].includes(inscricao.status)) {
    await prisma.inscricao.update({
      where: { id: inscricao.id },
      data: { status: 'AGUARDANDO_CONFIRMACAO' },
    });
  }

  return buscarAdmin(id);
}

/**
 * Lista inscrições de um evento com filtros de pesquisa.
 */
async function listarPorEvento(eventoId, filtros = {}) {
  const where = { eventoId };

  if (filtros.status) where.status = filtros.status;

  if (filtros.q || filtros.nome || filtros.telefone || filtros.cidade) {
    where.participante = {};
    if (filtros.nome || filtros.q) {
      where.participante.nome = {
        contains: filtros.nome || filtros.q,
        mode: 'insensitive',
      };
    }
    if (filtros.telefone) {
      where.participante.telefone = { contains: onlyDigits(filtros.telefone) };
    }
    if (filtros.cidade) {
      where.participante.cidade = { contains: filtros.cidade, mode: 'insensitive' };
    }
  }

  const items = await prisma.inscricao.findMany({
    where,
    include: {
      participante: true,
      pagamento: { include: { comprovante: true } },
      ingresso: true,
    },
    orderBy: { criadoEm: 'desc' },
  });

  return items.map(formatInscricao);
}

async function buscarAdmin(id) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: {
      participante: true,
      evento: true,
      pagamento: { include: { comprovante: true } },
      ingresso: true,
    },
  });
  if (!inscricao) {
    const err = new Error('Inscrição não encontrada');
    err.status = 404;
    throw err;
  }
  return formatInscricao(inscricao);
}

/**
 * Confirma pagamento → gera ingresso → e-mail / WhatsApp link.
 */
async function confirmarPagamento(id, adminId, ip) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: { participante: true, evento: true, pagamento: true },
  });
  if (!inscricao) {
    const err = new Error('Inscrição não encontrada');
    err.status = 404;
    throw err;
  }

  await prisma.$transaction([
    prisma.pagamento.update({
      where: { inscricaoId: id },
      data: { confirmadoEm: new Date(), recusadoEm: null },
    }),
    prisma.inscricao.update({
      where: { id },
      data: { status: 'PAGAMENTO_CONFIRMADO' },
    }),
  ]);

  const ingresso = await criarIngresso(id);

  await prisma.inscricao.update({
    where: { id },
    data: { status: 'INGRESSO_LIBERADO' },
  });

  const dataFmt = new Date(inscricao.evento.data).toLocaleDateString('pt-BR');

  let emailResult = { sent: false, reason: 'Participante sem e-mail' };
  if (inscricao.participante.email) {
    emailResult = await enviarConfirmacaoInscricao({
      para: inscricao.participante.email,
      nome: inscricao.participante.nome,
      evento: inscricao.evento.nome,
      data: dataFmt,
      horario: inscricao.evento.horario,
      local: inscricao.evento.local,
      cidade: inscricao.evento.cidade,
      codigoIngresso: ingresso.codigo,
      codigoInscricao: inscricao.codigo,
      chegada: '17h10',
    });
  }

  await registrarLog({
    adminId,
    acao: 'EMAIL_CONFIRMACAO',
    entidade: 'Inscricao',
    entidadeId: id,
    detalhes: emailResult,
    ip,
  });

  const whatsappLink = gerarLinkWhatsApp({
    telefone: inscricao.participante.telefone,
    nome: inscricao.participante.nome,
    evento: inscricao.evento.nome,
    data: dataFmt,
    horario: inscricao.evento.horario,
    local: inscricao.evento.local,
    codigoIngresso: ingresso.codigo,
  });

  await registrarLog({
    adminId,
    acao: 'PAGAMENTO_CONFIRMADO',
    entidade: 'Inscricao',
    entidadeId: id,
    ip,
  });

  const result = await buscarAdmin(id);
  return { ...result, whatsappLink, emailResult };
}

async function recusarPagamento(id, observacao, adminId, ip) {
  await prisma.$transaction([
    prisma.pagamento.update({
      where: { inscricaoId: id },
      data: { recusadoEm: new Date() },
    }),
    prisma.inscricao.update({
      where: { id },
      data: {
        status: 'PAGAMENTO_RECUSADO',
        observacao: observacao || null,
      },
    }),
  ]);

  await registrarLog({
    adminId,
    acao: 'PAGAMENTO_RECUSADO',
    entidade: 'Inscricao',
    entidadeId: id,
    detalhes: { observacao },
    ip,
  });

  return buscarAdmin(id);
}

async function cancelar(id, observacao, adminId, ip) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: { ingresso: true },
  });
  if (!inscricao) {
    const err = new Error('Inscrição não encontrada');
    err.status = 404;
    throw err;
  }

  await prisma.inscricao.update({
    where: { id },
    data: { status: 'CANCELADA', observacao: observacao || null },
  });

  if (inscricao.ingresso) {
    await prisma.ingresso.update({
      where: { id: inscricao.ingresso.id },
      data: { status: 'CANCELADO' },
    });
  }

  await registrarLog({
    adminId,
    acao: 'INSCRICAO_CANCELADA',
    entidade: 'Inscricao',
    entidadeId: id,
    detalhes: { observacao },
    ip,
  });

  return buscarAdmin(id);
}

async function excluir(id, adminId, ip) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id },
    include: { participante: true },
  });
  if (!inscricao) {
    const err = new Error('Inscrição não encontrada');
    err.status = 404;
    throw err;
  }

  const participanteId = inscricao.participanteId;

  await prisma.inscricao.delete({ where: { id } });

  // Remove participante órfão (sem outras inscrições)
  const outras = await prisma.inscricao.count({ where: { participanteId } });
  if (outras === 0) {
    await prisma.participante.delete({ where: { id: participanteId } }).catch(() => {});
  }

  await registrarLog({
    adminId,
    acao: 'INSCRICAO_EXCLUIDA',
    entidade: 'Inscricao',
    entidadeId: id,
    detalhes: {
      codigo: inscricao.codigo,
      participante: inscricao.participante?.nome,
    },
    ip,
  });

  return { id, excluida: true };
}

async function atualizarObservacao(id, observacao, adminId, ip) {
  await prisma.inscricao.update({
    where: { id },
    data: { observacao },
  });
  await registrarLog({
    adminId,
    acao: 'OBSERVACAO_ATUALIZADA',
    entidade: 'Inscricao',
    entidadeId: id,
    ip,
  });
  return buscarAdmin(id);
}

/**
 * Dashboard de estatísticas por evento.
 */
async function dashboard(eventoId) {
  const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!evento) {
    const err = new Error('Evento não encontrado');
    err.status = 404;
    throw err;
  }

  const [total, confirmadas, pendentes, canceladas, arrecadado] = await Promise.all([
    prisma.inscricao.count({ where: { eventoId } }),
    prisma.inscricao.count({
      where: { eventoId, status: { in: ['PAGAMENTO_CONFIRMADO', 'INGRESSO_LIBERADO'] } },
    }),
    prisma.inscricao.count({
      where: {
        eventoId,
        status: {
          in: [
            'AGUARDANDO_PAGAMENTO',
            'COMPROVANTE_ENVIADO',
            'OCR_PROCESSADO',
            'AGUARDANDO_CONFIRMACAO',
            'PAGAMENTO_RECUSADO',
          ],
        },
      },
    }),
    prisma.inscricao.count({ where: { eventoId, status: 'CANCELADA' } }),
    prisma.inscricao.aggregate({
      where: { eventoId, status: { in: ['PAGAMENTO_CONFIRMADO', 'INGRESSO_LIBERADO'] } },
      _sum: { valor: true },
    }),
  ]);

  const ocupadas = await contarOcupadas(eventoId);

  return {
    inscritos: total,
    confirmadas,
    pendentes,
    canceladas,
    valorArrecadado: Number(arrecadado._sum.valor || 0),
    vagasRestantes: Math.max(0, evento.vagasMaximas - ocupadas),
    vagasMaximas: evento.vagasMaximas,
  };
}

/**
 * Dashboard global (todos os eventos).
 */
async function dashboardGlobal() {
  const [eventos, inscritos, confirmadas, pendentes, valor] = await Promise.all([
    prisma.evento.count(),
    prisma.inscricao.count(),
    prisma.inscricao.count({
      where: { status: { in: ['PAGAMENTO_CONFIRMADO', 'INGRESSO_LIBERADO'] } },
    }),
    prisma.inscricao.count({
      where: {
        status: {
          in: ['AGUARDANDO_CONFIRMACAO', 'COMPROVANTE_ENVIADO', 'OCR_PROCESSADO'],
        },
      },
    }),
    prisma.inscricao.aggregate({
      where: { status: { in: ['PAGAMENTO_CONFIRMADO', 'INGRESSO_LIBERADO'] } },
      _sum: { valor: true },
    }),
  ]);

  return {
    eventos,
    inscritos,
    confirmadas,
    pendentes,
    valorArrecadado: Number(valor._sum.valor || 0),
  };
}

function formatInscricao(i) {
  return {
    id: i.id,
    codigo: i.codigo,
    status: i.status,
    valor: Number(i.valor),
    observacao: i.observacao,
    criadoEm: i.criadoEm,
    atualizadoEm: i.atualizadoEm,
    participante: i.participante
      ? {
          id: i.participante.id,
          nome: i.participante.nome,
          telefone: i.participante.telefone,
          email: i.participante.email,
          paroquia: i.participante.paroquia,
          cidade: i.participante.cidade,
        }
      : undefined,
    evento: i.evento
      ? {
          id: i.evento.id,
          nome: i.evento.nome,
          data: i.evento.data,
          horario: i.evento.horario,
          local: i.evento.local,
          cidade: i.evento.cidade,
          chavePix: i.evento.chavePix,
          nomeFavorecido: i.evento.nomeFavorecido,
          valor: Number(i.evento.valor),
          bannerUrl: i.evento.bannerUrl,
        }
      : undefined,
    pagamento: i.pagamento
      ? {
          id: i.pagamento.id,
          metodo: i.pagamento.metodo || 'PIX',
          valorEsperado: Number(i.pagamento.valorEsperado),
          valorDetectado: i.pagamento.valorDetectado != null
            ? Number(i.pagamento.valorDetectado)
            : null,
          dataDetectada: i.pagamento.dataDetectada,
          horaDetectada: i.pagamento.horaDetectada,
          nomeRecebedor: i.pagamento.nomeRecebedor,
          instituicao: i.pagamento.instituicao,
          idTransacao: i.pagamento.idTransacao,
          textoOcr: i.pagamento.textoOcr,
          alerta: i.pagamento.alerta,
          confirmadoEm: i.pagamento.confirmadoEm,
          recusadoEm: i.pagamento.recusadoEm,
          comprovante: i.pagamento.comprovante || null,
        }
      : null,
    ingresso: i.ingresso
      ? {
          id: i.ingresso.id,
          codigo: i.ingresso.codigo,
          status: i.ingresso.status,
          liberadoEm: i.ingresso.liberadoEm,
          utilizadoEm: i.ingresso.utilizadoEm,
        }
      : null,
  };
}

module.exports = {
  criarInscricao,
  buscarPorCodigo,
  enviarComprovante,
  reprocessarOcr,
  listarPorEvento,
  buscarAdmin,
  confirmarPagamento,
  recusarPagamento,
  cancelar,
  excluir,
  atualizarObservacao,
  dashboard,
  dashboardGlobal,
  STATUS_OCUPAM_VAGA,
};
