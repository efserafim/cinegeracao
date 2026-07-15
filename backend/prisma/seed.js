require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@cinegeracao.local").toLowerCase();
  const senha = process.env.ADMIN_PASSWORD || "Admin@123";
  const nome = process.env.ADMIN_NOME || "Administrador";
  const senhaHash = await bcrypt.hash(senha, 12);
  const admin = await prisma.admin.upsert({
    where: { email },
    update: { nome, senhaHash, ativo: true, perfil: "ADMIN" },
    create: { email, nome, senhaHash, ativo: true, perfil: "ADMIN" }
  });
  await prisma.configuracao.upsert({
    where: { chave: "nome_sistema" },
    update: { valor: "CineGeração" },
    create: { chave: "nome_sistema", valor: "CineGeração" }
  });
  const count = await prisma.evento.count();
  if (count === 0) {
    await prisma.evento.create({
      data: {
        nome: "CineGeração – Homem-Aranha: Um novo dia",
        descricao: [
          "Filme: Homem-Aranha: Um novo dia",
          "",
          "Cinema MaxiMovie",
          "Rua Beatriz Amaral Pereira, 106 - Bacaxá - Saquarema/RJ",
          "",
          "Sessão às 18h10 | Chegada às 17h10",
          "Pipoca cortesia + Guaravita inclusos"
        ].join("\n"),
        valor: 10,
        data: new Date("2026-08-01T12:00:00.000Z"),
        horario: "18:10",
        local: "Cinema MaxiMovie – Rua Beatriz Amaral Pereira, 106 - Bacaxá",
        cidade: "Saquarema",
        vagasMaximas: 200,
        chavePix: "22992473724",
        nomeFavorecido: "EDUARDO FERREIRA SERAFIM",
        status: "PRE_INSCRICAO"
      }
    });
  }
  console.log("Seed concluído.");
  console.log(`Admin: ${admin.email} / senha: ${senha}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
