import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Flashlight, FlashlightOff } from "lucide-react";
import api from "../../services/api";
import { Button, Input } from "../../components/ui";

export default function ValidarPage() {
  const [manual, setManual] = useState("");
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef(null);
  const running = useRef(false);

  async function validateCode(codigo) {
    setError("");
    try {
      const { data } = await api.post("/ingressos/validar", { codigo });
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Falha na validação");
      setResult(null);
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

  const tela = result?.tela;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-3xl">Validar entrada</h1>
        <p className="text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
          Leia o QR Code do ingresso ou digite o código.
        </p>
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

      {result && (
        <div
          className={`animate-fade-up rounded-3xl p-8 text-center text-white ${
            tela === "verde" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          <p className="font-display text-3xl">{result.mensagem}</p>
          {result.nome && <p className="mt-4 text-lg">{result.nome}</p>}
          {result.evento && <p className="opacity-90">{result.evento}</p>}
          {result.codigo && <p className="mt-2 text-sm opacity-80">{result.codigo}</p>}
        </div>
      )}
    </div>
  );
}
