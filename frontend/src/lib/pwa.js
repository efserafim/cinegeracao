const SW_PATH = "/admin/sw.js";
const MANIFEST_HREF = "/admin/manifest.webmanifest";
const MANIFEST_ATTR = "data-cg-admin-manifest";

export function isAdminPath(pathname = window.location.pathname) {
  return /^\/admin(\/|$)/.test(pathname);
}

export function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function ensureAdminManifest() {
  if (typeof document === "undefined") return;
  let link = document.querySelector(`link[${MANIFEST_ATTR}]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    link.href = MANIFEST_HREF;
    link.setAttribute(MANIFEST_ATTR, "1");
    document.head.appendChild(link);
  }
}

export function removeAdminManifest() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(`link[${MANIFEST_ATTR}], link[rel="manifest"]`).forEach((el) => el.remove());
}

function scriptUrl(reg) {
  return reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
}

function isLegacyServiceWorker(reg) {
  const script = scriptUrl(reg);
  return /\/sw\.js$/.test(script) && !script.includes("/admin/sw.js");
}

function isAdminServiceWorker(reg) {
  return scriptUrl(reg).includes("/admin/sw.js");
}

async function unregisterLegacyServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.map((reg) => {
      if (isAdminServiceWorker(reg)) return null;
      const path = new URL(reg.scope).pathname;
      if (path === "/" || path === "" || isLegacyServiceWorker(reg)) {
        return reg.unregister();
      }
      return null;
    })
  );
}

function waitForActive(reg, timeoutMs = 8000) {
  if (reg.active) return Promise.resolve(reg);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout waiting for service worker")), timeoutMs);
    const worker = reg.installing || reg.waiting;
    if (!worker) {
      clearTimeout(timer);
      resolve(reg);
      return;
    }
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated" || reg.active) {
        clearTimeout(timer);
        resolve(reg);
      }
    });
  });
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  if (!isAdminPath()) return null;
  if (!window.isSecureContext) return null;
  try {
    await unregisterLegacyServiceWorkers();
    // Escopo padrão de /admin/sw.js = /admin/ (não precisa de Service-Worker-Allowed)
    const existing = await navigator.serviceWorker.getRegistration("/admin/");
    if (existing && isAdminServiceWorker(existing)) {
      await waitForActive(existing).catch(() => {});
      return existing;
    }
    const reg = await navigator.serviceWorker.register(SW_PATH);
    await waitForActive(reg).catch(() => {});
    await navigator.serviceWorker.ready.catch(() => {});
    return reg;
  } catch (err) {
    console.warn("[PWA] SW register failed", err);
    return null;
  }
}

/** Ativa PWA só no painel admin (login + dashboard). */
export async function enableAdminPwa() {
  if (!isAdminPath()) return null;
  ensureAdminManifest();
  return registerServiceWorker();
}

/** Remove o manifesto na área pública para o Chrome não oferecer “Instalar app”. */
export async function disablePublicPwaInstall() {
  removeAdminManifest();
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.map((reg) => {
        if (isAdminServiceWorker(reg)) return null;
        const path = new URL(reg.scope).pathname;
        if (path === "/" || path === "" || isLegacyServiceWorker(reg)) {
          return reg.unregister();
        }
        return null;
      })
    );
  } catch {
    /* ignore */
  }
}

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function getAdminServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  let reg = await navigator.serviceWorker.getRegistration("/admin/");
  if (!reg || !isAdminServiceWorker(reg)) {
    reg = await enableAdminPwa();
  }
  if (!reg) return null;
  try {
    await waitForActive(reg);
  } catch {
    /* ainda assim tenta usar pushManager */
  }
  return reg;
}

export async function getExistingPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await getAdminServiceWorkerRegistration();
  if (!reg?.pushManager) return null;
  return reg.pushManager.getSubscription();
}

export function pushErrorMessage(err) {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.name === "NotAllowedError") {
    return "Permissão de notificação bloqueada. Ative nas configurações do Chrome.";
  }
  if (err?.name === "AbortError" || err?.name === "InvalidStateError") {
    return "Service worker ainda não pronto. Feche o app, abra /admin de novo e tente outra vez.";
  }
  if (!err?.response && err?.message) {
    if (/network|failed to fetch|cors/i.test(err.message) || err.code === "ERR_NETWORK") {
      return "Falha de rede/CORS ao falar com a API. Confirme o domínio no Render (FRONTEND_URL) e tente de novo.";
    }
    return err.message;
  }
  return "Não foi possível ativar as notificações.";
}
