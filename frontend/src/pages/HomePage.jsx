import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { formatDate, formatMoney, mediaUrl } from '../services/api';
import { Button, Loading } from '../components/ui';
import { logoImg, posterImg } from '../assets/brand';
import ContatosDuvidas from '../components/ContatosDuvidas';
import CinemaMapa from '../components/CinemaMapa';

/**
 * Entrada pública: hero cinematográfico full-bleed + inscrição fluida.
 */
export default function HomePage() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/eventos/publicos')
      .then((res) => {
        const list = res.data.data || [];
        setEventos(list);
        if (list.length > 0) setSelected(list[0].id);
      })
      .catch(() => setEventos([]))
      .finally(() => setLoading(false));
  }, []);

  function irParaFormulario() {
    if (!selected) return;
    navigate(`/evento/${selected}/inscrever`);
  }

  const eventoPrincipal = eventos[0];
  const flyerImg = mediaUrl(eventoPrincipal?.bannerUrl);

  return (
    <div>
      {/* Uma composição: poster de ponta a ponta + marca por cima */}
      <section className="relative min-h-[92svh] overflow-hidden bg-[#070a12]">
        <img
          src={posterImg}
          alt="Homem-Aranha: Um novo dia"
          className="absolute inset-0 h-full w-full object-cover object-[center_22%] animate-fade-in"
        />
        <div className="absolute inset-0 web-mask opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070a12]/55 via-[#070a12]/25 to-[#070a12]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070a12]/80 via-[#070a12]/35 to-transparent" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#e11d2e]/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-24 h-64 w-64 rounded-full bg-[#1a6cff]/20 blur-3xl" />

        <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 sm:px-8 lg:pb-20">
          <div className="max-w-lg">
            <img
              src={logoImg}
              alt="CineGeração"
              className="animate-swing animate-pulse-glow h-20 w-20 rounded-full object-cover ring-4 ring-[#f5c542]/65 shadow-[0_0_40px_rgba(225,29,46,0.4)] sm:h-24 sm:w-24"
            />
            <p
              className="animate-fade-up mt-5 font-display text-5xl leading-none text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] sm:text-6xl"
              style={{ animationDelay: '0.1s' }}
            >
              CineGeração
            </p>
            <p
              className="animate-fade-up mt-2 font-display text-xl text-[#f5c542] sm:text-2xl"
              style={{ animationDelay: '0.14s' }}
            >
              Homem-Aranha: Um novo dia
            </p>
            <h1
              className="animate-fade-up mt-4 max-w-sm text-sm font-medium leading-relaxed text-white/88 sm:text-base"
              style={{ animationDelay: '0.18s' }}
            >
              Cinema MaxiMovie · Bacaxá, Saquarema
              <br />
              Sessão 18h10 · Chegada 17h10
              <br />
              Pipoca P + Guaravita inclusos
            </h1>
            <button
              type="button"
              onClick={() => document.getElementById('inscricao')?.scrollIntoView({ behavior: 'smooth' })}
              className="animate-fade-up mt-8 inline-flex items-center rounded-full bg-[#e11d2e] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_12px_32px_rgba(225,29,46,0.45)] transition hover:bg-[#b01422] hover:shadow-[0_16px_40px_rgba(225,29,46,0.55)]"
              style={{ animationDelay: '0.26s' }}
            >
              Quero participar
            </button>
          </div>
        </div>

        {/* Curva suave para sair do “bloco” */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]">
          <svg viewBox="0 0 1440 72" className="h-12 w-full fill-[var(--color-sand)] dark:fill-[#070a12] sm:h-16" preserveAspectRatio="none" aria-hidden>
            <path d="M0,40 C240,72 480,0 720,28 C960,56 1200,72 1440,24 L1440,72 L0,72 Z" />
          </svg>
        </div>
      </section>

      <section id="inscricao" className="relative mx-auto max-w-lg px-5 py-12 animate-fade-up sm:px-6">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e11d2e]">Próximo passo</p>
          <h2 className="mt-2 font-display text-3xl text-[var(--color-ink)] dark:text-white">Inscrição</h2>
        </div>

        {loading && <Loading />}

        {!loading && eventos.length === 0 && (
          <p className="text-center text-sm text-[var(--color-ink-soft)]">Nenhum evento aberto no momento.</p>
        )}

        {!loading && eventos.length === 1 && (
          <div className="space-y-6">
            {flyerImg && (
              <div className="relative overflow-hidden rounded-[1.75rem] shadow-[0_24px_60px_rgba(11,16,32,0.14)]">
                <img src={flyerImg} alt="" className="block h-auto w-full object-contain" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
              </div>
            )}
            <div className="space-y-2 text-center">
              <p className="font-semibold tracking-tight">{eventos[0].nome}</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink-soft)] dark:text-slate-400">
                {eventos[0].descricao}
              </p>
              <p className="text-sm font-medium text-[var(--color-ink)] dark:text-white">
                {formatDate(eventos[0].data)} · {eventos[0].horario} · {formatMoney(eventos[0].valor)}
              </p>
            </div>
            <Button
              className="w-full !rounded-full py-3.5 shadow-md shadow-red-900/15"
              disabled={eventos[0].vagasRestantes <= 0}
              onClick={() => navigate(`/evento/${eventos[0].id}/inscrever`)}
            >
              {eventos[0].vagasRestantes <= 0 ? 'Vagas esgotadas' : 'Preencher formulário'}
            </Button>
          </div>
        )}

        {!loading && eventos.length > 1 && (
          <div className="space-y-3">
            {eventos.map((ev) => (
              <label
                key={ev.id}
                className={`flex cursor-pointer gap-3 rounded-[1.25rem] px-4 py-3.5 transition ${
                  selected === ev.id
                    ? 'bg-[#e11d2e]/8 ring-2 ring-[#e11d2e]/40'
                    : 'bg-white/70 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="evento"
                  className="mt-1 accent-[#e11d2e]"
                  checked={selected === ev.id}
                  onChange={() => setSelected(ev.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{ev.nome}</span>
                  <span className="mt-0.5 block text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                    {formatDate(ev.data)} · {ev.horario} · {formatMoney(ev.valor)}
                    {ev.vagasRestantes <= 0 ? ' · esgotado' : ''}
                  </span>
                </span>
              </label>
            ))}
            <Button className="mt-2 w-full !rounded-full" disabled={!selected} onClick={irParaFormulario}>
              Continuar
            </Button>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-[var(--color-ink-soft)]">
          Já tem código?{' '}
          <Link to="/consultar" className="font-semibold text-[#e11d2e] underline">
            Consultar inscrição
          </Link>
        </p>

        <div className="mt-10 space-y-8">
          <CinemaMapa />
          <ContatosDuvidas />
        </div>
      </section>
    </div>
  );
}
