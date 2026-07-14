import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { formatDate, formatMoney, mediaUrl } from "../services/api";
import { Loading } from "../components/ui";
import { logoImg, posterImg } from "../assets/brand";
import ContatosDuvidas from "../components/ContatosDuvidas";
import SpiderMark from "../components/SpiderMark";
import InscricaoForm from "../components/InscricaoForm";

function scrollToInscricao() {
  document.getElementById("inscricao")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/eventos/publicos")
      .then((res) => {
        if (cancelled) return;
        const list = res.data.data || [];
        setEventos(list);
        if (list.length === 0) return;
        const fromUrl = searchParams.get("evento");
        const match = fromUrl ? list.find((e) => e.id === fromUrl) : null;
        setSelected(match?.id || list[0].id);
      })
      .catch(() => {
        if (!cancelled) setEventos([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (loading) return;
    if (window.location.hash !== "#inscricao") return;
    const t = window.setTimeout(scrollToInscricao, 80);
    return () => window.clearTimeout(t);
  }, [loading]);

  const eventoAtivo = eventos.find((e) => e.id === selected) || eventos[0];
  const flyerImg = mediaUrl(eventoAtivo?.bannerUrl);
  const unico = !loading && eventos.length === 1;
  const varios = !loading && eventos.length > 1;

  return (
    <div>
      <section className="relative min-h-[92svh] overflow-hidden bg-[#070a12]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <img
            src={posterImg}
            alt=""
            className="animate-hero-cinematic absolute inset-0 h-full w-full object-cover object-[center_22%]"
          />
        </div>
        <span className="sr-only">CineGeração – Homem-Aranha: Um novo dia</span>
        <div className="absolute inset-0 web-mask opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070a12]/70 via-[#070a12]/35 to-[#070a12]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070a12]/85 via-[#070a12]/40 to-transparent" />
        <div className="pointer-events-none absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-[#e11d2e]/30 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-10 h-72 w-72 rounded-full bg-[#1a6cff]/25 blur-3xl" />

        <SpiderMark
          tone="light"
          className="animate-spidey-float pointer-events-none absolute -right-8 top-24 h-48 w-48 opacity-25 sm:right-6 sm:top-28 sm:h-64 sm:w-64 sm:opacity-35 lg:right-16 lg:h-80 lg:w-80"
        />
        <SpiderMark
          tone="light"
          className="pointer-events-none absolute -left-10 bottom-28 h-32 w-32 -rotate-12 opacity-15 sm:bottom-36 sm:h-40 sm:w-40"
        />

        <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-6xl flex-col justify-end px-5 pb-20 pt-28 sm:px-8 lg:pb-24">
          <div className="max-w-lg">
            <div className="animate-fade-up" style={{ animationDelay: "0.05s" }}>
              <img
                src={logoImg}
                alt="CineGeração"
                className="animate-pulse-glow h-16 w-16 rounded-full object-cover ring-4 ring-[#e11d2e]/70 sm:h-20 sm:w-20"
              />
            </div>

            <p
              className="animate-fade-up mt-5 font-display text-5xl leading-none tracking-wide text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] sm:text-6xl"
              style={{ animationDelay: "0.1s" }}
            >
              CINEGERAÇÃO
            </p>
            <p
              className="animate-fade-up mt-2 font-display text-xl uppercase tracking-[0.08em] text-[#f5c542] sm:text-2xl"
              style={{ animationDelay: "0.14s" }}
            >
              Homem-Aranha: Um novo dia
            </p>
            <h1
              className="animate-fade-up mt-4 max-w-sm text-sm font-medium leading-relaxed text-white/90 sm:text-base"
              style={{ animationDelay: "0.18s" }}
            >
              1º de agosto · Cinema MaxiMovie · Bacaxá
              <br />
              Sessão 18h10 · Chegada 17h10
            </h1>
            <button
              type="button"
              onClick={scrollToInscricao}
              className="animate-fade-up mt-8 inline-flex items-center gap-2 rounded-full bg-[#e11d2e] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_12px_32px_rgba(225,29,46,0.5)] transition hover:bg-[#b01422]"
              style={{ animationDelay: "0.26s" }}
            >
              <SpiderMark tone="light" className="h-5 w-5" />
              Quero participar
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]">
          <svg
            viewBox="0 0 1440 72"
            className="h-12 w-full fill-[var(--color-sand)] dark:fill-[#070a12] sm:h-16"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d="M0,40 C240,72 480,0 720,28 C960,56 1200,72 1440,24 L1440,72 L0,72 Z" />
          </svg>
        </div>
      </section>

      <section id="inscricao" className="relative scroll-mt-24 overflow-hidden px-5 py-10 sm:px-6 sm:py-12">
        <SpiderMark className="pointer-events-none absolute -right-10 top-8 h-44 w-44 rotate-6 opacity-[0.08]" />
        <SpiderMark className="pointer-events-none absolute -left-8 bottom-16 h-36 w-36 -rotate-12 opacity-[0.07]" />

        <div className="relative mx-auto max-w-3xl animate-fade-up">
          <div className="mb-6 text-center">
            <div className="mb-2 flex justify-center">
              <SpiderMark className="h-9 w-9" glow />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e11d2e]">Próximo passo</p>
            <h2 className="mt-1.5 font-display text-3xl tracking-wide text-[var(--color-ink)] dark:text-white">
              Inscrição
            </h2>
          </div>

          <div className="mb-6 overflow-hidden rounded-[1.35rem] ring-2 ring-[#e11d2e]/55 dark:ring-[#f5c542]/50">
            <div className="bg-gradient-to-r from-[#e11d2e] to-[#b01422] px-4 py-2.5 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white">
                Atenção · promoção do evento
              </p>
            </div>
            <div className="bg-[#f5c542]/20 px-4 py-4 text-center dark:bg-[#f5c542]/12">
              <p className="text-base font-bold leading-snug text-[#7a4b00] dark:text-[#f5c542] sm:text-lg">
                O ingresso a <span className="text-[#e11d2e] dark:text-white">R$&nbsp;10</span>, com{" "}
                <span className="underline decoration-2 underline-offset-2">pipoca cortesia</span> e{" "}
                <span className="underline decoration-2 underline-offset-2">guaravita</span>, vale somente com
                o mínimo de{" "}
                <span className="rounded-md bg-[#e11d2e] px-2 py-0.5 text-white shadow-sm">100 pessoas</span>.
              </p>
              <p className="mt-2 text-xs font-medium leading-relaxed text-[#7a4b00]/90 dark:text-[#f5c542]/85">
                Sem atingir 100 inscritos, a promoção pode não ser aplicada.
              </p>
            </div>
          </div>

          {loading && <Loading />}

          {!loading && eventos.length === 0 && (
            <p className="text-center text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
              Nenhum evento aberto no momento.
            </p>
          )}

          {varios && (
            <div className="mb-5 space-y-3">
              {eventos.map((ev) => (
                <label
                  key={ev.id}
                  className={`flex cursor-pointer gap-3 rounded-[1.25rem] px-4 py-3.5 transition ${
                    selected === ev.id
                      ? "bg-[#e11d2e]/8 ring-2 ring-[#e11d2e]/40"
                      : "bg-white/70 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10"
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
                    <span className="block font-medium text-[var(--color-ink)] dark:text-white">{ev.nome}</span>
                    <span className="mt-0.5 block text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                      {formatDate(ev.data)} · {ev.horario} · {formatMoney(ev.valor)}
                      {ev.vagasRestantes <= 0 ? " · esgotado" : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {(unico || (varios && eventoAtivo)) && eventoAtivo && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
                {flyerImg && (
                  <figure className="w-[14rem] shrink-0 rotate-[-1deg] bg-[#0a0e1a] p-1 shadow-[0_22px_44px_-14px_rgba(11,16,32,0.5)] ring-1 ring-black/25 transition duration-300 hover:rotate-0 sm:w-[16.5rem] dark:ring-white/10">
                    <img
                      src={flyerImg}
                      alt="Cartaz do CineGeração"
                      className="block h-auto w-full border border-white/10"
                    />
                  </figure>
                )}

                <div className={`min-w-0 flex-1 space-y-2.5 ${flyerImg ? "sm:pt-2" : "text-center"}`}>
                  <p className="font-display text-2xl leading-tight tracking-wide text-[var(--color-ink)] dark:text-white sm:text-[1.75rem]">
                    {eventoAtivo.nome}
                  </p>
                  {eventoAtivo.descricao && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink-soft)] dark:text-slate-400">
                      {eventoAtivo.descricao}
                    </p>
                  )}
                  <p className="text-sm font-medium text-[#e11d2e] dark:text-[#f5c542]">
                    {formatDate(eventoAtivo.data)} · {eventoAtivo.horario} · {formatMoney(eventoAtivo.valor)}
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                    {eventoAtivo.vagasRestantes > 0
                      ? `${eventoAtivo.vagasRestantes} vaga${eventoAtivo.vagasRestantes === 1 ? "" : "s"} disponíveis`
                      : "Vagas esgotadas"}
                  </p>
                </div>
              </div>

              <InscricaoForm key={eventoAtivo.id} evento={eventoAtivo} />
            </div>
          )}

          <p className="mt-6 text-center text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
            Já se inscreveu?{" "}
            <Link to="/consultar" className="font-semibold text-[#e11d2e] underline">
              Consultar pelo WhatsApp
            </Link>
          </p>

          <div className="mt-10 space-y-8">
            <ContatosDuvidas />
          </div>
        </div>
      </section>
    </div>
  );
}
