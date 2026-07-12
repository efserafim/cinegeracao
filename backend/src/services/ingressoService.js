const QRCode = require("qrcode");
const prisma = require("../config/prisma");
const { gerarCodigoIngresso } = require("../utils/codes");
const { registrarLog } = require("./logService");

async function criarIngressos(inscricaoId) {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id: inscricaoId },
    include: {
      participante: true,
      pessoas: { orderBy: { ordem: "asc" }, include: { ingresso: true } },
      ingressos: true
    }
  });
  if (!inscricao) {
    const err = new Error("Inscrição não encontrada");
    err.status = 404;
    throw err;
  }

  let pessoas = inscricao.pessoas || [];
  if (pessoas.length === 0) {
    const pessoa = await prisma.inscricaoPessoa.create({
      data: {
        inscricaoId,
        nome: inscricao.participante?.nome || "Participante",
        ordem: 0
      }
    });
    pessoas = [pessoa];
  }

  const criados = [];
  for (const pessoa of pessoas) {
    if (pessoa.ingresso) {
      criados.push(pessoa.ingresso);
      continue;
    }
    const codigo = gerarCodigoIngresso();
    const qrPayload = JSON.stringify({
      tipo: "ingresso",
      codigo,
      inscricaoId,
      pessoaId: pessoa.id
    });
    const ingresso = await prisma.ingresso.create({
      data: {
        inscricaoId,
        pessoaId: pessoa.id,
        codigo,
        qrPayload,
        status: "VALIDO"
      }
    });
    criados.push(ingresso);
  }

  if (criados.length === 0 && inscricao.ingressos.length > 0) {
    return inscricao.ingressos;
  }
  return criados;
}

async function criarIngresso(inscricaoId) {
  const list = await criarIngressos(inscricaoId);
  return list[0] || null;
}

async function gerarQrDataUrl(ingresso) {
  return QRCode.toDataURL(ingresso.qrPayload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280
  });
}

async function buscarPorCodigoInscricao(codigoInscricao) {
  let inscricao = await prisma.inscricao.findUnique({
    where: { codigo: codigoInscricao },
    include: {
      participante: true,
      evento: true,
      pessoas: {
        orderBy: { ordem: "asc" },
        include: { ingresso: true }
      },
      ingressos: {
        include: { pessoa: true },
        orderBy: { criadoEm: "asc" }
      }
    }
  });
  if (!inscricao) {
    const err = new Error("Ingresso não encontrado");
    err.status = 404;
    throw err;
  }

  const precisaGerar =
    ["INGRESSO_LIBERADO", "PAGAMENTO_CONFIRMADO"].includes(inscricao.status) &&
    (
      !inscricao.ingressos?.length ||
      (inscricao.pessoas || []).some((p) => !p.ingresso) ||
      (inscricao.quantidade || 1) > (inscricao.ingressos?.length || 0)
    );

  if (precisaGerar) {
    await criarIngressos(inscricao.id);
    inscricao = await prisma.inscricao.findUnique({
      where: { codigo: codigoInscricao },
      include: {
        participante: true,
        evento: true,
        pessoas: {
          orderBy: { ordem: "asc" },
          include: { ingresso: true }
        },
        ingressos: {
          include: { pessoa: true },
          orderBy: { criadoEm: "asc" }
        }
      }
    });
  }

  if (!inscricao.ingressos?.length) {
    const err = new Error("Ingresso não encontrado");
    err.status = 404;
    throw err;
  }

  const tickets = [];
  const pessoas = inscricao.pessoas || [];
  if (pessoas.length > 0) {
    for (const pessoa of pessoas) {
      const ingresso = pessoa.ingresso || inscricao.ingressos.find((ig) => ig.pessoaId === pessoa.id);
      if (!ingresso) continue;
      tickets.push({
        nome: pessoa.nome,
        codigo: ingresso.codigo,
        status: ingresso.status,
        qrDataUrl: await gerarQrDataUrl(ingresso)
      });
    }
  }
  if (tickets.length === 0) {
    for (const ingresso of inscricao.ingressos) {
      tickets.push({
        nome: ingresso.pessoa?.nome || inscricao.participante.nome,
        codigo: ingresso.codigo,
        status: ingresso.status,
        qrDataUrl: await gerarQrDataUrl(ingresso)
      });
    }
  }

  return {
    nome: inscricao.participante.nome,
    evento: inscricao.evento.nome,
    data: inscricao.evento.data,
    horario: inscricao.evento.horario,
    local: inscricao.evento.local,
    cidade: inscricao.evento.cidade,
    quantidade: inscricao.quantidade || tickets.length,
    codigo: tickets[0].codigo,
    status: tickets[0].status,
    qrDataUrl: tickets[0].qrDataUrl,
    tickets
  };
}

async function validarEntrada({ codigoOuPayload, adminId, ip }) {
  let codigo = codigoOuPayload;
  try {
    const parsed = JSON.parse(codigoOuPayload);
    if (parsed?.codigo) codigo = parsed.codigo;
  } catch {
  }
  codigo = String(codigo).trim();
  const ingresso = await prisma.ingresso.findUnique({
    where: { codigo },
    include: {
      pessoa: true,
      inscricao: {
        include: { participante: true, evento: true }
      }
    }
  });
  if (!ingresso) {
    return {
      resultado: "INVALIDO",
      mensagem: "Ingresso não encontrado",
      tela: "vermelha"
    };
  }
  let resultado;
  let mensagem;
  let tela;
  if (ingresso.status === "CANCELADO") {
    resultado = "CANCELADO";
    mensagem = "Ingresso cancelado";
    tela = "vermelha";
  } else if (ingresso.status === "UTILIZADO") {
    resultado = "JA_UTILIZADO";
    mensagem = "Ingresso já utilizado";
    tela = "vermelha";
  } else {
    resultado = "AUTORIZADO";
    mensagem = "Entrada autorizada";
    tela = "verde";
    await prisma.ingresso.update({
      where: { id: ingresso.id },
      data: { status: "UTILIZADO", utilizadoEm: new Date() }
    });
  }
  await prisma.validacaoTicket.create({
    data: {
      ingressoId: ingresso.id,
      adminId: adminId || null,
      resultado
    }
  });
  await registrarLog({
    adminId,
    acao: "VALIDACAO_INGRESSO",
    entidade: "Ingresso",
    entidadeId: ingresso.id,
    detalhes: { resultado, codigo: ingresso.codigo },
    ip
  });
  return {
    resultado,
    mensagem,
    tela,
    nome: ingresso.pessoa?.nome || ingresso.inscricao.participante.nome,
    evento: ingresso.inscricao.evento.nome,
    status: resultado === "AUTORIZADO" ? "UTILIZADO" : ingresso.status,
    codigo: ingresso.codigo,
    lidoEm: new Date()
  };
}

module.exports = {
  criarIngresso,
  criarIngressos,
  gerarQrDataUrl,
  buscarPorCodigoInscricao,
  validarEntrada
};
