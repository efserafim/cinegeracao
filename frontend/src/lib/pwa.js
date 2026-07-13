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

async function unregisterLegacyServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.map((reg) => {
      const path = new URL(reg.scope).pathname;
      if (path === "/" || path === "" || reg.active?.scriptURL?.endsWith("/sw.js")) {
        return reg.unregister();
      }
      return null;
    })
  );
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  if (!isAdminPath()) return null;
  try {
    await unregisterLegacyServiceWorkers();
    return await navigator.serviceWorker.register(SW_PATH);
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
        const path = new URL(reg.scope).pathname;
        if (path === "/" || path === "" || reg.active?.scriptURL?.endsWith("/sw.js")) {
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

export async function getExistingPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}
