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
    linkPagamento: 'https://exemplo.com/inscricao/ABC123'
  });

  assert.match(text, /CineGeração.*lembrete de pagamento/s);
  assert.match(text, /https:\/\/exemplo\.com\/inscricao\/ABC123/);
  assert.match(text, /31\/07\/2026 às 23h59/);
  assert.match(text, /melhores assentos/i);
  assert.match(text, /mensagem automática/i);
  assert.match(text, /desconsidere/i);
  assert.doesNotMatch(text, /geucaristica\.com\.br\/consultar/);
  assert.match(text, /Lavínia.*99818-7602/);
  assert.doesNotMatch(text, /Eduardo/i);
});

test('formata telefone WhatsApp com prefixo 55', () => {
  assert.equal(formatWhatsAppNumber('(22) 99999-9999'), '5522999999999');
  assert.equal(formatWhatsAppNumber('22999999999'), '5522999999999');
  assert.equal(formatWhatsAppNumber('5511999999999'), '5511999999999');
});
