import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Search, Trash2 } from "lucide-react";
import api, { formatDate, formatMoney } from "../../services/api";
import { Button, Input, Loading, StatCard, StatusBadge, ConfirmModal } from "../../components/ui";

const PAGE_SIZE = 15;

function formatPhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw || "—";
}

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

export default function InscritosPage() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [excluindoId, setExcluindoId] = useState(null);
  const [confirmExcluir, setConfirmExcluir] = useState(null);
  const [page, setPage] = useState(1);
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
      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const totaisLista = useMemo(() => {
    const ativos = items.filter((i) => i.status !== "CANCELADA");
    const pre = items.filter((i) => i.status === "PRE_INSCRITA");
    const confirmadas = items.filter((i) =>
      ["PAGAMENTO_CONFIRMADO", "INGRESSO_LIBERADO"].includes(i.status)
    );
    const pendentes = items.filter((i) =>
      [
        "AGUARDANDO_PAGAMENTO",
        "COMPROVANTE_ENVIADO",
        "OCR_PROCESSADO",
        "AGUARDANDO_CONFIRMACAO",
        "PAGAMENTO_RECUSADO",
      ].includes(i.status)
    );
    const sumQtd = (arr) => arr.reduce((s, i) => s + (Number(i.quantidade) || 1), 0);
    return {
      pessoas: sumQtd(ativos),
      cadastros: items.length,
      preInscritos: pre.length,
      preInscritosPessoas: sumQtd(pre),
      confirmadas: confirmadas.length,
      confirmadasPessoas: sumQtd(confirmadas),
      pendentes: pendentes.length,
      pendentesPessoas: sumQtd(pendentes),
      canceladas: items.filter((i) => i.status === "CANCELADA").length,
    };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, currentPage]);
  const pageNumbers = useMemo(
    () => buildPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );
  const rangeStart = items.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, items.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function exportFile(formato) {
    const res = await api.get(`/inscricoes/evento/${id}/export/${formato}`, { responseType: "blob" });
    const ext = formato === "excel" ? "xlsx" : formato;
    const disposition = res.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || `inscritos.${ext}`;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
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

  function goToPage(next) {
    const target = Math.max(1, Math.min(totalPages, next));
    setPage(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
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
          <Button variant="secondary" onClick={() => exportFile("excel")}>
            <Download size={14} /> Excel
          </Button>
          <Button variant="secondary" onClick={() => exportFile("csv")}>
            CSV
          </Button>
          <Button variant="secondary" onClick={() => exportFile("pdf")}>
            PDF
          </Button>
        </div>
      </div>

      {(dash || items.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <StatCard
            label="Pessoas / ingressos"
            value={dash?.pessoas > 0 ? dash.pessoas : totaisLista.pessoas}
            hint="Soma das quantidades"
          />
          <StatCard
            label="Cadastros"
            value={dash?.inscritos ?? totaisLista.cadastros}
            hint="Cadastros"
          />
          <StatCard
            label="Pré-inscritos"
            value={
              dash?.preInscritosPessoas > 0
                ? dash.preInscritosPessoas
                : totaisLista.preInscritosPessoas
            }
            hint={`${dash?.preInscritos ?? totaisLista.preInscritos} cadastro(s)`}
          />
          <StatCard
            label="Confirmadas"
            value={
              dash?.confirmadasPessoas > 0
                ? dash.confirmadasPessoas
                : totaisLista.confirmadasPessoas
            }
            hint={`${dash?.confirmadas ?? totaisLista.confirmadas} cadastro(s)`}
          />
          <StatCard
            label="Pendentes"
            value={
              dash?.pendentesPessoas > 0 ? dash.pendentesPessoas : totaisLista.pendentesPessoas
            }
            hint={`${dash?.pendentes ?? totaisLista.pendentes} cadastro(s)`}
          />
          <StatCard label="Cancelados" value={dash?.canceladas ?? totaisLista.canceladas} />
          <StatCard label="Arrecadado" value={formatMoney(dash?.valorArrecadado)} />
          <StatCard
            label="Vagas"
            value={dash?.vagasRestantes ?? "—"}
            hint={
              dash
                ? `${dash.vagasOcupadas ?? 0} de ${dash.vagasMaximas} ocupadas`
                : `${totaisLista.pessoas} pessoas na lista`
            }
          />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
        <div className="min-w-[160px] flex-1">
          <Input
            label="Nome"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
        </div>
        <div className="min-w-[140px]">
          <Input
            label="Telefone"
            value={filters.telefone}
            onChange={(e) => setFilters({ ...filters, telefone: e.target.value })}
          />
        </div>
        <div className="min-w-[140px]">
          <Input
            label="Cidade"
            value={filters.cidade}
            onChange={(e) => setFilters({ ...filters, cidade: e.target.value })}
          />
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
        <Button onClick={load}>
          <Search size={14} /> Pesquisar
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-black/5 bg-white/80 dark:border-white/10 dark:bg-slate-900/70">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:border-white/10">
                  <th className="px-3 py-2.5">Nome</th>
                  <th className="w-14 px-2 py-2.5 text-center">Qtd</th>
                  <th className="px-3 py-2.5">Telefone</th>
                  <th className="px-3 py-2.5">Paróquia</th>
                  <th className="px-3 py-2.5">Cidade</th>
                  <th className="px-3 py-2.5">Data</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Pag.</th>
                  <th className="px-3 py-2.5 text-right">Valor</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((i) => {
                  const pessoasOrd = [...(i.pessoas || [])].sort(
                    (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
                  );
                  const nome = i.participante?.nome || pessoasOrd[0]?.nome || "—";
                  const extras = pessoasOrd
                    .filter((p) => p.nome && p.nome !== nome)
                    .map((p) => p.nome);
                  const qtd = pessoasOrd.length || i.quantidade || 1;
                  return (
                    <tr
                      key={i.id}
                      className="border-b border-black/5 last:border-0 hover:bg-black/[0.03] dark:border-white/5 dark:hover:bg-white/[0.03]"
                    >
                      <td className="max-w-[240px] px-3 py-2 align-middle">
                        <p className="truncate font-medium" title={nome}>
                          {nome}
                        </p>
                        {extras.length > 0 && (
                          <p
                            className="truncate text-[11px] text-[var(--color-ink-soft)]"
                            title={extras.join(", ")}
                          >
                            +{extras.length} · {extras.join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums text-[var(--color-ink-soft)]">
                        {qtd}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                        {formatPhone(i.participante?.telefone)}
                      </td>
                      <td className="max-w-[140px] px-3 py-2">
                        <span className="block truncate" title={i.participante?.paroquia || ""}>
                          {i.participante?.paroquia || "—"}
                        </span>
                      </td>
                      <td className="max-w-[120px] px-3 py-2">
                        <span className="block truncate" title={i.participante?.cidade || ""}>
                          {i.participante?.cidade || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-[var(--color-ink-soft)]">
                        {formatDate(i.criadoEm)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-[var(--color-ink-soft)]">
                        {i.pagamento?.metodo === "DINHEIRO" ? "Dinheiro" : "PIX"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {formatMoney(i.valor)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/inscricoes/${i.id}`}
                            className="text-xs font-semibold text-[var(--color-forest)] hover:underline"
                          >
                            {i.pagamento?.metodo === "DINHEIRO" ? "Conferir" : "Abrir"}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmExcluir(i)}
                            disabled={excluindoId === i.id}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-600 hover:bg-red-500/10 disabled:opacity-50"
                            title="Excluir inscrição"
                            aria-label="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {items.length === 0 && (
              <p className="p-6 text-center text-sm text-[var(--color-ink-soft)]">
                Nenhuma inscrição encontrada.
              </p>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900/70">
              <p className="text-[var(--color-ink-soft)] dark:text-slate-400">
                Mostrando {rangeStart}–{rangeEnd} de {items.length}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 disabled:opacity-40 dark:border-white/15"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                {pageNumbers.map((num, idx) => {
                  const prev = pageNumbers[idx - 1];
                  const showEllipsis = prev != null && num - prev > 1;
                  return (
                    <span key={num} className="contents">
                      {showEllipsis && (
                        <span className="px-1 text-[var(--color-ink-soft)]">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => goToPage(num)}
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-sm font-medium ${
                          num === currentPage
                            ? "bg-[var(--color-forest)] text-white"
                            : "border border-black/10 dark:border-white/15"
                        }`}
                        aria-current={num === currentPage ? "page" : undefined}
                      >
                        {num}
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 disabled:opacity-40 dark:border-white/15"
                  aria-label="Próxima página"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
