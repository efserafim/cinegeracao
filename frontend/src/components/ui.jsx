import { useEffect } from "react";
import { createPortal } from "react-dom";

export function StatusBadge({ status }) {
  const map = {
    PRE_INSCRITA: "bg-[#f5c542]/25 text-[#7a4b00] dark:bg-[#f5c542]/20 dark:text-[#f5c542]",
    AGUARDANDO_PAGAMENTO: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    COMPROVANTE_ENVIADO: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    OCR_PROCESSADO: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    AGUARDANDO_CONFIRMACAO: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
    PAGAMENTO_CONFIRMADO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    INGRESSO_LIBERADO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    PAGAMENTO_RECUSADO: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    CANCELADA: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
  };
  const labels = {
    PRE_INSCRITA: "Pré-inscrita",
    AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
    COMPROVANTE_ENVIADO: "Comprovante enviado",
    OCR_PROCESSADO: "OCR processado",
    AGUARDANDO_CONFIRMACAO: "Aguardando confirmação",
    PAGAMENTO_CONFIRMADO: "Confirmado",
    INGRESSO_LIBERADO: "Ingresso liberado",
    PAGAMENTO_RECUSADO: "Recusado",
    CANCELADA: "Cancelada"
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${map[status] || map.CANCELADA}`}>
      {labels[status] || status}
    </span>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="animate-fade-up rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)] dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-[var(--color-ink)] dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--color-ink-soft)] dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50";
  const variants = {
    primary:
      "bg-[var(--color-forest)] text-white shadow-sm shadow-red-900/20 hover:bg-[var(--color-forest-deep)]",
    secondary:
      "bg-[var(--color-sand-deep)] text-[var(--color-ink)] hover:bg-[#d8dee9] dark:bg-slate-700 dark:text-white",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-[var(--color-ink-soft)] hover:bg-black/5 dark:hover:bg-white/10",
  };
  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-slate-400">
          {label}
        </span>
      )}
      <input
        className={`w-full rounded-[1.25rem] border border-black/10 bg-white px-4 py-3 text-sm outline-none ring-[var(--color-forest)] transition focus:ring-2 dark:border-white/15 dark:bg-slate-900 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function TextArea({ label, error, className = "", ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-medium text-[var(--color-ink-soft)] dark:text-slate-300">{label}</span>
      )}
      <textarea
        className={`w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none ring-[var(--color-forest)] focus:ring-2 dark:border-white/15 dark:bg-slate-900 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-forest)] border-t-transparent" />
    </div>
  );
}

/** Overlay no viewport (portal) — evita a janela “lá embaixo” no celular. */
export function Modal({ open, onClose, children, className = "", labelledBy }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className={`modal-panel ${className}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} onClose={busy ? undefined : onCancel} labelledBy="cg-confirm-title">
      <div className="space-y-4 p-5 text-left">
        <h3 id="cg-confirm-title" className="font-display text-2xl text-[var(--color-ink)] dark:text-white">
          {title}
        </h3>
        {message && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink-soft)] dark:text-slate-300">
            {message}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} disabled={busy} onClick={onConfirm}>
            {busy ? "Aguarde…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
