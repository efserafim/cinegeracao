require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const EVENTO = {
  nome: "CineGeração – Homem-Aranha: Um novo dia",
  descricao: [
    "Filme: Homem-Aranha: Um novo dia",
    "",
    "Cinema MaxiMovie",
    "Rua Beatriz Amaral Pereira, 106 - Bacaxá - Saquarema/RJ",
    "",
    "Sessão às 18h10 | Chegada às 17h10",
    "Pipoca cortesia + Guaravita inclusos",
    "",
    "Dúvidas:",
    "Eduardo – (22) 99247-3724",
    "Lavínia – (22) 99818-7602",
  ].join("\n"),
  // Coluna DATE no Postgres: gravar meio-dia UTC só para documentar a intenção do dia civil
  data: new Date("2026-08-02T12:00:00.000Z"),
  horario: "18:10",
  local: "Cinema MaxiMovie – Rua Beatriz Amaral Pereira, 106 - Bacaxá",
  cidade: "Saquarema",
  chavePix: "22992473724",
  nomeFavorecido: "EDUARDO FERREIRA SERAFIM",
};

async function main() {
  const before = await prisma.evento.findMany({
    select: { id: true, nome: true, data: true, horario: true },
  });
  console.log("Antes:", JSON.stringify(before, null, 2));

  const existing = await prisma.evento.findFirst({ orderBy: { criadoEm: "asc" } });
  if (existing) {
    const updated = await prisma.evento.update({
      where: { id: existing.id },
      data: EVENTO,
    });
    console.log("Atualizado:", {
      id: updated.id,
      nome: updated.nome,
      data: updated.data,
    });
  } else {
    const created = await prisma.evento.create({
      data: {
        ...EVENTO,
        valor: 10,
        vagasMaximas: 200,
        status: "ABERTO",
      },
    });
    console.log("Criado:", created.id);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
