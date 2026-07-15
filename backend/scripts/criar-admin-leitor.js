require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Cria/atualiza a conta LEITOR (só eventos online + leitor de QR).
 *
 * Uso:
 *   node scripts/criar-admin-leitor.js
 *
 * Env opcional:
 *   LEITOR_EMAIL, LEITOR_PASSWORD, LEITOR_NOME, LEITOR_APARELHO
 */
async function main() {
  const email = (process.env.LEITOR_EMAIL || "leitor@cinegeracao.local").toLowerCase();
  const senha = process.env.LEITOR_PASSWORD || "Leitor@123";
  const nome = process.env.LEITOR_NOME || "Leitor QR";
  const aparelhoNome = process.env.LEITOR_APARELHO || "Aparelho de entrada";
  const senhaHash = await bcrypt.hash(senha, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      nome,
      senhaHash,
      ativo: true,
      perfil: "LEITOR",
      aparelhoNome,
    },
    create: {
      email,
      nome,
      senhaHash,
      ativo: true,
      perfil: "LEITOR",
      aparelhoNome,
    },
  });

  console.log("Conta LEITOR pronta:");
  console.log(`  E-mail: ${admin.email}`);
  console.log(`  Senha:  ${senha}`);
  console.log(`  Nome:   ${admin.nome}`);
  console.log(`  Perfil: ${admin.perfil}`);
  console.log(`  Aparelho padrão: ${admin.aparelhoNome}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
