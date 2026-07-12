import { MessageCircle } from 'lucide-react';

const CONTATOS = [
  { nome: 'Eduardo', telefone: '22992473724', whatsapp: '5522992473724' },
  { nome: 'Lavínia', telefone: '22998187602', whatsapp: '5522998187602' },
];

function formatTel(digits) {
  const d = String(digits).replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return digits;
}

/**
 * Contatos WhatsApp — respeita modo claro/escuro.
 */
export default function ContatosDuvidas() {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e11d2e] dark:text-[#f5c542]">
        Dúvidas? Fale conosco
      </p>
      <ul className="mt-4 space-y-3">
        {CONTATOS.map((c) => (
          <li
            key={c.telefone}
            className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-white/70 px-4 py-3 text-sm ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10"
          >
            <span className="text-[var(--color-ink)] dark:text-white">
              <strong>{c.nome}</strong>
              <span className="text-[var(--color-ink-soft)] dark:text-white/60"> · {formatTel(c.telefone)}</span>
            </span>
            <a
              href={`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(`Olá, ${c.nome}! Tenho uma dúvida sobre o CineGeração.`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { CONTATOS };
