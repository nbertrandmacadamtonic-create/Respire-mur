/* M.U.R. Supabase v2.0 — synchronisation par compte.
 * Remplace uniquement mur-supabase.js, sans modifier index.html.
 * La table mur_history est facultative tant que la migration SQL n'est pas lancee.
 * Ne jamais placer de cle secrete/service_role dans ce fichier public.
 */
(() => {
  'use strict';
  const URL = 'https://iaglscnuynasdvhrqvby.supabase.co';
  const KEY = 'sb_publishable_7RbsvBsF4J3iQF0xVi5M7g_8jfNQ0U_';
  const client = window.supabase?.createClient?.(URL, KEY, {
    auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
  });
  if(!client) { console.error('[MUR Cloud] Bibliotheque Supabase absente.'); return; }

  let user = null, busy = false, syncing = false, historyEnabled = true;
  let lastSyncUser = null;
  const $ = id => document.getElementById(id);
  const get = id => $(id)?.value;
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const zoneKey = zone => {
    const z = typeof zone === 'string' ? zone : (zone?.key || zone?.name || '');
    return ['bleu','vert','orange','rouge'].find(v=>String(z).toLowerCase().includes(v)) || 'vert';
  };
  const profileKey = p => {
    const v = String(p||'').toLowerCase();
    return v.includes('fonceur') && !v.includes('funambule') ? 'fonceur'
      : v.includes('pose') && !v.includes('funambule') ? 'pose' : 'funambule';
  };
  const profileLabel = (p, score) => {
    const n=Number(score);
    if(Number.isFinite(n)){
      if(n >= 8) return 'Pose';
      if(n <= -8) return 'Fonceur';
      if(n > 2) return 'Funambule a tendance Pose';
      if(n < -2) return 'Funambule a tendance Fonceur';
      return 'Funambule equilibre';
    }
    return p==='pose'?'Pose':p==='fonceur'?'Fonceur':'Funambule equilibre';
  };
  const zoneFor = n => {
    if(n <= -22) return {key:'bleu',name:'BLEUE',color:'#3b82f6',family:'Activer',breath:'boost'};
    if(n >= 28) return {key:'rouge',name:'ROUGE',color:'#ef4444',family:'Freiner',breath:'frein'};
    if(n >= 10) return {key:'orange',name:'ORANGE',color:'#f59e0b',family:'Reguler',breath:'regulate'};
    return {key:'vert',name:'VERTE',color:'#22c55e',family:'Entretenir',breath:'365'};
  };
  const scoreText = n => (n > 0 ? '+' : '') + String(n);
  function status(message, error=false){
    const node=$('mur-cloud-status');
    if(node){ node.textContent=message; node.style.color=error?'#ffb4b4':'#b6f3d2'; }
    if(error) console.warn('[MUR Cloud]', message);
  }
  async function insert(table,row){
    if(!user)return;
    const id=user.id;
    const {error}=await client.from(table).insert({...row,user_id:id});
    if(error){status('Sauvegarde impossible : '+error.message,true);throw error;}
    status('Sauvegarde cloud effectuee.');
  }
  async function saveKis(){
    if(!user || typeof kisResult==='undefined' || typeof kisAnswers==='undefined' || !kisResult)return;
    if(!Array.isArray(kisAnswers)||kisAnswers.length!==15||kisAnswers.some(v=>v===null))return;
    await insert('mur_kis_results',{answers:[...kisAnswers],profile:profileKey(kisResult.profile)});
  }
  async function saveNow(answers){
    if(!user || typeof nowResult==='undefined'||!nowResult)return;
    if(!Array.isArray(answers)||answers.length!==4||answers.some(v=>v==null||v===''))return;
    await insert('mur_state_results',{answers:answers.map(Number),score:Number(nowResult.score),zone:zoneKey(nowResult.zone)});
  }
  async function saveProfile(){
    if(!user)return;
    const display_name=String(get('userName')||'').trim().slice(0,100)||null;
    const {error}=await client.from('mur_profiles').upsert({user_id:user.id,display_name},{onConflict:'user_id'});
    if(error)status('Profil non enregistre : '+error.message,true);
  }
  function takeHistoryLast(){
    const h=read('murHistory'); return Array.isArray(h)?h[0]:null;
  }
  async function saveHistoryEvent(item){
    if(!user||!historyEnabled||!item)return;
    const event={...item};
    const stamp=Number(event.timestamp)||Date.now();
    const source_key=String(event.id||stamp)+'-'+String(stamp);
    const {error}=await client.from('mur_history').upsert({
      user_id:user.id,source_key,occurred_at:new Date(stamp).toISOString(),event
    },{onConflict:'user_id,source_key',ignoreDuplicates:true});
    if(error){
      if(error.code==='42P01'||error.code==='PGRST205'||error.code==='PGRST116'){
        historyEnabled=false;console.info('[MUR Cloud] Historique cloud non installe (migration SQL requise).');
      } else console.warn('[MUR Cloud] Ecriture historique :',error.message);
    }
  }
  function wrap(name,before,after){
    const original=window[name];
    if(typeof original!=='function')return;
    window[name]=function(...args){
      const data=before?.();
      const result=original.apply(this,args);
      Promise.resolve().then(()=>after(data)).catch(e=>console.error('[MUR Cloud]',e));
      return result;
    };
  }
  function installHooks(){
    wrap('finishKis',()=>Boolean(typeof kisResult!=='undefined'&&kisResult),previous => {if(!previous)return saveKis();});
    wrap('finishNow',()=>['nowEnergy','nowBreath','nowMind','nowBody'].map(get),saveNow);
    wrap('saveProfile',null,saveProfile);
    wrap('addHistory',null,()=>saveHistoryEvent(takeHistoryLast()));
  }

  function mergeHistory(cloudItems,stateRows,kisRows){
    const local=read('murHistory');
    const result=new Map();
    const add=e=>{if(!e||!Number.isFinite(Number(e.timestamp)))return;
      const id=String(e.id??e.timestamp),key=id+'|'+String(e.timestamp)+'|'+String(e.type||'');
      if(!result.has(key)) result.set(key,e);
    };
    // Les donnees locales d'un autre compte ne sont jamais importees par defaut.
    const owner=localStorage.getItem('murCloudOwner');
    if(owner===user.id && Array.isArray(local)) local.forEach(add);
    cloudItems.forEach(x=>add(x.event));
    // Pour les tests deja sauvegardes avant la v2, reconstruire la ligne de synthese.
    stateRows.forEach(s=>{
      const ms=Date.parse(s.completed_at);
      if(!Number.isFinite(ms)||!Number.isFinite(Number(s.score)))return;
      const already=cloudItems.some(x=>Math.abs(Date.parse(x.occurred_at)-ms)<120000 && x.event?.type==='test');
      if(already)return;
      const relevant=kisRows.find(k=>Date.parse(k.completed_at)<=ms+120000)||kisRows[0];
      const ks=relevant?.answers?.reduce?.((acc,v)=>acc+Number(v||0),0)||0;
      const score=Math.max(-50,Math.min(50,Number(s.score)+Math.round(ks*1.2)));
      const zone=zoneFor(score);
      add({id:ms,timestamp:ms,date:new Date(ms).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}),time:new Date(ms).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),type:'test',title:'Test NeuroFlex',detail:scoreText(score)+' - '+zone.name,score,color:zone.color});
    });
    return [...result.values()].sort((a,b)=>Number(b.timestamp)-Number(a.timestamp)).slice(0,400);
  }
  async function syncFromCloud(){
    if(!user||syncing)return;
    syncing=true;
    const currentUser=user.id;
    status('Synchronisation des resultats...');
    try{
      const [kisResultQuery,nowResultQuery,profileQuery,historyQuery]=await Promise.all([
        client.from('mur_kis_results').select('answers,profile,completed_at').eq('user_id',currentUser).order('completed_at',{ascending:false}).limit(400),
        client.from('mur_state_results').select('answers,score,zone,completed_at').eq('user_id',currentUser).order('completed_at',{ascending:false}).limit(400),
        client.from('mur_profiles').select('display_name').eq('user_id',currentUser).maybeSingle(),
        historyEnabled?client.from('mur_history').select('source_key,occurred_at,event').eq('user_id',currentUser).order('occurred_at',{ascending:false}).limit(400):Promise.resolve({data:[],error:null})
      ]);
      if(user?.id!==currentUser)return;
      if(kisResultQuery.error)throw kisResultQuery.error;
      if(nowResultQuery.error)throw nowResultQuery.error;
      if(profileQuery.error)throw profileQuery.error;
      if(historyQuery.error){
        if(['42P01','PGRST205','PGRST116'].includes(historyQuery.error.code))historyEnabled=false;
        else console.warn('[MUR Cloud] Lecture historique :',historyQuery.error.message);
      }
      const kisRows=kisResultQuery.data||[],stateRows=nowResultQuery.data||[];
      const kis=kisRows[0],now=stateRows[0];
      const oldOwner=localStorage.getItem('murCloudOwner');
      // Si les donnees locales proviennent d'un autre compte, on les isole avant toute restauration.
      if(oldOwner && oldOwner!==currentUser){
        ['murKis','murNow','murLastNeuro','murHistory','murTestsUnlocked','murName'].forEach(k=>localStorage.removeItem(k));
      }
      let modified=false;
      if(kis){
        const score=kis.answers.reduce((acc,v)=>acc+Number(v||0),0);
        write('murKis',{score,profile:profileLabel(kis.profile,score)});modified=true;
      }else if(oldOwner!==currentUser){localStorage.removeItem('murKis');localStorage.removeItem('murLastNeuro');localStorage.removeItem('murNow');}
      if(now && kis){
        const score=Number(now.score);
        const nz=zoneFor(score);
        write('murNow',{score,zone:nz});
        const kisScore=read('murKis')?.score||0;
        const neuroScore=Math.max(-50,Math.min(50,score+Math.round(kisScore*1.2)));
        const neuroZone=zoneFor(neuroScore);
        write('murLastNeuro',{score:neuroScore,zone:neuroZone,kis:read('murKis').profile,kisScore,nowScore:score});
        localStorage.setItem('murTestsUnlocked','1');modified=true;
      }else if(kis && oldOwner!==currentUser){
        localStorage.removeItem('murNow');localStorage.removeItem('murLastNeuro');localStorage.removeItem('murTestsUnlocked');
      }
      const profile=profileQuery.data?.display_name;
      if(profile){localStorage.setItem('murName',profile);modified=true;}
      const merged=mergeHistory(historyQuery.data||[],stateRows,kisRows);
      if(merged.length){write('murHistory',merged);modified=true;}
      localStorage.setItem('murCloudOwner',currentUser);
      if(modified && typeof window.loadAll==='function'){
        try{window.loadAll();}catch(e){console.warn('[MUR Cloud] Rafraichissement interface :',e);}
      }
      lastSyncUser=currentUser;
      status('Synchronisation terminee : '+kisRows.length+' ki.S, '+stateRows.length+' Ici & Maintenant.');
    }catch(e){status('Synchronisation impossible : '+(e.message||e),true);}
    finally{syncing=false;}
  }
  function panel(){
    const button=document.createElement('button');
    button.id='mur-cloud-account';button.type='button';button.textContent='Compte';
    button.setAttribute('aria-label','Compte M.U.R.');
    button.style.cssText='position:fixed;top:calc(12px + env(safe-area-inset-top));right:12px;z-index:9900;border-radius:14px;border:1px solid #ffffff55;background:#142a3e;color:white;padding:8px 10px;font:600 12px system-ui;cursor:pointer';
    document.body.appendChild(button);
    const sheet=document.createElement('section');
    sheet.id='mur-cloud-dialog';sheet.hidden=true;
    sheet.style.cssText='position:fixed;inset:0;z-index:9901;background:#020916db;display:none;align-items:center;justify-content:center;padding:20px';
    sheet.innerHTML=`<div role="dialog" aria-modal="true" aria-label="Compte M.U.R." style="max-width:380px;width:100%;border:1px solid #ffffff45;border-radius:24px;background:#112238;color:#fff;padding:23px;font:14px system-ui;box-shadow:0 24px 70px #0009">
      <h2 style="margin:0 0 12px">Compte M.U.R.</h2>
      <p id="mur-cloud-description" style="line-height:1.5;color:#d4e2ee;margin:0 0 14px">Connectez-vous pour retrouver vos resultats sur vos appareils.</p>
      <label id="mur-cloud-email-label" for="mur-cloud-email">Adresse e-mail</label>
      <input id="mur-cloud-email" type="email" autocomplete="email" placeholder="vous@exemple.fr" style="display:block;width:100%;margin:7px 0 12px;padding:12px;border-radius:10px;border:1px solid #ffffff55;background:#091727;color:white" />
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button id="mur-cloud-send" type="button" style="padding:11px 13px;border:0;border-radius:10px;background:#fff;color:#07111f;font-weight:700">Recevoir un lien</button><button id="mur-cloud-sync" type="button" hidden style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:#245778;color:white">Synchroniser</button><button id="mur-cloud-logout" type="button" hidden style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:transparent;color:white">Se deconnecter</button><button id="mur-cloud-close" type="button" style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:transparent;color:white">Fermer</button></div>
      <p id="mur-cloud-status" role="status" aria-live="polite" style="font-size:12px;line-height:1.4;margin:12px 0 0;color:#b6f3d2"></p>
      <p style="font-size:11px;color:#b4c5d7;line-height:1.45">Connexion requise sur chaque appareil. Les anciens resultats locaux non envoyes auparavant ne sont pas automatiquement transferes.</p>
    </div>`;
    document.body.appendChild(sheet);
    const close=()=>{sheet.hidden=true;sheet.style.display='none';};
    button.addEventListener('click',()=>{sheet.hidden=false;sheet.style.display='flex';refreshAuth();});
    $('mur-cloud-close').addEventListener('click',close);
    sheet.addEventListener('click',e=>{if(e.target===sheet)close();});
    $('mur-cloud-sync').addEventListener('click',syncFromCloud);
    $('mur-cloud-send').addEventListener('click',async()=>{
      if(busy)return;
      const email=String(get('mur-cloud-email')||'').trim();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status('Saisissez une adresse e-mail valide.',true);return;}
      busy=true;status('Envoi du lien...');
      try{
        const redirect=location.origin+location.pathname;
        const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirect}});
        if(error)throw error;
        status('Lien envoye, consultez vos e-mails.');
      }catch(e){status(e.message||'Erreur de connexion',true);}finally{busy=false;}
    });
    $('mur-cloud-logout').addEventListener('click',async()=>{
      const {error}=await client.auth.signOut();
      if(error)status(error.message,true);else status('Deconnecte.');
    });
  }
  function refreshAuth(){
    const connected=!!user;
    ['mur-cloud-email','mur-cloud-email-label','mur-cloud-send'].forEach(id=>{if($(id))$(id).style.display=connected?'none':'';});
    ['mur-cloud-sync','mur-cloud-logout'].forEach(id=>{if($(id))$(id).style.display=connected?'inline-block':'none';});
    if($('mur-cloud-description'))$('mur-cloud-description').textContent=connected
      ? 'Connecte : '+(user.email||'compte actif')+'. Synchronisation disponible.'
      : 'Connectez-vous pour retrouver vos resultats sur vos appareils.';
    if($('mur-cloud-account'))$('mur-cloud-account').textContent=connected?'Compte ✓':'Compte';
  }
  async function start(){
    panel();installHooks();
    const {data,error}=await client.auth.getUser();
    if(error)console.info('[MUR Cloud] Pas de session :',error.message);
    user=data?.user||null;refreshAuth();
    if(user)syncFromCloud();
    client.auth.onAuthStateChange((event,session)=>{
      const previous=user?.id||null;
      user=session?.user||null;refreshAuth();
      if(user && (previous!==user.id || (event==='SIGNED_IN'&&lastSyncUser!==user.id)))setTimeout(syncFromCloud,0);
      if(!user)lastSyncUser=null;
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.MURCloud={client,getUser:()=>user,saveKis,saveNow,saveProfile,sync:syncFromCloud};
})();
