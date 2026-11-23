self.addEventListener("push", event => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    // Show a generic reminder if the payload cannot be parsed.
  }
  event.waitUntil(self.registration.showNotification(payload.title || "Remindo", {
    body: payload.body || "Anda memiliki notifikasi baru.",
    icon: "/icon.svg",
    tag: payload.id || "remindo",
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL("/dashboard/notifications", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window" });
    const existing = windows.find(client => client.url === target);
    if (existing) return existing.focus();
    return self.clients.openWindow(target);
  })());
});
