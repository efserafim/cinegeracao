import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Search } from 'lucide-react';
import api, { formatDate, formatMoney } from '../../services/api';
import { Button, Input, Loading, StatCard, StatusBadge } from '../../components/ui';

export default function InscritosPage() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', status: '', cidade: '', telefone: '' });

  async function load() {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v),
      );
      const [list, d] = await Promise.all([
        api.get(`/inscricoes/evento/${id}`, { params }),
        api.get(`/inscricoes/evento/${id}/dashboard`),
      ]);
      setItems(list.data.data || []);
      setDash(d.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function exportFile(formato) {
    const res = await api.get(`/inscricoes/evento/${id}/export/${formato}`, { responseType: 'blob' });
    const ext = formato === 'excel' ? 'xlsx' : formato;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscritos.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Inscritos</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportFile('excel')}><Download size={14} /> Excel</Button>
          <Button variant="secondary" onClick={() => exportFile('csv')}>CSV</Button>
          <Button variant="secondary" onClick={() => exportFile('pdf')}>PDF</Button>
        </div>
      </div>

      {dash && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Inscritos" value={dash.inscritos} />
          <StatCard label="Confirmadas" value={dash.confirmadas} />
          <StatCard label="Pendentes" value={dash.pendentes} />
          <StatCard label="Cancelados" value={dash.canceladas} />
          <StatCard label="Arrecadado" value={formatMoney(dash.valorArrecadado)} />
          <StatCard label="Vagas" value={dash.vagasRestantes} hint={`de ${dash.vagasMaximas}`} />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
        <div className="min-w-[160px] flex-1">
          <Input label="Nome" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        </div>
        <div className="min-w-[140px]">
          <Input label="Telefone" value={filters.telefone} onChange={(e) => setFilters({ ...filters, telefone: e.target.value })} />
        </div>
        <div className="min-w-[140px]">
          <Input label="Cidade" value={filters.cidade} onChange={(e) => setFilters({ ...filters, cidade: e.target.value })} />
        </div>
        <label className="block min-w-[180px] space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-soft)]">Status</span>
          <select
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-slate-900"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="AGUARDANDO_PAGAMENTO">Aguardando pagamento</option>
            <option value="AGUARDANDO_CONFIRMACAO">Aguardando confirmação</option>
            <option value="INGRESSO_LIBERADO">Ingresso liberado</option>
            <option value="PAGAMENTO_RECUSADO">Recusado</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </label>
        <Button onClick={load}><Search size={14} /> Pesquisar</Button>
      </div>

      {loading ? <Loading /> : (
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white/80 dark:border-white/10 dark:bg-slate-900/70">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs uppercase text-[var(--color-ink-soft)] dark:border-white/10">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Paróquia</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-4 py-3 font-medium">{i.participante?.nome}</td>
                  <td className="px-4 py-3">{i.participante?.telefone}</td>
                  <td className="px-4 py-3">{i.participante?.paroquia}</td>
                  <td className="px-4 py-3">{i.participante?.cidade}</td>
                  <td className="px-4 py-3">{formatDate(i.criadoEm)}</td>
                  <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                  <td className="px-4 py-3">{formatMoney(i.valor)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/inscricoes/${i.id}`} className="text-[var(--color-forest)] hover:underline">
                      Ver comprovante
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="p-6 text-center text-sm text-[var(--color-ink-soft)]">Nenhuma inscrição encontrada.</p>
          )}
        </div>
      )}
    </div>
  );
}
