import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Ticket } from 'lucide-react';
import api, { formatDate, formatMoney, mediaUrl, STATUS_LABELS } from '../services/api';
import { Button, Input, Loading, StatusBadge } from '../components/ui';
import { logoImg, posterImg } from '../assets/brand';
import ContatosDuvidas from '../components/ContatosDuvidas';
import CinemaMapa from '../components/CinemaMapa';

export default function InscricaoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
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
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-red-600">{error || 'Evento não encontrado'}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-[#e11d2e] underline">Voltar</Link>
      </div>
    );
  }

  const esgotado = evento.vagasRestantes <= 0;
  const bannerSrc = mediaUrl(evento.bannerUrl) || posterImg;

  return (
    <div className="mx-auto max-w-md px-4 py-8 animate-fade-up">
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-[#070a12] shadow-[0_16px_40px_rgba(7,10,18,0.28)] ring-1 ring-black/10">
        <img
          src={bannerSrc}
          alt=""
          className="mx-auto h-48 w-auto max-w-full object-contain sm:h-56"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-4 pt-14">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="" className="h-12 w-12 rounded-full ring-2 ring-[#f5c542]/90" />
            <div>
              <p className="font-display text-lg text-white">Inscrição</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#f5c542]">CineGeração</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/85">
        <h1 className="font-display text-2xl leading-none text-[var(--color-ink)] dark:text-white">{evento.nome}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)] dark:text-slate-400">
          {formatDate(evento.data)} · {evento.horario}
          <br />
          {evento.local}
          <br />
          <strong className="text-[#e11d2e]">{formatMoney(evento.valor)}</strong>
          {' · '}
          {evento.vagasRestantes} vagas
        </p>

        {esgotado ? (
          <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Vagas esgotadas para este evento.
          </p>
        ) : duplicata ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[#f5c542]/40 bg-[#f5c542]/10 p-4">
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
              <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-center dark:bg-slate-950/50">
                <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-soft)]">Seu código</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-[#e11d2e]">{duplicata.codigo}</p>
                {duplicata.status && (
                  <p className="mt-2 flex items-center justify-center gap-2 text-xs">
                    <StatusBadge status={duplicata.status} />
                    <span className="text-[var(--color-ink-soft)]">{STATUS_LABELS[duplicata.status]}</span>
                  </p>
                )}
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() => navigate(`/inscricao/${duplicata.codigo}`)}
              >
                Continuar com este código
              </Button>
              <button
                type="button"
                className="mt-2 w-full text-center text-xs text-[var(--color-ink-soft)] underline"
                onClick={() => setDuplicata(null)}
              >
                Tentar com outro WhatsApp
              </button>
            </div>
            <ContatosDuvidas />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Input
              label="Nome completo"
              {...register('nome', { required: 'Obrigatório' })}
              error={errors.nome?.message}
            />
            <Input
              label="WhatsApp (com DDD)"
              placeholder="22999999999"
              {...register('telefone', { required: 'Obrigatório' })}
              error={errors.telefone?.message}
            />
            <Input
              label="E-mail"
              type="email"
              {...register('email', {
                required: 'Obrigatório para receber a confirmação',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido' },
              })}
              error={errors.email?.message}
            />
            <Input
              label="De qual Paróquia você é?"
              {...register('paroquia', { required: 'Obrigatório' })}
              error={errors.paroquia?.message}
            />
            <Input
              label="Cidade"
              {...register('cidade', { required: 'Obrigatório' })}
              error={errors.cidade?.message}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full shadow-md shadow-red-900/15">
              {loading ? 'Gerando...' : 'Continuar para o PIX'}
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-[var(--color-ink-soft)]">
              Já se inscreveu? Use o mesmo WhatsApp para recuperar seu código, ou fale com Eduardo/Lavínia.
            </p>
          </form>
        )}
      </div>

      <div className="mt-8 space-y-4">
        <CinemaMapa />
        {!duplicata && <ContatosDuvidas />}
      </div>
    </div>
  );
}
