/* M.U.R. Supabase v6.0 — synchronisation par compte.
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

  let role = 'visiteur';
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
    // V7 : le bouton « Passer » saute seulement la lecture et conserve
    // le dernier ecran de presentation (Commencer + Inscription).
    // Le lecteur mur-custom.js gere deja l'evenement "ended" : on le
    // declenche sans appeler enterApplication(), qui ouvrirait l'app.
    document.addEventListener('click', event => {
      const skip = event.target.closest?.('#murIntroSkip');
      if (!skip) return;
      const presentation = $('presentation');
      const introVideo = $('murWelcomeVideo2026');
      if (!presentation || presentation.classList.contains('hide') || !introVideo) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      introVideo.dispatchEvent(new Event('ended'));
    }, true);
    // Aucun bouton flottant : le compte vit dans Profil et la connexion
    // est proposee sous « Commencer » apres la video de presentation.
    const sheet=document.createElement('section');
    sheet.id='mur-cloud-dialog';sheet.hidden=true;
    sheet.style.cssText='position:fixed;inset:0;z-index:120000;background:#020916ee;display:none;align-items:center;justify-content:center;padding:20px';
    sheet.innerHTML=`<div role="dialog" aria-modal="true" aria-label="Compte M.U.R." style="max-width:380px;width:100%;border:1px solid #ffffff45;border-radius:24px;background:#112238;color:#fff;padding:23px;font:14px system-ui;box-shadow:0 24px 70px #0009">
      <h2 style="margin:0 0 12px">Compte M.U.R.</h2>
      <p id="mur-cloud-description" style="line-height:1.5;color:#d4e2ee;margin:0 0 14px">Connectez-vous pour retrouver vos resultats sur vos appareils.</p>
      <div id="mur-cloud-tabs" style="display:flex;gap:8px;margin:10px 0 15px">
        <button id="mur-cloud-tab-register" type="button" aria-pressed="true" style="flex:1;padding:11px;border-radius:12px;border:1px solid #84e1be;background:#194d46;color:white">S'inscrire</button>
        <button id="mur-cloud-tab-login" type="button" aria-pressed="false" style="flex:1;padding:11px;border-radius:12px;border:1px solid #ffffff55;background:transparent;color:white">Se connecter</button>
      </div>
      <div id="mur-cloud-name-block"><label for="mur-cloud-name">Prénom ou pseudonyme</label>
      <input id="mur-cloud-name" type="text" autocomplete="nickname" maxlength="100" placeholder="Votre prénom ou pseudonyme" style="display:block;width:100%;box-sizing:border-box;margin:7px 0 12px;padding:12px;border-radius:10px;border:1px solid #ffffff55;background:#091727;color:white" /></div>
      <label id="mur-cloud-email-label" for="mur-cloud-email">Adresse e-mail</label>
      <input id="mur-cloud-email" type="email" autocomplete="email" placeholder="vous@exemple.fr" style="display:block;width:100%;margin:7px 0 12px;padding:12px;border-radius:10px;border:1px solid #ffffff55;background:#091727;color:white" />
      <label id="mur-cloud-password-label" for="mur-cloud-password">Mot de passe</label>
      <input id="mur-cloud-password" type="password" minlength="12" autocomplete="current-password" placeholder="Votre mot de passe" style="display:block;width:100%;margin:7px 0 12px;padding:12px;border-radius:10px;border:1px solid #ffffff55;background:#091727;color:white" />
      <button id="mur-cloud-password-toggle" type="button" aria-controls="mur-cloud-password" aria-pressed="false" aria-label="Afficher le mot de passe" style="display:flex;align-items:center;gap:7px;margin:-4px 0 13px auto;padding:5px 3px;border:0;background:transparent;color:#c2e4f7;font:600 12px system-ui;cursor:pointer"><span aria-hidden="true" id="mur-cloud-password-eye">👁</span><span id="mur-cloud-password-toggle-label">Afficher le mot de passe</span></button>
      <label id="mur-cloud-consent-block" style="display:flex;align-items:flex-start;gap:8px;margin:6px 0 16px;font-size:12px;line-height:1.4"><input type="checkbox" id="mur-cloud-consent" style="margin-top:2px"/> <span>J'accepte les conditions d'utilisation et reconnais avoir pris connaissance de la politique de confidentialité.</span></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button id="mur-cloud-login" type="button" style="padding:11px 13px;border:0;border-radius:10px;background:#fff;color:#07111f;font-weight:700">Se connecter</button><button id="mur-cloud-register" type="button" style="padding:11px 13px;border:1px solid #5ee2a0;border-radius:10px;background:#173f36;color:#fff;font-weight:700">Créer mon compte</button><button id="mur-cloud-set-password" type="button" hidden style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:#245778;color:white">Definir / changer mon mot de passe</button><button id="mur-cloud-send" type="button" style="padding:11px 13px;border:0;border-radius:10px;background:#fff;color:#07111f;font-weight:700">Recevoir un lien</button><button id="mur-cloud-sync" type="button" hidden style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:#245778;color:white">Synchroniser</button><button id="mur-cloud-logout" type="button" hidden style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:transparent;color:white">Se deconnecter</button><button id="mur-cloud-close" type="button" style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:transparent;color:white">Fermer</button></div>
      <button id="mur-cloud-reset" type="button" style="border:0;background:transparent;color:#b5dfff;padding:10px 0;text-decoration:underline;cursor:pointer">Mot de passe oublié ?</button>
      <p id="mur-cloud-role" style="font-size:12px;color:#b6f3d2;display:none"></p>
      <p id="mur-cloud-status" role="status" aria-live="polite" style="font-size:12px;line-height:1.4;margin:12px 0 0;color:#b6f3d2"></p>
      <p style="font-size:11px;color:#b4c5d7;line-height:1.45">Le compte reste connecte sur cet appareil tant que la session est conservee. Pour activer le mot de passe, connectez-vous une derniere fois par e-mail, puis choisissez Definir / changer mon mot de passe. Ne partagez pas votre mot de passe.</p>
    </div>`;
    document.body.appendChild(sheet);
    let accountMode='register';
    const setAccountMode=mode=>{
      accountMode=mode;
      const connected=!!user;
      if($('mur-cloud-tabs'))$('mur-cloud-tabs').style.display=connected?'none':'flex';
      if($('mur-cloud-name-block'))$('mur-cloud-name-block').style.display=!connected&&mode==='register'?'block':'none';
      if($('mur-cloud-consent-block'))$('mur-cloud-consent-block').style.display=!connected&&mode==='register'?'flex':'none';
      if($('mur-cloud-register'))$('mur-cloud-register').style.display=!connected&&mode==='register'?'inline-block':'none';
      if($('mur-cloud-login'))$('mur-cloud-login').style.display=!connected&&mode==='login'?'inline-block':'none';
      if($('mur-cloud-send'))$('mur-cloud-send').style.display=!connected&&mode==='login'?'inline-block':'none';
      if($('mur-cloud-reset'))$('mur-cloud-reset').style.display=!connected&&mode==='login'?'block':'none';
      for(const key of ['register','login']){
        const btn=$('mur-cloud-tab-'+key);
        if(btn){btn.setAttribute('aria-pressed',String(mode===key));btn.style.background=mode===key?'#194d46':'transparent';}
      }
      if($('mur-cloud-password'))$('mur-cloud-password').autocomplete=connected?'new-password':mode==='register'?'new-password':'current-password';
    };
    // Afficher/masquer uniquement le texte saisi, sans jamais recuperer
    // ni afficher un mot de passe conserve sur les serveurs Supabase.
    $('mur-cloud-password-toggle').addEventListener('click',()=>{
      const field=$('mur-cloud-password');
      if(!field)return;
      const shown=field.type==='password';
      field.type=shown?'text':'password';
      $('mur-cloud-password-toggle').setAttribute('aria-pressed',String(shown));
      $('mur-cloud-password-toggle').setAttribute('aria-label',shown?'Masquer le mot de passe':'Afficher le mot de passe');
      $('mur-cloud-password-toggle-label').textContent=shown?'Masquer le mot de passe':'Afficher le mot de passe';
      $('mur-cloud-password-eye').textContent=shown?'🙈':'👁';
    });
    $('mur-cloud-tab-register').addEventListener('click',()=>setAccountMode('register'));
    $('mur-cloud-tab-login').addEventListener('click',()=>setAccountMode('login'));
    $('mur-cloud-reset').addEventListener('click',async()=>{
      const email=String(get('mur-cloud-email')||'').trim();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status('Indiquez votre e-mail pour recevoir un lien de réinitialisation.',true);return;}
      if(busy)return;
      busy=true;
      try{
        const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
        if(error)throw error;
        status('Si ce compte existe, un e-mail de réinitialisation a été envoyé.');
      }catch(e){status(e.message||'Erreur de réinitialisation',true);}finally{busy=false;}
    });
    const close=()=>{sheet.hidden=true;sheet.style.display='none';};
    const openAccount=()=>{
      const passwordField=$('mur-cloud-password');
      if(passwordField)passwordField.type='password';
      const toggle=$('mur-cloud-password-toggle');
      if(toggle){toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Afficher le mot de passe');}
      if($('mur-cloud-password-toggle-label'))$('mur-cloud-password-toggle-label').textContent='Afficher le mot de passe';
      sheet.hidden=false;
      sheet.style.display='flex';
      refreshAuth();
      setAccountMode(user?'login':accountMode);
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

    // Page finale reelle de la video : le bouton Commencer est cree par mur-custom.js.
    // Ajouter la connexion a cet endroit precis, sans toucher au HTML ni au lecteur.
    const installFinalVideoAccountButton=()=>{
      const commencer=$('murCommencer');
      if(!commencer || $('mur-cloud-video-account'))return;
      const frame=commencer.parentElement;
      if(!frame)return;
      // Degager la place sous Commencer : le second bouton se pose au bas du film.
      commencer.style.bottom='calc(105px + env(safe-area-inset-bottom))';
      const entry=document.createElement('button');
      entry.id='mur-cloud-video-account';
      entry.type='button';
      entry.textContent=user?'Mon compte':'Se connecter / S’inscrire';
      entry.setAttribute('aria-label','Se connecter ou créer un compte M.U.R.');
      entry.style.cssText=[
        'position:absolute','left:50%',
        'bottom:calc(38px + env(safe-area-inset-bottom))',
        'transform:translateX(-50%)','display:none','z-index:6',
        'width:max-content','min-width:200px','max-width:calc(100% - 32px)',
        'min-height:50px','padding:10px 15px','border-radius:999px',
        'border:1px solid rgba(255,255,255,.72)',
        'background:rgba(9,24,43,.83)','color:#fff',
        'font:750 14px system-ui,sans-serif','cursor:pointer',
        'box-shadow:0 8px 24px rgba(0,0,0,.3)',
        'backdrop-filter:blur(10px)'
      ].join(';');
      entry.addEventListener('click',event=>{
        event.preventDefault(); event.stopPropagation();
        openAccount();
      });
      frame.appendChild(entry);
      const updateVisibility=()=>{
        const finalVisible=commencer.style.display!=='none' &&
          !($('presentation')?.classList.contains('hide'));
        entry.style.display=finalVisible?'block':'none';
      };
      new MutationObserver(updateVisibility).observe(commencer,{attributes:true,attributeFilter:['style']});
      new MutationObserver(updateVisibility).observe($('presentation'),{attributes:true,attributeFilter:['class']});
      updateVisibility();
    };
    installFinalVideoAccountButton();
    // Le lecteur peut etre reconstruit par mur-custom.js : conserver ce point de montage.
    const videoPresentation=$('presentation');
    if(videoPresentation){
      const videoMountObserver=new MutationObserver(()=>installFinalVideoAccountButton());
      videoMountObserver.observe(videoPresentation,{childList:true,subtree:true});
    }

    // Le visiteur reste libre d'utiliser le mode découverte : aucune ouverture
    // automatique du formulaire après le bouton « Commencer ».
    window.MUROfferAccountAfterIntro=()=>{};

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
      const displayName=String(get('mur-cloud-name')||'').trim();
      if(!displayName){status('Indiquez un prénom ou un pseudonyme.',true);return;}
      if(!$('mur-cloud-consent')?.checked){status('Veuillez accepter les conditions et prendre connaissance de la confidentialité.',true);return;}
      busy=true; status('Création de votre compte...');
      try{
        const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname,data:{display_name:displayName}}});
        if(error)throw error;
        $('mur-cloud-password').value='';
        if(data?.session){
          const {error:profileError}=await client.from('mur_profiles').upsert({user_id:data.user.id,display_name:displayName},{onConflict:'user_id'});
          if(profileError)console.warn('[MUR Cloud] Profil:',profileError.message);
          status('Compte créé et connecté.');
        }
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
        status('Connecté : vos données sont synchronisées.');
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
    ['mur-cloud-email','mur-cloud-email-label'].forEach(id=>{if($(id))$(id).style.display=connected?'none':'';});
    if($('mur-cloud-set-password'))$('mur-cloud-set-password').style.display=connected?'inline-block':'none';
    if($('mur-cloud-tabs'))$('mur-cloud-tabs').style.display=connected?'none':'flex';
    if(connected){for(const id of ['mur-cloud-login','mur-cloud-register','mur-cloud-send','mur-cloud-reset','mur-cloud-name-block','mur-cloud-consent-block'])if($(id))$(id).style.display='none';}
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
    if($('mur-cloud-video-account'))$('mur-cloud-video-account').textContent=connected?'Mon compte':'Se connecter / S’inscrire';
    if($('mur-cloud-role')){ $('mur-cloud-role').style.display=connected?'block':'none'; $('mur-cloud-role').textContent='Statut : '+(role==='superadmin'?'Super-administrateur':role==='admin'?'Administrateur':'Utilisateur inscrit'); }
  }
  async function loadRole(){
    if(!user){role='visiteur';refreshAuth();return;}
    role='utilisateur';
    try{
      const {data,error}=await client.rpc('mur_my_role');
      if(!error && ['utilisateur','admin','superadmin'].includes(data))role=data;
      else if(error)console.info('[MUR Cloud] Fonction rôle non installée :',error.message);
    }catch(e){console.warn('[MUR Cloud] Lecture du rôle:',e);}
    refreshAuth();
  }
  async function start(){
    panel();installHooks();
    const {data,error}=await client.auth.getUser();
    if(error)console.info('[MUR Cloud] Pas de session :',error.message);
    user=data?.user||null;authReady=true;refreshAuth();
    await loadRole();
    if(user)syncFromCloud();
    else if($('presentation')?.classList.contains('hide') && !$('infoModal')?.classList.contains('open')){
      window.MUROfferAccountAfterIntro?.();
    }

    client.auth.onAuthStateChange((event,session)=>{
      const previous=user?.id||null;
      user=session?.user||null;refreshAuth();
      void loadRole();
      if(user && (previous!==user.id || (event==='SIGNED_IN'&&lastSyncUser!==user.id)))setTimeout(syncFromCloud,0);
      if(!user)lastSyncUser=null;
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.MURCloud={client,getUser:()=>user,getRole:()=>role,saveKis,saveNow,saveProfile,sync:syncFromCloud};
})();
