/* M.U.R. V20 — Rappels NeuroFlex multiples et alertes d’inscription V19.4.
 * Deux notifications indépendantes : inscription admin / question NeuroFlex.
 * Même chemin de Service Worker pour éviter de modifier les autres fichiers.
 */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
const adminUrl = () => new URL('admin.html', self.registration.scope).href;
const signupLandingUrl = isTest => new URL('nouvelle-inscription.html'+(isTest?'?test=1':''), self.registration.scope).href;
const dailyUrl = q => new URL('./?mur_daily=1&mur_q='+q, self.registration.scope).href;

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch (_) {}

  if (payload.type === 'mur_signup_alert') {
    const isTest = payload.test === true;
    event.waitUntil(self.registration.showNotification(
      isTest ? 'M.U.R. — Test administrateur' : 'M.U.R. — Nouvelle inscription', {
        body: isTest ? 'Test réussi : touchez pour ouvrir les inscriptions.'
          : 'Un nouvel utilisateur vient de rejoindre M.U.R. Appuyez pour consulter les inscriptions.',
        tag: isTest ? 'mur-signup-test' : 'mur-signup-'+String(payload.event_id || Date.now()),
        data: {type:'mur_signup_alert',url:signupLandingUrl(isTest)},
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
  const day = /^\d{4}-\d{2}-\d{2}$/.test(payload.local_day || '') ? payload.local_day : 'daily';
  const slot = Number(payload.slot_minute);
  const validSlot = Number.isInteger(slot) && slot >= 0 && slot < 1440 && slot % 15 === 0;
  const tag = payload.test === true ? 'mur-neuroflex-test-'+Date.now()
    : 'mur-neuroflex-'+day+'-'+(validSlot ? slot : 'legacy');
  event.waitUntil(self.registration.showNotification('M.U.R. · Ici & Maintenant', {
    body:(payload.test === true ? 'Test NeuroFlex : ' : 'Votre question NeuroFlex : ')+labels[idx],
    tag,renotify:true,
    data:{type:'mur_neuroflex_daily',url:dailyUrl(idx),question:idx},
    icon:'./mur-icon-192.png',badge:'./mur-icon-192.png'
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const notification = event.notification;
  const data = notification.data || {};
  const tag = String(notification.tag || '');
  const title = String(notification.title || '').toLowerCase();

  // Rattrape les notifications d'inscription dont le champ data.type est absent
  // (anciennes versions ou informations de navigation perdues sur iOS).
  const isAdmin = data.type === 'mur_signup_alert'
    || tag.startsWith('mur-signup-')
    || title.includes('nouvelle inscription')
    || title.includes('test administrateur');
  const isTest = tag === 'mur-signup-test'
    || title.includes('test administrateur')
    || (isAdmin && data.test === true);
  const q = Number(data.question);
  const question = Number.isInteger(q) && q >= 0 && q < 4 ? q : 0;

  // Ne pas ouvrir une URL externe transmise par le contenu d'un push.
  const target = isAdmin ? signupLandingUrl(isTest) : dailyUrl(question);

  event.waitUntil((async () => {
    const pages = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const inScope = pages.filter(page => page.url.startsWith(self.registration.scope));
    const landing = inScope.find(page => new URL(page.url).pathname.endsWith('/nouvelle-inscription.html'));

    // Si M.U.R. est déjà lancé, naviguer d'abord cette fenêtre vers la page
    // demandée. Une ouverture directe d'une nouvelle PWA peut revenir à l'accueil.
    const ordered = isAdmin ? [landing, ...inScope.filter(p => p !== landing)] : inScope;
    for (const page of ordered) {
      if (!page) continue;
      try {
        const navigated = await page.navigate(target);
        const focused = await (navigated || page).focus();
        if (focused) return;
      } catch (error) {
        console.warn('[MUR Push] Navigation impossible, nouvel essai :',error);
      }
    }

    // Si l'application est fermée, ouvrir directement la destination.
    return self.clients.openWindow(target);
  })());
});
