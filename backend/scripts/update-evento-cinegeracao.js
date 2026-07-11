/**
 * Atualiza chave PIX e dados do evento CineGeração.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CHAVE_PIX = '22992473724';
const FAVORECIDO = 'EDUARDO FERREIRA SERAFIM';

async function main() {
  const descricao = [
    'Filme: Homem-Aranha: Um novo dia',
    '',
    'Cinema MaxiMovie',
    'Rua Beatriz Amaral Pereira, 106 - Bacaxá - Saquarema/RJ',
    '',
    'Sessão às 18h10 | Chegada às 17h10',
    'Pipoca P + Guaravita inclusos',
    '',
    'Dúvidas:',
    'Eduardo – (22) 99247-3724',
    'Lavínia – (22) 99818-7602',
  ].join('\n');

  const data = {
    nome: 'CineGeração – Homem-Aranha: Um novo dia',
    descricao,
    data: new Date('2026-08-01T12:00:00'),
    horario: '18:10',
    local: 'Cinema MaxiMovie – Rua Beatriz Amaral Pereira, 106 - Bacaxá',
    cidade: 'Saquarema',
    chavePix: CHAVE_PIX,
    nomeFavorecido: FAVORECIDO,
  };

  const existing = await prisma.evento.findFirst({ orderBy: { criadoEm: 'asc' } });
  if (existing) {
    await prisma.evento.update({ where: { id: existing.id }, data });
    console.log('Evento atualizado – chave PIX', CHAVE_PIX);
  } else {
    await prisma.evento.create({
      data: {
        ...data,
        valor: 10.0,
        data: new Date('2026-08-01T12:00:00'),
        vagasMaximas: 200,
        status: 'ABERTO',
      },
    });
    console.log('Evento criado');
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
