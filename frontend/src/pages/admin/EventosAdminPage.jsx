import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Users, Ban, Trash2 } from "lucide-react";
import api, { formatDate, formatMoney } from "../../services/api";
import { Button, Loading } from "../../components/ui";

const STATUS_EVENTO = {
  ABERTO: {
    label: "Online",
    hint: "Inscrições abertas",
    dot: "bg-emerald-500",
    ping: true,
    className: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300"
  },
  ENCERRADO: {
    label: "Encerrado",
    hint: "Não recebe mais inscrições",
    dot: "bg-slate-400",
    ping: false,
    className: "bg-slate-500/15 text-slate-600 ring-slate-500/20 dark:text-slate-300"
  },
  RASCUNHO: {
    label: "Rascunho",
    hint: "Ainda não publicado",
    dot: "bg-amber-400",
    ping: false,
    className: "bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-200"
  },
  CANCELADO: {
    label: "Cancelado",
    hint: "Evento cancelado",
    dot: "bg-red-500",
    ping: false,
    className: "bg-red-500/15 text-red-700 ring-red-500/30 dark:text-red-300"
  }
};

export default function EventosAdminPage() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/eventos");
      setEventos(data.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function encerrar(id) {
    if (!confirm("Encerrar este evento?")) return;
    await api.patch(`/eventos/${id}/encerrar`);
    load();
  }
  async function excluir(id) {
    if (!confirm("Excluir permanentemente este evento e suas inscrições?")) return;
    await api.delete(`/eventos/${id}`);
    load();
  }
  if (loading) return <Loading />;
  return <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Eventos</h1>
        <Link to="/admin/eventos/novo"><Button>Novo evento</Button></Link>
      </div>

      <div className="grid gap-4">
        {eventos.map((ev) => {
          const st = STATUS_EVENTO[ev.status] || STATUS_EVENTO.RASCUNHO;
          return (
          <div
    key={ev.id}
    className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-slate-900/70"
  >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl">{ev.nome}</h2>
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
              </div>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
                {formatDate(ev.data)} · {ev.horario} · {ev.cidade} · {formatMoney(ev.valor)}
              </p>
              <p className="text-sm">Vagas: {ev.vagasRestantes}/{ev.vagasMaximas}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/admin/eventos/${ev.id}/inscritos`}>
                <Button variant="secondary"><Users size={14} /> Inscritos</Button>
              </Link>
              <Link to={`/admin/eventos/${ev.id}/editar`}>
                <Button variant="ghost"><Pencil size={14} /></Button>
              </Link>
              <Button variant="ghost" onClick={() => encerrar(ev.id)}><Ban size={14} /></Button>
              <Button variant="ghost" onClick={() => excluir(ev.id)}><Trash2 size={14} className="text-red-600" /></Button>
            </div>
          </div>
          );
        })}
      </div>
    </div>;
}
