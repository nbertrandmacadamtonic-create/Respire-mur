/* M.U.R. Supabase v5.0 — synchronisation par compte.
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
  let lastSyncUser = null, authReady = false;
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
    // Aucun bouton flottant : le compte vit dans Profil et la connexion
    // est proposee sous « Commencer » apres la video de presentation.
    const sheet=document.createElement('section');
    sheet.id='mur-cloud-dialog';sheet.hidden=true;
    sheet.style.cssText='position:fixed;inset:0;z-index:9901;background:#020916db;display:none;align-items:center;justify-content:center;padding:20px';
    sheet.innerHTML=`<div role="dialog" aria-modal="true" aria-label="Compte M.U.R." style="max-width:380px;width:100%;border:1px solid #ffffff45;border-radius:24px;background:#112238;color:#fff;padding:23px;font:14px system-ui;box-shadow:0 24px 70px #0009">
      <h2 style="margin:0 0 12px">Compte M.U.R.</h2>
      <p id="mur-cloud-description" style="line-height:1.5;color:#d4e2ee;margin:0 0 14px">Connectez-vous pour retrouver vos resultats sur vos appareils.</p>
      <label id="mur-cloud-email-label" for="mur-cloud-email">Adresse e-mail</label>
      <input id="mur-cloud-email" type="email" autocomplete="email" placeholder="vous@exemple.fr" style="display:block;width:100%;margin:7px 0 12px;padding:12px;border-radius:10px;border:1px solid #ffffff55;background:#091727;color:white" />
      <label id="mur-cloud-password-label" for="mur-cloud-password">Mot de passe</label>
      <input id="mur-cloud-password" type="password" autocomplete="current-password" placeholder="Votre mot de passe" style="display:block;width:100%;margin:7px 0 12px;padding:12px;border-radius:10px;border:1px solid #ffffff55;background:#091727;color:white" />
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button id="mur-cloud-login" type="button" style="padding:11px 13px;border:0;border-radius:10px;background:#fff;color:#07111f;font-weight:700">Se connecter</button><button id="mur-cloud-register" type="button" style="padding:11px 13px;border:1px solid #5ee2a0;border-radius:10px;background:#173f36;color:#fff;font-weight:700">Créer mon compte</button><button id="mur-cloud-set-password" type="button" hidden style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:#245778;color:white">Definir / changer mon mot de passe</button><button id="mur-cloud-send" type="button" style="padding:11px 13px;border:0;border-radius:10px;background:#fff;color:#07111f;font-weight:700">Recevoir un lien</button><button id="mur-cloud-sync" type="button" hidden style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:#245778;color:white">Synchroniser</button><button id="mur-cloud-logout" type="button" hidden style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:transparent;color:white">Se deconnecter</button><button id="mur-cloud-close" type="button" style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:transparent;color:white">Fermer</button></div>
      <p id="mur-cloud-status" role="status" aria-live="polite" style="font-size:12px;line-height:1.4;margin:12px 0 0;color:#b6f3d2"></p>
      <p style="font-size:11px;color:#b4c5d7;line-height:1.45">Le compte reste connecte sur cet appareil tant que la session est conservee. Pour activer le mot de passe, connectez-vous une derniere fois par e-mail, puis choisissez Definir / changer mon mot de passe. Ne partagez pas votre mot de passe.</p>
    </div>`;
    document.body.appendChild(sheet);
    const close=()=>{sheet.hidden=true;sheet.style.display='none';};
    const openAccount=()=>{
      sheet.hidden=false;
      sheet.style.display='flex';
      refreshAuth();
    };
    // Page Profil : accès stable à la gestion du compte.
    const settings=$('settings');
    const profileCard=settings?.querySelector('.card');
    if(profileCard){
      const group=document.createElement('div');
      group.id='mur-cloud-profile-section';
      group.style.cssText='margin-top:18px;padding-top:15px;border-top:1px solid rgba(255,255,255,.16)';
      group.innerHTML=`<h3 style="margin:0 0 8px;font-size:16px">Mon compte M.U.R.</h3>
        <p id="mur-cloud-profile-status" class="help" style="margin-bottom:10px">Connexion et synchronisation de vos résultats.</p>
        <button id="mur-cloud-profile-open" type="button" class="secondary">Gérer mon compte</button>`;
      profileCard.appendChild(group);
      $('mur-cloud-profile-open').addEventListener('click',openAccount);
    }
    // La présentation vidéo ouvre le panneau explicatif ; ajouter la connexion
    // sous le bouton « Commencer », sans modifier le parcours ni la vidéo.
    const introActions=document.querySelector('#infoModal .info-actions');
    if(introActions){
      const entry=document.createElement('button');
      entry.id='mur-cloud-intro-open';
      entry.type='button';
      entry.textContent='Se connecter à mon compte';
      entry.style.cssText='display:block;width:100%;margin-top:10px;min-height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.42);background:rgba(255,255,255,.1);color:white;font:700 14px system-ui;cursor:pointer';
      introActions.appendChild(entry);
      entry.addEventListener('click',()=>{
        if(typeof window.closeInfoModal==='function')window.closeInfoModal();
        openAccount();
      });
    }

    // Parcours inscription : apres la video, y compris lorsque l'on choisit Passer.
    // Si l'accueil "Bienvenue" est affiche, proposer le compte apres Commencer.
    let onboardingDisplayed=false;
    let introWasVisible=Boolean($('presentation') && !$('presentation').classList.contains('hide'));
    const offerAccountAfterIntro=()=>{
      if(onboardingDisplayed || user || !authReady)return;
      // Attendre que la presentation ait bien disparu, y compris en cas de "Passer".
      setTimeout(()=>{
        if(onboardingDisplayed || user || !authReady)return;
        if($('presentation') && !$('presentation').classList.contains('hide'))return;
        const welcome=$('infoModal');
        if(welcome?.classList.contains('open'))return; // "Commencer" ouvrira le compte.
        onboardingDisplayed=true;
        openAccount();
      },900);
    };
    window.MUROfferAccountAfterIntro=offerAccountAfterIntro;
    const introVideo=$('murIntroVideo');
    if(introVideo){
      introVideo.addEventListener('ended',offerAccountAfterIntro);
      introVideo.addEventListener('error',offerAccountAfterIntro);
    }
    const introSkip=document.querySelector('#presentation .mur-intro-skip');
    if(introSkip)introSkip.addEventListener('click',offerAccountAfterIntro);
    const welcomeStart=document.querySelector('#infoModal .info-close');
    if(welcomeStart)welcomeStart.addEventListener('click',()=>{
      if(introWasVisible && !user && !onboardingDisplayed){
        onboardingDisplayed=true;
        setTimeout(openAccount,0);
      }
    });
    // Dans le cas d'une presentation deja terminee avant l'initialisation du compte.
    if(!introWasVisible && !user && !$('infoModal')?.classList.contains('open'))offerAccountAfterIntro();

    $('mur-cloud-close').addEventListener('click',close);
    sheet.addEventListener('click',e=>{if(e.target===sheet)close();});
    $('mur-cloud-sync').addEventListener('click',syncFromCloud);
    $('mur-cloud-register').addEventListener('click',async()=>{
      if(busy)return;
      const email=String(get('mur-cloud-email')||'').trim();
      const password=String(get('mur-cloud-password')||'');
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        status('Indiquez une adresse e-mail valide.',true);return;
      }
      if(password.length<12){
        status('Choisissez un mot de passe d au moins 12 caracteres.',true);return;
      }
      busy=true; status('Creation de votre compte...');
      try{
        const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});
        if(error)throw error;
        $('mur-cloud-password').value='';
        if(data?.session)status('Compte cree et connecte.');
        else status('Inscription demandee. Si un e-mail de confirmation est envoye, validez-le pour activer le compte.');
      }catch(e){status('Inscription impossible : '+(e.message||e),true);}
      finally{busy=false;}
    });
    $('mur-cloud-login').addEventListener('click',async()=>{
      if(busy)return;
      const email=String(get('mur-cloud-email')||'').trim();
      const password=String(get('mur-cloud-password')||'');
      if(!email||!password){status('Saisissez votre e-mail et votre mot de passe.',true);return;}
      busy=true;status('Connexion...');
      try{
        const {error}=await client.auth.signInWithPassword({email,password});
        if(error)throw error;
        $('mur-cloud-password').value='';
        status('Connecte : vos donnees sont synchronisees.');
      }catch(e){status('Connexion impossible : '+(e.message||e),true);}
      finally{busy=false;}
    });
    $('mur-cloud-set-password').addEventListener('click',async()=>{
      if(busy||!user)return;
      const password=String(get('mur-cloud-password')||'');
      if(password.length<12){status('Choisissez au moins 12 caracteres pour votre mot de passe.',true);return;}
      busy=true;status('Enregistrement du mot de passe...');
      try{
        const {error}=await client.auth.updateUser({password});
        if(error)throw error;
        $('mur-cloud-password').value='';
        status('Mot de passe enregistre. Vos prochains acces pourront se faire sans e-mail.');
      }catch(e){status('Impossible de modifier le mot de passe : '+(e.message||e),true);}
      finally{busy=false;}
    });
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
      if(error)status(error.message,true);else {if($('mur-cloud-password'))$('mur-cloud-password').value='';status('Deconnecte.');}
    });
  }
  function refreshAuth(){
    const connected=!!user;
    ['mur-cloud-email','mur-cloud-email-label','mur-cloud-send','mur-cloud-login','mur-cloud-register'].forEach(id=>{if($(id))$(id).style.display=connected?'none':'';});
    if($('mur-cloud-set-password'))$('mur-cloud-set-password').style.display=connected?'inline-block':'none';
    if($('mur-cloud-password-label'))$('mur-cloud-password-label').textContent=connected?'Definir / modifier mon mot de passe':'Mot de passe';
    if($('mur-cloud-password'))$('mur-cloud-password').autocomplete=connected?'new-password':'current-password';
    ['mur-cloud-sync','mur-cloud-logout'].forEach(id=>{if($(id))$(id).style.display=connected?'inline-block':'none';});
    if($('mur-cloud-description'))$('mur-cloud-description').textContent=connected
      ? 'Connecte : '+(user.email||'compte actif')+'. Synchronisation disponible. Vous pouvez definir ou changer votre mot de passe ci-dessous.'
      : 'Connectez-vous avec votre e-mail et mot de passe ou recevez un lien si vous n avez pas encore defini de mot de passe.';
    if($('mur-cloud-profile-status'))$('mur-cloud-profile-status').textContent=connected
      ? 'Connecté : '+(user.email||'compte actif')+' · synchronisation activée.'
      : 'Non connecté · connectez-vous pour retrouver vos résultats.';
    if($('mur-cloud-profile-open'))$('mur-cloud-profile-open').textContent=connected?'Gérer mon compte et synchroniser':'Se connecter / gérer mon compte';
    if($('mur-cloud-intro-open'))$('mur-cloud-intro-open').textContent=connected?'Mon compte (connecté)':'Se connecter à mon compte';
  }
  async function start(){
    panel();installHooks();
    const {data,error}=await client.auth.getUser();
    if(error)console.info('[MUR Cloud] Pas de session :',error.message);
    user=data?.user||null;authReady=true;refreshAuth();
    if(user)syncFromCloud();
    else if($('presentation')?.classList.contains('hide') && !$('infoModal')?.classList.contains('open')){
      window.MUROfferAccountAfterIntro?.();
    }

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
