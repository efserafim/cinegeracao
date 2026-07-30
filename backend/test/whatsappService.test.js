const test = require('node:test');
const assert = require('node:assert/strict');
const { buildLembretePagamentoWhatsAppText, formatWhatsAppNumber } = require('../src/services/whatsappService');

test('gerar texto de lembrete de pagamento para WhatsApp', () => {
  const text = buildLembretePagamentoWhatsAppText({
    nome: 'Maria',
    evento: 'CineGeração',
    data: '02/08/2026',
    horario: '19:30',
    local: 'Paróquia São Pedro',
    cidade: 'Niterói',
    valor: 12,
    codigoInscricao: 'ABC123',
    linkPagamento: 'https://exemplo.com/inscricao/ABC123',
    prazo: 'hoje'
  });

  assert.match(text, /CineGeração.*lembrete de pagamento/s);
  assert.match(text, /https:\/\/exemplo\.com\/inscricao\/ABC123/);
  assert.match(text, /hoje às 23h59/);
  assert.match(text, /melhores assentos/i);
  assert.doesNotMatch(text, /geucaristica\.com\.br\/consultar/);
  assert.doesNotMatch(text, /leve o ingresso do cinema/i);
});

test('formata telefone WhatsApp com prefixo 55', () => {
  assert.equal(formatWhatsAppNumber('(22) 99999-9999'), '5522999999999');
  assert.equal(formatWhatsAppNumber('22999999999'), '5522999999999');
  assert.equal(formatWhatsAppNumber('5511999999999'), '5511999999999');
});
