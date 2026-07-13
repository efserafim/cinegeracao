import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatDate, STATUS_LABELS } from "../services/api";
import { Button, Input } from "../components/ui";

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function ConsultarPage() {
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultados, setResultados] = useState(null);
  const navigate = useNavigate();

  async function go(e) {
    e.preventDefault();
    setError("");
    setResultados(null);
    const digits = onlyDigits(telefone);
    if (digits.length < 10 || digits.length > 13) {
      setError("Informe o WhatsApp com DDD (ex.: 22999999999).");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/inscricoes/por-whatsapp/${encodeURIComponent(digits)}`);
      const list = data?.data || [];
      if (list.length === 0) {
        setError("Nenhuma inscrição encontrada para este WhatsApp.");
        setResultados([]);
        return;
      }
      if (list.length === 1) {
        navigate(`/inscricao/${list[0].codigo}`);
        return;
      }
      setResultados(list);
    } catch (err) {
      setError(err.response?.data?.message || "Não foi possível buscar a inscrição.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 animate-fade-up">
      <h1 className="font-display text-2xl">Consultar inscrição</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
        Digite o WhatsApp usado na inscrição (com DDD).
      </p>
      <form onSubmit={go} className="mt-6 space-y-4">
        <Input
          label="WhatsApp"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="22999999999"
          inputMode="numeric"
          autoComplete="tel"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Buscando…" : "Buscar"}
        </Button>
      </form>

      {Array.isArray(resultados) && resultados.length > 1 && (
        <ul className="mt-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)] dark:text-slate-400">
            {resultados.length} inscrições encontradas
          </p>
          {resultados.map((item) => (
            <li key={item.id}>
              <Link
                to={`/inscricao/${item.codigo}`}
                className="block rounded-[1.25rem] bg-white/80 px-4 py-3 ring-1 ring-black/5 transition hover:ring-[#e11d2e]/35 dark:bg-white/5 dark:ring-white/10"
              >
                <p className="font-medium text-[var(--color-ink)] dark:text-white">
                  {item.evento?.nome || "Evento"}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                  {item.evento?.data ? formatDate(item.evento.data) : "—"}
                  {item.evento?.horario ? ` · ${item.evento.horario}` : ""}
                  {" · "}
                  {STATUS_LABELS[item.status] || item.status}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#e11d2e]">
                  {item.codigo}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
