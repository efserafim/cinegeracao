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

  const usados = new Set();
  const criados = [];

  for (const pessoa of pessoas) {
    if (pessoa.ingresso) {
      usados.add(pessoa.ingresso.id);
      criados.push(pessoa.ingresso);
      continue;
    }

    const orfao = (inscricao.ingressos || []).find((ig) => !ig.pessoaId && !usados.has(ig.id));
    if (orfao) {
      const atualizado = await prisma.ingresso.update({
        where: { id: orfao.id },
        data: { pessoaId: pessoa.id }
      });
      usados.add(atualizado.id);
      criados.push(atualizado);
      continue;
    }

    const codigo = gerarCodigoIngresso();
    const qrPayload = JSON.stringify({
      tipo: "ingresso",
      codigo,
      inscricaoId,
      pessoaId: pessoa.id
    });

    try {
      const ingresso = await prisma.ingresso.create({
        data: {
          inscricaoId,
          pessoaId: pessoa.id,
          codigo,
          qrPayload,
          status: "VALIDO"
        }
      });
      usados.add(ingresso.id);
      criados.push(ingresso);
    } catch (err) {
      if (err?.code === "P2002") {
        const existente = await prisma.ingresso.findFirst({
          where: { inscricaoId },
          orderBy: { criadoEm: "asc" }
        });
        if (existente && !usados.has(existente.id)) {
          const atualizado = await prisma.ingresso.update({
            where: { id: existente.id },
            data: { pessoaId: pessoa.id }
          });
          usados.add(atualizado.id);
          criados.push(atualizado);
          continue;
        }
        const errUnique = new Error(
          "Não foi possível gerar múltiplos ingressos: índice único antigo ainda ativo no banco. Aguarde o redeploy (migration drop index) e tente novamente."
        );
        errUnique.status = 500;
        errUnique.expose = true;
        throw errUnique;
      }
      err.status = err.status || 500;
      err.expose = true;
      throw err;
    }
  }

  if (criados.length === 0 && inscricao.ingressos?.length) {
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

async function validarEntrada({
  codigoOuPayload,
  adminId,
  ip,
  aparelho,
  observacao,
  userAgent,
  aparelhoPadrao,
}) {
  let codigo = codigoOuPayload;
  try {
    const parsed = JSON.parse(codigoOuPayload);
    if (parsed?.codigo) codigo = parsed.codigo;
  } catch {
    /* payload plain */
  }
  codigo = String(codigo).trim();
  const ingresso = await prisma.ingresso.findUnique({
    where: { codigo },
    include: {
      pessoa: true,
      inscricao: {
        include: { participante: true, evento: true },
      },
    },
  });
  if (!ingresso) {
    return {
      resultado: "INVALIDO",
      mensagem: "Ingresso não encontrado",
      tela: "vermelha",
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
      data: { status: "UTILIZADO", utilizadoEm: new Date() },
    });
  }

  const aparelhoFinal = String(aparelho || aparelhoPadrao || "").trim().slice(0, 120) || null;
  const obsFinal = String(observacao || "").trim().slice(0, 500) || null;
  const uaFinal = String(userAgent || "").trim().slice(0, 500) || null;
  const lidoEm = new Date();

  const validacao = await prisma.validacaoTicket.create({
    data: {
      ingressoId: ingresso.id,
      adminId: adminId || null,
      resultado,
      observacao: obsFinal,
      aparelho: aparelhoFinal,
      userAgent: uaFinal,
      lidoEm,
    },
  });

  await registrarLog({
    adminId,
    acao: "VALIDACAO_INGRESSO",
    entidade: "Ingresso",
    entidadeId: ingresso.id,
    detalhes: {
      resultado,
      codigo: ingresso.codigo,
      aparelho: aparelhoFinal,
      observacao: obsFinal,
      validacaoId: validacao.id,
    },
    ip,
  });

  const nome = ingresso.pessoa?.nome || ingresso.inscricao.participante.nome;
  return {
    resultado,
    mensagem,
    tela,
    id: validacao.id,
    nome,
    evento: ingresso.inscricao.evento.nome,
    status: resultado === "AUTORIZADO" ? "UTILIZADO" : ingresso.status,
    codigo: ingresso.codigo,
    lidoEm,
    aparelho: aparelhoFinal,
    observacao: obsFinal,
    leitor: null,
  };
}

async function listarValidacoes({ adminId, perfil, page = 1, limit = 30 }) {
  const take = Math.min(100, Math.max(1, Number(limit) || 30));
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;
  const where = perfil === "LEITOR" && adminId ? { adminId } : {};

  const [total, rows] = await Promise.all([
    prisma.validacaoTicket.count({ where }),
    prisma.validacaoTicket.findMany({
      where,
      orderBy: { lidoEm: "desc" },
      skip,
      take,
      include: {
        admin: { select: { id: true, nome: true, email: true, perfil: true, aparelhoNome: true } },
        ingresso: {
          select: {
            codigo: true,
            status: true,
            pessoa: { select: { nome: true } },
            inscricao: {
              select: {
                codigo: true,
                participante: { select: { nome: true } },
                evento: { select: { id: true, nome: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    total,
    page: Math.max(1, Number(page) || 1),
    limit: take,
    totalPages: Math.max(1, Math.ceil(total / take)),
    items: rows.map((v) => ({
      id: v.id,
      resultado: v.resultado,
      lidoEm: v.lidoEm,
      observacao: v.observacao || "",
      aparelho: v.aparelho || v.admin?.aparelhoNome || "—",
      leitor: v.admin?.nome || "—",
      leitorEmail: v.admin?.email || null,
      perfilLeitor: v.admin?.perfil || null,
      nome:
        v.ingresso?.pessoa?.nome ||
        v.ingresso?.inscricao?.participante?.nome ||
        "—",
      codigo: v.ingresso?.codigo || "—",
      codigoInscricao: v.ingresso?.inscricao?.codigo || null,
      evento: v.ingresso?.inscricao?.evento?.nome || "—",
      eventoId: v.ingresso?.inscricao?.evento?.id || null,
      statusIngresso: v.ingresso?.status || null,
    })),
  };
}

async function marcarPresencaChamada({ codigo, presente = true, adminId, ip }) {
  codigo = String(codigo || "").trim();
  const ingresso = await prisma.ingresso.findUnique({
    where: { codigo },
    include: {
      pessoa: true,
      inscricao: { include: { participante: true, evento: true } },
    },
  });
  if (!ingresso) {
    const err = new Error("Ingresso não encontrado");
    err.status = 404;
    throw err;
  }
  if (ingresso.status === "CANCELADO") {
    const err = new Error("Ingresso cancelado");
    err.status = 400;
    throw err;
  }
  const nome = ingresso.pessoa?.nome || ingresso.inscricao.participante.nome;
  if (presente) {
    const now = new Date();
    const updated = await prisma.ingresso.update({
      where: { id: ingresso.id },
      data: { presenteEm: ingresso.presenteEm || now },
    });
    await registrarLog({
      adminId,
      acao: "CHAMADA_PRESENTE",
      entidade: "Ingresso",
      entidadeId: ingresso.id,
      detalhes: { codigo: ingresso.codigo, nome },
      ip,
    });
    return {
      presente: true,
      codigo: ingresso.codigo,
      nome,
      presenteEm: updated.presenteEm,
    };
  }
  await prisma.ingresso.update({
    where: { id: ingresso.id },
    data: { presenteEm: null },
  });
  await registrarLog({
    adminId,
    acao: "CHAMADA_AUSENTE",
    entidade: "Ingresso",
    entidadeId: ingresso.id,
    detalhes: { codigo: ingresso.codigo, nome },
    ip,
  });
  return {
    presente: false,
    codigo: ingresso.codigo,
    nome,
    presenteEm: null,
  };
}

module.exports = {
  criarIngresso,
  criarIngressos,
  gerarQrDataUrl,
  buscarPorCodigoInscricao,
  validarEntrada,
  listarValidacoes,
  marcarPresencaChamada,
};
