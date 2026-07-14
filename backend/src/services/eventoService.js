const prisma = require("../config/prisma");
const { registrarLog } = require("./logService");

const STATUS_OCUPAM_VAGA = [
  "PRE_INSCRITA",
  "AGUARDANDO_PAGAMENTO",
  "COMPROVANTE_ENVIADO",
  "OCR_PROCESSADO",
  "AGUARDANDO_CONFIRMACAO",
  "PAGAMENTO_CONFIRMADO",
  "INGRESSO_LIBERADO"
];

const STATUS_PUBLICOS = ["ABERTO", "PRE_INSCRICAO"];

async function contarOcupadas(eventoId) {
  const result = await prisma.inscricao.aggregate({
    where: { eventoId, status: { in: STATUS_OCUPAM_VAGA } },
    _sum: { quantidade: true }
  });
  return Number(result._sum.quantidade || 0);
}

async function comVagas(evento) {
  const ocupadas = await contarOcupadas(evento.id);
  return {
    ...evento,
    vagasOcupadas: ocupadas,
    vagasRestantes: Math.max(0, evento.vagasMaximas - ocupadas),
    valor: Number(evento.valor),
    preInscricao: evento.status === "PRE_INSCRICAO"
  };
}

async function listarPublicos() {
  const eventos = await prisma.evento.findMany({
    where: { status: { in: STATUS_PUBLICOS } },
    orderBy: { data: "asc" }
  });
  return Promise.all(eventos.map(comVagas));
}

async function listarTodos(filtros = {}) {
  const where = {};
  if (filtros.status) where.status = filtros.status;
  if (filtros.q) {
    where.OR = [
      { nome: { contains: filtros.q, mode: "insensitive" } },
      { cidade: { contains: filtros.q, mode: "insensitive" } },
      { local: { contains: filtros.q, mode: "insensitive" } }
    ];
  }
  const eventos = await prisma.evento.findMany({
    where,
    orderBy: { criadoEm: "desc" }
  });
  return Promise.all(eventos.map(comVagas));
}

async function buscarPorId(id, { publico = false } = {}) {
  const evento = await prisma.evento.findUnique({ where: { id } });
  if (!evento) {
    const err = new Error("Evento não encontrado");
    err.status = 404;
    throw err;
  }
  if (publico && !STATUS_PUBLICOS.includes(evento.status)) {
    const err = new Error("Evento não está aberto para inscrições");
    err.status = 404;
    throw err;
  }
  return comVagas(evento);
}

async function criar(dados, adminId, ip) {
  const evento = await prisma.evento.create({
    data: {
      nome: dados.nome,
      descricao: dados.descricao,
      bannerUrl: dados.bannerUrl || null,
      valor: dados.valor,
      data: new Date(dados.data),
      horario: dados.horario,
      local: dados.local,
      cidade: dados.cidade,
      vagasMaximas: Number(dados.vagasMaximas),
      chavePix: dados.chavePix,
      nomeFavorecido: dados.nomeFavorecido,
      status: dados.status || "PRE_INSCRICAO"
    }
  });
  await registrarLog({
    adminId,
    acao: "EVENTO_CRIADO",
    entidade: "Evento",
    entidadeId: evento.id,
    detalhes: { nome: evento.nome },
    ip
  });
  return comVagas(evento);
}

async function converterPreInscricoesParaCobranca(eventoId) {
  const pre = await prisma.inscricao.findMany({
    where: { eventoId, status: "PRE_INSCRITA" },
    include: { pagamento: true }
  });
  let convertidas = 0;
  for (const item of pre) {
    await prisma.$transaction(async (tx) => {
      await tx.inscricao.update({
        where: { id: item.id },
        data: {
          status: "AGUARDANDO_PAGAMENTO",
          observacao: item.observacao
            ? `${item.observacao}\nCobrança liberada após pré-inscrição.`
            : "Cobrança liberada após pré-inscrição. Realize o pagamento PIX."
        }
      });
      if (!item.pagamento) {
        await tx.pagamento.create({
          data: {
            inscricaoId: item.id,
            valorEsperado: item.valor,
            metodo: "PIX",
            alerta: "NENHUM"
          }
        });
      }
    });
    convertidas += 1;
  }
  return convertidas;
}

async function atualizar(id, dados, adminId, ip) {
  const atual = await buscarPorId(id);
  const novoStatus = dados.status !== void 0 ? dados.status : atual.status;
  const evento = await prisma.evento.update({
    where: { id },
    data: {
      ...dados.nome !== void 0 && { nome: dados.nome },
      ...dados.descricao !== void 0 && { descricao: dados.descricao },
      ...dados.bannerUrl !== void 0 && { bannerUrl: dados.bannerUrl },
      ...dados.valor !== void 0 && { valor: dados.valor },
      ...dados.data !== void 0 && { data: new Date(dados.data) },
      ...dados.horario !== void 0 && { horario: dados.horario },
      ...dados.local !== void 0 && { local: dados.local },
      ...dados.cidade !== void 0 && { cidade: dados.cidade },
      ...dados.vagasMaximas !== void 0 && { vagasMaximas: Number(dados.vagasMaximas) },
      ...dados.chavePix !== void 0 && { chavePix: dados.chavePix },
      ...dados.nomeFavorecido !== void 0 && { nomeFavorecido: dados.nomeFavorecido },
      ...dados.status !== void 0 && { status: dados.status }
    }
  });

  let convertidas = 0;
  if (atual.status === "PRE_INSCRICAO" && novoStatus === "ABERTO") {
    convertidas = await converterPreInscricoesParaCobranca(id);
  }

  await registrarLog({
    adminId,
    acao: "EVENTO_ATUALIZADO",
    entidade: "Evento",
    entidadeId: id,
    detalhes: { ...dados, convertidas },
    ip
  });
  return { ...(await comVagas(evento)), convertidas };
}

async function abrirCobranca(id, adminId, ip) {
  const atual = await buscarPorId(id);
  if (atual.status !== "PRE_INSCRICAO") {
    const err = new Error("O evento não está em pré-inscrição");
    err.status = 400;
    throw err;
  }
  return atualizar(id, { status: "ABERTO" }, adminId, ip);
}

async function encerrar(id, adminId, ip) {
  return atualizar(id, { status: "ENCERRADO" }, adminId, ip);
}

async function excluir(id, adminId, ip) {
  await buscarPorId(id);
  await prisma.evento.delete({ where: { id } });
  await registrarLog({
    adminId,
    acao: "EVENTO_EXCLUIDO",
    entidade: "Evento",
    entidadeId: id,
    ip
  });
  return true;
}

module.exports = {
  listarPublicos,
  listarTodos,
  buscarPorId,
  criar,
  atualizar,
  abrirCobranca,
  encerrar,
  excluir,
  contarOcupadas,
  STATUS_OCUPAM_VAGA
};
