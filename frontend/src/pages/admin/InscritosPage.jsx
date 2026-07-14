import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Search, Trash2 } from "lucide-react";
import api, { formatDate, formatMoney } from "../../services/api";
import { Button, Input, Loading, StatCard, StatusBadge, ConfirmModal } from "../../components/ui";
export default function InscritosPage() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [excluindoId, setExcluindoId] = useState(null);
  const [confirmExcluir, setConfirmExcluir] = useState(null);
  const [filters, setFilters] = useState({ q: "", status: "", cidade: "", telefone: "" });
  async function load() {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v)
      );
      const [list, d] = await Promise.all([
        api.get(`/inscricoes/evento/${id}`, { params }),
        api.get(`/inscricoes/evento/${id}/dashboard`)
      ]);
      setItems(list.data.data || []);
      setDash(d.data.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [id]);
  async function exportFile(formato) {
    const res = await api.get(`/inscricoes/evento/${id}/export/${formato}`, { responseType: "blob" });
    const ext = formato === "excel" ? "xlsx" : formato;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscritos.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function confirmarExclusao() {
    if (!confirmExcluir) return;
    const inscricao = confirmExcluir;
    setConfirmExcluir(null);
    setExcluindoId(inscricao.id);
    try {
      await api.delete(`/inscricoes/${inscricao.id}`);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || err.message || "Falha ao excluir");
    } finally {
      setExcluindoId(null);
    }
  }
  return <div className="space-y-6">
      <ConfirmModal
        open={Boolean(confirmExcluir)}
        title="Excluir inscrição?"
        message={`Excluir a inscrição de ${confirmExcluir?.participante?.nome || "esta pessoa"}?\nEssa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        busy={Boolean(excluindoId)}
        onCancel={() => setConfirmExcluir(null)}
        onConfirm={confirmarExclusao}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Inscritos</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportFile("excel")}><Download size={14} /> Excel</Button>
          <Button variant="secondary" onClick={() => exportFile("csv")}>CSV</Button>
          <Button variant="secondary" onClick={() => exportFile("pdf")}>PDF</Button>
        </div>
      </div>

      {dash && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <StatCard
            label="Pessoas / ingressos"
            value={dash.pessoas ?? dash.vagasOcupadas ?? 0}
            hint="Soma das quantidades"
          />
          <StatCard label="Cadastros" value={dash.inscritos} hint="Responsáveis" />
          <StatCard
            label="Pré-inscritos"
            value={dash.preInscritosPessoas ?? 0}
            hint={`${dash.preInscritos || 0} cadastro(s)`}
          />
          <StatCard
            label="Confirmadas"
            value={dash.confirmadasPessoas ?? dash.confirmadas}
            hint={`${dash.confirmadas || 0} cadastro(s)`}
          />
          <StatCard
            label="Pendentes"
            value={dash.pendentesPessoas ?? dash.pendentes}
            hint={`${dash.pendentes || 0} cadastro(s)`}
          />
          <StatCard label="Cancelados" value={dash.canceladas} />
          <StatCard label="Arrecadado" value={formatMoney(dash.valorArrecadado)} />
          <StatCard
            label="Vagas"
            value={dash.vagasRestantes}
            hint={`${dash.vagasOcupadas ?? 0} de ${dash.vagasMaximas} ocupadas`}
          />
        </div>}

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
            <option value="PRE_INSCRITA">Pré-inscrito(a)</option>
            <option value="AGUARDANDO_PAGAMENTO">Aguardando pagamento</option>
            <option value="AGUARDANDO_CONFIRMACAO">Aguardando confirmação</option>
            <option value="INGRESSO_LIBERADO">Ingresso liberado</option>
            <option value="PAGAMENTO_RECUSADO">Recusado</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </label>
        <Button onClick={load}><Search size={14} /> Pesquisar</Button>
      </div>

      {loading ? <Loading /> : <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white/80 dark:border-white/10 dark:bg-slate-900/70">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs uppercase text-[var(--color-ink-soft)] dark:border-white/10">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Qtd</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Paróquia</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => <tr key={i.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-4 py-3 font-medium">
                    <div>{i.participante?.nome}</div>
                    {i.pessoas?.length > 1 && <p className="mt-1 text-xs font-normal text-[var(--color-ink-soft)]">
                        {i.pessoas.map((p) => p.nome).join(", ")}
                      </p>}
                  </td>
                  <td className="px-4 py-3">{i.quantidade || 1}</td>
                  <td className="px-4 py-3">{i.participante?.telefone}</td>
                  <td className="px-4 py-3">{i.participante?.paroquia}</td>
                  <td className="px-4 py-3">{i.participante?.cidade}</td>
                  <td className="px-4 py-3">{formatDate(i.criadoEm)}</td>
                  <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                  <td className="px-4 py-3">{i.pagamento?.metodo === "DINHEIRO" ? "Dinheiro" : "PIX"}</td>
                  <td className="px-4 py-3">{formatMoney(i.valor)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/admin/inscricoes/${i.id}`} className="text-[var(--color-forest)] hover:underline">
                        {i.pagamento?.metodo === "DINHEIRO" ? "Conferir" : "Ver comprovante"}
                      </Link>
                      <button
    type="button"
    onClick={() => setConfirmExcluir(i)}
    disabled={excluindoId === i.id}
    className="inline-flex items-center gap-1 text-red-600 hover:underline disabled:opacity-50"
    title="Excluir inscrição"
  >
                        <Trash2 size={14} />
                        {excluindoId === i.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
          {items.length === 0 && <p className="p-6 text-center text-sm text-[var(--color-ink-soft)]">Nenhuma inscrição encontrada.</p>}
        </div>}
    </div>;
}
