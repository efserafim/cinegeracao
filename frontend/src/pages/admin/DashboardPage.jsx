import { useEffect, useMemo, useState } from "react";
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
  ClipboardList,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import api, { formatDate, formatMoney, STATUS_LABELS } from "../../services/api";
import { Loading, Button } from "../../components/ui";
import AdminPhoneSetup from "../../components/admin/AdminPhoneSetup";
import { EventoStatusBadge } from "../../components/admin/EventoStatus";
import { useAuth } from "../../context/AuthContext";
import { logoImg } from "../../assets/brand";

function Stat({ label, value, hint, icon: Icon, to }) {
  const body = (
    <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl leading-none text-[var(--color-ink)] dark:text-white">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-xs text-[var(--color-ink-soft)] dark:text-slate-400">{hint}</p>
          ) : null}
        </div>
        <span className="rounded-xl bg-[#e11d2e]/10 p-2.5 text-[#e11d2e]">
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block transition hover:-translate-y-0.5">
      {body}
    </Link>
  ) : (
    body
  );
}

function Action({ to, icon: Icon, title, hint }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-black/5 bg-white/80 px-4 py-3.5 transition hover:border-[#e11d2e]/30 dark:border-white/10 dark:bg-slate-900/70"
    >
      <span className="rounded-xl bg-[#e11d2e]/10 p-2.5 text-[#e11d2e]">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--color-ink)] dark:text-white">{title}</span>
        <span className="text-xs text-[var(--color-ink-soft)]">{hint}</span>
      </span>
      <ArrowRight size={14} className="ml-auto text-[#e11d2e] opacity-0 transition group-hover:opacity-100" />
    </Link>
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
          ? { ...prev, conferirExtrato: (prev.conferirExtrato || []).filter((x) => x.id !== id) }
          : prev
      );
    } catch {
      /* ignore */
    } finally {
      setMarcandoExtrato((prev) => ({ ...prev, [id]: false }));
    }
  }

  const abertos = useMemo(() => eventos.filter((e) => e.status === "ABERTO"), [eventos]);
  const eventoPrincipal = abertos[0] || eventos[0] || null;
  const pendentes = stats?.pendentes ?? 0;
  const presentes = stats?.presentes ?? 0;
  const pendentesRecentes = stats?.pendentesRecentes || [];
  const conferirExtrato = stats?.conferirExtrato || [];
  const pessoas = stats?.pessoas ?? stats?.inscritos ?? 0;
  const confirmadas = stats?.confirmadasPessoas ?? stats?.confirmadas ?? 0;
  const taxa = pessoas ? Math.round((confirmadas / pessoas) * 100) : 0;
  const ocupadas = eventoPrincipal
    ? Math.max(0, (eventoPrincipal.vagasMaximas || 0) - (eventoPrincipal.vagasRestantes || 0))
    : 0;
  const primeiroNome = (admin?.nome || "Admin").split(" ")[0];
  const inscritosHref = eventoPrincipal
    ? `/admin/eventos/${eventoPrincipal.id}/inscritos`
    : "/admin/eventos";

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#070a12] px-4 py-4 text-white sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoImg} alt="" className="h-11 w-11 rounded-full ring-2 ring-[#f5c542]/70" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl leading-none">
                Olá, {primeiroNome}
              </h1>
              {eventoPrincipal ? (
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-white/70">
                  <EventoStatusBadge status={eventoPrincipal.status} />
                  <span className="truncate font-medium text-white/90">{eventoPrincipal.nome}</span>
                  <span>
                    {formatDate(eventoPrincipal.data)} · {eventoPrincipal.horario} · {ocupadas}/
                    {eventoPrincipal.vagasMaximas}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-white/60">Crie um evento para começar.</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/eventos/novo">
              <Button className="!bg-[#e11d2e] hover:!bg-[#c41626]">
                <CalendarPlus size={14} /> Novo evento
              </Button>
            </Link>
            {eventoPrincipal && (
              <Link to={inscritosHref}>
                <Button variant="secondary" className="!bg-white/10 !text-white hover:!bg-white/15">
                  <Users size={14} /> Inscritos
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <AdminPhoneSetup />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="Eventos"
          value={stats?.eventos ?? 0}
          hint={`${abertos.length} online`}
          icon={CalendarPlus}
          to="/admin/eventos"
        />
        <Stat
          label="Pessoas"
          value={pessoas}
          hint={`${stats?.inscritos ?? 0} cadastros`}
          icon={Users}
          to={inscritosHref}
        />
        <Stat
          label="Confirmados"
          value={confirmadas}
          hint={`${taxa}% do total`}
          icon={CheckCircle2}
          to={inscritosHref}
        />
        <Stat label="Pendentes" value={pendentes} hint="Aguardando conferência" icon={AlertCircle} to={inscritosHref} />
        <Stat
          label="Arrecadado"
          value={formatMoney(stats?.valorArrecadado)}
          hint={presentes > 0 ? `${presentes} na chamada` : "Confirmados"}
          icon={Wallet}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Action
          to={eventoPrincipal ? `/admin/chamada?evento=${eventoPrincipal.id}` : "/admin/chamada"}
          icon={ClipboardList}
          title="Chamada"
          hint={presentes > 0 ? `${presentes} presentes` : "Marcar presença"}
        />
        <Action to="/admin/validar" icon={QrCode} title="Validar entrada" hint="Leitor de QR" />
        <Action to={inscritosHref} icon={Users} title="Inscritos" hint="Lista e comprovantes" />
        <Action
          to={eventoPrincipal ? `/admin/eventos/${eventoPrincipal.id}/editar` : "/admin/eventos"}
          icon={Pencil}
          title="Editar evento"
          hint={eventoPrincipal?.nome || "Sem evento"}
        />
      </section>

      {(pendentes > 0 || pendentesRecentes.length > 0 || conferirExtrato.length > 0) && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Atenção</h2>

          {pendentes > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f5c542]/40 bg-[#f5c542]/15 px-4 py-3">
              <div className="flex items-center gap-3">
                <Clock3 size={18} className="text-[#7a4b00]" />
                <div>
                  <p className="text-sm font-semibold">
                    {pendentes} comprovante{pendentes === 1 ? "" : "s"} para conferir
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    Valor divergente ou OCR falhou — o restante libera sozinho.
                  </p>
                </div>
              </div>
              <Link to={inscritosHref}>
                <Button>Ver agora</Button>
              </Link>
            </div>
          )}

          {pendentesRecentes.length > 0 && (
            <ul className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-white/80 dark:divide-white/10 dark:border-white/10 dark:bg-slate-900/70">
              {pendentesRecentes.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/admin/inscricoes/${item.id}`}
                    className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.nome}</p>
                      <p className="truncate text-xs text-[var(--color-ink-soft)]">
                        {item.codigo} · {STATUS_LABELS[item.status] || item.status}
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

          {conferirExtrato.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Conferir no extrato do banco</p>
              <ul className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-white/80 dark:divide-white/10 dark:border-white/10 dark:bg-slate-900/70">
                {conferirExtrato.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <Link to={`/admin/inscricoes/${item.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {item.nome}
                        {item.liberacaoAutomatica ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                            <Sparkles size={10} /> auto
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-[var(--color-ink-soft)]">
                        {item.codigo} · {formatMoney(item.valor)}
                        {item.idTransacao ? ` · ${item.idTransacao}` : ""}
                      </p>
                    </Link>
                    <Button disabled={Boolean(marcandoExtrato[item.id])} onClick={() => marcarExtrato(item.id)}>
                      {marcandoExtrato[item.id] ? "…" : "Conferido"}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl">Eventos</h2>
          <Link to="/admin/eventos" className="text-xs font-semibold text-[#e11d2e] underline">
            Ver todos
          </Link>
        </div>

        {eventos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 px-5 py-10 text-center dark:border-white/20">
            <p className="font-display text-xl">Nenhum evento ainda</p>
            <Link to="/admin/eventos/novo" className="mt-4 inline-block">
              <Button>Criar evento</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {eventos.slice(0, 5).map((ev) => {
              const filled = Math.max(0, (ev.vagasMaximas || 0) - (ev.vagasRestantes || 0));
              const pct = ev.vagasMaximas ? Math.min(100, Math.round((filled / ev.vagasMaximas) * 100)) : 0;
              return (
                <div
                  key={ev.id}
                  className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-xl">{ev.nome}</h3>
                        <EventoStatusBadge status={ev.status} />
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                        {formatDate(ev.data)} · {ev.horario}
                        {ev.cidade ? ` · ${ev.cidade}` : ""} · {formatMoney(ev.valor)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-[var(--color-ink-soft)]">
                      <span>Vagas</span>
                      <span>
                        {filled}/{ev.vagasMaximas} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#e11d2e]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/admin/eventos/${ev.id}/inscritos`}>
                      <Button variant="secondary">
                        <Users size={14} /> Inscritos
                      </Button>
                    </Link>
                    <Link to={`/admin/chamada?evento=${ev.id}`}>
                      <Button variant="secondary">
                        <ClipboardList size={14} /> Chamada
                      </Button>
                    </Link>
                    <Link to={`/admin/eventos/${ev.id}/editar`}>
                      <Button variant="ghost">
                        <Pencil size={14} /> Editar
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
