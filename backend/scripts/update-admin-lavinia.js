require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/** @deprecated Prefira: node scripts/garantir-admins-mestres.js */
async function main() {
  const email = "laviniadossantos22@gmail.com";
  const nome = "Lavínia Bernardino";
  const admin = await prisma.admin.update({
    where: { email },
    data: { nome, perfil: "ADMIN", ativo: true },
  });
  console.log(`Atualizado: ${admin.email} → ${admin.nome} (${admin.perfil})`);
}

main()
  .catch((e) => {
    console.error(e);
    console.error("Se a conta não existir, rode: node scripts/garantir-admins-mestres.js");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
