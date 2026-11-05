/* M.U.R. - Annuaire des utilisateurs dans le back-office.
 * Necessite SQL MUR_admin_utilisateurs.sql et @supabase/supabase-js UMD.
 * N'utilise que la cle PUBLIQUE ; l'autorisation est validee par Supabase (RPC).
 * Ne publie aucun resultat de questionnaire ; uniquement les comptes et les volumes.
 */
(() => {
  'use strict';
  const URL = 'https://iaglscnuynasdvhrqvby.supabase.co';
  const KEY = 'sb_publishable_7RbsvBsF4J3iQF0xVi5M7g_8jfNQ0U_';
  const client = window.supabase?.createClient?.(URL, KEY, {
    auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}
  });
  if (!client) return console.error('[MUR Admin] Bibliotheque Supabase absente');

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g,
    ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dt = value => value ? new Intl.DateTimeFormat('fr-FR',{
    dateStyle:'short',timeStyle:'short'
  }).format(new Date(value)) : 'Jamais';
  let users = [], connected = null;
  let loading = false;

  function mount(){
    const section = $('users');
    if(!section) return console.error('[MUR Admin] Section utilisateurs introuvable');
    section.innerHTML = `
      <style>#users [hidden]{display:none!important}</style>
      <h1>Inscriptions et utilisateurs</h1>
      <p class="hint">Annuaire sécurisé des comptes M.U.R. enregistrés dans Supabase Authentication.
      Les réponses individuelles aux tests restent privées.</p>
      <div class="card" id="mur-admin-login-card">
        <h2>Accès administrateur</h2>
        <p class="hint" id="mur-admin-who">Vérification de la session…</p>
        <div id="mur-admin-fields" class="fields">
          <div class="field"><label for="mur-admin-email">Adresse e-mail</label>
            <input id="mur-admin-email" type="email" autocomplete="email" /></div>
          <div class="field"><label for="mur-admin-password">Mot de passe</label>
            <input id="mur-admin-password" type="password" autocomplete="current-password" /></div>
        </div>
        <div class="tools">
          <button class="btn primary" id="mur-admin-login" type="button">Se connecter</button>
          <button class="btn" id="mur-admin-refresh" type="button" hidden>Actualiser</button>
          <button class="btn" id="mur-admin-logout" type="button" hidden>Se déconnecter</button>
        </div>
        <p class="status" id="mur-admin-message" role="status" aria-live="polite"></p>
      </div>
      <div id="mur-admin-data" hidden>
        <div class="grid" style="margin-top:14px">
          <article class="card"><div class="num" id="mur-admin-total">0</div>Comptes inscrits</article>
          <article class="card"><div class="num" id="mur-admin-with-kis">0</div>Comptes ayant un ki.S</article>
          <article class="card"><div class="num" id="mur-admin-with-state">0</div>Comptes ayant un Ici & Maintenant</article>
        </div>
        <div class="card">
          <div class="itemtop"><h2>Liste des utilisateurs</h2><span class="pill" id="mur-admin-count">0</span></div>
          <div class="field"><label for="mur-admin-search">Rechercher</label>
            <input id="mur-admin-search" type="search" placeholder="E-mail ou pseudonyme" /></div>
          <div id="mur-admin-list" style="margin-top:14px;overflow:auto"></div>
          <p class="hint">Les dates de connexion dépendent des informations fournies par Supabase Auth.
          Aucun résultat détaillé n'est visible ici.</p>
        </div>
      </div>`;
    $('mur-admin-login').addEventListener('click',login);
    $('mur-admin-refresh').addEventListener('click',loadUsers);
    $('mur-admin-logout').addEventListener('click',logout);
    $('mur-admin-search').addEventListener('input',renderUsers);
    $('mur-admin-password').addEventListener('keydown',e=>{if(e.key==='Enter')login();});
  }
  function message(s,error=false){
    const el=$('mur-admin-message');if(!el)return;
    el.textContent=s;el.style.color=error?'#ffb4b4':'#a7f3d0';
  }
  function renderAuth(){
    const ready=!!connected;
    $('mur-admin-fields').hidden=ready;
    $('mur-admin-login').hidden=ready;
    $('mur-admin-refresh').hidden=!ready;
    $('mur-admin-logout').hidden=!ready;
    $('mur-admin-who').textContent=ready
      ? 'Connecté : '+(connected.email||'compte actif')+' — vérification des droits administrateur côté serveur.'
      : 'Connectez-vous avec le compte M.U.R. autorisé comme administrateur.';
    if(!ready){$('mur-admin-data').hidden=true;users=[];}
  }
  async function login(){
    if(loading)return;
    const email=$('mur-admin-email').value.trim();
    const password=$('mur-admin-password').value;
    if(!email||!password)return message('Renseignez e-mail et mot de passe.',true);
    loading=true;message('Connexion…');
    try{
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;
      $('mur-admin-password').value='';
      await refreshUser();
    }catch(e){message('Connexion impossible : '+(e.message||e),true);}
    finally{loading=false;}
  }
  async function logout(){
    const {error}=await client.auth.signOut();
    if(error)return message(error.message,true);
    connected=null;renderAuth();message('Déconnecté.');
  }
  async function refreshUser(){
    const {data,error}=await client.auth.getUser();
    connected=error?null:(data?.user||null);
    renderAuth();
    if(connected)await loadUsers();
  }
  async function loadUsers(){
    if(!connected)return;
    message('Chargement des utilisateurs…');
    const {data,error}=await client.rpc('mur_admin_list_users');
    if(error){
      $('mur-admin-data').hidden=true;
      message(error.code==='42501'
        ? 'Accès refusé. Ajoutez votre compte dans mur_admins avec le script SQL.'
        : 'Impossible de charger la liste : '+error.message,true);
      return;
    }
    users=Array.isArray(data)?data:[];
    $('mur-admin-data').hidden=false;
    $('mur-admin-total').textContent=users.length;
    $('mur-admin-with-kis').textContent=users.filter(u=>Number(u.kis_count)>0).length;
    $('mur-admin-with-state').textContent=users.filter(u=>Number(u.state_count)>0).length;
    renderUsers();message('Liste actualisée.');
  }
  function renderUsers(){
    const q=String($('mur-admin-search')?.value||'').toLocaleLowerCase('fr');
    const filtered=users.filter(u=>((u.email||'')+' '+(u.display_name||''))
      .toLocaleLowerCase('fr').includes(q));
    $('mur-admin-count').textContent=filtered.length+' / '+users.length;
    const list=$('mur-admin-list');
    if(!filtered.length){list.innerHTML='<p class="hint">Aucun compte correspondant.</p>';return;}
    list.innerHTML=`<table style="width:100%;border-collapse:collapse;min-width:650px;text-align:left;font-size:12px">
      <thead><tr><th style="padding:10px">Utilisateur</th><th>Création</th><th>Dernière connexion</th>
      <th>ki.S</th><th>Ici & Maintenant</th></tr></thead>
      <tbody>${filtered.map(u=>`<tr style="border-top:1px solid #ffffff24">
        <td style="padding:10px"><strong>${esc(u.display_name||'—')}</strong>
          <div style="color:#adc0d3;overflow-wrap:anywhere">${esc(u.email||'E-mail non renseigné')}</div></td>
        <td>${esc(dt(u.created_at))}</td><td>${esc(dt(u.last_sign_in_at))}</td>
        <td>${Number(u.kis_count)||0}</td><td>${Number(u.state_count)||0}</td></tr>`).join('')}</tbody>
      </table>`;
  }
  async function start(){
    mount();if(!$('mur-admin-login'))return;
    client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){connected=null;renderAuth();}
      if(event==='SIGNED_IN'){setTimeout(refreshUser,0);}
    });
    await refreshUser();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
