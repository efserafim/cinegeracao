import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { formatDate, formatMoney, mediaUrl } from '../services/api';
import { Button, Loading } from '../components/ui';
import { logoImg, posterImg } from '../assets/brand';
import ContatosDuvidas from '../components/ContatosDuvidas';
import CinemaMapa from '../components/CinemaMapa';

/**
 * Entrada pública temática Homem-Aranha + formulário.
 * Poster full-bleed + logo como marca principal.
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
  const heroImg = mediaUrl(eventoPrincipal?.bannerUrl) || posterImg;

  return (
    <div>
      {/* Hero: no mobile cobre a tela; no desktop mostra o poster inteiro ao lado */}
      <section className="relative overflow-hidden bg-[#070a12]">
        {/* Fundo desfocado (desktop) para preencher laterais sem crop agressivo */}
        <img
          src={heroImg}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden h-full w-full scale-110 object-cover opacity-40 blur-2xl lg:block"
        />
        <div className="absolute inset-0 hidden bg-[#070a12]/50 lg:block" />
        <div className="absolute inset-0 web-mask opacity-40" />

        <div className="relative mx-auto grid min-h-[78vh] max-w-6xl lg:grid-cols-2 lg:items-center lg:gap-8 lg:px-6 lg:py-10">
          {/* Poster */}
          <div className="relative min-h-[52vh] lg:min-h-[70vh]">
            {/* Mobile: crop mais suave no centro */}
            <img
              src={heroImg}
              alt="Homem-Aranha: Um novo dia"
              className="absolute inset-0 h-full w-full object-cover object-[center_25%] lg:hidden"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#070a12] lg:hidden" />

            {/* Desktop: poster vertical inteiro */}
            <div className="relative hidden h-full items-center justify-center lg:flex">
              <img
                src={heroImg}
                alt="Homem-Aranha: Um novo dia"
                className="animate-fade-in max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-white/15"
              />
            </div>
          </div>

          {/* Marca + CTA */}
          <div className="relative z-10 flex flex-col items-center px-4 pb-12 pt-6 text-center lg:items-start lg:pb-6 lg:pt-0 lg:text-left">
            <img
              src={logoImg}
              alt="CineGeração"
              className="animate-swing animate-pulse-glow h-28 w-28 rounded-full object-cover shadow-[0_0_40px_rgba(225,29,46,0.45)] ring-4 ring-[#f5c542]/80 md:h-36 md:w-36"
            />
            <p className="animate-fade-up mt-5 font-display text-4xl text-white drop-shadow-lg md:text-5xl" style={{ animationDelay: '0.1s' }}>
              CineGeração
            </p>
            <p
              className="animate-fade-up mt-1 font-display text-xl text-[#f5c542] md:text-2xl"
              style={{ animationDelay: '0.14s' }}
            >
              Homem-Aranha: Um novo dia
            </p>
            <h1
              className="animate-fade-up mt-3 max-w-sm text-sm font-medium leading-relaxed text-white/90 md:text-base"
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
              className="animate-fade-up mt-7 rounded-xl bg-[#e11d2e] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-red-900/40 transition hover:bg-[#b01422]"
              style={{ animationDelay: '0.26s' }}
            >
              Quero participar
            </button>
          </div>
        </div>
      </section>

      {/* Formulário / escolha de evento */}
      <section id="inscricao" className="mx-auto max-w-md px-4 py-10 animate-fade-up">
        <div className="mb-6 flex items-center gap-3">
          <span className="h-1 w-8 rounded-full bg-[#e11d2e]" />
          <h2 className="font-display text-2xl text-[var(--color-ink)] dark:text-white">Inscrição</h2>
        </div>

        {loading && <Loading />}

        {!loading && eventos.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">Nenhum evento aberto no momento.</p>
        )}

        {!loading && eventos.length === 1 && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-[#e11d2e]/15 bg-white/95 shadow-[0_12px_40px_rgba(11,16,32,0.08)] dark:border-white/10 dark:bg-slate-900/85">
              {(mediaUrl(eventos[0].bannerUrl) || posterImg) && (
                <img
                  src={mediaUrl(eventos[0].bannerUrl) || posterImg}
                  alt=""
                  className="h-52 w-full object-cover object-top sm:h-60"
                />
              )}
              <div className="p-5">
                <p className="font-semibold tracking-tight">{eventos[0].nome}</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink-soft)] dark:text-slate-400">
                  {eventos[0].descricao}
                </p>
                <p className="mt-3 text-sm font-medium text-[var(--color-ink)] dark:text-white">
                  {formatDate(eventos[0].data)} · {eventos[0].horario} · {formatMoney(eventos[0].valor)}
                </p>
              </div>
            </div>
            <Button
              className="w-full shadow-md shadow-red-900/15"
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
                className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition ${
                  selected === ev.id
                    ? 'border-[#e11d2e] bg-[#e11d2e]/5'
                    : 'border-black/10 bg-white/90 dark:border-white/15 dark:bg-slate-900/70'
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
            <Button className="mt-2 w-full" disabled={!selected} onClick={irParaFormulario}>
              Continuar
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-[var(--color-ink-soft)]">
          Já tem código?{' '}
          <Link to="/consultar" className="font-semibold text-[#e11d2e] underline">
            Consultar inscrição
          </Link>
        </p>

        <div className="mt-8 space-y-4">
          <CinemaMapa />
          <ContatosDuvidas />
        </div>
      </section>
    </div>
  );
}
