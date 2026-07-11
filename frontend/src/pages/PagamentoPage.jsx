import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Copy, Check, Upload, Banknote, User, KeyRound } from 'lucide-react';
import QRCode from 'qrcode';
import api, { formatMoney, STATUS_LABELS } from '../services/api';
import { Button, Loading, StatusBadge } from '../components/ui';
import ContatosDuvidas from '../components/ContatosDuvidas';

export default function PagamentoPage() {
  const { codigo } = useParams();
  const [inscricao, setInscricao] = useState(null);
  const [step, setStep] = useState('pix');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    sessionStorage.removeItem(`pix_${codigo}`);

    api.get(`/inscricoes/codigo/${codigo}`)
      .then((res) => {
        const data = res.data.data;
        setInscricao(data);
        if (['AGUARDANDO_CONFIRMACAO', 'COMPROVANTE_ENVIADO', 'OCR_PROCESSADO', 'PAGAMENTO_CONFIRMADO', 'INGRESSO_LIBERADO'].includes(data.status)) {
          setStep('done');
        }
      })
      .catch((err) => setError(err.response?.data?.message || 'Inscrição não encontrada'))
      .finally(() => setLoading(false));
  }, [codigo]);

  const chavePix = inscricao?.evento?.chavePix || '';
  const favorecido = inscricao?.evento?.nomeFavorecido || '';
  const valor = inscricao?.valor;

  useEffect(() => {
    if (!chavePix) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(chavePix, { margin: 2, width: 280, errorCorrectionLevel: 'M' })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [chavePix]);

  async function copyPix() {
    if (!chavePix) return;
    await navigator.clipboard.writeText(chavePix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('comprovante', file);
      const { data } = await api.post(`/inscricoes/codigo/${codigo}/comprovante`, form, {
        timeout: 180000,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setInscricao(data.data);
      setStep('done');
    } catch (err) {
      const msg =
        err.response?.data?.message
        || (err.code === 'ECONNABORTED' ? 'Tempo esgotado. Tente novamente com uma imagem JPG/PNG.' : null)
        || (err.message === 'Network Error' ? 'Servidor indisponível. Recarregue a página e tente de novo.' : null)
        || 'Falha no upload';
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <Loading />;
  if (!inscricao) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f5c542]">CineGeração</p>
          <h1 className="font-display text-3xl leading-none text-[var(--color-ink)] dark:text-white">Pagamento PIX</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
            {inscricao.participante?.nome}
            <span className="mx-1.5 opacity-40">·</span>
            <span className="font-mono text-xs">{inscricao.codigo}</span>
          </p>
        </div>
        <StatusBadge status={inscricao.status} />
      </div>

      {step === 'pix' && (
        <div className="mt-6 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1020] text-white shadow-xl">
            <div className="border-b border-white/10 bg-gradient-to-r from-[#e11d2e]/90 to-[#1a6cff]/70 px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-widest text-white/80">Valor a pagar</p>
              <p className="mt-1 font-display text-4xl">{formatMoney(valor)}</p>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="mb-2 text-center text-xs text-white/60">1. Escaneie o QR Code no app do seu banco</p>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code PIX"
                    className="mx-auto w-full max-w-[240px] rounded-2xl bg-white p-3"
                  />
                ) : (
                  <div className="mx-auto flex h-48 max-w-[240px] items-center justify-center rounded-2xl bg-white/10 text-sm text-white/50">
                    Gerando QR...
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="mb-3 text-center text-xs text-white/60">2. Ou pague com a chave PIX (celular)</p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <User size={16} className="mt-0.5 shrink-0 text-[#f5c542]" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-white/45">Favorecido</p>
                      <p className="font-medium">{favorecido}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Banknote size={16} className="mt-0.5 shrink-0 text-[#f5c542]" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-white/45">Valor</p>
                      <p className="font-medium">{formatMoney(valor)}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <KeyRound size={16} className="mt-0.5 shrink-0 text-[#f5c542]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-wide text-white/45">Chave PIX</p>
                      <p className="font-mono text-lg tracking-wide text-[#f5c542]">{chavePix}</p>
                    </div>
                  </li>
                </ul>
              </div>

              <Button
                variant="secondary"
                onClick={copyPix}
                className="w-full bg-white text-[#0b1020] hover:bg-white/90"
              >
                {copied ? <><Check size={16} /> Chave copiada</> : <><Copy size={16} /> Copiar chave PIX</>}
              </Button>
              <Button onClick={() => setStep('upload')} className="w-full">
                Já realizei o pagamento
              </Button>
            </div>
          </div>

          <ContatosDuvidas />
        </div>
      )}

      {step === 'upload' && (
        <div className="mt-6 space-y-4">
          <div className="space-y-4 rounded-3xl border border-black/5 bg-white/90 p-5 dark:border-white/10 dark:bg-slate-900/80">
            <div>
              <h2 className="font-display text-xl">Enviar comprovante</h2>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
                PNG, JPG ou PDF · até 15 MB.
              </p>
            </div>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-[#e11d2e]/40 bg-[#e11d2e]/5 px-4 py-10 transition hover:bg-[#e11d2e]/10">
              <Upload size={28} className="text-[#e11d2e]" />
              <span className="text-sm font-medium">{file ? file.name : 'Toque para selecionar o arquivo'}</span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep('pix')}>Voltar</Button>
              <Button onClick={upload} disabled={!file || uploading} className="flex-1">
                {uploading ? 'Enviando...' : 'Enviar comprovante'}
              </Button>
            </div>
          </div>
          <ContatosDuvidas />
        </div>
      )}

      {step === 'done' && (
        <div className="mt-6 space-y-4">
          <div className="space-y-4 rounded-3xl border border-black/5 bg-white/90 p-5 dark:border-white/10 dark:bg-slate-900/80">
            <h2 className="font-display text-xl">Status da inscrição</h2>
            <p className="text-sm">
              <StatusBadge status={inscricao.status} />
              <span className="ml-2 text-[var(--color-ink-soft)]">{STATUS_LABELS[inscricao.status]}</span>
            </p>
            {['INGRESSO_LIBERADO', 'PAGAMENTO_CONFIRMADO'].includes(inscricao.status) ? (
              <Link to={`/ingresso/${inscricao.codigo}`}>
                <Button className="w-full">Ver meu ingresso</Button>
              </Link>
            ) : (
              <p className="text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
                Comprovante recebido. Assim que o organizador confirmar, você recebe o ingresso por e-mail.
              </p>
            )}
          </div>
          <ContatosDuvidas />
        </div>
      )}
    </div>
  );
}
