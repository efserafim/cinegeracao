const test = require('node:test');
const assert = require('node:assert/strict');
const { buildLembretePagamentoHtml } = require('../src/services/emailService');

test('constrói html de lembrete com link de pagamento e prazo', () => {
  const html = buildLembretePagamentoHtml({
    nome: 'Maria',
    evento: 'CineGeração',
    data: '02/08/2026',
    horario: '19:30',
    local: 'Paróquia São Pedro',
    cidade: 'Niterói',
    valor: 12,
    codigoInscricao: 'ABC123',
    linkPagamento: 'https://exemplo.com/inscricao/ABC123',
    prazo: 'amanhã'
  });

  assert.match(html, /lembrete/i);
  assert.match(html, /https:\/\/exemplo\.com\/inscricao\/ABC123/);
  assert.match(html, /amanh[aã]/i);
  assert.match(html, /ABC123/);
});
