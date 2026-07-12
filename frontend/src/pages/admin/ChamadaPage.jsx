import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardList, Search, UserRound } from "lucide-react";
import api, { formatDate } from "../../services/api";
import { Button, Input, Loading, StatCard } from "../../components/ui";

function flattenPessoas(inscricoes) {
  const rows = [];
  for (const insc of inscricoes) {
    const tickets = Array.isArray(insc.ingressos) ? insc.ingressos : [];
    if (tickets.length) {
      for (const t of tickets) {
        rows.push({
          key: t.id || t.codigo,
          nome: t.nome || t.pessoa?.nome || insc.participante?.nome || "—",
          codigo: t.codigo,
          presenteEm: t.presenteEm || null,
          inscricaoCodigo: insc.codigo,
          telefone: insc.participante?.telefone,
          cidade: insc.participante?.cidade
        });
      }
      continue;
    }
    const pessoas = Array.isArray(insc.pessoas) ? insc.pessoas : [];
    for (const p of pessoas) {
      const t = p.ingresso;
      if (!t?.codigo) continue;
      rows.push({
        key: t.id || t.codigo,
        nome: p.nome || insc.participante?.nome || "—",
        codigo: t.codigo,
        presenteEm: t.presenteEm || null,
        inscricaoCodigo: insc.codigo,
        telefone: insc.participante?.telefone,
        cidade: insc.participante?.cidade
      });
    }
  }
  return rows.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export default function ChamadaPage() {
  const [eventos, setEventos] = useState([]);
  const [eventoId, setEventoId] = useState("");
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLista, setLoadingLista] = useState(false);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [ordem, setOrdem] = useState("az");
  const [savingCodigo, setSavingCodigo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/eventos")
      .then((res) => {
        const list = res.data.data || [];
        setEventos(list);
        const aberto = list.find((e) => e.status === "ABERTO") || list[0];
        if (aberto) setEventoId(aberto.id);
      })
      .catch((err) => setError(err.response?.data?.message || "Falha ao carregar eventos"))
      .finally(() => setLoading(false));
  }, []);

  async function loadLista(id = eventoId) {
    if (!id) return;
    setLoadingLista(true);
    setError("");
    try {
      const { data } = await api.get(`/inscricoes/evento/${id}`, {
        params: { status: "INGRESSO_LIBERADO" }
      });
      setPessoas(flattenPessoas(data.data || []));
    } catch (err) {
      setError(err.response?.data?.message || "Falha ao carregar confirmados");
      setPessoas([]);
    } finally {
      setLoadingLista(false);
    }
  }

  useEffect(() => {
    if (eventoId) loadLista(eventoId);
  }, [eventoId]);

  const filtradas = useMemo(() => {
    const termo = q.trim().toLowerCase();
    const lista = pessoas.filter((p) => {
      const presente = Boolean(p.presenteEm);
      if (filtro === "presentes" && !presente) return false;
      if (filtro === "faltam" && presente) return false;
      if (!termo) return true;
      return (
        p.nome.toLowerCase().includes(termo) ||
        (p.codigo || "").toLowerCase().includes(termo) ||
        (p.telefone || "").includes(termo) ||
        (p.cidade || "").toLowerCase().includes(termo)
      );
    });
    const sorted = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
    return ordem === "za" ? sorted.reverse() : sorted;
  }, [pessoas, q, filtro, ordem]);

  const presentes = pessoas.filter((p) => Boolean(p.presenteEm)).length;
  const total = pessoas.length;
  const faltam = total - presentes;
  const evento = eventos.find((e) => e.id === eventoId);

  async function togglePresenca(pessoa) {
    const presente = !pessoa.presenteEm;
    setSavingCodigo(pessoa.codigo);
    setError("");
    try {
      const { data } = await api.post("/ingressos/chamada", {
        codigo: pessoa.codigo,
        presente
      });
      const next = data.data;
      setPessoas((prev) =>
        prev.map((p) =>
          p.codigo === pessoa.codigo
            ? { ...p, presenteEm: next.presenteEm }
            : p
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Falha ao atualizar chamada");
    } finally {
      setSavingCodigo(null);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Chamada</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
          Lista de pessoas com ingresso liberado. Toque para marcar presença.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
        <label className="block min-w-[220px] flex-1 space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-soft)]">Evento</span>
          <select
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-slate-900"
            value={eventoId}
            onChange={(e) => setEventoId(e.target.value)}
          >
            {eventos.length === 0 && <option value="">Nenhum evento</option>}
            {eventos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome} · {formatDate(e.data)}
              </option>
            ))}
          </select>
        </label>
        <div className="min-w-[180px] flex-1">
          <Input
            label="Buscar"
            placeholder="Nome, telefone ou código"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="block min-w-[140px] space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-soft)]">Filtro</span>
          <select
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-slate-900"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="faltam">Faltam</option>
            <option value="presentes">Presentes</option>
          </select>
        </label>
        <label className="block min-w-[160px] space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-ink-soft)]">Ordem</span>
          <select
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/15 dark:bg-slate-900"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          >
            <option value="az">Alfabética (A-Z)</option>
            <option value="za">Alfabética (Z-A)</option>
          </select>
        </label>
        <Button variant="secondary" onClick={() => loadLista()}>
          <Search size={14} /> Atualizar
        </Button>
      </div>

      {evento && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Confirmados" value={total} hint="Com ingresso liberado" />
          <StatCard label="Presentes" value={presentes} hint={total ? `${Math.round((presentes / total) * 100)}%` : "—"} />
          <StatCard label="Faltam" value={faltam} />
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {loadingLista ? (
        <Loading />
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 px-5 py-12 text-center dark:border-white/15">
          <ClipboardList className="mx-auto mb-3 text-[var(--color-ink-soft)]" size={28} />
          <p className="text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
            {total === 0
              ? "Nenhuma pessoa com ingresso liberado neste evento."
              : "Nenhum resultado para a busca/filtro."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtradas.map((pessoa) => {
            const presente = Boolean(pessoa.presenteEm);
            const saving = savingCodigo === pessoa.codigo;
            return (
              <li key={pessoa.key}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => togglePresenca(pessoa)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ring-1 ${
                    presente
                      ? "bg-emerald-50 ring-emerald-200/80 dark:bg-emerald-950/30 dark:ring-emerald-800/50"
                      : "bg-white/80 ring-black/5 hover:ring-[#e11d2e]/25 dark:bg-slate-900/70 dark:ring-white/10"
                  } ${saving ? "opacity-60" : ""}`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      presente
                        ? "bg-emerald-500 text-white"
                        : "bg-black/5 text-[var(--color-ink-soft)] dark:bg-white/10"
                    }`}
                  >
                    {presente ? <Check size={20} strokeWidth={3} /> : <UserRound size={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-[var(--color-ink)] dark:text-white">
                      {pessoa.nome}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                      {pessoa.codigo}
                      {pessoa.cidade ? ` · ${pessoa.cidade}` : ""}
                      {pessoa.inscricaoCodigo ? ` · ${pessoa.inscricaoCodigo}` : ""}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      presente
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-black/5 text-[var(--color-ink-soft)] dark:bg-white/10 dark:text-slate-300"
                    }`}
                  >
                    {saving ? "…" : presente ? "Presente" : "Confirmar"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
