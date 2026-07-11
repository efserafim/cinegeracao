/**
 * Serviço de ingressos digitais e validação de entrada.
 */
const QRCode = require('qrcode');
const prisma = require('../config/prisma');
const { gerarCodigoIngresso } = require('../utils/codes');
const { registrarLog } = require('./logService');

/**
 * Cria ingresso após confirmação de pagamento.
 */
async function criarIngresso(inscricaoId) {
  const existente = await prisma.ingresso.findUnique({ where: { inscricaoId } });
  if (existente) return existente;

  const codigo = gerarCodigoIngresso();
  const qrPayload = JSON.stringify({ tipo: 'ingresso', codigo, inscricaoId });

  return prisma.ingresso.create({
    data: {
      inscricaoId,
      codigo,
      qrPayload,
      status: 'VALIDO',
    },
  });
}

/**
 * Gera Data URL do QR Code do ingresso.
 */
async function gerarQrDataUrl(ingresso) {
  return QRCode.toDataURL(ingresso.qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
  });
}

/**
 * Busca ingresso completo para exibição pública (via código da inscrição).
 */
async function buscarPorCodigoInscricao(codigoInscricao) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { codigo: codigoInscricao },
    include: {
      participante: true,
      evento: true,
      ingresso: true,
    },
  });

  if (!inscricao || !inscricao.ingresso) {
    const err = new Error('Ingresso não encontrado');
    err.status = 404;
    throw err;
  }

  const qrDataUrl = await gerarQrDataUrl(inscricao.ingresso);

  return {
    nome: inscricao.participante.nome,
    evento: inscricao.evento.nome,
    data: inscricao.evento.data,
    horario: inscricao.evento.horario,
    local: inscricao.evento.local,
    cidade: inscricao.evento.cidade,
    codigo: inscricao.ingresso.codigo,
    status: inscricao.ingresso.status,
    qrDataUrl,
  };
}

/**
 * Valida leitura de QR Code na entrada do evento.
 */
async function validarEntrada({ codigoOuPayload, adminId, ip }) {
  let codigo = codigoOuPayload;

  // Aceita JSON do QR ou código puro
  try {
    const parsed = JSON.parse(codigoOuPayload);
    if (parsed?.codigo) codigo = parsed.codigo;
  } catch {
    // texto puro
  }

  // Também aceita payload "TKT-XXXX"
  codigo = String(codigo).trim();

  const ingresso = await prisma.ingresso.findUnique({
    where: { codigo },
    include: {
      inscricao: {
        include: { participante: true, evento: true },
      },
    },
  });

  if (!ingresso) {
    return {
      resultado: 'INVALIDO',
      mensagem: 'Ingresso não encontrado',
      tela: 'vermelha',
    };
  }

  let resultado;
  let mensagem;
  let tela;

  if (ingresso.status === 'CANCELADO') {
    resultado = 'CANCELADO';
    mensagem = 'Ingresso cancelado';
    tela = 'vermelha';
  } else if (ingresso.status === 'UTILIZADO') {
    resultado = 'JA_UTILIZADO';
    mensagem = 'Ingresso já utilizado';
    tela = 'vermelha';
  } else {
    resultado = 'AUTORIZADO';
    mensagem = 'Entrada autorizada';
    tela = 'verde';

    await prisma.ingresso.update({
      where: { id: ingresso.id },
      data: { status: 'UTILIZADO', utilizadoEm: new Date() },
    });
  }

  await prisma.validacaoTicket.create({
    data: {
      ingressoId: ingresso.id,
      adminId: adminId || null,
      resultado,
    },
  });

  await registrarLog({
    adminId,
    acao: 'VALIDACAO_INGRESSO',
    entidade: 'Ingresso',
    entidadeId: ingresso.id,
    detalhes: { resultado, codigo: ingresso.codigo },
    ip,
  });

  return {
    resultado,
    mensagem,
    tela,
    nome: ingresso.inscricao.participante.nome,
    evento: ingresso.inscricao.evento.nome,
    status: resultado === 'AUTORIZADO' ? 'UTILIZADO' : ingresso.status,
    codigo: ingresso.codigo,
    lidoEm: new Date(),
  };
}

module.exports = {
  criarIngresso,
  gerarQrDataUrl,
  buscarPorCodigoInscricao,
  validarEntrada,
};
