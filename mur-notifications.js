/* M.U.R. V20.1 — Rappels multiples + statistiques par réponse, toutes les 15 minutes.
 * Ce fichier conserve les questions « Ici & Maintenant », les réponses rapides
 * et le système d'inscription admin indépendant.
 * Prérequis : migration SQL V20 + Edge Function NeuroFlex V20.
 */
(() => {
  'use strict';
  const VAPID_PUBLIC_KEY = 'BJsM0BizcjKsez64-pAqRBUy0ICoG89yxpZvDVMCMlHOhEjL369IMz5WmJfE4lMlg1TuMycBiReQJSlwd039fuI';
  const SW = './mur-push-sw.js?v=20';
  const LOCAL_Q = 'mur-daily-pending';
  const LOCAL_TIMES = 'mur-daily-times-v20';
  const labels = ['Énergie', 'Respiration', 'Mental', 'Corps'];
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
  function normalizeTimes(value){
    return [...new Set((Array.isArray(value)?value:[]).map(Number)
      .filter(v=>Number.isInteger(v)&&v>=0&&v<1440&&v%15===0))].sort((a,b)=>a-b);
  }
  function initialTimes(){
    try{const saved=normalizeTimes(JSON.parse(localStorage.getItem(LOCAL_TIMES)||'null'));if(saved.length)return saved;}catch(e){}
    const oldStored=localStorage.getItem('mur-daily-hour');
    const old=oldStored===null ? NaN : Number(oldStored);
    return [Number.isInteger(old)&&old>=0&&old<24?old*60:9*60];
  }
  function timeLabel(minutes){return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
  let selectedTimes=initialTimes();
  function persistTimes(){localStorage.setItem(LOCAL_TIMES,JSON.stringify(selectedTimes));}
  function renderTimes(){
    const list=$('mur-daily-list'),count=$('mur-daily-count');
    if(!list)return;
    list.replaceChildren();
    selectedTimes.forEach(t=>{
      const item=document.createElement('li');
      item.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;background:#15364a;border:1px solid #b0d7e244;border-radius:11px';
      const text=document.createElement('span');text.textContent=timeLabel(t);text.style.fontWeight='700';
      const remove=document.createElement('button');remove.type='button';remove.textContent='Supprimer';remove.setAttribute('aria-label','Supprimer le rappel de '+timeLabel(t));
      remove.style.cssText='border:1px solid #c0d5df66;background:#263f50;color:#fff;padding:7px 10px;border-radius:9px';
      remove.addEventListener('click',()=>{
        if(selectedTimes.length<=1){notice('Conservez au moins un créneau. Pour tout arrêter, utilisez « Désactiver sur cet appareil ».',true);return;}
        selectedTimes=selectedTimes.filter(x=>x!==t);renderTimes();notice('Liste modifiée. Appuyez sur « Enregistrer mes rappels ».');
      });
      item.append(text,remove);list.appendChild(item);
    });
    if(count)count.textContent=`${selectedTimes.length} rappel${selectedTimes.length>1?'s':''} par jour sur cet appareil`;
  }
  async function currentSubscription(){
    const reg=await navigator.serviceWorker.getRegistration('./');
    return reg?.pushManager?.getSubscription();
  }
  async function saveSubscription(sub,enabled=true){
    const user=currentUser();
    if(!user)throw Error('Connectez-vous pour enregistrer les rappels.');
    if(!client())throw Error('Connexion Supabase indisponible.');
    const data=sub.toJSON();
    const zone=Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
    const times=normalizeTimes(selectedTimes);
    if(!times.length)throw Error('Sélectionnez au moins un créneau.');
    // Nouveau jeton à CHAQUE enregistrement : remet à zéro le suivi d'envoi.
    const record={
      user_id:user.id,endpoint:data.endpoint,p256dh:data.keys?.p256dh,auth:data.keys?.auth,
      timezone:zone,local_hour:Math.floor(times[0]/60),
      reminder_minutes:times,schedule_version:new Date().toISOString(),enabled
    };
    const {error}=await client().from('mur_push_subscriptions').upsert(record,{onConflict:'endpoint'});
    if(error)throw Error('Enregistrement impossible : '+error.message+' (migration SQL V20 à vérifier).');
    persistTimes();
    // Conserver la clé historique pour les anciennes versions temporairement en cache.
    localStorage.setItem('mur-daily-hour',String(Math.floor(times[0]/60)));
  }
  async function enable(){
    if(!currentUser()){notice('Connectez-vous d’abord à votre compte M.U.R.',true);return;}
    if(!isPushSupported()){notice('Ce navigateur ne prend pas en charge les notifications push.',true);return;}
    if(!isInstalledIOS()){notice('Sur iPhone, ouvrez Safari → Partager → Sur l’écran d’accueil, puis lancez M.U.R. depuis son icône.',true);return;}
    try{
      notice('Activation des notifications…');
      const perm=await Notification.requestPermission();
      if(perm!=='granted'){notice('Autorisation refusée. Vous pouvez la réactiver dans les réglages du téléphone.',true);return;}
      const registration=await navigator.serviceWorker.register(SW,{scope:'./',updateViaCache:'none'});
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToUint8(VAPID_PUBLIC_KEY)});
      await saveSubscription(subscription,true);
      notice(`Activé : ${selectedTimes.map(timeLabel).join(', ')}. Un nouveau programme remet à zéro le suivi du jour.`);
      updateButtons();
    }catch(e){notice(e.message||String(e),true);}
  }
  async function disable(){
    try{
      if(!isPushSupported())return;
      const sub=await currentSubscription();
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
      try{subscribed=Boolean(await currentSubscription());}catch(e){}
    }
    yes.hidden=subscribed;no.hidden=!subscribed;
    const save=$('mur-daily-save');if(save)save.disabled=!subscribed;
  }
  async function loadRemoteSchedule(){
    if(!isPushSupported()||!currentUser()||!client())return;
    try{
      const sub=await currentSubscription();if(!sub)return;
      const {data,error}=await client().from('mur_push_subscriptions')
        .select('reminder_minutes,local_hour').eq('endpoint',sub.endpoint)
        .eq('user_id',currentUser().id).maybeSingle();
      if(error||!data)return;
      const times=normalizeTimes(data.reminder_minutes?.length?data.reminder_minutes:[Number(data.local_hour)*60]);
      if(times.length){selectedTimes=times;persistTimes();renderTimes();}
      updateButtons();
    }catch(e){console.warn('[MUR V20] Lecture horaires :',e);}
  }
  function mountSettings(){
    const settings=$('settings');if(!settings||$('mur-daily-settings'))return;
    const card=document.createElement('section');card.id='mur-daily-settings';card.className='card';
    card.style.cssText='padding:17px;margin:14px 0;border:1px solid #8bcde055;border-radius:18px;background:#0a2031;color:#eef8ff';
    card.innerHTML=`<h2 style="margin:0 0 8px">Rappels NeuroFlex</h2>
      <p style="font-size:13px;line-height:1.5">Programmez un ou plusieurs rappels « Ici & Maintenant » dans la journée, par tranches de 15 minutes. Les horaires sont propres à cet appareil.</p>
      <label for="mur-daily-hour" style="display:block;margin-bottom:8px">Ajouter un horaire</label>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select id="mur-daily-hour" style="font-size:16px;min-height:44px;background:#102c42;color:#fff;border:1px solid #8fc0d577;border-radius:9px;padding:6px 10px">
          ${Array.from({length:96},(_,i)=>i*15).map(m=>`<option value="${m}">${timeLabel(m)}</option>`).join('')}
        </select>
        <button id="mur-daily-add" type="button" style="padding:10px 14px;border-radius:11px;background:#b7e9f5;color:#082334;border:0;font-weight:700">+ Ajouter</button>
      </div>
      <p id="mur-daily-count" style="font-size:12px;margin:12px 0 7px;color:#bcf0ea"></p>
      <ul id="mur-daily-list" aria-label="Horaires programmés" style="padding:0;margin:0 0 13px;list-style:none;display:grid;gap:7px"></ul>
      <button id="mur-daily-save" type="button" style="padding:12px 15px;border-radius:11px;background:linear-gradient(110deg,#46b4c2,#58d3aa);color:#082334;border:0;font-weight:750">Enregistrer mes rappels</button>
      <p style="font-size:12px;line-height:1.5;color:#c9e4e8;margin:8px 0 0">Chaque enregistrement réinitialise le suivi des envois : même si un rappel a déjà été reçu aujourd’hui, un nouveau créneau à venir peut être envoyé.</p>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button id="mur-daily-enable" type="button" style="padding:10px 14px;border-radius:11px;background:#ddf8ff;color:#082334;border:0;font-weight:700">Activer les notifications</button>
        <button id="mur-daily-disable" type="button" hidden style="padding:10px 14px;border-radius:11px;background:#263d4b;color:#fff;border:1px solid #ffffff77">Désactiver sur cet appareil</button>
      </div>
      <p id="mur-daily-status" role="status" style="font-size:12px;line-height:1.45"></p>`;
    settings.appendChild(card);
    $('mur-daily-hour').value=String(selectedTimes[0]);
    $('mur-daily-enable').addEventListener('click',enable);
    $('mur-daily-disable').addEventListener('click',disable);
    $('mur-daily-add').addEventListener('click',()=>{
      const value=Number($('mur-daily-hour').value);
      if(selectedTimes.includes(value)){notice('Cet horaire figure déjà dans la liste.');return;}
      selectedTimes=normalizeTimes([...selectedTimes,value]);renderTimes();
      notice('Horaire ajouté. Appuyez sur « Enregistrer mes rappels ».');
    });
    $('mur-daily-save').addEventListener('click',async()=>{
      if(!currentUser()){notice('Connectez-vous avant d’enregistrer.',true);return;}
      const button=$('mur-daily-save');button.disabled=true;
      try{
        const sub=await currentSubscription();
        if(!sub){notice('Activez d’abord les notifications sur cet appareil.',true);return;}
        await saveSubscription(sub,true);
        notice(`Programme enregistré : ${selectedTimes.map(timeLabel).join(', ')}. Compteur réinitialisé.`);
      }catch(e){notice(e.message||String(e),true);}
      finally{button.disabled=false;}
    });
    renderTimes();updateButtons();
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
  // V20.1 — Journal détaillé. Chaque réponse est un événement indépendant.
  // La table historique mur_daily_answers (une ligne par jour) est conservée
  // pour la compatibilité, mais n'est PLUS utilisée comme source statistique.
  const EVENTS_KEY = 'mur-daily-answer-events-v201';
  const EVENT_LIMIT = 400;
  let activeStatsQuestion = null;
  let cloudStatsLoading = false;
  const eventStoreKey = () => EVENTS_KEY + ':' + (currentUser()?.id || 'guest');
  function cleanEvent(raw){
    const q=Number(raw?.question_index??raw?.question);
    const v=Number(raw?.answer_value??raw?.value);
    const timestamp=Number(raw?.timestamp) || Date.parse(raw?.answered_at||'');
    if(!Number.isInteger(q)||q<0||q>3||!Number.isInteger(v)||v<0||v>4||!Number.isFinite(timestamp))return null;
    return {
      id:String(raw?.id||`${timestamp}-${q}-${v}`),question:q,value:v,timestamp,
      day:String(raw?.local_day||raw?.day||new Date(timestamp).toLocaleDateString('en-CA')).slice(0,10)
    };
  }
  function getEvents(){
    try{return (JSON.parse(localStorage.getItem(eventStoreKey())||'[]')||[])
      .map(cleanEvent).filter(Boolean).sort((a,b)=>b.timestamp-a.timestamp).slice(0,EVENT_LIMIT);}
    catch(_){return [];}
  }
  function mergeEvents(incoming){
    const list=new Map();
    for(const raw of [...incoming,...getEvents()]){
      const event=cleanEvent(raw);if(event&&!list.has(event.id))list.set(event.id,event);
    }
    const items=[...list.values()].sort((a,b)=>b.timestamp-a.timestamp).slice(0,EVENT_LIMIT);
    localStorage.setItem(eventStoreKey(),JSON.stringify(items));return items;
  }
  async function loadCloudEvents(){
    if(cloudStatsLoading||!currentUser()||!client())return;
    const uid=currentUser().id;cloudStatsLoading=true;
    try{
      const {data,error}=await client().from('mur_daily_answer_events')
        .select('id,question_index,answer_value,local_day,answered_at')
        .eq('user_id',uid).order('answered_at',{ascending:false}).limit(EVENT_LIMIT);
      if(error)throw error;
      if(currentUser()?.id!==uid)return;
      mergeEvents((data||[]).map(row=>({...row,timestamp:Date.parse(row.answered_at)})));
      renderDailyStats();
    }catch(error){console.warn('[MUR V20.1] Historique quotidien :',error.message||error);}
    finally{cloudStatsLoading=false;}
  }
  function ensureDailyStatsPanel(){
    const page=$('stats');if(!page)return null;
    let panel=$('mur-daily-stats-v201');if(panel)return panel;
    const style=document.createElement('style');style.id='mur-daily-stats-style-v201';
    style.textContent=`
      #stats #mur-daily-stats-v201{padding:16px!important;margin-bottom:9px!important;border:1px solid #82cdd855!important;border-radius:19px!important;background:linear-gradient(145deg,#173950,#0a1c2d)!important;color:#f5fbff}
      #mur-daily-stats-v201 .mur-daily-tabs{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}
      #mur-daily-stats-v201 .mur-daily-tab{border:1px solid #a4d7e359;background:#16394f;color:#d9edf8;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:600;min-height:35px}
      #mur-daily-stats-v201 .mur-daily-tab[aria-pressed="true"]{background:linear-gradient(110deg,#48b7c5,#5bcfac);border-color:transparent;color:#062433}
      #mur-daily-stats-v201 .mur-daily-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:11px}
      #mur-daily-stats-v201 .mur-daily-metric{border:1px solid #ffffff25;border-radius:12px;background:#ffffff0c;padding:10px 8px;min-width:0}
      #mur-daily-stats-v201 .mur-daily-metric small{font-size:10px;color:#acd1df;display:block;line-height:1.3}
      #mur-daily-stats-v201 .mur-daily-metric strong{font-size:17px;display:block;margin-top:5px;overflow-wrap:anywhere}
      #mur-daily-stats-v201 .mur-daily-graph{margin-top:12px;padding:10px;border-radius:12px;background:#061929;border:1px solid #ffffff20}
      #mur-daily-stats-v201 .mur-daily-graph svg{display:block;width:100%;height:116px}
      @media(max-width:365px){#mur-daily-stats-v201 .mur-daily-metrics{gap:4px}#mur-daily-stats-v201 .mur-daily-metric{padding:8px 5px}#mur-daily-stats-v201 .mur-daily-metric strong{font-size:14px}}
    `;
    document.head.appendChild(style);
    panel=document.createElement('section');panel.className='card';panel.id='mur-daily-stats-v201';
    panel.innerHTML=`
      <div style="font-size:11px;letter-spacing:.12em;color:#79d7c2;font-weight:800">NEUROFLEX · SUIVI DES RAPPELS</div>
      <h3 id="mur-daily-stats-heading" style="font-size:20px;margin:7px 0 2px;color:#fff">Ma réponse du moment</h3>
      <p id="mur-daily-stats-last" style="font-size:13px;color:#d4e6ee;margin-top:6px;line-height:1.5"></p>
      <div class="mur-daily-tabs" role="group" aria-label="Choisir le thème NeuroFlex"></div>
      <div class="mur-daily-metrics">
        <div class="mur-daily-metric"><small>Dernière réponse</small><strong id="mur-daily-stat-value">—</strong></div>
        <div class="mur-daily-metric"><small>Évolution précédente</small><strong id="mur-daily-stat-change">—</strong></div>
        <div class="mur-daily-metric"><small>Réponses aujourd’hui</small><strong id="mur-daily-stat-count">0</strong></div>
      </div>
      <div class="mur-daily-graph"><div style="color:#c5e0ed;font-size:11px">Dernières réponses · échelle descriptive de 1 à 5</div>
        <div id="mur-daily-stats-graph" aria-label="Évolution des réponses"></div></div>
      <p id="mur-daily-stats-note" style="margin-top:8px;font-size:10px;color:#a7c5d2;line-height:1.4">Ces positions décrivent vos réponses personnelles ; ce ne sont pas des mesures physiologiques ni un diagnostic.</p>`;
    const anchor=page.querySelector('.stats-title-card');
    if(anchor)anchor.insertAdjacentElement('afterend',panel);else page.prepend(panel);
    const tabs=panel.querySelector('.mur-daily-tabs');
    labels.forEach((label,q)=>{
      const b=document.createElement('button');b.type='button';b.className='mur-daily-tab';
      b.textContent=label;b.dataset.question=String(q);
      b.addEventListener('click',()=>{activeStatsQuestion=q;renderDailyStats();});tabs.appendChild(b);
    });
    return panel;
  }
  function makeDailyChart(events){
    const wrap=$('mur-daily-stats-graph');if(!wrap)return;
    wrap.replaceChildren();
    if(!events.length){const p=document.createElement('p');p.style.cssText='font-size:12px;color:#b9d5df;margin:14px 0';p.textContent='Aucune réponse enregistrée pour ce thème.';wrap.append(p);return;}
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 320 116');
    svg.setAttribute('role','img');svg.setAttribute('aria-label',`Évolution de ${events.length} réponses sur cinq niveaux`);
    for(let v=0;v<5;v++){
      const y=14+(4-v)*21;
      const grid=document.createElementNS(ns,'line');
      Object.entries({x1:18,x2:306,y1:y,y2:y,stroke:'#ffffff1b','stroke-width':1}).forEach(([k,x])=>grid.setAttribute(k,x));svg.appendChild(grid);
    }
    const list=events.slice(0,12).reverse();
    const x=i=>list.length===1?160:18+288*i/(list.length-1);
    const y=v=>14+(4-v)*21;
    if(list.length>1){
      const path=document.createElementNS(ns,'polyline');
      path.setAttribute('points',list.map((e,i)=>`${x(i)},${y(e.value)}`).join(' '));
      path.setAttribute('fill','none');path.setAttribute('stroke','#61d6c2');
      path.setAttribute('stroke-width','3');path.setAttribute('stroke-linecap','round');
      path.setAttribute('stroke-linejoin','round');svg.appendChild(path);
    }
    list.forEach((e,i)=>{
      const circle=document.createElementNS(ns,'circle');
      circle.setAttribute('cx',x(i));circle.setAttribute('cy',y(e.value));
      circle.setAttribute('r',i===list.length-1?'5':'3.5');
      circle.setAttribute('fill',i===list.length-1?'#b4fff0':'#57c4d3');svg.appendChild(circle);
    });
    wrap.appendChild(svg);
    const note=document.createElement('div');note.style.cssText='font-size:10px;color:#a8cbd6;text-align:right';
    note.textContent=`${list.length} dernière${list.length>1?'s':''} réponse${list.length>1?'s':''}`;wrap.append(note);
  }
  function renderDailyStats(){
    const panel=ensureDailyStatsPanel();if(!panel)return;
    const all=getEvents();
    const q=activeStatsQuestion??all[0]?.question??0;
    const events=all.filter(e=>e.question===q);
    const latest=events[0],previous=events[1];
    panel.querySelectorAll('.mur-daily-tab').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.question)===q)));
    $('mur-daily-stats-heading').textContent=labels[q]+' · ma réponse du moment';
    $('mur-daily-stats-last').textContent=latest
      ? `Réponse validée : « ${options[q][latest.value]} » · ${new Date(latest.timestamp).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`
      : 'Aucune mesure pour ce thème. Répondez à un rappel pour commencer.';
    $('mur-daily-stat-value').textContent=latest?`${latest.value+1} / 5`:'—';
    const delta=latest&&previous?latest.value-previous.value:null;
    $('mur-daily-stat-change').textContent=delta===null?'1er relevé':delta===0?'Stable':`${delta>0?'+':''}${delta} cran${Math.abs(delta)>1?'s':''}`;
    $('mur-daily-stat-count').textContent=String(events.filter(e=>e.day===dateLocal()).length);
    makeDailyChart(events);
  }
  async function submit(question,value){
    const status=$('mur-daily-answer-status'),user=currentUser(),day=dateLocal();
    const timestamp=Date.now();
    let saved={id:`local-${timestamp}-${question}`,day,question,value,timestamp};
    const buttons=$('mur-daily-options')?.querySelectorAll('button')||[];
    buttons.forEach(b=>b.disabled=true);
    if(user&&client()){
      // Chaque validation INSERT une nouvelle ligne (jamais d'upsert journalier).
      const {data,error}=await client().from('mur_daily_answer_events')
        .insert({user_id:user.id,local_day:day,question_index:question,answer_value:value})
        .select('id,local_day,question_index,answer_value,answered_at').single();
      if(error){
        buttons.forEach(b=>b.disabled=false);
        if(status)status.textContent='Réponse non sauvegardée : '+error.message+' (migration V20.1 à installer).';
        return;
      }
      saved={...saved,id:data.id,timestamp:Date.parse(data.answered_at)||timestamp};
      // Compatibilité : l'ancienne table fournit uniquement la dernière réponse du jour.
      const legacy=await client().from('mur_daily_answers').upsert(
        {user_id:user.id,local_day:day,question_index:question,answer_value:value},
        {onConflict:'user_id,local_day'});
      if(legacy.error)console.warn('[MUR V20.1] Ancien résumé journalier :',legacy.error.message);
    }
    // En mode découverte, sauvegarde locale explicite seulement.
    mergeEvents([saved]);
    // Chaque action apparaît dans l'historique général, même plusieurs fois par jour.
    if(typeof window.addHistory==='function'){
      window.addHistory({type:'daily',title:'NeuroFlex · '+labels[question],
        detail:options[question][value],minutes:0});
    }
    activeStatsQuestion=question;
    localStorage.removeItem(LOCAL_Q);
    if(status)status.textContent='Réponse enregistrée. Ouverture des statistiques…';
    // Afficher la statistique spécifique, y compris si les tests complets
    // n'ont pas encore débloqué l'onglet Statistiques général.
    $('mur-daily-question')?.remove();
    if(typeof window.switchPageDirect==='function')window.switchPageDirect('stats');
    else if(typeof window.showPage==='function')window.showPage('stats');
    if(typeof window.renderStats==='function')window.renderStats();
    renderDailyStats();
    window.scrollTo(0,0);
    // Synchroniser les autres sessions sans remplacer la réponse locale récente.
    loadCloudEvents();
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
    ensureDailyStatsPanel();
    renderDailyStats();
    setTimeout(loadCloudEvents,850);
    handleDailyOpen();
    // Lire les horaires enregistrés sur cet appareil dès que la session est chargée.
    setTimeout(loadRemoteSchedule, 600);
    window.MURCloud?.client?.auth?.onAuthStateChange?.(() => {
      setTimeout(loadRemoteSchedule, 100);
      setTimeout(()=>{renderDailyStats();loadCloudEvents();}, 250);
    });
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
  window.MURDaily={showToday:()=>showQuestion(dailyIndex()),questionIndex:dailyIndex,refreshStats:renderDailyStats};
})();
