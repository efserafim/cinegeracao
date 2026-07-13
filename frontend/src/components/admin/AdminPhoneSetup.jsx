import { useEffect, useState } from "react";
import { Bell, BellOff, Download, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "../ui";
import api from "../../services/api";
import {
  getExistingPushSubscription,
  isStandaloneDisplay,
  enableAdminPwa,
  urlBase64ToUint8Array,
} from "../../lib/pwa";

export default function AdminPhoneSetup() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandaloneDisplay());
  const [swReady, setSwReady] = useState(false);
  const [notifStatus, setNotifStatus] = useState("idle"); // idle | on | denied | unsupported | loading | error
  const [message, setMessage] = useState("");
  const [vapidOk, setVapidOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const onBip = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    (async () => {
      const reg = await enableAdminPwa();
      if (!cancelled) setSwReady(Boolean(reg));

      try {
        const { data } = await api.get("/admin/push/vapid-public-key");
        if (!cancelled) setVapidOk(Boolean(data?.data?.publicKey));
      } catch {
        if (!cancelled) setVapidOk(false);
      }

      if (!("Notification" in window) || !("PushManager" in window)) {
        if (!cancelled) setNotifStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setNotifStatus("denied");
        return;
      }
      const sub = await getExistingPushSubscription();
      if (!cancelled) setNotifStatus(sub ? "on" : "idle");
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBip);
    };
  }, []);

  async function handleInstall() {
    setMessage("");
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }

    if (!swReady) {
      const reg = await enableAdminPwa();
      setSwReady(Boolean(reg));
      if (!reg) {
        setMessage("Não foi possível preparar o app. Abra /admin/login no Chrome Android e tente de novo.");
        return;
      }
    }

    setMessage(
      "No Chrome Android: menu ⋮ → “Instalar app” ou “Adicionar à tela inicial”. Se não aparecer, recarregue esta página uma vez e tente outra vez."
    );
  }

  function handleReloadForInstall() {
    window.location.reload();
  }

  async function handleEnableNotifications() {
    setMessage("");
    setNotifStatus("loading");
    try {
      if (!("Notification" in window) || !("PushManager" in window)) {
        setNotifStatus("unsupported");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotifStatus("denied");
        setMessage("Permissão negada. Ative nas configurações do Chrome se quiser receber avisos.");
        return;
      }

      const { data } = await api.get("/admin/push/vapid-public-key");
      const publicKey = data?.data?.publicKey;
      if (!publicKey) {
        setNotifStatus("error");
        setMessage("Servidor sem chave de notificação configurada.");
        return;
      }

      const reg = (await enableAdminPwa()) || (await navigator.serviceWorker.ready);
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await api.post("/admin/push/subscribe", { subscription: sub.toJSON() });
      setNotifStatus("on");
      setVapidOk(true);
      setMessage("Notificações ativas neste celular.");
    } catch (err) {
      console.error(err);
      setNotifStatus("error");
      setMessage(err.response?.data?.message || "Não foi possível ativar as notificações.");
    }
  }

  async function handleDisableNotifications() {
    setNotifStatus("loading");
    try {
      const sub = await getExistingPushSubscription();
      if (sub) {
        await api.post("/admin/push/unsubscribe", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setNotifStatus("idle");
      setMessage("Notificações desativadas neste aparelho.");
    } catch {
      setNotifStatus("idle");
    }
  }

  return (
    <section className="rounded-[1.5rem] bg-white/80 p-4 ring-1 ring-black/5 dark:bg-slate-900/70 dark:ring-white/10 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-[#e11d2e]/10 p-2.5 text-[#e11d2e]">
          <Smartphone size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl text-[var(--color-ink)] dark:text-white">No celular</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
            Fixe o painel na tela inicial do Android e receba aviso quando chegar comprovante — funciona pela web (Chrome).
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.25rem] bg-[#070a12]/[0.03] p-4 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)] dark:text-slate-400">
            Fixar app
          </p>
          {installed ? (
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} /> Já está instalado neste aparelho
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-[var(--color-ink)] dark:text-white">
                Adiciona um ícone como se fosse um app.
              </p>
              <Button className="mt-3 w-full !rounded-full" onClick={handleInstall}>
                <Download size={16} />
                {deferredPrompt ? "Instalar no celular" : "Como instalar"}
              </Button>
              {!deferredPrompt && swReady && (
                <Button variant="secondary" className="mt-2 w-full !rounded-full" onClick={handleReloadForInstall}>
                  Recarregar para ativar instalação
                </Button>
              )}
            </>
          )}
        </div>

        <div className="rounded-[1.25rem] bg-[#070a12]/[0.03] p-4 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)] dark:text-slate-400">
            Notificações
          </p>
          {notifStatus === "unsupported" ? (
            <p className="mt-2 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
              Este navegador não suporta push. Use o Chrome no Android.
            </p>
          ) : notifStatus === "on" ? (
            <>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <Bell size={16} /> Ativas neste aparelho
              </p>
              <Button
                variant="secondary"
                className="mt-3 w-full !rounded-full"
                onClick={handleDisableNotifications}
              >
                <BellOff size={16} /> Desativar
              </Button>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-[var(--color-ink)] dark:text-white">
                Aviso de comprovante aguardando conferência{vapidOk ? "" : " (precisa HTTPS em produção)"}.
              </p>
              <Button
                className="mt-3 w-full !rounded-full"
                disabled={notifStatus === "loading" || notifStatus === "denied"}
                onClick={handleEnableNotifications}
              >
                <Bell size={16} />
                {notifStatus === "loading" ? "Ativando…" : "Ativar notificações"}
              </Button>
            </>
          )}
        </div>
      </div>

      {message && (
        <p className="mt-3 text-xs leading-relaxed text-[var(--color-ink-soft)] dark:text-slate-400">{message}</p>
      )}
    </section>
  );
}
