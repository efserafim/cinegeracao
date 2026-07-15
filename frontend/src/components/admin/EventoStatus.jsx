import { STATUS_EVENTO } from "./statusEvento";

export { STATUS_EVENTO };

export function EventoStatusBadge({ status }) {
  const st = STATUS_EVENTO[status] || STATUS_EVENTO.RASCUNHO;
  return (
    <span
      title={st.hint}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${st.className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        {st.ping && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${st.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${st.dot}`} />
      </span>
      {st.label}
    </span>
  );
}
