require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { MASTER_ADMINS } = require("../src/config/masterAdmins");

const prisma = new PrismaClient();

/**
 * Garante Lavínia e Eduardo como ADMIN mestres (perfil completo).
 *
 *   node scripts/garantir-admins-mestres.js
 *
 * Env:
 *   EDUARDO_ADMIN_EMAIL  — e-mail do Eduardo (se diferente do padrão)
 *   MASTER_ADMIN_PASSWORD — senha local opcional ao criar conta nova
 */
async function main() {
  const senhaPadrao = process.env.MASTER_ADMIN_PASSWORD || "Admin@Master1";
  const senhaHash = await bcrypt.hash(senhaPadrao, 12);

  console.log("Sincronizando admins mestres…");
  for (const master of MASTER_ADMINS) {
    const email = master.email.toLowerCase();
    const existing = await prisma.admin.findUnique({ where: { email } });
    const admin = await prisma.admin.upsert({
      where: { email },
      update: {
        nome: master.nome,
        perfil: "ADMIN",
        ativo: true,
      },
      create: {
        email,
        nome: master.nome,
        senhaHash,
        perfil: "ADMIN",
        ativo: true,
      },
    });
    console.log(
      `  ✓ ${admin.nome} <${admin.email}> → perfil=${admin.perfil}` +
        (existing ? "" : ` (criada · senha local: ${senhaPadrao})`)
    );
  }

  // Qualquer outro admin com nome Lavínia/Eduardo também fica ADMIN
  const extras = await prisma.admin.findMany({
    where: {
      OR: [
        { nome: { contains: "Lavínia", mode: "insensitive" } },
        { nome: { contains: "Lavinia", mode: "insensitive" } },
        { nome: { contains: "Eduardo", mode: "insensitive" } },
      ],
      perfil: { not: "ADMIN" },
    },
  });
  for (const extra of extras) {
    await prisma.admin.update({
      where: { id: extra.id },
      data: { perfil: "ADMIN", ativo: true },
    });
    console.log(`  ✓ promovido por nome: ${extra.nome} <${extra.email}>`);
  }

  console.log("Pronto. Admins mestres: Lavínia e Eduardo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
