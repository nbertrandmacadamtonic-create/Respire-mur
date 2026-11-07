/* M.U.R. V18 — Notifications NeuroFlex et réponse rapide.
 * À inclure APRÈS mur-supabase.js.
 * Configuration : renseigner la clé publique VAPID ci-dessous.
 * Aucune clé privée ni service_role ne doit figurer dans le navigateur.
 */
(() => {
  'use strict';
  const VAPID_PUBLIC_KEY = 'BJsM0BizcjKsez64-pAqRBUy0ICoG89yxpZvDVMCMlHOhEjL369IMz5WmJfE4lMlg1TuMycBiReQJSlwd039fuI';
  const SW = './mur-push-sw.js?v=19-1';
  const LOCAL_Q = 'mur-daily-pending';
  const labels = ['Énergie', 'Respiration', 'Mental', 'Corps'];
  // Niveaux du test Ici & Maintenant, dans l'ordre exact de l'application.
  const options = [
    ['Très bas','Bas','Stable','Élevé','Très élevé'],
    ['Très lente','Lente','Stable','Courte','Très courte'],
    ['Éteint','Ralenti','Clair','Chargé','Saturé'],
    ['Lourd','Relâché','Disponible','Tendu','Crispé']
  ];
  const $ = id => document.getElementById(id);
  const client = () => window.MURCloud?.client;
  const currentUser = () => window.MURCloud?.getUser?.();
  const dateLocal = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function dailyIndex(day = dateLocal()) {
    const [y,m,d] = day.split('-').map(Number);
    return ((Math.floor(Date.UTC(y,m-1,d)/86400000)%4)+4)%4;
  }
  function isPushSupported() {
    return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window) && isSecureContext;
  }
  function isInstalledIOS() {
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    return !ios || standalone;
  }
  function base64UrlToUint8(base64) {
    const pad='='.repeat((4-base64.length%4)%4);
    const raw=atob((base64+pad).replace(/-/g,'+').replace(/_/g,'/'));
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }
  function notice(msg,error=false){const el=$('mur-daily-status');if(el){el.textContent=msg;el.style.color=error?'#ffc5c5':'#c5f5e5';}}

  async function saveSubscription(sub,enabled=true){
    const user=currentUser();
    if(!user)throw Error('Connectez-vous pour recevoir les notifications quotidiennes.');
    if(!client())throw Error('Connexion Supabase indisponible.');
    const data=sub.toJSON();
    const zone=Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
    const hour=Number($('mur-daily-hour')?.value || localStorage.getItem('mur-daily-hour') || 9);
    const record={user_id:user.id,endpoint:data.endpoint,p256dh:data.keys?.p256dh,auth:data.keys?.auth,timezone:zone,local_hour:hour,enabled};
    const {error}=await client().from('mur_push_subscriptions').upsert(record,{onConflict:'endpoint'});
    if(error)throw Error('Enregistrement impossible : '+error.message+' (SQL V18 à installer dans Supabase).');
  }
  async function enable(){
    if(!currentUser()){notice('Connectez-vous d’abord à votre compte M.U.R.',true);return;}
    if(!isPushSupported()){notice('Ce navigateur ne prend pas en charge les notifications push.',true);return;}
    if(!isInstalledIOS()){notice('Sur iPhone, ouvrez Safari → Partager → Sur l’écran d’accueil, puis lancez M.U.R. depuis son icône.',true);return;}
    if(VAPID_PUBLIC_KEY.startsWith('REMPLACER_')){notice('La clé publique VAPID n’est pas encore configurée.',true);return;}
    try{
      notice('Activation des notifications…');
      // Demander l'autorisation directement dans le geste utilisateur (obligatoire sur iOS).
      const permissionRequest=Notification.requestPermission();
      const perm=await permissionRequest;
      if(perm!=='granted'){notice('Autorisation refusée. Vous pouvez la réactiver dans les réglages du téléphone.',true);return;}
      const registration=await navigator.serviceWorker.register(SW,{scope:'./',updateViaCache:'none'});
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToUint8(VAPID_PUBLIC_KEY)});
      localStorage.setItem('mur-daily-hour',String($('mur-daily-hour')?.value||9));
      await saveSubscription(subscription,true);
      notice('Notifications quotidiennes activées sur cet appareil.');
      updateButtons();
    }catch(e){notice(e.message||String(e),true);}
  }
  async function disable(){
    try{
      if(!isPushSupported())return;
      const reg=await navigator.serviceWorker.getRegistration('./');
      const sub=await reg?.pushManager?.getSubscription();
      if(sub){
        const c=client(),user=currentUser();
        if(user&&c){const {error}=await c.from('mur_push_subscriptions').delete().eq('endpoint',sub.endpoint).eq('user_id',user.id);if(error)throw error;}
        await sub.unsubscribe();
      }
      notice('Notifications désactivées sur cet appareil.');updateButtons();
    }catch(e){notice('Désactivation impossible : '+e.message,true);}
  }
  async function updateButtons(){
    const yes=$('mur-daily-enable'),no=$('mur-daily-disable');if(!yes||!no)return;
    let subscribed=false;
    if(isPushSupported()){
      try{const reg=await navigator.serviceWorker.getRegistration('./');subscribed=Boolean(await reg?.pushManager?.getSubscription());}catch(e){}
    }
    yes.hidden=subscribed;no.hidden=!subscribed;
  }
  function mountSettings(){
    const settings=$('settings');if(!settings||$('mur-daily-settings'))return;
    const card=document.createElement('section');card.id='mur-daily-settings';card.className='card';
    card.style.cssText='padding:17px;margin:14px 0;border:1px solid #8bcde055;border-radius:18px;background:#0a2031;color:#eef8ff';
    card.innerHTML=`<h2 style="margin:0 0 8px">Rappel NeuroFlex quotidien</h2>
      <p style="font-size:13px;line-height:1.5">Recevez chaque jour une des quatre questions « Ici & Maintenant » : Énergie, Respiration, Mental ou Corps. Une réponse rapide, sans refaire le test complet.</p>
      <label for="mur-daily-hour" style="display:block;margin-bottom:8px">Heure du rappel</label>
      <select id="mur-daily-hour" style="font-size:16px;min-height:44px;background:#102c42;color:#fff;border:1px solid #8fc0d577;border-radius:9px;padding:6px 10px">${Array.from({length:16},(_,i)=>i+7).map(h=>`<option value="${h}">${String(h).padStart(2,'0')}:00</option>`).join('')}</select>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button id="mur-daily-enable" type="button" style="padding:10px 14px;border-radius:11px;background:#ddf8ff;color:#082334;border:0;font-weight:700">Activer les notifications</button>
        <button id="mur-daily-disable" type="button" hidden style="padding:10px 14px;border-radius:11px;background:#263d4b;color:#fff;border:1px solid #ffffff77">Désactiver sur cet appareil</button>
      </div><p id="mur-daily-status" role="status" style="font-size:12px;line-height:1.45"></p>`;
    settings.appendChild(card);
    const hour=localStorage.getItem('mur-daily-hour');if(hour && +hour>=7 && +hour<=22)$('mur-daily-hour').value=hour;
    $('mur-daily-enable').addEventListener('click',enable);
    $('mur-daily-disable').addEventListener('click',disable);
    $('mur-daily-hour').addEventListener('change',async()=>{
      localStorage.setItem('mur-daily-hour',$('mur-daily-hour').value);
      if(!currentUser())return;
      try{const reg=await navigator.serviceWorker.getRegistration('./');const sub=await reg?.pushManager?.getSubscription();if(sub){await saveSubscription(sub,true);notice('Heure mise à jour.');}}catch(e){notice(e.message,true);}
    });
    updateButtons();
  }
  function hideIntroductionForNotification(){
    const panel=$('presentation');if(!panel)return;
    panel.querySelectorAll('video').forEach(v=>{try{v.pause();}catch(e){}});
    panel.classList.add('hide');panel.style.display='none';
    if(typeof window.openPresentation==='function' && !window.openPresentation.__murDailyWrapped){
      const original=window.openPresentation;
      const wrapped=(...args)=>{panel.style.display='flex';return original(...args);};
      wrapped.__murDailyWrapped=true;window.openPresentation=wrapped;
    }
    if(typeof window.switchPageDirect==='function')window.switchPageDirect('home');
    else if(typeof window.showPage==='function')window.showPage('home');
  }
  function showQuestion(index){
    const q=Number.isInteger(index)&&index>=0&&index<4?index:dailyIndex();
    if($('mur-daily-question'))$('mur-daily-question').remove();
    const veil=document.createElement('div');veil.id='mur-daily-question';veil.setAttribute('role','dialog');veil.setAttribute('aria-modal','true');
    veil.style.cssText='position:fixed;inset:0;background:#05101be8;z-index:130000;display:grid;place-items:center;padding:16px';
    const card=document.createElement('div');card.style.cssText='width:min(100%,410px);max-height:90dvh;overflow:auto;background:linear-gradient(145deg,#153d58,#071827);border:1px solid #a7dcee77;color:#fff;border-radius:23px;padding:23px;box-shadow:0 20px 55px #0009;font-family:system-ui';
    card.innerHTML=`<div style="font-size:11px;letter-spacing:.13em;color:#a3d9f3">NEUROFLEX · ICI & MAINTENANT</div>
      <h2 style="margin:13px 0;font-size:25px">${labels[q]}</h2>
      <p style="line-height:1.5">Comment vous situez-vous maintenant ?</p>
      <div id="mur-daily-options" style="display:grid;gap:9px"></div>
      <p id="mur-daily-answer-status" role="status" style="font-size:12px"></p>
      <button id="mur-daily-later" type="button" style="margin-top:15px;background:transparent;color:#fff;border:1px solid #ffffff66;border-radius:11px;padding:10px 16px">Plus tard</button>`;
    veil.appendChild(card);document.body.append(veil);
    const wrap=$('mur-daily-options');
    for(let value=0;value<5;value++){
      const b=document.createElement('button');b.type='button';b.textContent=options[q][value];
      b.style.cssText='min-height:48px;background:#234a66;color:#fff;border:1px solid #a6d8eb55;border-radius:12px;padding:10px 15px;font-size:15px;text-align:left;cursor:pointer';
      b.addEventListener('click',()=>submit(q,value));wrap.appendChild(b);
    }
    $('mur-daily-later').addEventListener('click',()=>veil.remove());
  }
  async function submit(question,value){
    const status=$('mur-daily-answer-status'),user=currentUser(),day=dateLocal();
    const saved={day,question,value,label:labels[question],answer:options[question][value],timestamp:Date.now()};
    const buttons=$('mur-daily-options')?.querySelectorAll('button')||[];
    buttons.forEach(b=>b.disabled=true);
    if(user&&client()){
      const {error}=await client().from('mur_daily_answers').upsert({user_id:user.id,local_day:day,question_index:question,answer_value:value},{onConflict:'user_id,local_day'});
      if(error){buttons.forEach(b=>b.disabled=false);if(status)status.textContent='Réponse non sauvegardée : '+error.message;return;}
    }else{
      // Réponse locale si la personne n'est pas connectée : pas d'envoi serveur fictif.
      localStorage.setItem('mur-daily-local-'+day,JSON.stringify(saved));
    }
    // Historique normal déjà synchronisé par le module Supabase lorsqu'il est présent.
    if(typeof window.addHistory==='function' && localStorage.getItem('mur-daily-history-day')!==day){
      window.addHistory({type:'daily',title:'NeuroFlex · '+labels[question],detail:options[question][value],minutes:0});
      localStorage.setItem('mur-daily-history-day',day);
    }
    if(status)status.textContent='Réponse enregistrée.';
    localStorage.removeItem(LOCAL_Q);
    setTimeout(()=>$('mur-daily-question')?.remove(),450);
  }
  function handleDailyOpen(){
    const params=new URLSearchParams(location.search);
    if(!params.has('mur_daily') && !sessionStorage.getItem(LOCAL_Q))return;
    const requested=params.has('mur_q') ? Number(params.get('mur_q')) : -1;
    const question=Number.isInteger(requested)&&requested>=0&&requested<4?requested:dailyIndex();
    params.delete('mur_daily');params.delete('mur_q');
    history.replaceState({},'',location.pathname+(params.toString()?'?'+params:'')+location.hash);
    // Après que mur-custom.js a préparé son écran de présentation.
    setTimeout(()=>{hideIntroductionForNotification();showQuestion(question);},450);
    sessionStorage.removeItem(LOCAL_Q);
  }
  async function boot(){
    mountSettings();
    handleDailyOpen();
    if('serviceWorker' in navigator){
      try{
        const registration = await navigator.serviceWorker.register(SW,{scope:'./',updateViaCache:'none'});
        await registration.update();
        navigator.serviceWorker.addEventListener('message',event=>{
          if(event.data?.type==='MUR_DAILY_OPEN'){
            hideIntroductionForNotification();showQuestion(Number(event.data.question));
          }
        });
      }catch(e){console.warn('[MUR Push] Enregistrement impossible',e);}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.MURDaily={showToday:()=>showQuestion(dailyIndex()),questionIndex:dailyIndex};
})();
