import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Users, Ban, Trash2, HandCoins } from "lucide-react";
import api, { formatDate, formatMoney } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Button, Loading, ConfirmModal } from "../../components/ui";
import { EventoStatusBadge } from "../../components/admin/EventoStatus";

export default function EventosAdminPage() {
  const { isLeitor, isAdminFull } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/eventos");
      let list = data.data || [];
      if (isLeitor) {
        list = list.filter((ev) => ["ABERTO", "PRE_INSCRICAO"].includes(ev.status));
      }
      setEventos(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [isLeitor]);

  async function runConfirm() {
    if (!confirm) return;
    const { type, id } = confirm;
    setConfirm(null);
    if (type === "encerrar") await api.patch(`/eventos/${id}/encerrar`);
    if (type === "abrir-cobranca") await api.patch(`/eventos/${id}/abrir-cobranca`);
    if (type === "excluir") await api.delete(`/eventos/${id}`);
    load();
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={Boolean(confirm)}
        title={
          confirm?.type === "excluir"
            ? "Excluir evento?"
            : confirm?.type === "abrir-cobranca"
              ? "Liberar cobrança?"
              : "Encerrar evento?"
        }
        message={
          confirm?.type === "excluir"
            ? "Excluir permanentemente este evento e suas inscrições? Essa ação não pode ser desfeita."
            : confirm?.type === "abrir-cobranca"
              ? "O evento passa a cobrar PIX. Todas as pré-inscrições passam a aguardar pagamento."
              : "Encerrar este evento? As inscrições públicas serão fechadas."
        }
        confirmLabel={
          confirm?.type === "excluir"
            ? "Excluir"
            : confirm?.type === "abrir-cobranca"
              ? "Liberar cobrança"
              : "Encerrar"
        }
        danger={confirm?.type === "excluir"}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{isLeitor ? "Eventos online" : "Eventos"}</h1>
          {isLeitor && (
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              Consulta rápida — a leitura de QR fica em{" "}
              <Link to="/admin/validar" className="text-[var(--color-forest)] underline">
                Leitor QR
              </Link>
              .
            </p>
          )}
        </div>
        {isAdminFull && (
          <Link to="/admin/eventos/novo">
            <Button>Novo evento</Button>
          </Link>
        )}
        {isLeitor && (
          <Link to="/admin/validar">
            <Button>Abrir leitor</Button>
          </Link>
        )}
      </div>

      <div className={`grid gap-4 ${isLeitor ? "sm:grid-cols-2" : ""}`}>
        {eventos.map((ev) => (
          <div
            key={ev.id}
            className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-slate-900/70"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl">{ev.nome}</h2>
                <EventoStatusBadge status={ev.status} />
              </div>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
                {formatDate(ev.data)} · {ev.horario} · {ev.cidade}
                {isAdminFull ? ` · ${formatMoney(ev.valor)}` : ""}
              </p>
              <p className="text-sm">
                {isLeitor
                  ? `Local: ${ev.local || "—"}`
                  : `Vagas: ${ev.vagasRestantes}/${ev.vagasMaximas}`}
              </p>
              {isLeitor && (
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                  Vagas restantes: {ev.vagasRestantes}/{ev.vagasMaximas}
                </p>
              )}
            </div>
            {isAdminFull && (
              <div className="flex flex-wrap gap-2">
                <Link to={`/admin/eventos/${ev.id}/inscritos`}>
                  <Button variant="secondary">
                    <Users size={14} /> Inscritos
                  </Button>
                </Link>
                <Link to={`/admin/eventos/${ev.id}/editar`}>
                  <Button variant="ghost">
                    <Pencil size={14} />
                  </Button>
                </Link>
                {ev.status === "PRE_INSCRICAO" && (
                  <Button
                    variant="secondary"
                    onClick={() => setConfirm({ type: "abrir-cobranca", id: ev.id })}
                  >
                    <HandCoins size={14} /> Liberar cobrança
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setConfirm({ type: "encerrar", id: ev.id })}>
                  <Ban size={14} />
                </Button>
                <Button variant="ghost" onClick={() => setConfirm({ type: "excluir", id: ev.id })}>
                  <Trash2 size={14} className="text-red-600" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {eventos.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">Nenhum evento para exibir.</p>
        )}
      </div>
    </div>
  );
}
