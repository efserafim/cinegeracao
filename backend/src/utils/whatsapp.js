/**
 * Gera link wa.me com mensagem pronta de confirmação (sem API WhatsApp).
 */
function gerarLinkWhatsApp({ telefone, nome, evento, data, horario, local, codigoIngresso }) {
  const digits = String(telefone || '').replace(/\D/g, '');
  // Assume Brasil (+55) se não houver DDI
  const phone = digits.startsWith('55') ? digits : `55${digits}`;

  const mensagem = [
    `Olá, ${nome}!`,
    '',
    `Sua inscrição no evento *${evento}* foi confirmada.`,
    `Data: ${data}`,
    `Horário: ${horario}`,
    `Local: ${local}`,
    codigoIngresso ? `Código do ingresso: ${codigoIngresso}` : null,
    '',
    'Apresente o QR Code do ingresso na entrada. Até lá!',
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;
}

module.exports = { gerarLinkWhatsApp };
