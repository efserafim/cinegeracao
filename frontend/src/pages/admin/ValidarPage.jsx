import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Flashlight, FlashlightOff } from "lucide-react";
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

function resultadoLabel(resultado) {
  if (resultado === "AUTORIZADO") return "Autorizado";
  if (resultado === "JA_UTILIZADO") return "Já utilizado";
  if (resultado === "CANCELADO") return "Cancelado";
  if (resultado === "INVALIDO") return "Inválido";
  return resultado || "—";
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

  useEffect(() => {
    if (!aparelho && admin?.aparelhoNome) {
      setAparelho(admin.aparelhoNome);
    }
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
      if (row.resultado === "AUTORIZADO") {
        setObservacao("");
      }
      await loadHistorico(1);
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">
          {isLeitor ? "Leitor de entrada" : "Validar entrada"}
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
          {isAdminFull
            ? "Leia o QR, confira o histórico de todos os aparelhos e veja quem leu cada ingresso."
            : "Leia o QR Code do ingresso. As leituras ficam no histórico desta conta."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Nome do aparelho"
          placeholder="Ex.: Celular portaria 1"
          value={aparelho}
          onChange={(e) => setAparelho(e.target.value)}
        />
        <div className="sm:col-span-2">
          <TextArea
            label="Observação (opcional)"
            rows={2}
            placeholder="Anota algo sobre esta leitura, se precisar"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>
      </div>

      <div id="qr-reader" className="overflow-hidden rounded-2xl" />

      <div className="flex flex-wrap gap-2">
        {!scanning ? (
          <Button onClick={startScan} className="flex-1">
            Abrir câmera
          </Button>
        ) : (
          <Button variant="secondary" onClick={stopScan} className="flex-1">
            Parar câmera
          </Button>
        )}
        {scanning && torchSupported && (
          <Button
            variant={torchOn ? "primary" : "secondary"}
            onClick={() => setTorch(!torchOn)}
            aria-pressed={torchOn}
            title={torchOn ? "Desligar flash" : "Ligar flash"}
            className="inline-flex items-center gap-2"
          >
            {torchOn ? <FlashlightOff size={16} /> : <Flashlight size={16} />}
            {torchOn ? "Flash ligado" : "Flash"}
          </Button>
        )}
      </div>

      {scanning && !torchSupported && (
        <p className="text-xs text-[var(--color-ink-soft)] dark:text-slate-500">
          Flash indisponível neste aparelho ou navegador (comum em desktop/iOS).
        </p>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="TKT-XXXXXXXXXX"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          className="flex-1"
        />
        <Button onClick={() => validateCode(manual)}>Validar</Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {ultimo && (
        <div
          className={`animate-fade-up rounded-3xl p-6 text-white ${
            tela === "verde" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            Último lido
          </p>
          <p className="mt-1 font-display text-3xl">{ultimo.mensagem}</p>
          {ultimo.nome && <p className="mt-3 text-lg">{ultimo.nome}</p>}
          {ultimo.evento && <p className="opacity-90">{ultimo.evento}</p>}
          {ultimo.codigo && <p className="mt-1 text-sm opacity-80">{ultimo.codigo}</p>}
          <div className="mt-4 space-y-1 text-sm text-white/90">
            <p>Data/hora: {formatLidoEm(ultimo.lidoEm)}</p>
            <p>Aparelho: {ultimo.aparelho || aparelho || "—"}</p>
            {isAdminFull && <p>Leitor: {ultimo.leitor || admin?.nome || "—"}</p>}
            {ultimo.observacao && <p>Obs.: {ultimo.observacao}</p>}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">Histórico de leituras</h2>
          <p className="text-xs text-[var(--color-ink-soft)]">
            {histMeta.total} registro{histMeta.total === 1 ? "" : "s"}
          </p>
        </div>

        {histLoading ? (
          <Loading />
        ) : historico.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-ink-soft)]">Nenhuma leitura ainda.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {historico.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border px-3 py-3 text-sm ${
                  item.resultado === "AUTORIZADO"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-black/5 dark:border-white/10"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--color-ink)] dark:text-white">{item.nome}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      {item.evento} · {item.codigo}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      item.resultado === "AUTORIZADO"
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600/90 text-white"
                    }`}
                  >
                    {resultadoLabel(item.resultado)}
                  </span>
                </div>
                <div className="mt-2 grid gap-0.5 text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                  <p>Data/hora: {formatLidoEm(item.lidoEm)}</p>
                  <p>Aparelho: {item.aparelho || "—"}</p>
                  {isAdminFull && <p>Conta: {item.leitor || "—"}</p>}
                  {item.observacao ? <p>Obs.: {item.observacao}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {histMeta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-2">
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
      </div>
    </div>
  );
}
