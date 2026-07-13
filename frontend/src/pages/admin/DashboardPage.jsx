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
  AlertCircle,
  Sparkles
} from "lucide-react";
import api, { formatDate, formatMoney, STATUS_LABELS } from "../../services/api";
import { Loading, Button } from "../../components/ui";
import SpiderMark from "../../components/SpiderMark";
import AdminPhoneSetup from "../../components/admin/AdminPhoneSetup";
import { useAuth } from "../../context/AuthContext";
import { logoImg } from "../../assets/brand";

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

function SectionTitle({ kicker, title, action }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <p className="dash-section-kicker">{kicker}</p>}
        <h2 className="mt-1 font-display text-2xl tracking-wide text-[var(--color-ink)] dark:text-white">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function StatTile({ label, value, hint, icon: Icon, accent = "red", to, delay = 0 }) {
  const accents = {
    red: {
      bar: "from-[#e11d2e] to-[#ff5a6a]",
      icon: "bg-[#e11d2e]/12 text-[#e11d2e]",
      wash: "from-[#e11d2e]/18 via-transparent to-transparent",
    },
    gold: {
      bar: "from-[#f5c542] to-[#ffe08a]",
      icon: "bg-[#f5c542]/25 text-[#b45309] dark:text-[#f5c542]",
      wash: "from-[#f5c542]/25 via-transparent to-transparent",
    },
    blue: {
      bar: "from-[#1a6cff] to-[#6aa0ff]",
      icon: "bg-[#1a6cff]/12 text-[#1a6cff]",
      wash: "from-[#1a6cff]/18 via-transparent to-transparent",
    },
    green: {
      bar: "from-emerald-500 to-emerald-300",
      icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      wash: "from-emerald-500/18 via-transparent to-transparent",
    },
    amber: {
      bar: "from-amber-500 to-amber-300",
      icon: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      wash: "from-amber-500/18 via-transparent to-transparent",
    },
  };
  const a = accents[accent] || accents.red;
  const inner = (
    <div
      className="dash-panel group relative p-4 transition duration-300 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.wash}`} />
      <div className="pointer-events-none absolute -right-2 -top-2 opacity-[0.08] transition group-hover:opacity-20">
        <SpiderMark className="h-16 w-16" />
      </div>
      <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${a.bar}`} />
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
        <span className={`rounded-2xl p-2.5 ${a.icon}`}>
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="block animate-fade-up">
        {inner}
      </Link>
    );
  }
  return <div className="animate-fade-up">{inner}</div>;
}

function QuickLink({ to, icon: Icon, title, hint, tone }) {
  const tones = {
    red: "bg-[#e11d2e]/12 text-[#e11d2e] ring-[#e11d2e]/20",
    blue: "bg-[#1a6cff]/12 text-[#1a6cff] ring-[#1a6cff]/20",
    green: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400",
    gold: "bg-[#f5c542]/20 text-[#b45309] ring-[#f5c542]/35 dark:text-[#f5c542]",
    slate: "bg-black/5 text-[var(--color-ink-soft)] ring-black/5 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10",
  };
  return (
    <Link
      to={to}
      className="dash-panel group flex items-center gap-3 px-4 py-3.5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(225,29,46,0.25)]"
    >
      <span className={`rounded-2xl p-2.5 ring-1 ${tones[tone] || tones.slate}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--color-ink)] dark:text-white">{title}</span>
        <span className="text-xs text-[var(--color-ink-soft)] dark:text-slate-400">{hint}</span>
      </span>
      <ArrowRight
        size={14}
        className="ml-auto shrink-0 text-[#e11d2e] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
      />
    </Link>
  );
}

function EventoCard({ ev }) {
  const ocupadas = Math.max(0, (ev.vagasMaximas || 0) - (ev.vagasRestantes || 0));
  const pct = ev.vagasMaximas ? Math.min(100, Math.round((ocupadas / ev.vagasMaximas) * 100)) : 0;
  return (
    <div className="dash-panel relative p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-0 dash-comic-stripe opacity-40" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl tracking-wide text-[var(--color-ink)] dark:text-white">
              {ev.nome}
            </h3>
            <StatusBadge status={ev.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
            {formatDate(ev.data)} · {ev.horario}
            {ev.cidade ? ` · ${ev.cidade}` : ""}
            {" · "}
            {formatMoney(ev.valor)}
          </p>
        </div>
        <SpiderMark className="h-8 w-8 opacity-20" />
      </div>

      <div className="relative mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
          <span>Vagas preenchidas</span>
          <span className="font-semibold text-[var(--color-ink)] dark:text-white">
            {ocupadas}/{ev.vagasMaximas} ({pct}%)
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#e11d2e] via-[#f5c542] to-[#1a6cff] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
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
  const [marcandoExtrato, setMarcandoExtrato] = useState({});

  useEffect(() => {
    Promise.all([api.get("/inscricoes/dashboard/global"), api.get("/eventos")])
      .then(([s, e]) => {
        setStats(s.data.data);
        setEventos(e.data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function marcarExtrato(id) {
    setMarcandoExtrato((prev) => ({ ...prev, [id]: true }));
    try {
      await api.post(`/inscricoes/${id}/conferir-extrato`);
      setStats((prev) =>
        prev
          ? {
              ...prev,
              conferirExtrato: (prev.conferirExtrato || []).filter((x) => x.id !== id),
            }
          : prev
      );
    } catch {
      /* silent — admin can open detail */
    } finally {
      setMarcandoExtrato((prev) => ({ ...prev, [id]: false }));
    }
  }

  if (loading) return <Loading />;

  const abertos = eventos.filter((e) => e.status === "ABERTO");
  const eventoAberto = abertos[0] || null;
  const eventoPrincipal = eventoAberto || eventos[0] || null;
  const eventoAbertoOuNenhum = Boolean(eventoAberto);
  const pendentes = stats?.pendentes ?? 0;
  const presentes = stats?.presentes ?? 0;
  const pendentesRecentes = stats?.pendentesRecentes || [];
  const conferirExtrato = stats?.conferirExtrato || [];
  const taxaConfirmacao = stats?.inscritos
    ? Math.round(((stats?.confirmadas || 0) / stats.inscritos) * 100)
    : 0;
  const ocupadasPrincipal = eventoPrincipal
    ? Math.max(0, (eventoPrincipal.vagasMaximas || 0) - (eventoPrincipal.vagasRestantes || 0))
    : 0;
  const primeiroNome = (admin?.nome || "Admin").split(" ")[0];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[1.9rem] bg-[#070a12] text-white shadow-[0_24px_60px_-28px_rgba(225,29,46,0.55)] animate-swing">
        <div className="pointer-events-none absolute inset-0 dash-sunburst" />
        <div className="pointer-events-none absolute inset-0 web-mask opacity-35" />
        <div className="pointer-events-none absolute -left-10 top-0 h-full w-16 bg-gradient-to-b from-[#e11d2e] via-[#f5c542] to-[#1a6cff] opacity-90" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#f5c542]/70 to-transparent" />

        <SpiderMark
          tone="light"
          className="pointer-events-none absolute -right-3 bottom-2 h-28 w-28 opacity-25 animate-spidey-float sm:right-8 sm:h-36 sm:w-36"
        />

        <div className="relative flex flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <span className="absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(245,197,66,0.45),transparent_70%)]" />
              <img
                src={logoImg}
                alt="Geração Eucarística"
                className="relative h-16 w-16 rounded-full ring-2 ring-[#f5c542]/80 sm:h-20 sm:w-20"
              />
              <SpiderMark tone="light" className="absolute -bottom-1 -right-1 h-5 w-5 drop-shadow" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f5c542]">
                Geração Eucarística · CineGeração
              </p>
              <h1 className="mt-1 font-display text-4xl tracking-wide sm:text-5xl">
                <span className="spidey-title text-[#e11d2e]">CineGeração</span>
              </h1>
              <p className="mt-2 font-display text-2xl tracking-wide text-white/95 sm:text-3xl">
                Olá, {primeiroNome}
              </p>
              {eventoPrincipal ? (
                <div className="mt-3 max-w-xl space-y-1.5">
                  <p className="inline-flex flex-wrap items-center gap-2 text-sm text-white/75">
                    <StatusBadge status={eventoPrincipal.status} />
                    <span>
                      {eventoAbertoOuNenhum ? (
                        <>
                          Missão ativa: <strong className="text-white">{eventoPrincipal.nome}</strong>
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
                <p className="mt-3 max-w-md text-sm text-white/70">
                  Painel da operação: vagas, PIX, chamada e o que precisa da sua atenção.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link to="/admin/eventos/novo">
              <Button className="!rounded-full !bg-[#e11d2e] !px-5 hover:!bg-[#c41626]">
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
      </section>

      <AdminPhoneSetup />

      {(pendentes > 0 || pendentesRecentes.length > 0) && (
        <section className="animate-fade-up space-y-3">
          <SectionTitle
            kicker="Alerta Spidey"
            title="Precisa de atenção"
            action={
              eventoPrincipal ? (
                <Link
                  to={`/admin/eventos/${eventoPrincipal.id}/inscritos`}
                  className="text-xs font-semibold text-[#e11d2e] underline"
                >
                  Ver todos os inscritos
                </Link>
              ) : null
            }
          />

          <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-[#f5c542]/25 via-[#f5c542]/10 to-transparent px-4 py-4 ring-1 ring-[#f5c542]/45">
            <div className="pointer-events-none absolute inset-0 dash-comic-stripe opacity-50" />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-[#f5c542]/40 p-2.5 text-[#7a4b00]">
                  <Clock3 size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)] dark:text-white">
                    {pendentes} comprovante{pendentes === 1 ? "" : "s"} aguardando conferência
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                    Só quando o valor do PIX não bate ou o OCR falha. Se o valor confere, o ingresso já sai sozinho.
                  </p>
                </div>
              </div>
              {eventoPrincipal && (
                <Link to={`/admin/eventos/${eventoPrincipal.id}/inscritos`}>
                  <Button className="!rounded-full">Ver agora</Button>
                </Link>
              )}
            </div>
          </div>

          {pendentesRecentes.length > 0 && (
            <ul className="dash-panel divide-y divide-black/5 overflow-hidden dark:divide-white/10">
              {pendentesRecentes.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/admin/inscricoes/${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 transition hover:bg-[#e11d2e]/[0.04] dark:hover:bg-white/5"
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

      {conferirExtrato.length > 0 && (
        <section className="animate-fade-up space-y-3">
          <SectionTitle kicker="Extrato" title="Conferir no extrato do banco" />
          <p className="-mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
            Ingressos já liberados (muitos pelo valor do PIX). Marque quando bater com o extrato da conta.
          </p>
          <ul className="dash-panel divide-y divide-black/5 dark:divide-white/10">
            {conferirExtrato.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
              >
                <Link to={`/admin/inscricoes/${item.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)] dark:text-white">
                    {item.nome}
                    {item.liberacaoAutomatica && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <Sparkles size={10} /> auto
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
                    {item.codigo} · {formatMoney(item.valor)}
                    {item.idTransacao ? ` · ID ${item.idTransacao}` : ""}
                  </p>
                </Link>
                <Button
                  className="!rounded-full"
                  disabled={Boolean(marcandoExtrato[item.id])}
                  onClick={() => marcarExtrato(item.id)}
                >
                  {marcandoExtrato[item.id] ? "…" : "Conferido"}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle kicker="Radar" title="Números da missão" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile
            label="Eventos"
            value={stats?.eventos ?? 0}
            hint={`${abertos.length} online`}
            icon={Ticket}
            accent="red"
            to="/admin/eventos"
            delay={40}
          />
          <StatTile
            label="Inscritos"
            value={stats?.inscritos ?? 0}
            hint="Total geral"
            icon={Users}
            accent="blue"
            to={eventoPrincipal ? `/admin/eventos/${eventoPrincipal.id}/inscritos` : "/admin/eventos"}
            delay={80}
          />
          <StatTile
            label="Confirmados"
            value={stats?.confirmadas ?? 0}
            hint={`${taxaConfirmacao}% de confirmação`}
            icon={CheckCircle2}
            accent="green"
            to={eventoPrincipal ? `/admin/eventos/${eventoPrincipal.id}/inscritos` : "/admin/eventos"}
            delay={120}
          />
          <StatTile
            label="Pendentes"
            value={pendentes}
            hint="Aguardando conferência"
            icon={AlertCircle}
            accent="amber"
            to={eventoPrincipal ? `/admin/eventos/${eventoPrincipal.id}/inscritos` : "/admin/eventos"}
            delay={160}
          />
          <StatTile
            label="Arrecadado"
            value={formatMoney(stats?.valorArrecadado)}
            hint={presentes > 0 ? `${presentes} presente${presentes === 1 ? "" : "s"} na chamada` : "Pagamentos confirmados"}
            icon={Wallet}
            accent="gold"
            delay={200}
          />
        </div>
      </section>

      <section>
        <SectionTitle kicker="Dia D" title="No dia do cinema" />
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
        <SectionTitle kicker="Q.G." title="Gestão" />
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
        <SectionTitle
          kicker="Cartaz"
          title="Seus eventos"
          action={
            <Link to="/admin/eventos" className="text-xs font-semibold text-[#e11d2e] underline">
              Ver todos
            </Link>
          }
        />

        {eventos.length === 0 ? (
          <div className="dash-panel px-5 py-12 text-center">
            <SpiderMark className="mx-auto mb-3 h-14 w-14 opacity-40 animate-spidey-float" />
            <p className="font-display text-xl text-[var(--color-ink)] dark:text-white">Nenhum evento ainda</p>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
              Crie o próximo CineGeração e a teia começa a girar.
            </p>
            <Link to="/admin/eventos/novo" className="mt-5 inline-block">
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
