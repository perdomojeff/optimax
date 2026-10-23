/* StrataFlow · service worker. Sin caché de la aplicación (contiene datos privados).
   Atiende notificaciones Web Push de Páginas Blancas y abre la conversación correcta al tocarlas. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'StrataFlow', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    /* si el trabajador está mirando la aplicación, ya recibe el aviso dentro de ella */
    for (var i = 0; i < cs.length; i++) if (cs[i].visibilityState === 'visible' && cs[i].focused) return;
    return self.registration.showNotification(d.title || 'StrataFlow', {
      body: d.body || 'Tienes un mensaje nuevo', tag: d.tag || 'pb', icon: '/icon-192.png', badge: '/icon-192.png',
      data: { peer: d.peer || '', grupo: d.grupo || '', anuncio: d.anuncio || '' }, renotify: true
    });
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var dt = e.notification.data || {}, q = dt.anuncio ? '?anuncios=1' : dt.grupo ? '?grupo=' + encodeURIComponent(dt.grupo) : dt.peer ? '?chat=' + encodeURIComponent(dt.peer) : '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) {
      if ('focus' in cs[i]) { cs[i].postMessage({ type: 'pb-open', peer: dt.peer || '', grupo: dt.grupo || '', anuncio: dt.anuncio || '' }); return cs[i].focus(); }
    }
    return self.clients.openWindow('/' + q);
  }));
});
