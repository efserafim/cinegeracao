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
  ClipboardList,
  AlertCircle
} from "lucide-react";
import api, { formatDate, formatMoney, STATUS_LABELS } from "../../services/api";
import { Loading, Button } from "../../components/ui";
import SpiderMark from "../../components/SpiderMark";
import AdminPhoneSetup from "../../components/admin/AdminPhoneSetup";
import { useAuth } from "../../context/AuthContext";

const STATUS_EVENTO = {
  ABERTO: {
    label: "Online",
    dot: "bg-emerald-500",
    ping: true,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  ENCERRADO: {
    label: "Encerrado",
    dot: "bg-slate-400",
    ping: false,
    className: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
  RASCUNHO: {
    label: "Rascunho",
    dot: "bg-amber-400",
    ping: false,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  CANCELADO: {
    label: "Cancelado",
    dot: "bg-red-500",
    ping: false,
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  },
};

function StatusDot({ status }) {
  const st = STATUS_EVENTO[status] || STATUS_EVENTO.RASCUNHO;
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
      {st.ping && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${st.dot} opacity-60`} />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${st.dot}`} />
    </span>
  );
}

function StatusBadge({ status }) {
  const st = STATUS_EVENTO[status] || STATUS_EVENTO.RASCUNHO;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.className}`}>
      <StatusDot status={status} />
      {st.label}
    </span>
  );
}

function StatTile({ label, value, hint, icon: Icon, accent = "red", to }) {
  const accents = {
    red: "from-[#e11d2e]/15 to-transparent text-[#e11d2e]",
    gold: "from-[#f5c542]/20 to-transparent text-[#b45309] dark:text-[#f5c542]",
    blue: "from-[#1a6cff]/15 to-transparent text-[#1a6cff]",
    green: "from-emerald-500/15 to-transparent text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/15 to-transparent text-amber-700 dark:text-amber-300"
  };
  const inner = (
    <div className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${accents[accent]} p-4 ring-1 ring-black/5 dark:ring-white/10`}>
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
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="block transition hover:-translate-y-0.5">
        {inner}
      </Link>
    );
  }
  return inner;
}

function QuickLink({ to, icon: Icon, title, hint, tone }) {
  const tones = {
    red: "bg-[#e11d2e]/10 text-[#e11d2e]",
    blue: "bg-[#1a6cff]/10 text-[#1a6cff]",
    green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    gold: "bg-[#f5c542]/20 text-[#b45309] dark:text-[#f5c542]",
    slate: "bg-black/5 text-[var(--color-ink-soft)] dark:bg-white/10 dark:text-slate-300"
  };
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-[1.25rem] bg-white/80 px-4 py-3 ring-1 ring-black/5 transition hover:ring-[#e11d2e]/30 dark:bg-slate-900/70 dark:ring-white/10"
    >
      <span className={`rounded-2xl p-2 ${tones[tone] || tones.slate}`}>
        <Icon size={18} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-xs text-[var(--color-ink-soft)] dark:text-slate-400">{hint}</span>
      </span>
    </Link>
  );
}

function EventoCard({ ev }) {
  const ocupadas = Math.max(0, (ev.vagasMaximas || 0) - (ev.vagasRestantes || 0));
  const pct = ev.vagasMaximas ? Math.min(100, Math.round((ocupadas / ev.vagasMaximas) * 100)) : 0;
  return (
    <div className="rounded-[1.5rem] bg-white/80 p-4 ring-1 ring-black/5 dark:bg-slate-900/70 dark:ring-white/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl text-[var(--color-ink)] dark:text-white">{ev.nome}</h2>
            <StatusBadge status={ev.status} />
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
        <Link to={`/admin/chamada?evento=${ev.id}`}>
          <Button variant="secondary" className="!rounded-full">
            <ClipboardList size={14} /> Chamada
          </Button>
        </Link>
        <Link to={`/admin/eventos/${ev.id}/editar`}>
          <Button variant="ghost" className="!rounded-full">
            <Pencil size={14} /> Editar
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { admin } = useAuth();
  const [stats, setStats] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/inscricoes/dashboard/global"), api.get("/eventos")])
      .then(([s, e]) => {
        setStats(s.data.data);
        setEventos(e.data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const abertos = eventos.filter((e) => e.status === "ABERTO");
  const eventoAberto = abertos[0] || null;
  const eventoPrincipal = eventoAberto || eventos[0] || null;
  const eventoAbertoOuNenhum = Boolean(eventoAberto);
  const pendentes = stats?.pendentes ?? 0;
  const presentes = stats?.presentes ?? 0;
  const pendentesRecentes = stats?.pendentesRecentes || [];
  const taxaConfirmacao = stats?.inscritos
    ? Math.round(((stats?.confirmadas || 0) / stats.inscritos) * 100)
    : 0;
  const ocupadasPrincipal = eventoPrincipal
    ? Math.max(0, (eventoPrincipal.vagasMaximas || 0) - (eventoPrincipal.vagasRestantes || 0))
    : 0;
  const primeiroNome = (admin?.nome || "Admin").split(" ")[0];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-[#070a12] px-5 py-6 text-white sm:px-7">
        <div className="pointer-events-none absolute inset-0 web-mask opacity-30" />
        <SpiderMark tone="light" className="pointer-events-none absolute -right-4 -top-2 h-28 w-28 opacity-20 sm:right-6 sm:h-36 sm:w-36" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f5c542]">Painel CineGeração</p>
            <h1 className="mt-2 font-display text-3xl tracking-wide sm:text-4xl">Olá, {primeiroNome}</h1>
            {eventoPrincipal ? (
              <div className="mt-2 max-w-lg space-y-1.5">
                <p className="inline-flex flex-wrap items-center gap-2 text-sm text-white/70">
                  <StatusBadge status={eventoPrincipal.status} />
                  <span>
                    {eventoAbertoOuNenhum ? (
                      <>
                        Evento ativo: <strong className="text-white">{eventoPrincipal.nome}</strong>
                      </>
                    ) : (
                      <>
                        Sem evento aberto · último:{" "}
                        <strong className="text-white">{eventoPrincipal.nome}</strong>
                      </>
                    )}
                  </span>
                </p>
                <p className="text-sm text-white/55">
                  {formatDate(eventoPrincipal.data)} · {eventoPrincipal.horario}
                  {" · "}
                  {ocupadasPrincipal}/{eventoPrincipal.vagasMaximas} vagas
                </p>
              </div>
            ) : (
              <p className="mt-2 max-w-md text-sm text-white/70">
                Acompanhe vagas, confirmações e o que precisa da sua atenção agora.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/eventos/novo">
              <Button className="!rounded-full">
                <CalendarPlus size={16} /> Novo evento
              </Button>
            </Link>
            {eventoPrincipal && (
              <Link to={`/admin/eventos/${eventoPrincipal.id}/inscritos`}>
                <Button variant="secondary" className="!rounded-full !bg-white/10 !text-white hover:!bg-white/15">
                  <Users size={16} /> Inscritos
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <AdminPhoneSetup />

      {(pendentes > 0 || pendentesRecentes.length > 0) && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl text-[var(--color-ink)] dark:text-white">Precisa de atenção</h2>
            {eventoPrincipal && (
              <Link
                to={`/admin/eventos/${eventoPrincipal.id}/inscritos`}
                className="text-xs font-semibold text-[#e11d2e] underline"
              >
                Ver todos os inscritos
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-[#f5c542]/15 px-4 py-3 ring-1 ring-[#f5c542]/40">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-[#f5c542]/30 p-2 text-[#b45309]">
                <Clock3 size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)] dark:text-white">
                  {pendentes} comprovante{pendentes === 1 ? "" : "s"} aguardando conferência
                </p>
                <p className="text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                  Confirme ou recuse o pagamento para liberar o ingresso.
                </p>
              </div>
            </div>
            {eventoPrincipal && (
              <Link to={`/admin/eventos/${eventoPrincipal.id}/inscritos`}>
                <Button className="!rounded-full">Ver agora</Button>
              </Link>
            )}
          </div>

          {pendentesRecentes.length > 0 && (
            <ul className="divide-y divide-black/5 overflow-hidden rounded-[1.5rem] bg-white/80 ring-1 ring-black/5 dark:divide-white/10 dark:bg-slate-900/70 dark:ring-white/10">
              {pendentesRecentes.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/admin/inscricoes/${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-black/[0.03] dark:hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)] dark:text-white">
                        {item.nome}
                      </p>
                      <p className="truncate text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                        {item.codigo} · {item.eventoNome} · {STATUS_LABELS[item.status] || item.status}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#e11d2e]">
                      Conferir <ArrowRight size={12} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-xl text-[var(--color-ink)] dark:text-white">Números</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile
            label="Eventos"
            value={stats?.eventos ?? 0}
            hint={`${abertos.length} online`}
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
            to={eventoPrincipal ? `/admin/eventos/${eventoPrincipal.id}/inscritos` : "/admin/eventos"}
          />
          <StatTile
            label="Confirmados"
            value={stats?.confirmadas ?? 0}
            hint={`${taxaConfirmacao}% de confirmação`}
            icon={CheckCircle2}
            accent="green"
            to={eventoPrincipal ? `/admin/eventos/${eventoPrincipal.id}/inscritos` : "/admin/eventos"}
          />
          <StatTile
            label="Pendentes"
            value={pendentes}
            hint="Aguardando conferência"
            icon={AlertCircle}
            accent="amber"
            to={eventoPrincipal ? `/admin/eventos/${eventoPrincipal.id}/inscritos` : "/admin/eventos"}
          />
          <StatTile
            label="Arrecadado"
            value={formatMoney(stats?.valorArrecadado)}
            hint={presentes > 0 ? `${presentes} presente${presentes === 1 ? "" : "s"} na chamada` : "Pagamentos confirmados"}
            icon={Wallet}
            accent="gold"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl text-[var(--color-ink)] dark:text-white">No dia do cinema</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickLink
            to={eventoPrincipal ? `/admin/chamada?evento=${eventoPrincipal.id}` : "/admin/chamada"}
            icon={ClipboardList}
            title="Fazer chamada"
            hint={presentes > 0 ? `${presentes} já marcados` : "Confirmar presença"}
            tone="green"
          />
          <QuickLink
            to={eventoPrincipal ? `/admin/eventos/${eventoPrincipal.id}/inscritos` : "/admin/eventos"}
            icon={Users}
            title="Inscritos do evento"
            hint="Lista e comprovantes"
            tone="blue"
          />
          <QuickLink
            to="/admin/validar"
            icon={QrCode}
            title="Validar entrada"
            hint="QR no dia do cinema"
            tone="gold"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl text-[var(--color-ink)] dark:text-white">Gestão</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickLink to="/admin/eventos/novo" icon={CalendarPlus} title="Criar evento" hint="Novo CineGeração" tone="red" />
          <QuickLink to="/admin/eventos" icon={Ticket} title="Ver eventos" hint="Lista completa" tone="slate" />
          <QuickLink
            to={eventoPrincipal ? `/admin/eventos/${eventoPrincipal.id}/editar` : "/admin/eventos"}
            icon={Pencil}
            title={eventoAbertoOuNenhum ? "Editar evento ativo" : "Editar evento"}
            hint={eventoPrincipal?.nome || "Nenhum evento"}
            tone="slate"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-[var(--color-ink)] dark:text-white">Seus eventos</h2>
          <Link to="/admin/eventos" className="text-xs font-semibold text-[#e11d2e] underline">
            Ver todos
          </Link>
        </div>

        {eventos.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white/80 px-5 py-10 text-center ring-1 ring-black/5 dark:bg-slate-900/70 dark:ring-white/10">
            <SpiderMark className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="text-sm text-[var(--color-ink-soft)] dark:text-slate-400">Nenhum evento ainda.</p>
            <Link to="/admin/eventos/novo" className="mt-4 inline-block">
              <Button className="!rounded-full">Criar primeiro evento</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {eventos.slice(0, 5).map((ev) => (
              <EventoCard key={ev.id} ev={ev} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
