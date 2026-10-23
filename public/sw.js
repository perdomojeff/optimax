/* StrataFlow · service worker. Sin caché de la aplicación (contiene datos privados).
   Atiende avisos locales y notificaciones Web Push (fase 2: ver docs de Páginas Blancas). */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'StrataFlow', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'StrataFlow', {
    body: d.body || 'Tienes un mensaje nuevo', tag: d.tag || 'pb', icon: '/icon-192.png', badge: '/icon-192.png', data: { peer: d.peer || (d.data && d.data.peer) || '' }, renotify: true
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var peer = (e.notification.data && e.notification.data.peer) || '', url = '/' + (peer ? '?chat=' + encodeURIComponent(peer) : '');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) { cs[i].postMessage({ type: 'pb-open', peer: peer }); return cs[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
