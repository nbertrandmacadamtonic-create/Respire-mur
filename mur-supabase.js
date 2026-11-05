/* M.U.R. / Supabase — v1.0 : synchronisation des NOUVEAUX tests.
   Chargement APRES le script principal de index.html.
   Nécessite supabase-js UMD chargé auparavant (voir INSTALLATION_MUR_SUPABASE.txt).
   Aucune clé privée ici. Les données ne sont envoyées qu'après connexion explicite.
*/
(() => {
  'use strict';
  const URL = 'https://iaglscnuynasdvhrqvby.supabase.co';
  const KEY = 'sb_publishable_7RbsvBsF4J3iQF0xVi5M7g_8jfNQ0U_';
  const client = window.supabase?.createClient?.(URL, KEY, {
    auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}
  });
  if (!client) { console.warn('[MUR Cloud] Supabase JS absent.'); return; }
  let user = null;
  let busy = false;
  const $ = id => document.getElementById(id);
  const get = (id) => document.getElementById(id)?.value;
  const zoneKey = (zone) => {
    const z = typeof zone === 'string' ? zone : (zone?.key || zone?.name || '');
    const value = String(z).toLowerCase();
    return ['bleu','vert','orange','rouge'].find(v=>value.includes(v)) || null;
  };
  const profileKey = (p) => {
    const v = String(p || '').toLowerCase();
    return v.includes('fonceur') && !v.includes('funambule') ? 'fonceur'
      : v.includes('pose') && !v.includes('funambule') ? 'pose'
      : 'funambule';
  };
  function status(message, error=false) {
    const node = $('mur-cloud-status');
    if(node) { node.textContent = message; node.style.color = error ? '#ffb4b4' : '#b6f3d2'; }
  }
  async function insert(table, row) {
    if(!user) return;
    const {error} = await client.from(table).insert({...row, user_id:user.id});
    if(error) { console.error('[MUR Cloud]',table,error); status('Sauvegarde cloud impossible : ' + error.message, true); }
    else status('Sauvegarde cloud effectuée.');
  }
  async function saveKis() {
    if(!user || typeof kisResult === 'undefined' || typeof kisAnswers === 'undefined' || !kisResult) return;
    if(!Array.isArray(kisAnswers) || kisAnswers.length !== 15 || kisAnswers.some(v=>v === null)) return;
    return insert('mur_kis_results', {answers:[...kisAnswers], profile:profileKey(kisResult.profile)});
  }
  async function saveNow(answers) {
    if(!user || typeof nowResult === 'undefined' || !nowResult) return;
    if(!Array.isArray(answers) || answers.length !== 4 || answers.some(v=>v == null || v === '')) return;
    return insert('mur_state_results', {
      answers: answers.map(Number), score:Number(nowResult.score), zone:zoneKey(nowResult.zone)
    });
  }
  async function saveProfile() {
    if(!user) return;
    const display_name = String(get('userName') || '').trim().slice(0,100) || null;
    const {error} = await client.from('mur_profiles').upsert({user_id:user.id,display_name},{onConflict:'user_id'});
    if(error) status('Profil cloud non enregistré : ' + error.message,true);
  }
  function wrap(name, before, after) {
    const original = window[name];
    if(typeof original !== 'function') return;
    window[name] = function(...args) {
      const data = before?.();
      const result = original.apply(this,args);
      Promise.resolve().then(()=>after(data)).catch(e=>console.error('[MUR Cloud]',e));
      return result;
    };
  }
  function installHooks() {
    wrap('finishKis',null,()=>saveKis());
    wrap('finishNow',()=>['nowEnergy','nowBreath','nowMind','nowBody'].map(get),saveNow);
    wrap('saveProfile',null,()=>saveProfile());
  }
  function panel() {
    const button = document.createElement('button');
    button.id='mur-cloud-account'; button.type='button';
    button.textContent='Compte'; button.setAttribute('aria-label','Compte M.U.R.');
    button.style.cssText='position:fixed;bottom:78px;right:12px;z-index:9900;border-radius:18px;border:1px solid #ffffff55;background:#142a3e;color:white;padding:9px 12px;font:600 12px system-ui;cursor:pointer';
    document.body.appendChild(button);
    const sheet = document.createElement('section');
    sheet.id='mur-cloud-dialog'; sheet.hidden=true;
    sheet.style.cssText='position:fixed;inset:0;z-index:9901;background:#020916db;display:none;align-items:center;justify-content:center;padding:20px';
    sheet.innerHTML=`<div role="dialog" aria-modal="true" aria-label="Compte M.U.R." style="max-width:380px;width:100%;border:1px solid #ffffff45;border-radius:24px;background:#112238;color:#fff;padding:23px;font:14px system-ui;box-shadow:0 24px 70px #0009">
      <h2 style="margin:0 0 12px">Compte M.U.R.</h2>
      <p id="mur-cloud-description" style="line-height:1.5;color:#d4e2ee;margin:0 0 14px">Connectez-vous pour enregistrer vos nouveaux résultats sur votre compte.</p>
      <label for="mur-cloud-email">Adresse e-mail</label>
      <input id="mur-cloud-email" type="email" autocomplete="email" placeholder="vous@exemple.fr" style="display:block;width:100%;margin:7px 0 12px;padding:12px;border-radius:10px;border:1px solid #ffffff55;background:#091727;color:white" />
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button id="mur-cloud-send" type="button" style="padding:11px 13px;border:0;border-radius:10px;background:#fff;color:#07111f;font-weight:700">Recevoir un lien de connexion</button><button id="mur-cloud-logout" type="button" hidden style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:transparent;color:white">Se déconnecter</button><button id="mur-cloud-close" type="button" style="padding:11px 13px;border:1px solid #ffffff55;border-radius:10px;background:transparent;color:white">Fermer</button></div>
      <p id="mur-cloud-status" role="status" aria-live="polite" style="font-size:12px;line-height:1.4;margin:12px 0 0;color:#b6f3d2"></p>
      <p style="font-size:11px;color:#b4c5d7;line-height:1.45">Vos données restent sur cet appareil tant que vous ne vous connectez pas. La synchronisation des anciens tests n'est pas activée.</p>
    </div>`;
    document.body.appendChild(sheet);
    const close=()=>{ sheet.hidden=true;sheet.style.display='none'; };
    button.addEventListener('click',()=>{sheet.hidden=false;sheet.style.display='flex';refreshAuth();});
    $('mur-cloud-close').addEventListener('click',close);
    sheet.addEventListener('click',e=>{if(e.target===sheet)close();});
    $('mur-cloud-send').addEventListener('click',async()=>{
      if(busy)return;
      const email=String(get('mur-cloud-email')||'').trim();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {status('Saisissez une adresse e-mail valide.',true);return;}
      busy=true;status('Envoi du lien...');
      try {
        const redirect = location.origin + location.pathname;
        const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirect}});
        if(error) throw error;
        status('Lien de connexion envoyé. Consultez vos e-mails.');
      }catch(e){status(e.message||'Erreur de connexion',true);}finally{busy=false;}
    });
    $('mur-cloud-logout').addEventListener('click',async()=>{
      const {error}=await client.auth.signOut();
      if(error)status(error.message,true); else status('Déconnecté.');
    });
    return button;
  }
  function refreshAuth() {
    const connected=!!user;
    const email=$('mur-cloud-email');
    if(email)email.style.display=connected?'none':'block';
    const send=$('mur-cloud-send');if(send)send.style.display=connected?'none':'inline-block';
    const logout=$('mur-cloud-logout');if(logout)logout.style.display=connected?'inline-block':'none';
    const description=$('mur-cloud-description');
    if(description)description.textContent=connected
      ? 'Connecté : '+(user.email||'compte actif')+'. Vos nouveaux tests seront sauvegardés dans Supabase.'
      : 'Connectez-vous pour enregistrer vos nouveaux résultats sur votre compte.';
    const button=$('mur-cloud-account');if(button)button.textContent=connected?'Compte ✓':'Compte';
  }
  async function start() {
    panel(); installHooks();
    const {data,error}=await client.auth.getUser();
    if(error) console.info('[MUR Cloud] Session absente :',error.message);
    user=data?.user||null;refreshAuth();
    client.auth.onAuthStateChange((_event,session)=>{
      user=session?.user||null;refreshAuth();
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.MURCloud={client,getUser:()=>user,saveKis,saveNow,saveProfile};
})();
