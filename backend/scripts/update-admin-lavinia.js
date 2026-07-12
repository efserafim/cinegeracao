/**
 * Atualiza o nome de exibição da admin Lavínia.
 * Uso: node scripts/update-admin-lavinia.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'laviniadossantos22@gmail.com';
  const nome = 'Lavínia Bernardino';

  const admin = await prisma.admin.update({
    where: { email },
    data: { nome },
  });

  console.log(`Atualizado: ${admin.email} → ${admin.nome}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
