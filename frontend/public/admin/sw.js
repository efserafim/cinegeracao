/* Service worker — PWA admin (/admin/*) + push
 * Install leve: não usa cache.addAll (falha no Netlify derruba o SW e quebra instalar/notificar).
 * rev: 2026-07-13b — garante installability após proteção do _redirects
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.url.includes("/api/")) return;
  // Deixa o browser cuidar; SW só existe para installability + push
});

self.addEventListener("push", (event) => {
  let data = { title: "CineGeração", body: "Nova atualização no painel", url: "/admin/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "CineGeração", {
      body: data.body || "",
      icon: "/image/pwa-192.png",
      badge: "/image/pwa-192.png",
      data: { url: data.url || "/admin/" },
      vibrate: [120, 60, 120],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
