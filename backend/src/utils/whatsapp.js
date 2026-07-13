function siteBase() {
  return String(process.env.FRONTEND_URL || "https://geucaristica.com.br").replace(/\/$/, "");
}

/**
 * Gera link wa.me com texto no estilo CineGeração / Homem-Aranha
 * (mesmo tom do e-mail de confirmação).
 */
function gerarLinkWhatsApp({
  telefone,
  nome,
  evento,
  data,
  horario,
  local,
  cidade,
  codigoIngresso,
  codigoInscricao,
  chegada,
  tickets,
  quantidade
}) {
  const digits = String(telefone || "").replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const primeiroNome = String(nome || "").trim().split(/\s+/)[0] || "herói";
  const chegadaTxt = chegada || "17h10";
  const qtd = Number(quantidade) || (Array.isArray(tickets) ? tickets.length : 0) || 1;
  const linkIngresso = codigoInscricao
    ? `${siteBase()}/ingresso/${codigoInscricao}`
    : null;

  const linhasIngressos =
    Array.isArray(tickets) && tickets.length
      ? tickets.map((t) => `🎫 ${t.nome || "Participante"}: *${t.codigo}*`)
      : codigoIngresso
        ? [`🎫 Código: *${codigoIngresso}*`]
        : [];

  const mensagem = [
    "🕷️ *CineGeração*",
    "*Homem-Aranha: Um novo dia*",
    "",
    `Olá, ${primeiroNome}!`,
    "",
    qtd > 1
      ? `✅ *Missão confirmada!* Seus *${qtd} ingressos* já estão na teia.`
      : "✅ *Missão confirmada!* Seu ingresso já está na teia.",
    "",
    `🎬 *${evento || "CineGeração – Homem-Aranha: Um novo dia"}*`,
    `📅 Data: *${data}*`,
    `🕐 Sessão: *${horario}* · Chegada *${chegadaTxt}*`,
    `📍 Local: *${local}${cidade ? ` – ${cidade}` : ""}*`,
    "",
    ...linhasIngressos,
    linkIngresso ? "" : null,
    linkIngresso ? `🔗 Abrir ingresso: ${linkIngresso}` : null,
    "",
    "⚠️ *Importante:* o comprovante digital *não* substitui o ingresso físico do cinema.",
    "No dia, traga o ingresso do cinema e apresente-se a *Lavínia* e *Eduardo*.",
    "",
    '"Tudo posso naquele que me fortalece." (Filipenses 4,13)',
    "",
    "Que Deus abençoe este encontro.",
    "_Coordenação · Grupo Jovem Geração Eucarística_"
  ]
    .filter((l) => l !== null && l !== undefined)
    .join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;
}

module.exports = { gerarLinkWhatsApp };
