/* M.U.R. V19.1 — Réception push et navigation fiable iPhone.
 * Deux notifications indépendantes : inscription admin / question NeuroFlex.
 * Le versionnement ?v=19-1 force la mise à jour depuis mur-notifications.js.
 */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
const adminUrl = () => new URL('admin.html', self.registration.scope).href;
const dailyUrl = q => new URL('./?mur_daily=1&mur_q='+q, self.registration.scope).href;

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch (_) {}

  if (payload.type === 'mur_signup_alert') {
    const isTest = payload.test === true;
    event.waitUntil(self.registration.showNotification(
      isTest ? 'M.U.R. · Test administrateur' : 'M.U.R. · Nouveau compte', {
        body: isTest ? 'Test réussi : touchez pour ouvrir les inscriptions.'
          : 'Un nouvel utilisateur vient de créer un compte M.U.R.',
        tag: isTest ? 'mur-signup-test' : 'mur-signup-'+String(payload.event_id || Date.now()),
        data: {type:'mur_signup_alert',url:adminUrl()},
        icon:'./mur-icon-192.png',badge:'./mur-icon-192.png',renotify:true
      }
    ));
    return;
  }

  // Seules les notifications NeuroFlex identifiées (ou V18 sans champ type)
  // sont dirigées vers la question quotidienne.
  if (payload.type && payload.type !== 'mur_neuroflex_daily') {
    console.warn('[MUR] Type push inconnu :',payload.type);
    return;
  }
  const parsed = Number(payload.question);
  const idx = Number.isInteger(parsed) && parsed >= 0 && parsed < 4 ? parsed : 0;
  const labels = ['Énergie','Respiration','Mental','Corps'];
  event.waitUntil(self.registration.showNotification('M.U.R. · Ici & Maintenant', {
    body:'Votre question NeuroFlex du jour : '+labels[idx],
    tag:'mur-neuroflex-daily',renotify:false,
    data:{type:'mur_neuroflex_daily',url:dailyUrl(idx),question:idx},
    icon:'./mur-icon-192.png',badge:'./mur-icon-192.png'
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const isAdmin = data.type === 'mur_signup_alert';
  const target = isAdmin ? adminUrl() : data.url || dailyUrl(0);
  event.waitUntil((async () => {
    const pages = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    // Pour les alertes administrateur, privilégier une fenêtre dédiée.
    // Cela évite qu'une page NeuroFlex déjà ouverte garde son état/routage.
    if (isAdmin) {
      const existingAdmin = pages.find(p => new URL(p.url).pathname.endsWith('/admin.html'));
      if (existingAdmin) { await existingAdmin.navigate(target); return existingAdmin.focus(); }
      const opened = await self.clients.openWindow(target);
      if (opened) return opened.focus();
      // Repli lorsque le système bloque l'ouverture d'une nouvelle fenêtre.
    }
    for (const page of pages) {
      if (page.url.startsWith(self.registration.scope)) {
        await page.navigate(target);
        return page.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
