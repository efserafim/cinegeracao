import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Users, Ban, Trash2 } from "lucide-react";
import api, { formatDate, formatMoney } from "../../services/api";
import { Button, Loading } from "../../components/ui";
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
        {eventos.map((ev) => <div
    key={ev.id}
    className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-slate-900/70"
  >
            <div>
              <h2 className="font-display text-xl">{ev.nome}</h2>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
                {formatDate(ev.data)} · {ev.horario} · {ev.cidade} · {formatMoney(ev.valor)} · {ev.status}
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
          </div>)}
      </div>
    </div>;
}
