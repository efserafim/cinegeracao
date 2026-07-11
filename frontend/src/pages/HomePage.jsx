import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { formatDate, formatMoney, mediaUrl } from '../services/api';
import { Button, Loading } from '../components/ui';
import { posterImg } from '../assets/brand';
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
      {/* Hero: arte inteira (sem crop) + marca/CTA abaixo no mobile */}
      <section className="relative overflow-hidden bg-[#070a12]">
        <img
          src={heroImg}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden h-full w-full scale-110 object-cover opacity-40 blur-2xl lg:block"
        />
        <div className="absolute inset-0 hidden bg-[#070a12]/50 lg:block" />
        <div className="absolute inset-0 web-mask opacity-40" />

        <div className="relative mx-auto grid max-w-6xl lg:grid-cols-2 lg:items-center lg:gap-8 lg:px-6 lg:py-10">
          {/* Poster — largura total, altura natural (arte completa) */}
          <div className="relative">
            <img
              src={heroImg}
              alt="Homem-Aranha: Um novo dia"
              className="animate-fade-in block h-auto w-full object-contain lg:mx-auto lg:max-h-[78vh] lg:w-auto lg:max-w-full lg:rounded-2xl lg:shadow-[0_20px_60px_rgba(0,0,0,0.55)] lg:ring-1 lg:ring-white/15"
            />
          </div>

          {/* Marca Homem-Aranha + CTA */}
          <div className="relative z-10 overflow-hidden px-4 pb-10 pt-4 lg:overflow-visible lg:pb-6 lg:pt-0">
            <div className="pointer-events-none absolute inset-0 opacity-50 web-mask lg:rounded-3xl" />
            <div className="pointer-events-none absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-[#e11d2e]/25 blur-3xl" />
            <div className="pointer-events-none absolute left-4 top-8 h-28 w-28 rounded-full bg-[#1a6cff]/20 blur-3xl" />

            <div className="relative flex flex-col items-center lg:items-start lg:text-left">
              {/* Título + aranha da marca */}
              <div
                className="animate-fade-up flex items-center justify-center gap-2.5 lg:justify-start"
                style={{ animationDelay: '0.08s' }}
              >
                <img
                  src="/image/aranha.png"
                  alt=""
                  aria-hidden
                  className="animate-pulse-glow h-10 w-10 object-contain md:h-12 md:w-12"
                />
                <p className="brand-cinegeracao text-[clamp(2.35rem,10vw,3.75rem)]">
                  CineGeração
                </p>
              </div>

              <p
                className="animate-fade-up mt-2 font-display text-lg uppercase tracking-[0.14em] text-[#f5c542] md:text-xl"
                style={{ animationDelay: '0.12s' }}
              >
                Homem-Aranha: Um novo dia
              </p>

              {/* Spidey cutout com efeito moderno */}
              <div
                className="animate-fade-up relative mt-2 w-full max-w-md lg:max-w-none"
                style={{ animationDelay: '0.16s' }}
              >
                <div className="pointer-events-none absolute inset-x-8 bottom-2 h-10 rounded-[100%] bg-black/50 blur-xl" />
                <img
                  src="/image/spiderman.png"
                  alt="Homem-Aranha"
                  className="animate-spidey-float spidey-glow relative mx-auto h-auto w-[min(100%,340px)] object-contain lg:w-[min(100%,420px)]"
                />
              </div>

              <h1
                className="animate-fade-up mt-1 max-w-sm text-center text-sm font-medium leading-relaxed text-white/90 md:text-base lg:text-left"
                style={{ animationDelay: '0.2s' }}
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
                className="animate-fade-up mt-6 rounded-xl bg-[#e11d2e] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-red-900/40 transition hover:bg-[#b01422]"
                style={{ animationDelay: '0.26s' }}
              >
                Quero participar
              </button>
            </div>
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
                  className="h-auto w-full bg-[#070a12] object-contain"
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
