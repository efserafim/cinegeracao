import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Pencil, Trash2 } from "lucide-react";
import api, { formatDate, formatMoney, mediaUrl, ALERTA_LABELS } from "../../services/api";
import { Button, Input, Loading, StatusBadge, TextArea, ConfirmModal, Modal } from "../../components/ui";

function valorParaInput(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2).replace(".", ",");
}

export default function ComprovantePage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [liberando, setLiberando] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [showConfirmAnim, setShowConfirmAnim] = useState(false);
  const [msg, setMsg] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [emailInfo, setEmailInfo] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrTried, setOcrTried] = useState(false);
  const [conferindoExtrato, setConferindoExtrato] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editPessoas, setEditPessoas] = useState([]);
  const [removerConfirm, setRemoverConfirm] = useState(null);
  const [salvandoCorrecao, setSalvandoCorrecao] = useState(false);

  function syncEditFromItem(data) {
    setEditNome(data?.participante?.nome || "");
    setEditValor(valorParaInput(data?.valor));
    setEditPessoas(
      (data?.pessoas || []).map((p) => ({
        id: p.id,
        nome: p.nome || "",
      }))
    );
  }

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/inscricoes/${id}`);
      setItem(data.data);
      setObs(data.data.observacao || "");
      syncEditFromItem(data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setOcrTried(false);
    load();
  }, [id]);

  const comprovante = item?.pagamento?.comprovante;
  const arquivo = comprovante?.arquivoUrl;
  const isPdf = comprovante?.mimeType === "application/pdf" || String(arquivo || "").toLowerCase().endsWith(".pdf");

  useEffect(() => {
    let revoked;
    setPdfUrl(null);
    if (!arquivo || !isPdf) return void 0;
    (async () => {
      try {
        const res = await fetch(mediaUrl(arquivo));
        if (!res.ok) throw new Error("Falha ao carregar PDF");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        revoked = url;
        setPdfUrl(url);
      } catch {
        setPdfUrl(null);
      }
    })();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [arquivo, isPdf]);

  useEffect(() => {
    if (!item || ocrTried || ocrBusy) return;
    const alerta = item.pagamento?.alerta;
    const temArquivo = item.pagamento?.comprovante?.arquivoUrl;
    if (!temArquivo || alerta !== "OCR_FALHOU") return;
    setOcrTried(true);
    setOcrBusy(true);
    api.post(`/inscricoes/${id}/reprocessar-ocr`).then(({ data }) => {
      setItem(data.data);
      syncEditFromItem(data.data);
      if (data.data?.autoConfirmado) {
        setMsg("Valor do PIX confere — ingresso e e-mail liberados automaticamente.");
        setShowConfirmAnim(true);
        window.setTimeout(() => setShowConfirmAnim(false), 2800);
      } else if (data.data?.pagamento?.alerta !== "OCR_FALHOU") {
        setMsg("OCR reprocessado com sucesso.");
      }
    }).catch(() => {
    }).finally(() => setOcrBusy(false));
  }, [item, id, ocrTried, ocrBusy]);

  async function confirmar() {
    setConfirmando(true);
    try {
      const { data } = await api.post(`/inscricoes/${id}/confirmar`, null, { timeout: 45000 });
      setItem(data.data);
      syncEditFromItem(data.data);
      setWhatsapp(data.data.whatsappLink || "");
      setEmailInfo(data.data.emailResult || null);
      const er = data.data.emailResult;
      const qtd = data.data.quantidade || data.data.ingressos?.length || 1;
      if (er?.sent) {
        setMsg(`Pagamento confirmado. ${qtd} ingresso(s) liberado(s). E-mail enviado para ${er.to}.`);
      } else if (er?.queued) {
        setMsg(`Pagamento confirmado. ${qtd} ingresso(s) liberado(s). E-mail a caminho de ${er.to || "o participante"}.`);
      } else {
        setMsg(
          `Pagamento confirmado. ${qtd} ingresso(s) liberado(s). E-mail não enviado: ${er?.reason || "verifique BREVO_API_KEY no Render"}.`
        );
      }
      setShowConfirmAnim(true);
      window.setTimeout(() => setShowConfirmAnim(false), 2800);
    } catch (err) {
      if (err.code === "ECONNABORTED" || err.message === "Network Error" || !err.response) {
        setMsg("A conexão falhou ao confirmar. Atualize a página — se estiver “Ingresso liberado”, deu certo.");
        try {
          await load();
        } catch {
        }
      } else {
        setMsg(err.response?.data?.message || "Falha ao confirmar pagamento.");
      }
    } finally {
      setConfirmando(false);
    }
  }

  async function liberarFaltantes() {
    setLiberando(true);
    try {
      const { data } = await api.post(`/inscricoes/${id}/liberar-ingressos`);
      setItem(data.data);
      syncEditFromItem(data.data);
      const qtd = data.data.quantidade || data.data.ingressos?.length || 0;
      setMsg(`${qtd} ingresso(s) liberado(s) com sucesso.`);
      setShowConfirmAnim(true);
      window.setTimeout(() => setShowConfirmAnim(false), 2800);
    } catch (err) {
      setMsg(err.response?.data?.message || "Falha ao liberar ingressos faltantes.");
    } finally {
      setLiberando(false);
    }
  }

  async function reenviarEmail() {
    setEnviandoEmail(true);
    setMsg("");
    try {
      const { data } = await api.post(`/inscricoes/${id}/reenviar-email`, null, { timeout: 20000 });
      const er = data.data;
      setEmailInfo(er);
      if (er?.sent) {
        setMsg(`E-mail enviado para ${er.to}.`);
      } else {
        setMsg(`Falha no e-mail: ${er?.reason || data.message || "verifique o SMTP no Render"}`);
      }
    } catch (err) {
      setMsg(err.response?.data?.message || "Falha ao reenviar e-mail.");
    } finally {
      setEnviandoEmail(false);
    }
  }

  async function recusar() {
    const { data } = await api.post(`/inscricoes/${id}/recusar`, { observacao: obs });
    setItem(data.data);
    syncEditFromItem(data.data);
    setMsg("Pagamento recusado.");
  }

  async function cancelar() {
    setConfirmCancel(true);
  }

  async function confirmarCancelamento() {
    setConfirmCancel(false);
    const { data } = await api.post(`/inscricoes/${id}/cancelar`, { observacao: obs });
    setItem(data.data);
    syncEditFromItem(data.data);
    setMsg("Inscrição cancelada.");
  }

  async function salvarObs() {
    const { data } = await api.patch(`/inscricoes/${id}/observacao`, { observacao: obs });
    setItem(data.data);
    syncEditFromItem(data.data);
    setMsg("Observação salva.");
  }

  async function reprocessarOcr() {
    setOcrBusy(true);
    try {
      const { data } = await api.post(`/inscricoes/${id}/reprocessar-ocr`);
      setItem(data.data);
      syncEditFromItem(data.data);
      if (data.data?.autoConfirmado) {
        setMsg("Valor do PIX confere — ingresso e e-mail liberados automaticamente.");
        setShowConfirmAnim(true);
        window.setTimeout(() => setShowConfirmAnim(false), 2800);
      } else {
        setMsg(data.message || "OCR reprocessado.");
      }
    } catch (err) {
      setMsg(err.response?.data?.message || "Falha ao reprocessar OCR.");
    } finally {
      setOcrBusy(false);
    }
  }

  async function conferirExtrato() {
    setConferindoExtrato(true);
    try {
      const { data } = await api.post(`/inscricoes/${id}/conferir-extrato`);
      setItem(data.data);
      syncEditFromItem(data.data);
      setMsg("Conferência no extrato do banco registrada.");
    } catch (err) {
      setMsg(err.response?.data?.message || "Falha ao marcar conferência no extrato.");
    } finally {
      setConferindoExtrato(false);
    }
  }

  async function salvarCorrecao(extra = {}) {
    setSalvandoCorrecao(true);
    setMsg("");
    try {
      const payload = {
        nomeResponsavel: editNome.trim(),
        pessoas: editPessoas.map((p) => ({ id: p.id, nome: p.nome.trim() })),
        ...extra,
      };
      // Em remoção, não manda valor → backend recalcula (unitário × restantes)
      if (!extra.removerPessoaIds) {
        payload.valor = editValor;
      }
      const { data } = await api.patch(`/inscricoes/${id}/corrigir`, payload);
      setItem(data.data);
      syncEditFromItem(data.data);
      setMsg("Inscrição corrigida com sucesso.");
    } catch (err) {
      setMsg(err.response?.data?.message || "Falha ao corrigir inscrição.");
    } finally {
      setSalvandoCorrecao(false);
    }
  }

  async function confirmarRemocaoPessoa() {
    if (!removerConfirm) return;
    const pessoaId = removerConfirm.id;
    setRemoverConfirm(null);
    await salvarCorrecao({ removerPessoaIds: [pessoaId] });
  }

  if (loading) return <Loading />;
  if (!item) return <p>Não encontrado</p>;

  const p = item.pagamento;
  const ingressos = item.ingressos?.length
    ? item.ingressos
    : item.ingresso
      ? [item.ingresso]
      : [];
  const pessoas = item.pessoas || [];
  const pendentes = pessoas.filter((pessoa) => {
    const ingresso =
      pessoa.ingresso ||
      ingressos.find((ig) => ig.pessoaId === pessoa.id || ig.nome === pessoa.nome);
    return !ingresso?.codigo;
  });
  const podeConfirmar = [
    "AGUARDANDO_CONFIRMACAO",
    "COMPROVANTE_ENVIADO",
    "OCR_PROCESSADO",
    "AGUARDANDO_PAGAMENTO",
    "PAGAMENTO_RECUSADO",
  ].includes(item.status);
  const jaLiberado = ["INGRESSO_LIBERADO", "PAGAMENTO_CONFIRMADO"].includes(item.status);
  const precisaConferirExtrato = jaLiberado && p?.metodo !== "DINHEIRO" && !p?.conferidoExtratoEm;
  const podeEditar = item.status !== "CANCELADA";
  const unitario = Number(item.evento?.valor);

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={confirmCancel}
        title="Cancelar inscrição?"
        message="Essa ação marca a inscrição como cancelada."
        confirmLabel="Sim, cancelar"
        danger
        onCancel={() => setConfirmCancel(false)}
        onConfirm={confirmarCancelamento}
      />
      <ConfirmModal
        open={Boolean(removerConfirm)}
        title="Remover pessoa?"
        message={
          removerConfirm
            ? `Remover "${removerConfirm.nome}" desta inscrição?\nA quantidade e o valor serão recalculados (valor unitário × pessoas restantes), a menos que você altere o valor manualmente antes.`
            : ""
        }
        confirmLabel="Remover"
        danger
        busy={salvandoCorrecao}
        onCancel={() => setRemoverConfirm(null)}
        onConfirm={confirmarRemocaoPessoa}
      />
      <Modal open={showConfirmAnim} className="!max-w-sm overflow-hidden bg-[#070a12] text-center text-white !border-[#e11d2e]/40">
        <div className="px-6 py-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-emerald-400/40 animate-confirm-check">
            <Check size={40} className="text-emerald-400" strokeWidth={3} />
          </div>
          <p className="mt-5 font-display text-3xl tracking-wide">Confirmado!</p>
          <p className="mt-2 text-sm text-white/75">
            {(item.quantidade || ingressos.length || 1) > 1
              ? `${item.quantidade || ingressos.length} ingressos liberados`
              : "Ingresso liberado"}
          </p>
          {pessoas.length > 0 && (
            <ul className="mt-4 space-y-1 text-left text-sm text-white/85">
              {pessoas.map((pessoa) => (
                <li key={pessoa.id || pessoa.nome} className="rounded-xl bg-white/5 px-3 py-2">
                  · {pessoa.nome}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/admin/eventos/${item.evento?.id}/inscritos`} className="text-sm text-[var(--color-forest)]">
            ← Voltar
          </Link>
          <h1 className="font-display text-3xl">{item.participante?.nome}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            <span className="text-sm text-[var(--color-ink-soft)]">{item.codigo}</span>
            {p?.liberacaoAutomatica && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                Liberado pelo OCR
              </span>
            )}
            {p?.conferidoExtratoEm && (
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                Extrato conferido
              </span>
            )}
          </div>
        </div>
      </div>

      {msg && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
          {msg}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl">Comprovante</h2>
            {arquivo && (
              <a
                href={mediaUrl(arquivo)}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--color-forest)] underline"
              >
                Abrir em nova aba
              </a>
            )}
          </div>

          {arquivo ? (
            isPdf ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-slate-950 dark:border-white/10">
                {pdfUrl ? (
                  <iframe
                    title="Comprovante PDF"
                    src={`${pdfUrl}#view=FitH`}
                    className="h-[70vh] w-full bg-white"
                  />
                ) : (
                  <p className="p-6 text-sm text-slate-300">Carregando PDF…</p>
                )}
              </div>
            ) : (
              <img
                src={mediaUrl(arquivo)}
                alt="Comprovante"
                className="mt-4 max-h-[70vh] w-full rounded-xl object-contain"
              />
            )
          ) : (
            <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
              {p?.metodo === "DINHEIRO"
                ? "Pagamento em dinheiro — confirme quando receber o valor."
                : "Nenhum comprovante enviado."}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
            <h2 className="font-display text-xl">Dados do participante</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <p>Telefone: {item.participante?.telefone}</p>
              <p>E-mail: {item.participante?.email || "—"}</p>
              <p>Paróquia: {item.participante?.paroquia || "—"}</p>
              <p>Cidade: {item.participante?.cidade}</p>
              <p>
                PIX devolução:{" "}
                <span className="font-medium break-all">
                  {item.participante?.chavePixDevolucao || "—"}
                </span>
              </p>
              <p>
                Valor: {formatMoney(item.valor)}
                {item.quantidade > 1 ? ` (${item.quantidade} ingressos)` : ""}
              </p>
              <p>Pagamento: {p?.metodo === "DINHEIRO" ? "Dinheiro" : "PIX"}</p>
              <p>Evento: {item.evento?.nome}</p>
            </dl>
          </div>

          {podeEditar && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-50/60 p-4 dark:border-amber-400/20 dark:bg-amber-950/20">
              <div className="flex items-center gap-2">
                <Pencil size={16} className="text-amber-700 dark:text-amber-300" />
                <h2 className="font-display text-xl">Corrigir inscrição</h2>
              </div>
              <p className="mt-1 text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                Altere o nome, o valor cobrado ou os nomes das pessoas. Ao remover alguém, a quantidade cai e o valor volta para unitário × restantes
                {Number.isFinite(unitario) ? ` (R$ ${valorParaInput(unitario)} cada)` : ""}, se você não informar outro valor.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Input
                  label="Nome"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                />
                <Input
                  label="Valor total (R$)"
                  value={editValor}
                  onChange={(e) => setEditValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>

              {editPessoas.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
                    Pessoas / ingressos
                  </p>
                  {editPessoas.map((pessoa, idx) => (
                    <div key={pessoa.id} className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[180px] flex-1">
                        <Input
                          label={`Pessoa ${idx + 1}`}
                          value={pessoa.nome}
                          onChange={(e) => {
                            const next = [...editPessoas];
                            next[idx] = { ...next[idx], nome: e.target.value };
                            setEditPessoas(next);
                          }}
                        />
                      </div>
                      {editPessoas.length > 1 && (
                        <Button
                          type="button"
                          variant="danger"
                          className="mb-0.5 inline-flex items-center gap-1"
                          onClick={() => setRemoverConfirm(pessoa)}
                          disabled={salvandoCorrecao}
                        >
                          <Trash2 size={14} /> Remover
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <Button onClick={() => salvarCorrecao()} disabled={salvandoCorrecao}>
                  {salvandoCorrecao ? "Salvando…" : "Salvar correções"}
                </Button>
              </div>
            </div>
          )}

          {pessoas.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl">Ingressos / nomes</h2>
                {pendentes.length > 0 && (
                  <Button onClick={liberarFaltantes} disabled={liberando}>
                    {liberando
                      ? "Liberando…"
                      : `Liberar ${pendentes.length} ingresso${pendentes.length > 1 ? "s" : ""} faltante${pendentes.length > 1 ? "s" : ""}`}
                  </Button>
                )}
              </div>
              {pendentes.length > 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {pendentes.map((pe) => pe.nome).join(", ")} ainda sem QR. Clique em liberar após o deploy.
                </p>
              )}
              <div className="grid gap-3">
                {pessoas.map((pessoa, idx) => {
                  const ingresso =
                    pessoa.ingresso ||
                    ingressos.find((ig) => ig.pessoaId === pessoa.id || ig.nome === pessoa.nome);
                  return (
                    <div
                      key={pessoa.id || `${pessoa.nome}-${idx}`}
                      className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e11d2e]">
                        Ingresso {idx + 1}
                      </p>
                      <p className="mt-1 font-medium text-[var(--color-ink)] dark:text-white">{pessoa.nome}</p>
                      {ingresso?.codigo ? (
                        <Link
                          className="mt-2 inline-block text-sm text-[var(--color-forest)] underline"
                          to={`/ingresso/${item.codigo}`}
                        >
                          {ingresso.codigo}
                        </Link>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--color-ink-soft)]">Aguardando liberação</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl">Resultado do OCR</h2>
              {arquivo && (
                <Button variant="secondary" onClick={reprocessarOcr} disabled={ocrBusy}>
                  {ocrBusy ? "Lendo…" : "Reprocessar OCR"}
                </Button>
              )}
            </div>
            {ocrBusy && (
              <p className="mt-2 text-xs text-[var(--color-ink-soft)]">Processando leitura do comprovante…</p>
            )}
            {p ? (
              <dl className="mt-3 space-y-1 text-sm">
                <p>
                  Alerta: <strong>{ALERTA_LABELS[p.alerta] || p.alerta}</strong>
                </p>
                <p>Valor detectado: {p.valorDetectado != null ? formatMoney(p.valorDetectado) : "—"}</p>
                <p>Data: {p.dataDetectada ? formatDate(p.dataDetectada) : "—"}</p>
                <p>Hora: {p.horaDetectada || "—"}</p>
                <p>Recebedor: {p.nomeRecebedor || "—"}</p>
                <p>Instituição: {p.instituicao || "—"}</p>
                <p>ID/NSU: {p.idTransacao || "—"}</p>
                {p.textoOcr && (
                  <details className="mt-2" open>
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
            {podeConfirmar && (
              <>
                <Button onClick={confirmar} disabled={confirmando}>
                  {confirmando ? "Confirmando…" : "Confirmar pagamento"}
                </Button>
                <Button variant="danger" onClick={recusar}>
                  Recusar
                </Button>
              </>
            )}
            {precisaConferirExtrato && (
              <Button onClick={conferirExtrato} disabled={conferindoExtrato}>
                {conferindoExtrato ? "Salvando…" : "Conferir no extrato do banco"}
              </Button>
            )}
            <Button variant="secondary" onClick={salvarObs}>
              Editar observação
            </Button>
            <Button variant="ghost" onClick={cancelar}>
              Cancelar inscrição
            </Button>
          </div>
          {precisaConferirExtrato && (
            <p className="text-xs text-[var(--color-ink-soft)]">
              Ingresso já liberado{p?.liberacaoAutomatica ? " automaticamente pelo valor do PIX" : ""}.
              Use o botão acima só para registrar que você bateu a inscrição com o extrato da conta.
            </p>
          )}

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

          {(item.status === "INGRESSO_LIBERADO" || item.status === "PAGAMENTO_CONFIRMADO") && (
            <Button variant="secondary" onClick={reenviarEmail} disabled={enviandoEmail}>
              {enviandoEmail ? "Enviando e-mail…" : "Reenviar e-mail do ingresso"}
            </Button>
          )}

          {emailInfo && (
            <p
              className={`text-sm ${
                emailInfo.sent
                  ? "text-emerald-700 dark:text-emerald-300"
                  : emailInfo.queued
                    ? "text-sky-700 dark:text-sky-300"
                    : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {emailInfo.sent
                ? `E-mail enviado automaticamente para ${emailInfo.to}`
                : emailInfo.queued
                  ? `E-mail a caminho de ${emailInfo.to || "o participante"}…`
                  : `E-mail não enviado: ${emailInfo.reason}`}
            </p>
          )}

          {ingressos.length > 0 && (
            <p className="text-sm">
              Ver todos os ingressos:{" "}
              <Link className="text-[var(--color-forest)] underline" to={`/ingresso/${item.codigo}`}>
                abrir página pública
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
