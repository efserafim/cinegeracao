import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { formatDate, formatMoney, mediaUrl, ALERTA_LABELS } from '../../services/api';
import { Button, Loading, StatusBadge, TextArea } from '../../components/ui';

export default function ComprovantePage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [emailInfo, setEmailInfo] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/inscricoes/${id}`);
      setItem(data.data);
      setObs(data.data.observacao || '');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function confirmar() {
    const { data } = await api.post(`/inscricoes/${id}/confirmar`);
    setItem(data.data);
    setWhatsapp(data.data.whatsappLink || '');
    setEmailInfo(data.data.emailResult || null);
    const er = data.data.emailResult;
    if (er?.sent) {
      setMsg(`Pagamento confirmado. E-mail enviado para ${er.to}.`);
    } else {
      setMsg(`Pagamento confirmado. E-mail não enviado: ${er?.reason || 'verifique o SMTP'}.`);
    }
  }

  async function recusar() {
    const { data } = await api.post(`/inscricoes/${id}/recusar`, { observacao: obs });
    setItem(data.data);
    setMsg('Pagamento recusado.');
  }

  async function cancelar() {
    if (!confirm('Cancelar inscrição?')) return;
    const { data } = await api.post(`/inscricoes/${id}/cancelar`, { observacao: obs });
    setItem(data.data);
    setMsg('Inscrição cancelada.');
  }

  async function salvarObs() {
    const { data } = await api.patch(`/inscricoes/${id}/observacao`, { observacao: obs });
    setItem(data.data);
    setMsg('Observação salva.');
  }

  if (loading) return <Loading />;
  if (!item) return <p>Não encontrado</p>;

  const p = item.pagamento;
  const img = p?.comprovante?.arquivoUrl;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/admin/eventos/${item.evento?.id}/inscritos`} className="text-sm text-[var(--color-forest)]">
            ← Voltar
          </Link>
          <h1 className="font-display text-3xl">{item.participante?.nome}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={item.status} />
            <span className="text-sm text-[var(--color-ink-soft)]">{item.codigo}</span>
          </div>
        </div>
      </div>

      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
          <h2 className="font-display text-xl">Comprovante</h2>
          {img ? (
            p.comprovante.mimeType === 'application/pdf' ? (
              <a href={mediaUrl(img)} target="_blank" rel="noreferrer" className="mt-4 inline-block text-[var(--color-forest)] underline">
                Abrir PDF
              </a>
            ) : (
              <img src={mediaUrl(img)} alt="Comprovante" className="mt-4 max-h-[70vh] w-full rounded-xl object-contain" />
            )
          ) : (
            <p className="mt-4 text-sm text-[var(--color-ink-soft)]">Nenhum comprovante enviado.</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
            <h2 className="font-display text-xl">Dados do participante</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <p>Telefone: {item.participante?.telefone}</p>
              <p>E-mail: {item.participante?.email || '—'}</p>
              <p>Paróquia: {item.participante?.paroquia || '—'}</p>
              <p>Cidade: {item.participante?.cidade}</p>
              <p>Valor: {formatMoney(item.valor)}</p>
              <p>Evento: {item.evento?.nome}</p>
            </dl>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
            <h2 className="font-display text-xl">Resultado do OCR</h2>
            {p ? (
              <dl className="mt-3 space-y-1 text-sm">
                <p>Alerta: <strong>{ALERTA_LABELS[p.alerta] || p.alerta}</strong></p>
                <p>Valor detectado: {p.valorDetectado != null ? formatMoney(p.valorDetectado) : '—'}</p>
                <p>Data: {p.dataDetectada ? formatDate(p.dataDetectada) : '—'}</p>
                <p>Hora: {p.horaDetectada || '—'}</p>
                <p>Recebedor: {p.nomeRecebedor || '—'}</p>
                <p>Instituição: {p.instituicao || '—'}</p>
                <p>ID/NSU: {p.idTransacao || '—'}</p>
                {p.textoOcr && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[var(--color-forest)]">Texto OCR completo</summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/5 p-2 text-xs dark:bg-white/5">
                      {p.textoOcr}
                    </pre>
                  </details>
                )}
              </dl>
            ) : (
              <p className="mt-3 text-sm">Sem pagamento vinculado.</p>
            )}
          </div>

          <TextArea label="Observação" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />

          <div className="flex flex-wrap gap-2">
            <Button onClick={confirmar}>Confirmar pagamento</Button>
            <Button variant="danger" onClick={recusar}>Recusar</Button>
            <Button variant="secondary" onClick={salvarObs}>Editar observação</Button>
            <Button variant="ghost" onClick={cancelar}>Cancelar inscrição</Button>
          </div>

          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Enviar confirmação no WhatsApp
            </a>
          )}

          {emailInfo && (
            <p className={`text-sm ${emailInfo.sent ? 'text-emerald-700' : 'text-amber-700'}`}>
              {emailInfo.sent
                ? `E-mail automático enviado para ${emailInfo.to}`
                : `E-mail automático não enviado: ${emailInfo.reason}`}
            </p>
          )}

          {item.ingresso && (
            <p className="text-sm">
              Ingresso: <Link className="text-[var(--color-forest)] underline" to={`/ingresso/${item.codigo}`}>{item.ingresso.codigo}</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
