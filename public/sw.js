/* Service worker do painel do Nikola's: só existe para receber as
   notificações (Web Push) e abrir o painel quando a pessoa toca nelas. Não
   guarda página nem arquivo — a Vercel continua servindo tudo direto, então
   uma versão nova aparece ao recarregar, como sempre. Registrado só no
   painel (painel.nikolasrestaurante.com.br), pela tela de Perfil. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { body: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || "Nikola's", {
      body: d.body || "",
      tag: d.tag || "nikolas",
      renotify: true,
      icon: "/icon.png",
      badge: "/icon.png",
      lang: "pt-BR",
      data: { url: d.url || "/operacao?ver=delivery" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if ("focus" in j) {
          if ("navigate" in j) j.navigate(destino);
          return j.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
