import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarPlus,
  Users,
  CheckCircle2,
  Wallet,
  Clock3,
  QrCode,
  ArrowRight,
  Pencil,
  Ticket,
  ClipboardList
} from "lucide-react";
import api, { formatDate, formatMoney } from "../../services/api";
import { Loading, Button } from "../../components/ui";
import SpiderMark from "../../components/SpiderMark";
const STATUS_EVENTO = {
  ABERTO: { label: "Aberto", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  ENCERRADO: { label: "Encerrado", className: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  RASCUNHO: { label: "Rascunho", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" }
};
function StatTile({ label, value, hint, icon: Icon, accent = "red", to }) {
  const accents = {
    red: "from-[#e11d2e]/15 to-transparent text-[#e11d2e]",
    gold: "from-[#f5c542]/20 to-transparent text-[#b45309] dark:text-[#f5c542]",
    blue: "from-[#1a6cff]/15 to-transparent text-[#1a6cff]",
    green: "from-emerald-500/15 to-transparent text-emerald-600 dark:text-emerald-400"
  };
  const inner = <div className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${accents[accent]} p-4 ring-1 ring-black/5 dark:ring-white/10`}>
      <div className="absolute -right-3 -top-3 opacity-10">
        <SpiderMark className="h-16 w-16" />
      </div>
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)] dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl leading-none text-[var(--color-ink)] dark:text-white">
            {value}
          </p>
          {hint && <p className="mt-2 text-xs text-[var(--color-ink-soft)] dark:text-slate-400">{hint}</p>}
        </div>
        <span className="rounded-2xl bg-white/70 p-2.5 dark:bg-white/10">
          <Icon size={18} />
        </span>
      </div>
    </div>;
  if (to) {
    return <Link to={to} className="block transition hover:-translate-y-0.5">
        {inner}
      </Link>;
  }
  return inner;
}
function EventoCard({ ev }) {
  const ocupadas = Math.max(0, (ev.vagasMaximas || 0) - (ev.vagasRestantes || 0));
  const pct = ev.vagasMaximas ? Math.min(100, Math.round(ocupadas / ev.vagasMaximas * 100)) : 0;
  const st = STATUS_EVENTO[ev.status] || STATUS_EVENTO.RASCUNHO;
  return <div className="rounded-[1.5rem] bg-white/80 p-4 ring-1 ring-black/5 dark:bg-slate-900/70 dark:ring-white/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl text-[var(--color-ink)] dark:text-white">{ev.nome}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.className}`}>
              {st.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
            {formatDate(ev.data)} · {ev.horario}
            {ev.cidade ? ` · ${ev.cidade}` : ""}
            {" · "}
            {formatMoney(ev.valor)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
          <span>Vagas preenchidas</span>
          <span className="font-semibold text-[var(--color-ink)] dark:text-white">
            {ocupadas}/{ev.vagasMaximas} ({pct}%)
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
    className="h-full rounded-full bg-gradient-to-r from-[#e11d2e] to-[#f5c542] transition-all"
    style={{ width: `${pct}%` }}
  />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/admin/eventos/${ev.id}/inscritos`}>
          <Button variant="secondary" className="!rounded-full">
            <Users size={14} /> Inscritos
          </Button>
        </Link>
        <Link to={`/admin/eventos/${ev.id}/editar`}>
          <Button variant="ghost" className="!rounded-full">
            <Pencil size={14} /> Editar
          </Button>
        </Link>
        <Link
    to={`/admin/eventos/${ev.id}/inscritos`}
    className="inline-flex items-center gap-1 self-center text-xs font-semibold text-[#e11d2e]"
  >
          Gerenciar <ArrowRight size={12} />
        </Link>
      </div>
    </div>;
}
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      api.get("/inscricoes/dashboard/global"),
      api.get("/eventos")
    ]).then(([s, e]) => {
      setStats(s.data.data);
      setEventos(e.data.data || []);
    }).finally(() => setLoading(false));
  }, []);
  if (loading) return <Loading />;
  const abertos = eventos.filter((e) => e.status === "ABERTO");
  const eventoPrincipal = abertos[0] || eventos[0];
  const pendentes = stats?.pendentes ?? 0;
  const taxaConfirmacao = stats?.inscritos ? Math.round((stats?.confirmadas || 0) / stats.inscritos * 100) : 0;
  return <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-[#070a12] px-5 py-6 text-white sm:px-7">
        <div className="pointer-events-none absolute inset-0 web-mask opacity-30" />
        <SpiderMark tone="light" className="pointer-events-none absolute -right-4 -top-2 h-28 w-28 opacity-20 sm:right-6 sm:h-36 sm:w-36" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f5c542]">Painel CineGeração</p>
            <h1 className="mt-2 font-display text-3xl tracking-wide sm:text-4xl">Dashboard</h1>
            <p className="mt-2 max-w-md text-sm text-white/70">
              Acompanhe vagas, confirmações e o que precisa da sua atenção agora.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/eventos/novo">
              <Button className="!rounded-full">
                <CalendarPlus size={16} /> Novo evento
              </Button>
            </Link>
            <Link to="/admin/validar">
              <Button variant="secondary" className="!rounded-full !bg-white/10 !text-white hover:!bg-white/15">
                <QrCode size={16} /> Validar entrada
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {pendentes > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-[#f5c542]/15 px-4 py-3 ring-1 ring-[#f5c542]/40">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#f5c542]/30 p-2 text-[#b45309]">
              <Clock3 size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)] dark:text-white">
                {pendentes} comprovante{pendentes > 1 ? "s" : ""} aguardando conferência
              </p>
              <p className="text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                Abra os inscritos e confirme ou recuse o pagamento.
              </p>
            </div>
          </div>
          {eventoPrincipal && <Link to={`/admin/eventos/${eventoPrincipal.id}/inscritos`}>
              <Button className="!rounded-full">Ver agora</Button>
            </Link>}
        </div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
    label="Eventos"
    value={stats?.eventos ?? 0}
    hint={`${abertos.length} aberto${abertos.length === 1 ? "" : "s"}`}
    icon={Ticket}
    accent="red"
    to="/admin/eventos"
  />
        <StatTile
    label="Inscritos"
    value={stats?.inscritos ?? 0}
    hint="Total geral"
    icon={Users}
    accent="blue"
  />
        <StatTile
    label="Confirmados"
    value={stats?.confirmadas ?? 0}
    hint={`${taxaConfirmacao}% de confirmação`}
    icon={CheckCircle2}
    accent="green"
  />
        <StatTile
    label="Arrecadado"
    value={formatMoney(stats?.valorArrecadado)}
    hint={pendentes > 0 ? `${pendentes} pendente${pendentes > 1 ? "s" : ""}` : "Pagamentos confirmados"}
    icon={Wallet}
    accent="gold"
  />
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl text-[var(--color-ink)] dark:text-white">Ações rápidas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
    to="/admin/eventos/novo"
    className="flex items-center gap-3 rounded-[1.25rem] bg-white/80 px-4 py-3 ring-1 ring-black/5 transition hover:ring-[#e11d2e]/30 dark:bg-slate-900/70 dark:ring-white/10"
  >
            <span className="rounded-2xl bg-[#e11d2e]/10 p-2 text-[#e11d2e]"><CalendarPlus size={18} /></span>
            <span>
              <span className="block text-sm font-semibold">Criar evento</span>
              <span className="text-xs text-[var(--color-ink-soft)] dark:text-slate-400">Novo CineGeração</span>
            </span>
          </Link>
          <Link
    to={eventoPrincipal ? `/admin/eventos/${eventoPrincipal.id}/inscritos` : "/admin/eventos"}
    className="flex items-center gap-3 rounded-[1.25rem] bg-white/80 px-4 py-3 ring-1 ring-black/5 transition hover:ring-[#e11d2e]/30 dark:bg-slate-900/70 dark:ring-white/10"
  >
            <span className="rounded-2xl bg-[#1a6cff]/10 p-2 text-[#1a6cff]"><Users size={18} /></span>
            <span>
              <span className="block text-sm font-semibold">Ver inscritos</span>
              <span className="text-xs text-[var(--color-ink-soft)] dark:text-slate-400">Lista e comprovantes</span>
            </span>
          </Link>
          <Link
    to="/admin/chamada"
    className="flex items-center gap-3 rounded-[1.25rem] bg-white/80 px-4 py-3 ring-1 ring-black/5 transition hover:ring-[#e11d2e]/30 dark:bg-slate-900/70 dark:ring-white/10"
  >
            <span className="rounded-2xl bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-400"><ClipboardList size={18} /></span>
            <span>
              <span className="block text-sm font-semibold">Fazer chamada</span>
              <span className="text-xs text-[var(--color-ink-soft)] dark:text-slate-400">Confirmar presença</span>
            </span>
          </Link>
          <Link
    to="/admin/validar"
    className="flex items-center gap-3 rounded-[1.25rem] bg-white/80 px-4 py-3 ring-1 ring-black/5 transition hover:ring-[#e11d2e]/30 dark:bg-slate-900/70 dark:ring-white/10"
  >
            <span className="rounded-2xl bg-[#f5c542]/20 p-2 text-[#b45309] dark:text-[#f5c542]"><QrCode size={18} /></span>
            <span>
              <span className="block text-sm font-semibold">Validar entrada</span>
              <span className="text-xs text-[var(--color-ink-soft)] dark:text-slate-400">QR no dia do cinema</span>
            </span>
          </Link>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-[var(--color-ink)] dark:text-white">Seus eventos</h2>
          <Link to="/admin/eventos" className="text-xs font-semibold text-[#e11d2e] underline">
            Ver todos
          </Link>
        </div>

        {eventos.length === 0 ? <div className="rounded-[1.5rem] bg-white/80 px-5 py-10 text-center ring-1 ring-black/5 dark:bg-slate-900/70 dark:ring-white/10">
            <SpiderMark className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="text-sm text-[var(--color-ink-soft)] dark:text-slate-400">Nenhum evento ainda.</p>
            <Link to="/admin/eventos/novo" className="mt-4 inline-block">
              <Button className="!rounded-full">Criar primeiro evento</Button>
            </Link>
          </div> : <div className="grid gap-4">
            {eventos.slice(0, 5).map((ev) => <EventoCard key={ev.id} ev={ev} />)}
          </div>}
      </div>
    </div>;
}
