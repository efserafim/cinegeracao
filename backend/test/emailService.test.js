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
    linkPagamento: 'https://exemplo.com/inscricao/ABC123'
  });

  assert.match(html, /lembrete/i);
  assert.match(html, /https:\/\/exemplo\.com\/inscricao\/ABC123/);
  assert.match(html, /31\/07\/2026 às 23h59/);
  assert.match(html, /ABC123/);
});
