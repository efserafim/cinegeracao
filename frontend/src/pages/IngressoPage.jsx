import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { formatDate } from '../services/api';
import { Loading } from '../components/ui';
import { logoImg, posterImg } from '../assets/brand';

export default function IngressoPage() {
  const { codigoInscricao } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/ingressos/inscricao/${codigoInscricao}`)
      .then((res) => setTicket(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Ingresso indisponível'))
      .finally(() => setLoading(false));
  }, [codigoInscricao]);

  if (loading) return <Loading />;
  if (error || !ticket) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 animate-fade-up">
      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
        <div className="relative h-28 overflow-hidden">
          <img src={posterImg} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070a12]/90 via-[#e11d2e]/70 to-[#1a6cff]/50" />
          <div className="relative flex h-full items-center gap-3 px-5">
            <img src={logoImg} alt="" className="h-14 w-14 rounded-full ring-2 ring-[#f5c542]" />
            <div className="text-white">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#f5c542]">Ingresso digital</p>
              <h1 className="font-display text-xl leading-none">{ticket.evento}</h1>
            </div>
          </div>
        </div>
        <div className="space-y-2.5 px-6 py-5 text-sm">
          <p><span className="text-[var(--color-ink-soft)]">Nome:</span> <strong>{ticket.nome}</strong></p>
          <p><span className="text-[var(--color-ink-soft)]">Data:</span> {formatDate(ticket.data)}</p>
          <p><span className="text-[var(--color-ink-soft)]">Horário:</span> {ticket.horario}</p>
          <p><span className="text-[var(--color-ink-soft)]">Local:</span> {ticket.local}{ticket.cidade ? ` · ${ticket.cidade}` : ''}</p>
          <p><span className="text-[var(--color-ink-soft)]">Código:</span> <strong className="tracking-wider">{ticket.codigo}</strong></p>
          <p><span className="text-[var(--color-ink-soft)]">Status:</span> {ticket.status}</p>
        </div>
        <div className="flex justify-center bg-[#0b1020] px-6 py-6">
          <img src={ticket.qrDataUrl} alt="QR Code do ingresso" className="h-52 w-52 rounded-xl bg-white p-2" />
        </div>
      </div>
    </div>
  );
}
