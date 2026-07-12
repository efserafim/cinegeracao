import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { formatDate, formatMoney, mediaUrl } from '../services/api';
import { Button, Loading } from '../components/ui';
import { logoImg, posterImg } from '../assets/brand';
import ContatosDuvidas from '../components/ContatosDuvidas';
import CinemaMapa from '../components/CinemaMapa';
import SpiderMark from '../components/SpiderMark';

/**
 * Home temática Homem-Aranha: teia, aranha sem fundo, poster e inscrição.
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
    <div className="bg-[#070a12] text-white">
      <section className="relative min-h-[92svh] overflow-hidden">
        <img
          src={posterImg}
          alt="Homem-Aranha: Um novo dia"
          className="absolute inset-0 h-full w-full object-cover object-[center_22%] animate-fade-in"
        />
        <div className="absolute inset-0 web-mask opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070a12]/70 via-[#070a12]/35 to-[#070a12]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070a12]/85 via-[#070a12]/40 to-transparent" />
        <div className="pointer-events-none absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-[#e11d2e]/30 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-10 h-72 w-72 rounded-full bg-[#1a6cff]/25 blur-3xl" />

        {/* Aranha sem fundo — marca visual grande */}
        <SpiderMark className="animate-spidey-float pointer-events-none absolute -right-8 top-24 h-48 w-48 opacity-25 sm:right-6 sm:top-28 sm:h-64 sm:w-64 sm:opacity-35 lg:right-16 lg:h-80 lg:w-80" />
        <SpiderMark className="pointer-events-none absolute -left-10 bottom-28 h-32 w-32 -rotate-12 opacity-15 sm:bottom-36 sm:h-40 sm:w-40" />

        <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-6xl flex-col justify-end px-5 pb-20 pt-28 sm:px-8 lg:pb-24">
          <div className="max-w-lg">
            <div className="animate-fade-up flex items-center gap-3" style={{ animationDelay: '0.05s' }}>
              <img
                src={logoImg}
                alt="CineGeração"
                className="animate-pulse-glow h-16 w-16 rounded-full object-cover ring-4 ring-[#e11d2e]/70 sm:h-20 sm:w-20"
              />
              <SpiderMark className="animate-pulse-glow h-12 w-12 sm:h-14 sm:w-14" />
            </div>

            <p
              className="animate-fade-up mt-5 flex flex-wrap items-center gap-2 font-display text-5xl leading-none tracking-wide text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] sm:text-6xl"
              style={{ animationDelay: '0.1s' }}
            >
              <SpiderMark className="h-8 w-8 sm:h-10 sm:w-10" />
              CINEGERAÇÃO
            </p>
            <p
              className="animate-fade-up mt-2 font-display text-xl uppercase tracking-[0.08em] text-[#f5c542] sm:text-2xl"
              style={{ animationDelay: '0.14s' }}
            >
              Homem-Aranha: Um novo dia
            </p>
            <h1
              className="animate-fade-up mt-4 max-w-sm text-sm font-medium leading-relaxed text-white/90 sm:text-base"
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
              className="animate-fade-up mt-8 inline-flex items-center gap-2 rounded-full bg-[#e11d2e] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_12px_32px_rgba(225,29,46,0.5)] transition hover:bg-[#b01422]"
              style={{ animationDelay: '0.26s' }}
            >
              <SpiderMark className="h-5 w-5" />
              Quero participar
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]">
          <svg viewBox="0 0 1440 72" className="h-12 w-full fill-[#0a0e1a] sm:h-16" preserveAspectRatio="none" aria-hidden>
            <path d="M0,40 C240,72 480,0 720,28 C960,56 1200,72 1440,24 L1440,72 L0,72 Z" />
          </svg>
        </div>
      </section>

      <section id="inscricao" className="relative overflow-hidden bg-[#0a0e1a] px-5 py-14 sm:px-6">
        <div className="pointer-events-none absolute inset-0 web-mask opacity-20" />
        <SpiderMark className="pointer-events-none absolute -right-10 top-8 h-44 w-44 rotate-6 opacity-[0.08]" />
        <SpiderMark className="pointer-events-none absolute -left-8 bottom-16 h-36 w-36 -rotate-12 opacity-[0.07]" />

        <div className="relative mx-auto max-w-lg animate-fade-up">
          <div className="mb-8 text-center">
            <div className="mb-3 flex justify-center">
              <SpiderMark className="h-10 w-10 animate-pulse-glow" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e11d2e]">Próximo passo</p>
            <h2 className="mt-2 font-display text-3xl tracking-wide text-white">Inscrição</h2>
          </div>

          {loading && <Loading />}

          {!loading && eventos.length === 0 && (
            <p className="text-center text-sm text-slate-400">Nenhum evento aberto no momento.</p>
          )}

          {!loading && eventos.length === 1 && (
            <div className="space-y-6">
              {flyerImg && (
                <div className="relative overflow-hidden rounded-[1.75rem] shadow-[0_24px_60px_rgba(225,29,46,0.18)] ring-1 ring-[#e11d2e]/25">
                  <img src={flyerImg} alt="" className="block h-auto w-full object-contain" />
                </div>
              )}
              <div className="space-y-2 text-center">
                <p className="font-semibold tracking-tight text-white">{eventos[0].nome}</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-400">
                  {eventos[0].descricao}
                </p>
                <p className="text-sm font-medium text-[#f5c542]">
                  {formatDate(eventos[0].data)} · {eventos[0].horario} · {formatMoney(eventos[0].valor)}
                </p>
              </div>
              <Button
                className="w-full !rounded-full py-3.5 shadow-md shadow-red-900/30"
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
                      ? 'bg-[#e11d2e]/15 ring-2 ring-[#e11d2e]/50'
                      : 'bg-white/5 ring-1 ring-white/10'
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
                    <span className="block font-medium text-white">{ev.nome}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">
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

          <p className="mt-8 text-center text-xs text-slate-400">
            Já tem código?{' '}
            <Link to="/consultar" className="font-semibold text-[#e11d2e] underline">
              Consultar inscrição
            </Link>
          </p>

          <div className="mt-10 space-y-8">
            <CinemaMapa variant="dark" />
            <ContatosDuvidas variant="dark" />
          </div>
        </div>
      </section>
    </div>
  );
}
