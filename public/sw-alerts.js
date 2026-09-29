/* Imported by the generated service worker (vite.config.ts → workbox.importScripts).
 * Installed PWA only: when Chrome wakes us via Periodic Background Sync, show
 * the latest planned notification that is due and not yet shown. The plan is
 * written to IndexedDB by the app (src/services/lockScreenNotifications.ts). */
function kv(mode, fn) {
  return new Promise((resolve) => {
    const open = indexedDB.open('st-bus-timetable');
    open.onerror = () => resolve(undefined);
    open.onsuccess = () => {
      try {
        const tx = open.result.transaction('kv', mode);
        const out = fn(tx.objectStore('kv'));
        tx.oncomplete = () => resolve(out && out.result);
        tx.onerror = () => resolve(undefined);
      } catch (e) { resolve(undefined); }
    };
  });
}
async function showDue() {
  const queue = (await kv('readonly', (s) => s.get('notif-queue'))) || [];
  const shown = (await kv('readonly', (s) => s.get('notif-queue-shown'))) || 0;
  const now = Date.now();
  const due = queue.filter((n) => n.at <= now && n.at > shown && now - n.at < 6 * 3600 * 1000);
  const n = due[due.length - 1];
  if (!n) return;
  await self.registration.showNotification(n.title, {
    body: n.body, tag: 'st-alert', renotify: true,
    icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    data: { to: n.to },
  });
  await kv('readwrite', (s) => s.put(n.at, 'notif-queue-shown'));
}
self.addEventListener('periodicsync', (e) => { if (e.tag === 'st-alerts') e.waitUntil(showDue()); });
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const to = (e.notification.data && e.notification.data.to) || '/alerts';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.navigate(to); return c.focus(); } }
    return self.clients.openWindow(to);
  }));
});
