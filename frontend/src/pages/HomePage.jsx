import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { formatDate, formatMoney, mediaUrl } from '../services/api';
import { Button, Loading } from '../components/ui';
import { logoImg, posterImg } from '../assets/brand';
import ContatosDuvidas from '../components/ContatosDuvidas';
import CinemaMapa from '../components/CinemaMapa';

/**
 * Entrada pública: poster cinematográfico full-bleed + inscrição.
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
      {/* Hero: poster do filme (não o flyer quadrado) */}
      <section className="relative min-h-[88vh] overflow-hidden bg-[#070a12]">
        <img
          src={posterImg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-105 object-cover object-[center_18%] blur-2xl opacity-50"
        />
        <div className="absolute inset-0 web-mask opacity-30" />

        <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col lg:flex-row lg:items-end lg:gap-10 lg:px-6 lg:pb-14 lg:pt-8">
          {/* Poster cinematográfico — sem moldura quadrada */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute -inset-8 bg-[radial-gradient(ellipse_at_center,rgba(225,29,46,0.28),transparent_65%)]" />
            <img
              src={posterImg}
              alt="Homem-Aranha: Um novo dia"
              className="animate-fade-in relative mx-auto h-[58vh] w-auto max-w-[100%] object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.65)] sm:h-[64vh] lg:mx-0 lg:h-[78vh]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#070a12] to-transparent lg:hidden" />
          </div>

          {/* Marca + CTA */}
          <div className="relative z-10 -mt-10 flex flex-col items-center px-5 pb-12 text-center lg:mt-0 lg:mb-8 lg:max-w-md lg:items-start lg:px-0 lg:pb-4 lg:text-left">
            <img
              src={logoImg}
              alt="CineGeração"
              className="animate-swing animate-pulse-glow h-24 w-24 rounded-full object-cover shadow-[0_0_40px_rgba(225,29,46,0.45)] ring-4 ring-[#f5c542]/70 md:h-28 md:w-28"
            />
            <p
              className="animate-fade-up mt-5 font-display text-4xl text-white drop-shadow-lg md:text-5xl"
              style={{ animationDelay: '0.1s' }}
            >
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
              className="animate-fade-up mt-7 rounded-full bg-[#e11d2e] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-red-900/40 transition hover:bg-[#b01422]"
              style={{ animationDelay: '0.26s' }}
            >
              Quero participar
            </button>
          </div>
        </div>
      </section>

      {/* Inscrição */}
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
          <div className="space-y-5">
            {flyerImg && (
              <img
                src={flyerImg}
                alt=""
                className="h-auto w-full object-contain shadow-[0_18px_50px_rgba(11,16,32,0.18)]"
              />
            )}
            <div className="space-y-2 px-1">
              <p className="font-semibold tracking-tight">{eventos[0].nome}</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink-soft)] dark:text-slate-400">
                {eventos[0].descricao}
              </p>
              <p className="text-sm font-medium text-[var(--color-ink)] dark:text-white">
                {formatDate(eventos[0].data)} · {eventos[0].horario} · {formatMoney(eventos[0].valor)}
              </p>
            </div>
            <Button
              className="w-full rounded-full shadow-md shadow-red-900/15"
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
                className={`flex cursor-pointer gap-3 rounded-2xl border px-4 py-3 transition ${
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
            <Button className="mt-2 w-full rounded-full" disabled={!selected} onClick={irParaFormulario}>
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
