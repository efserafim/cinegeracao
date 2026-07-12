import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api, { formatDate } from "../services/api";
import { Loading } from "../components/ui";
import { logoImg, posterImg } from "../assets/brand";

function TicketCard({ ticket, evento, data, horario, local, cidade, index, total }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
      <div className="relative h-28 overflow-hidden">
        <img src={posterImg} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070a12]/90 via-[#e11d2e]/70 to-[#1a6cff]/50" />
        <div className="relative flex h-full items-center gap-3 px-5">
          <img src={logoImg} alt="" className="h-14 w-14 rounded-full ring-2 ring-[#f5c542]" />
          <div className="text-white">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#f5c542]">
              Ingresso digital{total > 1 ? ` · ${index + 1}/${total}` : ""}
            </p>
            <h1 className="font-display text-xl leading-none">{evento}</h1>
          </div>
        </div>
      </div>
      <div className="space-y-2.5 px-6 py-5 text-sm">
        <p><span className="text-[var(--color-ink-soft)]">Nome:</span> <strong>{ticket.nome}</strong></p>
        <p><span className="text-[var(--color-ink-soft)]">Data:</span> {formatDate(data)}</p>
        <p><span className="text-[var(--color-ink-soft)]">Horário:</span> {horario}</p>
        <p><span className="text-[var(--color-ink-soft)]">Local:</span> {local}{cidade ? ` · ${cidade}` : ""}</p>
        <p><span className="text-[var(--color-ink-soft)]">Código:</span> <strong className="tracking-wider">{ticket.codigo}</strong></p>
        <p><span className="text-[var(--color-ink-soft)]">Status:</span> {ticket.status}</p>
      </div>
      <div className="flex justify-center bg-[#0b1020] px-6 py-6">
        <img src={ticket.qrDataUrl} alt={`QR Code de ${ticket.nome}`} className="h-52 w-52 rounded-xl bg-white p-2" />
      </div>
    </div>
  );
}

export default function IngressoPage() {
  const { codigoInscricao } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ativo, setAtivo] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const startX = useRef(0);

  useEffect(() => {
    api.get(`/ingressos/inscricao/${codigoInscricao}`).then((res) => {
      setTicket(res.data.data);
      setAtivo(0);
    }).catch((err) => setError(err.response?.data?.message || "Ingresso indisponível")).finally(() => setLoading(false));
  }, [codigoInscricao]);

  if (loading) return <Loading />;
  if (error || !ticket) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-red-600">{error}</div>;
  }

  const tickets = ticket.tickets?.length ? ticket.tickets : [{
    nome: ticket.nome,
    codigo: ticket.codigo,
    status: ticket.status,
    qrDataUrl: ticket.qrDataUrl
  }];
  const multi = tickets.length > 1;

  function irPara(idx) {
    setAtivo(Math.max(0, Math.min(tickets.length - 1, idx)));
    setDragX(0);
  }

  function onPointerDown(e) {
    if (!multi) return;
    setArrastando(true);
    startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  }

  function onPointerMove(e) {
    if (!arrastando || !multi) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    setDragX(x - startX.current);
  }

  function onPointerUp() {
    if (!arrastando || !multi) return;
    setArrastando(false);
    if (dragX < -60) irPara(ativo + 1);
    else if (dragX > 60) irPara(ativo - 1);
    else setDragX(0);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 animate-fade-up">
      {multi && (
        <div className="mb-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e11d2e]">
            {tickets.length} ingressos
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
            Deslize para o lado para ver cada pessoa
          </p>
        </div>
      )}

      <div className="relative">
        {multi && (
          <>
            <button
              type="button"
              aria-label="Ingresso anterior"
              onClick={() => irPara(ativo - 1)}
              disabled={ativo === 0}
              className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e11d2e] p-2 text-white shadow-lg disabled:opacity-30 sm:-translate-x-3"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label="Próximo ingresso"
              onClick={() => irPara(ativo + 1)}
              disabled={ativo === tickets.length - 1}
              className="absolute right-0 top-1/2 z-10 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e11d2e] p-2 text-white shadow-lg disabled:opacity-30 sm:translate-x-3"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        <div
          className="overflow-hidden touch-pan-y"
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        >
          <div
            className={`flex ${arrastando ? "" : "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"}`}
            style={{ transform: `translateX(calc(${-ativo * 100}% + ${dragX}px))` }}
          >
            {tickets.map((t, idx) => (
              <div key={t.codigo} className="w-full shrink-0 px-0.5">
                <TicketCard
                  ticket={t}
                  evento={ticket.evento}
                  data={ticket.data}
                  horario={ticket.horario}
                  local={ticket.local}
                  cidade={ticket.cidade}
                  index={idx}
                  total={tickets.length}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {multi && (
        <div className="mt-5 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            {tickets.map((t, idx) => (
              <button
                key={t.codigo}
                type="button"
                aria-label={`Ver ingresso de ${t.nome}`}
                onClick={() => irPara(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  idx === ativo ? "w-7 bg-[#e11d2e]" : "w-2.5 bg-black/20 dark:bg-white/25"
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
            <span className="font-medium text-[var(--color-ink)] dark:text-white">{tickets[ativo]?.nome}</span>
            {" · "}
            {ativo + 1} de {tickets.length}
          </p>
        </div>
      )}
    </div>
  );
}
