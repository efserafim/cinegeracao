import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  History,
  Keyboard,
  Settings2,
  Smartphone,
  XCircle,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Button, Input, Loading, TextArea } from "../../components/ui";

const APARELHO_KEY = "cg_aparelho_nome";

function formatLidoEm(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatHora(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function resultadoLabel(resultado) {
  if (resultado === "AUTORIZADO") return "Autorizado";
  if (resultado === "JA_UTILIZADO") return "Já utilizado";
  if (resultado === "CANCELADO") return "Cancelado";
  if (resultado === "INVALIDO") return "Inválido";
  return resultado || "—";
}

function isMesmoDia(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function ValidarPage() {
  const { admin, isAdminFull, isLeitor } = useAuth();
  const [manual, setManual] = useState("");
  const [aparelho, setAparelho] = useState(() => {
    try {
      return localStorage.getItem(APARELHO_KEY) || admin?.aparelhoNome || "";
    } catch {
      return admin?.aparelhoNome || "";
    }
  });
  const [observacao, setObservacao] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [ultimo, setUltimo] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [histMeta, setHistMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [histLoading, setHistLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef(null);
  const running = useRef(false);
  const resultRef = useRef(null);

  useEffect(() => {
    if (!aparelho && admin?.aparelhoNome) setAparelho(admin.aparelhoNome);
  }, [admin?.aparelhoNome, aparelho]);

  useEffect(() => {
    try {
      if (aparelho) localStorage.setItem(APARELHO_KEY, aparelho);
    } catch {
      /* ignore */
    }
  }, [aparelho]);

  const loadHistorico = useCallback(async (page = 1) => {
    setHistLoading(true);
    try {
      const { data } = await api.get("/ingressos/validacoes", {
        params: { page, limit: 20 },
      });
      const payload = data.data || {};
      setHistorico(payload.items || []);
      setHistMeta({
        page: payload.page || 1,
        totalPages: payload.totalPages || 1,
        total: payload.total || 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Falha ao carregar histórico");
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistorico(1);
  }, [loadHistorico]);

  const stats = useMemo(() => {
    const hoje = historico.filter((i) => isMesmoDia(i.lidoEm));
    const autorizadosHoje = hoje.filter((i) => i.resultado === "AUTORIZADO").length;
    const bloqueadosHoje = hoje.filter((i) => i.resultado !== "AUTORIZADO").length;
    return {
      total: histMeta.total,
      hoje: hoje.length,
      autorizadosHoje,
      bloqueadosHoje,
    };
  }, [historico, histMeta.total]);

  async function validateCode(codigo) {
    setError("");
    try {
      const { data } = await api.post("/ingressos/validar", {
        codigo,
        aparelho: aparelho.trim() || undefined,
        observacao: observacao.trim() || undefined,
      });
      const row = {
        ...data.data,
        leitor: data.data.leitor || admin?.nome || "—",
      };
      setUltimo(row);
      if (row.resultado === "AUTORIZADO") setObservacao("");
      await loadHistorico(1);
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 80);
    } catch (err) {
      setError(err.response?.data?.message || "Falha na validação");
      setUltimo(null);
    }
  }

  function detectTorchSupport() {
    try {
      const caps = scannerRef.current?.getRunningTrackCameraCapabilities?.();
      const torch = caps?.torchFeature?.();
      return Boolean(torch?.isSupported?.());
    } catch {
      return false;
    }
  }

  async function setTorch(enabled) {
    if (!scannerRef.current) return;
    try {
      const caps = scannerRef.current.getRunningTrackCameraCapabilities();
      const torch = caps.torchFeature();
      if (!torch.isSupported()) {
        setTorchSupported(false);
        setError("Este aparelho não permite ligar o flash pela câmera.");
        return;
      }
      await torch.apply(enabled);
      setTorchOn(enabled);
    } catch {
      try {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: enabled }],
        });
        setTorchOn(enabled);
      } catch {
        setError("Não foi possível alterar o flash neste dispositivo.");
        setTorchSupported(false);
      }
    }
  }

  async function startScan() {
    setError("");
    setTorchOn(false);
    setTorchSupported(false);
    setScanning(true);
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    running.current = true;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        async (decoded) => {
          if (!running.current) return;
          running.current = false;
          await stopScan();
          await validateCode(decoded);
        },
        () => {}
      );
      setTorchSupported(detectTorchSupport());
    } catch {
      setError("Não foi possível acessar a câmera. Use o código manual.");
      setScanning(false);
      scannerRef.current = null;
    }
  }

  async function stopScan() {
    setScanning(false);
    setTorchOn(false);
    setTorchSupported(false);
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
  }

  useEffect(
    () => () => {
      stopScan();
    },
    []
  );

  const tela = ultimo?.tela;
  const ok = tela === "verde";

  return (
    <div className={`mx-auto space-y-5 ${isLeitor ? "max-w-5xl" : "max-w-3xl"}`}>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">
            {isLeitor ? "Entrada · Leitor QR" : "Validar entrada"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
            {isAdminFull
              ? "Leia o QR e acompanhe o histórico de todos os aparelhos."
              : "Aponte a câmera para o ingresso. O resultado aparece na hora."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs font-medium dark:border-white/15 dark:bg-slate-900/70">
            <Smartphone size={14} className="text-[#e11d2e]" />
            {aparelho.trim() || "Aparelho sem nome"}
          </span>
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/15 dark:bg-slate-900/70 dark:hover:bg-white/10"
          >
            <Settings2 size={14} />
            {showConfig ? "Fechar" : "Configurar"}
          </button>
        </div>
      </div>

      {/* Resumo rápido — foco do leitor */}
      {isLeitor && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="Hoje" value={stats.hoje} />
          <StatPill label="Autorizados" value={stats.autorizadosHoje} tone="ok" />
          <StatPill label="Bloqueados" value={stats.bloqueadosHoje} tone="bad" />
          <StatPill label="Total" value={stats.total} />
        </div>
      )}

      {/* Configuração recolhível */}
      {showConfig && (
        <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
            Configuração deste aparelho
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Nome do aparelho"
              placeholder="Ex.: Celular portaria 1"
              value={aparelho}
              onChange={(e) => setAparelho(e.target.value)}
            />
            <div className="sm:col-span-2">
              <TextArea
                label="Observação (opcional — vai junto na próxima leitura)"
                rows={2}
                placeholder="Ex.: entrada lateral, acompanhante, etc."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Área principal: scanner + último */}
      <div className={`grid gap-4 ${isLeitor ? "lg:grid-cols-2" : ""}`}>
        <section className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
          <div className="mb-3 flex items-center gap-2">
            <Camera size={16} className="text-[#e11d2e]" />
            <h2 className="font-display text-xl">Escanear</h2>
          </div>

          <div
            id="qr-reader"
            className={`overflow-hidden rounded-xl bg-black/5 dark:bg-black/40 ${
              scanning ? "min-h-[220px]" : "min-h-[72px]"
            }`}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {!scanning ? (
              <Button onClick={startScan} className="min-w-[140px] flex-1">
                <Camera size={16} /> Abrir câmera
              </Button>
            ) : (
              <Button variant="secondary" onClick={stopScan} className="min-w-[140px] flex-1">
                Parar câmera
              </Button>
            )}
            {scanning && torchSupported && (
              <Button
                variant={torchOn ? "primary" : "secondary"}
                onClick={() => setTorch(!torchOn)}
                aria-pressed={torchOn}
                className="inline-flex items-center gap-2"
              >
                {torchOn ? <FlashlightOff size={16} /> : <Flashlight size={16} />}
                Flash
              </Button>
            )}
          </div>

          {scanning && !torchSupported && (
            <p className="mt-2 text-xs text-[var(--color-ink-soft)] dark:text-slate-500">
              Flash indisponível neste aparelho/navegador.
            </p>
          )}

          <div className="mt-4 border-t border-black/5 pt-4 dark:border-white/10">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
              <Keyboard size={12} /> Código manual
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="TKT-XXXXXXXXXX"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") validateCode(manual);
                }}
              />
              <Button onClick={() => validateCode(manual)}>Validar</Button>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>

        <section ref={resultRef} className={isLeitor ? "" : "contents"}>
          {ultimo ? (
            <div
              className={`animate-fade-up flex h-full flex-col justify-center rounded-2xl p-6 text-white ${
                ok ? "bg-emerald-600" : "bg-red-600"
              }`}
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                Último lido · {formatHora(ultimo.lidoEm)}
              </div>
              <p className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{ultimo.mensagem}</p>
              {ultimo.nome && <p className="mt-4 text-xl font-medium">{ultimo.nome}</p>}
              {ultimo.evento && <p className="mt-1 text-sm text-white/85">{ultimo.evento}</p>}
              {ultimo.codigo && (
                <p className="mt-1 font-mono text-sm text-white/75">{ultimo.codigo}</p>
              )}
              <div className="mt-5 space-y-1 border-t border-white/20 pt-4 text-sm text-white/90">
                <p>Data: {formatLidoEm(ultimo.lidoEm)}</p>
                <p>Aparelho: {ultimo.aparelho || aparelho || "—"}</p>
                {isAdminFull && <p>Leitor: {ultimo.leitor || admin?.nome || "—"}</p>}
                {ultimo.observacao && <p>Obs.: {ultimo.observacao}</p>}
              </div>
            </div>
          ) : (
            isLeitor && (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white/40 px-6 text-center dark:border-white/20 dark:bg-slate-900/40">
                <CheckCircle2 size={36} className="text-[var(--color-ink-soft)] opacity-40" />
                <p className="mt-3 font-display text-xl text-[var(--color-ink-soft)]">
                  Aguardando leitura
                </p>
                <p className="mt-1 max-w-xs text-sm text-[var(--color-ink-soft)] dark:text-slate-500">
                  Abra a câmera ou digite o código. O resultado da pessoa aparece aqui.
                </p>
              </div>
            )
          )}
        </section>
      </div>

      {/* Histórico */}
      <section className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#e11d2e]" />
            <h2 className="font-display text-xl">Histórico</h2>
          </div>
          <p className="text-xs text-[var(--color-ink-soft)]">
            {histMeta.total} registro{histMeta.total === 1 ? "" : "s"}
            {isAdminFull ? " · todos os aparelhos" : " · deste leitor"}
          </p>
        </div>

        {histLoading ? (
          <Loading />
        ) : historico.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-ink-soft)]">Nenhuma leitura ainda.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5 dark:divide-white/10">
            {historico.map((item) => {
              const okItem = item.resultado === "AUTORIZADO";
              return (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--color-ink)] dark:text-white">{item.nome}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          okItem ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                        }`}
                      >
                        {resultadoLabel(item.resultado)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-ink-soft)]">
                      {item.evento} · {item.codigo}
                    </p>
                    {item.observacao ? (
                      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">Obs.: {item.observacao}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                    <p className="font-medium text-[var(--color-ink)] dark:text-slate-200">
                      {formatHora(item.lidoEm)}
                    </p>
                    <p>{formatLidoEm(item.lidoEm).split(",")[0]}</p>
                    <p className="mt-1">{item.aparelho || "—"}</p>
                    {isAdminFull && <p>{item.leitor || "—"}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {histMeta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/10">
            <Button
              variant="secondary"
              disabled={histMeta.page <= 1 || histLoading}
              onClick={() => loadHistorico(histMeta.page - 1)}
            >
              Anterior
            </Button>
            <span className="text-xs text-[var(--color-ink-soft)]">
              Página {histMeta.page} de {histMeta.totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={histMeta.page >= histMeta.totalPages || histLoading}
              onClick={() => loadHistorico(histMeta.page + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function StatPill({ label, value, tone }) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
      : tone === "bad"
        ? "border-red-500/25 bg-red-500/10 text-red-800 dark:text-red-200"
        : "border-black/5 bg-white/80 dark:border-white/10 dark:bg-slate-900/70";
  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-1 font-display text-2xl leading-none">{value}</p>
    </div>
  );
}
