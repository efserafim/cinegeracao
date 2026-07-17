import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Check, Upload, Banknote, User, KeyRound, HandCoins, AlertTriangle } from "lucide-react";
import api, { formatMoney, STATUS_LABELS } from "../services/api";
import { Button, Loading, StatusBadge } from "../components/ui";
import ContatosDuvidas from "../components/ContatosDuvidas";
export default function PagamentoPage() {
  const { codigo } = useParams();
  const [inscricao, setInscricao] = useState(null);
  const [step, setStep] = useState("pix");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    sessionStorage.removeItem(`pix_${codigo}`);
    api.get(`/inscricoes/codigo/${codigo}`).then((res) => {
      const data = res.data.data;
      setInscricao(data);
      const metodo = data.pagamento?.metodo || "PIX";
      if (data.status === "PRE_INSCRITA") {
        setStep("pre");
      } else if (["AGUARDANDO_CONFIRMACAO", "COMPROVANTE_ENVIADO", "OCR_PROCESSADO", "PAGAMENTO_CONFIRMADO", "INGRESSO_LIBERADO"].includes(data.status)) {
        setStep(metodo === "DINHEIRO" && data.status === "AGUARDANDO_CONFIRMACAO" ? "dinheiro" : "done");
      } else if (metodo === "DINHEIRO") {
        setStep("dinheiro");
      } else {
        setStep("pix");
      }
    }).catch((err) => setError(err.response?.data?.message || "Inscrição não encontrada")).finally(() => setLoading(false));
  }, [codigo]);
  const chavePix = inscricao?.evento?.chavePix || "";
  const favorecido = inscricao?.evento?.nomeFavorecido || "";
  const valor = inscricao?.valor;
  const pixCopiaECola = inscricao?.pagamento?.pixPayload || "";
  const qrCodePix = inscricao?.pagamento?.qrCodeDataUrl || "";
  const isDinheiro = inscricao?.pagamento?.metodo === "DINHEIRO";
  const isPre = inscricao?.status === "PRE_INSCRITA";
  async function copyPix() {
    const texto = pixCopiaECola || chavePix;
    if (!texto) return;
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  }
  async function upload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("comprovante", file);
      const { data } = await api.post(`/inscricoes/codigo/${codigo}/comprovante`, form, {
        timeout: 18e4,
        headers: { "Content-Type": "multipart/form-data" }
      });
      setInscricao(data.data);
      setStep("done");
    } catch (err) {
      const msg = err.response?.data?.message || (err.code === "ECONNABORTED" ? "Tempo esgotado. Tente novamente com uma imagem JPG/PNG." : null) || (err.message === "Network Error" ? "Servidor indisponível. Recarregue a página e tente de novo." : null) || "Falha no upload";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }
  if (loading) return <Loading />;
  if (!inscricao) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center text-red-600">{error}</div>;
  }
  return <div className="mx-auto max-w-md px-4 py-8 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f5c542]">CineGeração</p>
          <h1 className="font-display text-3xl leading-none text-[var(--color-ink)] dark:text-white">
            {isPre ? "Pré-inscrição confirmada" : isDinheiro ? "Pagamento em dinheiro" : "Pagamento PIX"}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
            {inscricao.participante?.nome}
            <span className="mx-1.5 opacity-40">·</span>
            <span className="font-mono text-xs">{inscricao.codigo}</span>
            {inscricao.quantidade > 1 && <>
              <span className="mx-1.5 opacity-40">·</span>
              <span>{inscricao.quantidade} ingressos</span>
            </>}
          </p>
          {inscricao.pessoas?.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
              {inscricao.pessoas.map((p) => <li key={p.id || p.nome}>· {p.nome}</li>)}
            </ul>}
        </div>
        <StatusBadge status={inscricao.status} />
      </div>

      {step === "pre" && (
        <div className="mt-6 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1020] text-white shadow-xl">
            <div className="border-b border-white/10 bg-gradient-to-r from-[#e11d2e]/90 to-[#f5c542]/55 px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-widest text-white/80">Sem pagamento por enquanto</p>
              <p className="mt-1 font-display text-3xl">Você está na lista!</p>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-center text-sm leading-relaxed text-white/85">
                Sua pré-inscrição foi registrada. Estamos medindo o interesse para confirmar a promoção
                (R$&nbsp;12 + pipoca + guaravita com mínimo de 100 pessoas).
              </p>

              <div className="rounded-[1.5rem] bg-[#f5c542]/15 px-4 py-5 text-center ring-2 ring-[#f5c542]/70">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f5c542]">
                  Guarde este código
                </p>
                <p className="mt-2 font-mono text-3xl font-black tracking-[0.12em] text-[#f5c542] sm:text-4xl">
                  {inscricao.codigo}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inscricao.codigo);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      /* ignore */
                    }
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f5c542] px-5 py-2.5 text-sm font-bold text-[#0b1020] transition hover:bg-[#ffd56a]"
                >
                  {copied ? <><Check size={16} /> Código copiado</> : <><Copy size={16} /> Copiar código</>}
                </button>
                <p className="mt-3 text-xs font-semibold leading-snug text-[#f5c542]/90">
                  Anote ou tire um print — você vai precisar deste código + e-mail
                </p>
              </div>

              <ul className="space-y-2 rounded-2xl bg-white/5 p-4 text-sm text-white/80">
                <li>· Quando liberarmos a cobrança, use o código + e-mail em Consultar</li>
                <li>· Ou fale no WhatsApp com Eduardo ou Lavínia</li>
              </ul>

              <div className="rounded-[1.35rem] bg-[#f5c542] px-4 py-4 text-center shadow-[0_0_28px_rgba(245,197,66,0.35)] ring-2 ring-white/30">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1a1200]/70">
                  Status da sua inscrição
                </p>
                <p className="mt-1 font-display text-3xl tracking-wide text-[#1a1200] sm:text-4xl">
                  Pré-inscrito(a)
                </p>
              </div>
            </div>
          </div>
          <ContatosDuvidas />
        </div>
      )}

      {step === "dinheiro" && <div className="mt-6 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1020] text-white shadow-xl">
            <div className="border-b border-white/10 bg-gradient-to-r from-[#e11d2e]/90 to-[#f5c542]/50 px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-widest text-white/80">Valor a pagar</p>
              <p className="mt-1 font-display text-4xl">{formatMoney(valor)}</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex justify-center">
                <span className="rounded-full bg-[#f5c542]/20 p-4 text-[#f5c542]">
                  <HandCoins size={28} />
                </span>
              </div>
              <p className="text-center text-sm leading-relaxed text-white/85">
                Você escolheu pagar <strong>em dinheiro</strong>. Entregue o valor para{" "}
                <strong>Eduardo</strong> ou <strong>Lavínia</strong> e aguarde a confirmação no sistema.
              </p>
              <ul className="space-y-2 rounded-2xl bg-white/5 p-4 text-sm text-white/80">
                <li>· Guarde seu código: <span className="font-mono text-[#f5c542]">{inscricao.codigo}</span></li>
                <li>· Após a confirmação, o ingresso é liberado</li>
                <li>· Em dúvida, fale no WhatsApp com a organização</li>
              </ul>
              <p className="text-center text-xs text-white/55">
                Status: {STATUS_LABELS[inscricao.status] || inscricao.status}
              </p>
            </div>
          </div>
          <ContatosDuvidas />
        </div>}

      {step === "pix" && <div className="mt-6 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1020] text-white shadow-xl">
            <div className="border-b border-white/10 bg-gradient-to-r from-[#e11d2e]/90 to-[#1a6cff]/70 px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-widest text-white/80">Valor a pagar</p>
              <p className="mt-1 font-display text-4xl">{formatMoney(valor)}</p>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="mb-2 text-center text-xs text-white/60">1. Escaneie o QR Code no app do seu banco</p>
                {qrCodePix ? (
                  <img
                    src={qrCodePix}
                    alt={`QR Code PIX no valor de ${formatMoney(valor)}`}
                    className="mx-auto w-full max-w-[240px] rounded-2xl bg-white p-3 object-contain"
                  />
                ) : (
                  <p className="text-center text-sm text-white/75">
                    Use o PIX copia e cola abaixo.
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="mb-3 text-center text-xs text-white/60">2. Ou use o PIX copia e cola</p>
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
                {copied ? <><Check size={16} /> PIX copiado</> : <><Copy size={16} /> Copiar PIX copia e cola</>}
              </Button>
              <Button onClick={() => setStep("upload")} className="w-full">
                Já realizei o pagamento
              </Button>
            </div>
          </div>

          <ContatosDuvidas />
        </div>}

      {step === "upload" && <div className="mt-6 space-y-4">
          <div className="space-y-4 rounded-3xl border border-black/5 bg-white/90 p-5 dark:border-white/10 dark:bg-slate-900/80">
            <div>
              <h2 className="font-display text-xl">Enviar comprovante</h2>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
                PNG, JPG ou PDF · até 15 MB.
              </p>
            </div>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-[#e11d2e]/40 bg-[#e11d2e]/5 px-4 py-10 transition hover:bg-[#e11d2e]/10">
              <Upload size={28} className="text-[#e11d2e]" />
              <span className="text-sm font-medium">{file ? file.name : "Toque para selecionar o arquivo"}</span>
              <input
    type="file"
    accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
    className="hidden"
    onChange={(e) => setFile(e.target.files?.[0] || null)}
  />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep("pix")}>Voltar</Button>
              <Button onClick={upload} disabled={!file || uploading} className="flex-1">
                {uploading ? "Enviando..." : "Enviar comprovante"}
              </Button>
            </div>
          </div>
          <ContatosDuvidas />
        </div>}

      {step === "done" && <div className="mt-6 space-y-4">
          <div className="space-y-4 rounded-3xl border border-black/5 bg-white/90 p-5 dark:border-white/10 dark:bg-slate-900/80">
            <h2 className="font-display text-xl">Status da inscrição</h2>
            <p className="text-sm">
              <StatusBadge status={inscricao.status} />
              <span className="ml-2 text-[var(--color-ink-soft)]">{STATUS_LABELS[inscricao.status]}</span>
            </p>
            {["INGRESSO_LIBERADO", "PAGAMENTO_CONFIRMADO"].includes(inscricao.status) ? <>
                <p className="flex items-start gap-2 rounded-2xl bg-[#f5c542]/15 px-3 py-2.5 text-xs leading-relaxed text-[#7a4b00] dark:text-[#f5c542]">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Este comprovante digital <strong>não substitui o ingresso físico</strong> e não autoriza o acesso à sala. A entrada será permitida somente com o ingresso do cinema, no dia do evento, na presença dos organizadores Lavínia e Eduardo.
                  </span>
                </p>
                <Link to={`/ingresso/${inscricao.codigo}`}>
                  <Button className="w-full">
                    {inscricao.quantidade > 1 ? `Ver meus ${inscricao.quantidade} ingressos` : "Ver meu ingresso"}
                  </Button>
                </Link>
              </> : <p className="text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
                {isDinheiro ? "Pagamento em dinheiro registrado. Assim que Eduardo ou Lavínia confirmar, o ingresso é liberado." : "Comprovante recebido. Assim que o organizador confirmar, você recebe o ingresso por e-mail."}
              </p>}
          </div>
          <ContatosDuvidas />
        </div>}
    </div>;
}
