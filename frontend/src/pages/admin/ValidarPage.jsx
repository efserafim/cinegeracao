import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../../services/api";
import { Button, Input } from "../../components/ui";
export default function ValidarPage() {
  const [manual, setManual] = useState("");
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
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
  async function startScan() {
    setError("");
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
        () => {
        }
      );
    } catch (err) {
      setError("Não foi possível acessar a câmera. Use o código manual.");
      setScanning(false);
    }
  }
  async function stopScan() {
    setScanning(false);
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
      }
      scannerRef.current = null;
    }
  }
  useEffect(() => () => {
    stopScan();
  }, []);
  const tela = result?.tela;
  return <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-3xl">Validar entrada</h1>
        <p className="text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
          Leia o QR Code do ingresso ou digite o código.
        </p>
      </div>

      <div id="qr-reader" className="overflow-hidden rounded-2xl" />

      <div className="flex gap-2">
        {!scanning ? <Button onClick={startScan} className="flex-1">Abrir câmera</Button> : <Button variant="secondary" onClick={stopScan} className="flex-1">Parar câmera</Button>}
      </div>

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

      {result && <div
    className={`animate-fade-up rounded-3xl p-8 text-center text-white ${tela === "verde" ? "bg-emerald-600" : "bg-red-600"}`}
  >
          <p className="font-display text-3xl">{result.mensagem}</p>
          {result.nome && <p className="mt-4 text-lg">{result.nome}</p>}
          {result.evento && <p className="opacity-90">{result.evento}</p>}
          {result.codigo && <p className="mt-2 text-sm opacity-80">{result.codigo}</p>}
        </div>}
    </div>;
}
