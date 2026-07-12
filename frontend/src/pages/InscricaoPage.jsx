import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Ticket } from 'lucide-react';
import api, { formatDate, formatMoney, mediaUrl, STATUS_LABELS } from '../services/api';
import { Button, Input, Loading, StatusBadge } from '../components/ui';
import { logoImg, posterImg } from '../assets/brand';
import ContatosDuvidas from '../components/ContatosDuvidas';
import CinemaMapa from '../components/CinemaMapa';
import SpiderMark from '../components/SpiderMark';

/**
 * Formulário de inscrição — visual Homem-Aranha alinhado à home.
 */
export default function InscricaoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { metodoPagamento: 'PIX' },
  });
  const metodoPagamento = watch('metodoPagamento');
  const [evento, setEvento] = useState(null);
  const [loadingEvento, setLoadingEvento] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicata, setDuplicata] = useState(null);

  useEffect(() => {
    api.get(`/eventos/publicos/${id}`)
      .then((res) => setEvento(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Evento não encontrado'))
      .finally(() => setLoadingEvento(false));
  }, [id]);

  async function onSubmit(values) {
    setLoading(true);
    setError('');
    setDuplicata(null);
    try {
      const { data } = await api.post(`/inscricoes/evento/${id}`, values);
      const codigo = data.data.inscricao.codigo;
      navigate(`/inscricao/${codigo}`);
    } catch (err) {
      const payload = err.response?.data;
      if (err.response?.status === 409 && payload?.data?.duplicada) {
        setDuplicata(payload.data);
        setError('');
      } else {
        setError(payload?.message || 'Erro ao criar inscrição');
      }
    } finally {
      setLoading(false);
    }
  }

  if (loadingEvento) return <Loading />;

  if (!evento) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <SpiderMark className="mx-auto mb-4 h-12 w-12 opacity-70" />
        <p className="text-red-600">{error || 'Evento não encontrado'}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-[#e11d2e] underline">Voltar</Link>
      </div>
    );
  }

  const esgotado = evento.vagasRestantes <= 0;
  const bannerSrc = mediaUrl(evento.bannerUrl) || posterImg;
  const fieldClass =
    '!rounded-[1.25rem] border-0 bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/5 focus:ring-2 dark:bg-white/5 dark:ring-white/10';

  return (
    <div className="relative overflow-hidden">
      <SpiderMark className="pointer-events-none absolute -right-12 top-32 h-48 w-48 rotate-6 opacity-[0.06]" />
      <SpiderMark className="pointer-events-none absolute -left-10 bottom-40 h-40 w-40 -rotate-12 opacity-[0.05]" />

      {/* Cabeçalho cinematográfico */}
      <section className="relative overflow-hidden bg-[#070a12] pt-20">
        <div className="pointer-events-none absolute inset-0 web-mask opacity-30" />
        <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-[#e11d2e]/25 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-20 h-48 w-48 rounded-full bg-[#1a6cff]/20 blur-3xl" />
        <SpiderMark tone="light" className="pointer-events-none absolute right-4 top-24 h-28 w-28 opacity-20 sm:right-10 sm:h-36 sm:w-36" />

        <div className="relative mx-auto max-w-lg px-5 pb-10 pt-4 text-center sm:px-6">
          <div className="flex items-center justify-center gap-3">
            <img
              src={logoImg}
              alt=""
              className="h-14 w-14 rounded-full object-cover ring-4 ring-[#e11d2e]/70"
            />
            <SpiderMark tone="light" className="h-10 w-10 animate-pulse-glow" />
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 font-display text-3xl tracking-wide text-white">
            <SpiderMark tone="light" className="h-6 w-6" />
            Inscrição
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#f5c542]">CineGeração · Homem-Aranha</p>

          <div className="relative mx-auto mt-6 max-w-sm overflow-hidden rounded-[1.75rem] shadow-[0_24px_60px_rgba(0,0,0,0.45)] ring-1 ring-[#e11d2e]/30">
            <img src={bannerSrc} alt="" className="block h-auto w-full object-contain" />
          </div>

          <div className="mt-5 space-y-1 text-sm text-white/85">
            <p className="font-display text-xl text-white">{evento.nome}</p>
            <p>
              {formatDate(evento.data)} · {evento.horario}
            </p>
            <p className="text-white/65">{evento.local}</p>
            <p className="pt-1 font-semibold text-[#f5c542]">
              {formatMoney(evento.valor)} · {evento.vagasRestantes} vagas
            </p>
          </div>
        </div>

        <div className="pointer-events-none leading-[0]">
          <svg viewBox="0 0 1440 72" className="h-10 w-full fill-[var(--color-sand)] dark:fill-[#070a12] sm:h-12" preserveAspectRatio="none" aria-hidden>
            <path d="M0,40 C240,72 480,0 720,28 C960,56 1200,72 1440,24 L1440,72 L0,72 Z" />
          </svg>
        </div>
      </section>

      <section className="relative mx-auto max-w-lg px-5 py-10 animate-fade-up sm:px-6">
        <div className="mb-7 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e11d2e]">Seus dados</p>
          <h1 className="mt-2 font-display text-2xl tracking-wide text-[var(--color-ink)] dark:text-white">
            Preencha para garantir sua vaga
          </h1>
        </div>

        {esgotado ? (
          <p className="rounded-[1.25rem] bg-amber-50 px-5 py-4 text-center text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Vagas esgotadas para este evento.
          </p>
        ) : duplicata ? (
          <div className="space-y-5">
            <div className="rounded-[1.75rem] bg-[#f5c542]/12 p-5 ring-1 ring-[#f5c542]/35">
              <div className="flex items-start gap-3">
                <Ticket className="mt-0.5 shrink-0 text-[#e11d2e]" size={20} />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)] dark:text-white">
                    Você já está inscrito(a)
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-300">
                    Encontramos uma inscrição com este WhatsApp
                    {duplicata.nome ? <> ({duplicata.nome})</> : null}. Para não duplicar, use o código abaixo
                    ou fale com Eduardo ou Lavínia.
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-[1.25rem] bg-white/80 px-4 py-4 text-center dark:bg-white/5">
                <div className="mb-2 flex justify-center">
                  <SpiderMark className="h-7 w-7" />
                </div>
                <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-soft)]">Seu código</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-[#e11d2e]">{duplicata.codigo}</p>
                {duplicata.status && (
                  <p className="mt-2 flex items-center justify-center gap-2 text-xs">
                    <StatusBadge status={duplicata.status} />
                    <span className="text-[var(--color-ink-soft)]">{STATUS_LABELS[duplicata.status]}</span>
                  </p>
                )}
              </div>
              <Button className="mt-4 w-full !rounded-full" onClick={() => navigate(`/inscricao/${duplicata.codigo}`)}>
                Continuar com este código
              </Button>
              <button
                type="button"
                className="mt-3 w-full text-center text-xs text-[var(--color-ink-soft)] underline"
                onClick={() => setDuplicata(null)}
              >
                Tentar com outro WhatsApp
              </button>
            </div>
            <ContatosDuvidas />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nome completo"
              className={fieldClass}
              {...register('nome', { required: 'Obrigatório' })}
              error={errors.nome?.message}
            />
            <Input
              label="WhatsApp (com DDD)"
              placeholder="22999999999"
              className={fieldClass}
              {...register('telefone', { required: 'Obrigatório' })}
              error={errors.telefone?.message}
            />
            <Input
              label="E-mail"
              type="email"
              className={fieldClass}
              {...register('email', {
                required: 'Obrigatório para receber a confirmação',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido' },
              })}
              error={errors.email?.message}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Paróquia"
                className={fieldClass}
                {...register('paroquia', { required: 'Obrigatório' })}
                error={errors.paroquia?.message}
              />
              <Input
                label="Cidade"
                className={fieldClass}
                {...register('cidade', { required: 'Obrigatório' })}
                error={errors.cidade?.message}
              />
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-slate-400">
                Forma de pagamento
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setValue('metodoPagamento', 'PIX')}
                  className={`rounded-[1.25rem] px-4 py-3 text-left text-sm transition ring-1 ${
                    metodoPagamento === 'PIX'
                      ? 'bg-[#e11d2e]/10 ring-[#e11d2e] font-semibold text-[var(--color-ink)] dark:text-white'
                      : 'bg-white/70 ring-black/5 dark:bg-white/5 dark:ring-white/10'
                  }`}
                >
                  <span className="block font-semibold">PIX</span>
                  <span className="mt-0.5 block text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                    Pague agora e envie o comprovante
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('metodoPagamento', 'DINHEIRO')}
                  className={`rounded-[1.25rem] px-4 py-3 text-left text-sm transition ring-1 ${
                    metodoPagamento === 'DINHEIRO'
                      ? 'bg-[#e11d2e]/10 ring-[#e11d2e] font-semibold text-[var(--color-ink)] dark:text-white'
                      : 'bg-white/70 ring-black/5 dark:bg-white/5 dark:ring-white/10'
                  }`}
                >
                  <span className="block font-semibold">Dinheiro</span>
                  <span className="mt-0.5 block text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                    Entregue a Eduardo ou Lavínia
                  </span>
                </button>
              </div>
              <input type="hidden" {...register('metodoPagamento')} />
            </div>

            {error && <p className="text-center text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={loading} className="mt-2 w-full !rounded-full py-3.5 shadow-md shadow-red-900/15">
              <SpiderMark tone="light" className="h-4 w-4" />
              {loading
                ? 'Gerando...'
                : metodoPagamento === 'DINHEIRO'
                  ? 'Confirmar inscrição em dinheiro'
                  : 'Continuar para o PIX'}
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-[var(--color-ink-soft)] dark:text-slate-400">
              Já se inscreveu? Use o mesmo WhatsApp para recuperar seu código, ou fale com Eduardo/Lavínia.
            </p>
          </form>
        )}

        <div className="mt-12 space-y-8">
          <CinemaMapa />
          {!duplicata && <ContatosDuvidas />}
        </div>

        <p className="mt-8 text-center">
          <Link to="/" className="text-xs font-semibold text-[#e11d2e] underline">
            ← Voltar para a página inicial
          </Link>
        </p>
      </section>
    </div>
  );
}
