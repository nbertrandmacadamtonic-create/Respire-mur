/* M.U.R. V19 — Notifications quotidiennes NeuroFlex + nouvelles inscriptions.
 * Remplace le mur-push-sw.js V18, sans autre modification de l'application.
 */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch (_) {}

  if (payload.type === 'mur_signup_alert') {
    const url = new URL('./admin.html', self.registration.scope).href;
    const isTest = payload.test === true;
    event.waitUntil(self.registration.showNotification('M.U.R. · ' + (isTest ? 'Test administrateur' : 'Nouveau compte'), {
      body: isTest ? 'Les alertes de nouvelle inscription fonctionnent.' : 'Un nouvel utilisateur vient de créer un compte M.U.R.',
      tag: isTest ? 'mur-signup-test' : 'mur-signup-' + String(payload.event_id || Date.now()),
      renotify: true,
      data: { url, type: 'mur_signup_alert' },
      badge: './mur-icon-192.png', icon: './mur-icon-192.png'
    }));
    return;
  }

  // V18 conservée : notification quotidienne Ici & Maintenant.
  const q = Number(payload.question);
  const idx = Number.isInteger(q) && q >= 0 && q < 4 ? q : 0;
  const labels = ['Énergie','Respiration','Mental','Corps'];
  const url = new URL('./?mur_daily=1&mur_q=' + idx, self.registration.scope).href;
  event.waitUntil(self.registration.showNotification('M.U.R. · Ici & Maintenant', {
    body: `Votre question NeuroFlex du jour : ${labels[idx]}`,
    tag: 'mur-neuroflex-daily', renotify: false, data: { url, question: idx },
    badge: './mur-icon-192.png', icon: './mur-icon-192.png'
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || new URL('./?mur_daily=1', self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const page of windows) {
      if (page.url.startsWith(self.registration.scope)) {
        await page.navigate(url);
        return page.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
