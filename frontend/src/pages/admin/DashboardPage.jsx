import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { formatMoney } from '../../services/api';
import { Loading, StatCard, Button } from '../../components/ui';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/inscricoes/dashboard/global'),
      api.get('/eventos'),
    ])
      .then(([s, e]) => {
        setStats(s.data.data);
        setEventos(e.data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Dashboard</h1>
        <Link to="/admin/eventos/novo"><Button>Novo evento</Button></Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Eventos" value={stats?.eventos ?? 0} />
        <StatCard label="Inscritos" value={stats?.inscritos ?? 0} />
        <StatCard label="Confirmados" value={stats?.confirmadas ?? 0} />
        <StatCard label="Arrecadado" value={formatMoney(stats?.valorArrecadado)} />
      </div>

      <div className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-white/80 dark:divide-white/5 dark:border-white/10 dark:bg-slate-900/70">
        {eventos.length === 0 && (
          <p className="p-4 text-sm text-[var(--color-ink-soft)]">Nenhum evento ainda.</p>
        )}
        {eventos.map((ev) => (
          <div key={ev.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <p className="font-medium">{ev.nome}</p>
              <p className="text-xs text-[var(--color-ink-soft)]">
                {ev.status} · {ev.vagasRestantes}/{ev.vagasMaximas} vagas
              </p>
            </div>
            <Link
              to={`/admin/eventos/${ev.id}/inscritos`}
              className="text-sm font-medium text-[var(--color-forest)] hover:underline"
            >
              Ver inscritos
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
