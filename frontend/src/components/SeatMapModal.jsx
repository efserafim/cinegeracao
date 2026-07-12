import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Armchair, X } from "lucide-react";
import { Button } from "./ui";

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const COLS = 10;

const OCUPADOS_FIXOS = new Set([
  "A3", "A4", "B1", "B8", "C5", "C6", "D2", "D9",
  "E4", "E5", "E6", "F1", "F10", "G3", "G7", "H5"
]);

export default function SeatMapModal({
  open,
  onClose,
  quantidade = 1,
  selected = [],
  onConfirm
}) {
  const [local, setLocal] = useState(selected);

  useEffect(() => {
    if (open) setLocal(selected.slice(0, quantidade));
  }, [open, selected, quantidade]);

  const ocupados = useMemo(() => OCUPADOS_FIXOS, []);

  function toggle(seat) {
    if (ocupados.has(seat)) return;
    setLocal((prev) => {
      if (prev.includes(seat)) return prev.filter((s) => s !== seat);
      if (prev.length >= quantidade) return [...prev.slice(1), seat];
      return [...prev, seat];
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 animate-confirm-fade sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seat-map-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] bg-[#0b1020] text-white shadow-2xl ring-1 ring-[#e11d2e]/35 animate-confirm-pop"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-[#0b1020]/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f5c542]">CineGeração</p>
            <h2 id="seat-map-title" className="mt-1 font-display text-2xl tracking-wide">
              Escolha seus assentos
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/70 hover:bg-white/10"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-2xl border border-[#f5c542]/35 bg-[#f5c542]/10 px-3 py-3 text-[11px] leading-relaxed text-[#f5c542]">
            <p className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                Este mapa é apenas uma <strong>brincadeira de imersão</strong>.
                Não corresponde ao mapa real do cinema e <strong>o assento escolhido não será reservado</strong>.
                A distribuição real ocorre no dia do evento.
              </span>
            </p>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <div className="mb-4 rounded-full bg-gradient-to-b from-white/25 to-white/5 px-6 py-2 text-center text-[10px] uppercase tracking-[0.25em] text-white/70">
              Tela
            </div>

            <div className="space-y-1.5">
              {ROWS.map((row) => (
                <div key={row} className="flex items-center gap-1.5">
                  <span className="w-4 text-center text-[10px] text-white/40">{row}</span>
                  <div className="grid flex-1 grid-cols-10 gap-1">
                    {Array.from({ length: COLS }, (_, i) => {
                      const seat = `${row}${i + 1}`;
                      const ocupado = ocupados.has(seat);
                      const escolhido = local.includes(seat);
                      return (
                        <button
                          key={seat}
                          type="button"
                          disabled={ocupado}
                          title={ocupado ? "Indisponível (simulado)" : seat}
                          onClick={() => toggle(seat)}
                          className={`aspect-square rounded-md text-[8px] font-semibold transition sm:text-[9px] ${
                            ocupado
                              ? "cursor-not-allowed bg-white/10 text-white/20"
                              : escolhido
                                ? "bg-[#e11d2e] text-white shadow shadow-red-900/40 scale-105"
                                : "bg-[#1a6cff]/35 text-white/80 hover:bg-[#1a6cff]/55"
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[10px] text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[#1a6cff]/35" /> Livre
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[#e11d2e]" /> Seu lugar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-white/10" /> Ocupado
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-white/80">
            Selecione <strong className="text-[#f5c542]">{quantidade}</strong> assento{quantidade > 1 ? "s" : ""}
            {local.length > 0 && (
              <> · Escolhidos: <strong className="text-white">{local.join(", ")}</strong></>
            )}
          </p>

          <div className="flex gap-2 pb-2">
            <Button variant="secondary" className="flex-1 !bg-white/10 !text-white" onClick={onClose}>
              Agora não
            </Button>
            <Button
              className="flex-1"
              disabled={local.length !== quantidade}
              onClick={() => {
                onConfirm?.(local);
                onClose();
              }}
            >
              <Armchair size={16} />
              Confirmar brincadeira
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
