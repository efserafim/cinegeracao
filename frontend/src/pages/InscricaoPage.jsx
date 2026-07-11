import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { formatDate, formatMoney, mediaUrl } from '../services/api';
import { Button, Input, Loading } from '../components/ui';
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

  useEffect(() => {
    api.get(`/eventos/publicos/${id}`)
      .then((res) => setEvento(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Evento não encontrado'))
      .finally(() => setLoadingEvento(false));
  }, [id]);

  async function onSubmit(values) {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/inscricoes/evento/${id}`, values);
      const codigo = data.data.inscricao.codigo;
      navigate(`/inscricao/${codigo}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar inscrição');
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
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-[#070a12]">
        <img
          src={bannerSrc}
          alt=""
          className="mx-auto h-44 w-auto max-w-full object-contain sm:h-52"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="" className="h-12 w-12 rounded-full ring-2 ring-[#f5c542]" />
            <div>
              <p className="font-display text-lg text-white">Formulário</p>
              <p className="text-[10px] uppercase tracking-widest text-[#f5c542]">CineGeração</p>
            </div>
          </div>
        </div>
      </div>

      <h1 className="font-display text-2xl leading-none text-[var(--color-ink)] dark:text-white">{evento.nome}</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
        {formatDate(evento.data)} · {evento.horario} · {evento.local}
        <br />
        <strong className="text-[#e11d2e]">{formatMoney(evento.valor)}</strong>
        {' · '}
        {evento.vagasRestantes} vagas
      </p>

      {esgotado ? (
        <p className="mt-8 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Vagas esgotadas para este evento.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            label="Nome completo"
            {...register('nome', { required: 'Obrigatório' })}
            error={errors.nome?.message}
          />
          <Input
            label="Telefone (WhatsApp)"
            placeholder="11999999999"
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

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Gerando...' : 'Continuar para o PIX'}
          </Button>
        </form>
      )}

      <div className="mt-8 space-y-4">
        <CinemaMapa />
        <ContatosDuvidas />
      </div>
    </div>
  );
}
