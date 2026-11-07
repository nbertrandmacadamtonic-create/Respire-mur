/* M.U.R. — Acces decouverte v1
   A charger APRES index.html, mur-custom.js et mur-supabase.js.
   Aucune cle secrete. Les droits administrateur restent controles cote Supabase.
   ATTENTION : cette couche gere l'interface, pas une protection de contenus
   payants contre l'inspection du code public de GitHub Pages.
*/
(()=>{
  'use strict';
  const FREE_BREATH = '365'; // protocole existant « Respiration 365 » (a confirmer si « Respi 360 » est un autre mode)
  const FREE_EXERCISE = 'double'; // choix provisoire : « Double inspiration » ; remplacable ici
  const $ = id => document.getElementById(id);
  const connected = () => Boolean(window.MURCloud?.getUser?.());

  function showUnlock(message){
    let veil = $('mur-discovery-gate');
    if(!veil){
      veil=document.createElement('div');
      veil.id='mur-discovery-gate';
      veil.setAttribute('role','dialog');
      veil.setAttribute('aria-modal','true');
      veil.setAttribute('aria-label','Acces M.U.R.');
      veil.style.cssText='position:fixed;inset:0;z-index:119900;display:flex;align-items:center;justify-content:center;background:#06101fdd;padding:20px';
      const card=document.createElement('div');
      card.style.cssText='max-width:360px;width:100%;background:#112238;color:#fff;border:1px solid #ffffff55;border-radius:20px;padding:22px;font-family:system-ui;box-shadow:0 12px 44px #0008';
      const heading=document.createElement('h2');heading.textContent='Découvrez tout M.U.R.';heading.style.margin='0 0 12px';
      const para=document.createElement('p');para.id='mur-discovery-gate-text';para.style.lineHeight='1.5';
      const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:10px';
      const account=document.createElement('button');account.type='button';account.textContent="Se connecter / S'inscrire";account.style.cssText='background:white;color:#102238;border:0;border-radius:12px;padding:12px;font-weight:700;cursor:pointer';
      const close=document.createElement('button');close.type='button';close.textContent='Continuer la découverte';close.style.cssText='background:transparent;color:white;border:1px solid #ffffff55;border-radius:12px;padding:12px;cursor:pointer';
      close.addEventListener('click',()=>veil.remove());
      account.addEventListener('click',()=>{
        veil.remove();
        // Ouvre le formulaire Supabase existant depuis le bouton déjà installé.
        const trigger=$('mur-cloud-video-account')||$('mur-cloud-profile-open')||$('mur-cloud-intro-open');
        if(trigger){trigger.click();return;}
        // Fallback : ouvrir le panneau Profil, sans fausse connexion.
        if(typeof window.showPage==='function')window.showPage('settings');
      });
      actions.append(account,close);card.append(heading,para,actions);veil.append(card);document.body.append(veil);
    }
    $('mur-discovery-gate-text').textContent=message;
  }

  function protectFunction(name, permitted, explanation){
    const original=window[name];
    if(typeof original!=='function'||original.__murAccessProtected)return;
    const guarded=function(...args){
      if(!connected()&&!permitted(...args)){
        showUnlock(explanation);return;
      }
      return original.apply(this,args);
    };
    guarded.__murAccessProtected=true;
    window[name]=guarded;
  }

  function install(){
    // Les tests ki.S / Ici & Maintenant et la synthèse ne sont pas verrouillés.
    protectFunction('selectBreath',key=>key===FREE_BREATH,
      'En mode découverte, une seule respiration est disponible. Créez un compte pour découvrir les autres protocoles.');
    protectFunction('openExercise',key=>key===FREE_EXERCISE,
      'Vous pouvez essayer un exercice Paniflex en mode découverte. Inscrivez-vous pour accéder à tous les exercices.');
    protectFunction('openExerciseCardFull',key=>key===FREE_EXERCISE,
      'La collection complète Paniflex est réservée aux comptes inscrits.');
    protectFunction('startBreathing',()=>{
      // Le choix courant existe dans le sélecteur de l'application.
      const selected=$('protocolSelect')?.value;
      return selected===FREE_BREATH;
    },'Choisissez la respiration de découverte ou créez un compte pour les autres respirations.');

    // Signaler clairement les restrictions sans masquer les tests.
    if(!$('mur-discovery-notice')){
      const panel=$('exercises')?.querySelector('.page-title');
      if(panel){
        const hint=document.createElement('p');hint.id='mur-discovery-notice';
        hint.style.cssText='font-size:12px;line-height:1.4;opacity:.8;margin:6px 0';
        panel.append(hint);
      }
    }
    refresh();
  }
  function refresh(){
    const info=$('mur-discovery-notice');
    if(info)info.textContent=connected()?'Tous les exercices sont disponibles.':'Découverte : un exercice Paniflex au choix de la version gratuite.';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  // Rafraîchir le libellé après une connexion ou une déconnexion.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  const client=window.MURCloud?.client;
  if(client?.auth?.onAuthStateChange)client.auth.onAuthStateChange(()=>queueMicrotask(refresh));
  window.MURAccess={isRegistered:connected,freeBreath:FREE_BREATH,freeExercise:FREE_EXERCISE};
})();
