/* M.U.R. V57 — Souffle vivant, inspiration silencieuse.
   Déploiement non destructif : surcharge uniquement l'entrée murStartQuickMode.
   1200 points 3D : surface régulière + cœur structuré en couronnes concentriques, inertie au relâchement.
   Score provisoire : 7 expirations de 8 s (56 s cumulées) = 100 %.
   La progression reste conservée entre les expirations. Aucun diagnostic médical.
*/
(()=>{
  'use strict';
  if(window.MURSOUFFLEVIVANT21)return;
  const VERSION='22.9-score-bonus-inspiration-silencieuse-V57';
  const COUNT=1200, REFERENCE_EXHALE_SECONDS=8, REFERENCE_EXHALES=7;
  const GOAL=REFERENCE_EXHALE_SECONDS*REFERENCE_EXHALES; // 56 s = 100 % du score ; en mode 90 s, bonus possible au-delà.
  const fingerprint='<svg aria-hidden="true" viewBox="0 0 48 48" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M10 23c0-9 6-15 14-15s14 6 14 15"/><path d="M15 26v-3c0-6 4-10 9-10s9 4 9 10v5"/><path d="M20 30v-7a4 4 0 0 1 8 0v9"/><path d="M11 31v-7"/><path d="M16 35c3-4 3-7 3-11"/><path d="M24 22v8c0 6-2 10-5 13"/><path d="M32 34c-1 5-3 8-5 10"/><path d="M37 29c0 6-2 11-5 15"/></svg>';
  const speakerOn='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5a9.5 9.5 0 0 1 0 14"/></svg>';
  const speakerOff='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/></svg>';
  const resetIcon='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11a9 9 0 1 1 2.7 6.5"/><path d="M3 4v7h7"/></svg>';
  const css=`
   #murSV21{position:fixed;inset:0;z-index:10030;background:radial-gradient(ellipse at 50% 37%,#15344a 0%,#091d31 50%,#061220 100%);color:#eaf7ff;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',system-ui,sans-serif;overflow:hidden;overscroll-behavior:none;touch-action:manipulation}
   #murSV21 *{box-sizing:border-box}
   /* M.U.R. : on réutilise exactement le menu inférieur de l'application. */
   body.mur-sv-active .tabbar{z-index:10045!important;opacity:1!important;pointer-events:auto!important;transform:translateX(-50%)!important}
   /* Tap sur la sphere : le menu natif s'efface quelques secondes, puis revient. */
   body.mur-sv-active .tabbar{transition:opacity .28s ease,visibility .28s ease,transform .28s ease!important}
   body.mur-sv-active.mur-sv-menu-hidden .tabbar{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:translateX(-50%) translateY(76px)!important}
   body.mur-sv-active .tabbar #navBreath:not(.locked){background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(237,242,250,.92));color:#07111f;box-shadow:0 12px 28px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.96)}
   body.mur-sv-active .tabbar #navBreath:not(.locked) .nav-ico{background:linear-gradient(180deg,rgba(7,12,24,.98),rgba(24,34,53,.98))}
   #murSV21 .sv-shell{padding-bottom:calc(80px + env(safe-area-inset-bottom));width:min(100%,520px)}
   #murSV21 .sv-top{height:42px;border-bottom:1px solid rgba(255,255,255,.10);padding-bottom:8px;margin-bottom:4px}
   #murSV21 .sv-mark{display:flex;align-items:center;gap:9px;font-size:14px;letter-spacing:.015em;font-weight:650;color:#f0f9fe}
   #murSV21 .sv-brand-orb{width:32px;height:32px;border:1px solid rgba(124,232,197,.62);border-radius:50%;background:radial-gradient(circle at 35% 30%,#57e4b6,#164b61 72%);box-shadow:0 0 15px rgba(59,214,165,.23);color:#f4fff9;display:grid;place-items:center;font-size:15px;font-weight:800;flex-shrink:0;cursor:pointer}
   #murSV21 .sv-top-actions{gap:8px}
   #murSV21 .sv-info-trigger{width:34px;height:34px}
   #murSV21 .sv-main-card{width:100%;max-width:470px;min-height:0;display:flex;flex-direction:column;align-items:center;flex:1 1 0;overflow:hidden;border:1px solid rgba(125,183,202,.17);background:linear-gradient(180deg,rgba(27,58,77,.50),rgba(10,29,46,.16));border-radius:20px;padding:7px 10px 5px;box-shadow:inset 0 1px 0 rgba(255,255,255,.045)}
   #murSV21 .sv-main-card .sv-canvas{min-height:0}
   #murSV21 .sv-shell>.sv-main-card h2{margin-top:1px}
   #murSV21 .sv-foot{margin-top:4px}
   #murSV21 .sv-results-backdrop,#murSV21 .sv-info-backdrop{bottom:calc(70px + env(safe-area-inset-bottom));padding-bottom:8px}
   #murSV21 .sv-results-card{max-height:100%;padding:clamp(12px,2vh,19px)}
   @media(max-height:720px){#murSV21 .sv-shell{padding-bottom:calc(74px + env(safe-area-inset-bottom))}#murSV21 .sv-main-card{padding:4px 7px}#murSV21 .sv-top{height:37px}#murSV21 .sv-results-explain{margin:8px 1px}#murSV21 .sv-results-grid{gap:5px}}
   @media(max-height:590px){#murSV21 .sv-results-card{padding:9px}#murSV21 .sv-results-percent{font-size:39px;margin:3px 0}#murSV21 .sv-results-stat{padding:5px}#murSV21 .sv-results-card h3{margin:3px 0}}

   #murSV21 .sv-shell{width:min(100%,450px);height:100%;height:100dvh;min-height:0;margin:auto;padding:calc(9px + env(safe-area-inset-top)) 16px calc(8px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;overflow:hidden;gap:0}
   #murSV21 .sv-top{display:flex;justify-content:space-between;align-items:center;width:100%;gap:12px;flex:none;height:30px}
   #murSV21 .sv-mark{font-size:11px;letter-spacing:.13em;color:#b5d4dc}
   #murSV21 .sv-top-actions{display:flex;align-items:center;gap:6px;flex:none}
   #murSV21 .sv-top-link{border:1px solid #456b7f;border-radius:999px;color:#dcecf5;background:#102b3e;padding:5px 9px;min-height:30px;font-size:10px;white-space:nowrap;cursor:pointer}
   #murSV21 .sv-info-trigger{width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;border:1px solid rgba(255,255,255,.36)!important;border-radius:10px!important;background:rgba(10,32,52,.84)!important;color:#fff!important;font-family:Arial,sans-serif!important;font-weight:800!important;font-size:19px!important;line-height:1!important;display:grid!important;place-items:center!important;box-shadow:0 5px 18px rgba(0,0,0,.30)!important;flex:none!important;cursor:pointer;touch-action:manipulation}
   #murSV21 .sv-close{border:1px solid #567b89;border-radius:50%;color:#e2f3f9;background:#112b3d;width:30px;height:30px;font-size:19px;flex:none}
   #murSV21 h2{margin:3px 0 0;font-size:clamp(19px,3.5vh,25px);font-weight:500;letter-spacing:-.03em;text-align:center;line-height:1.12;flex:none}
   #murSV21 .sv-sub{font-size:11px;color:#a6c5d2;text-align:center;margin:2px 0 0;line-height:1.2;flex:none}
   #murSV21 .sv-options{display:flex;gap:8px;justify-content:center;margin:7px 0 3px;flex:none}
   #murSV21 .sv-option{color:#bad7e3;background:#10283a;border:1px solid #3b6475;padding:6px 13px;border-radius:999px;min-width:108px;font-size:12px;min-height:30px}
   #murSV21 .sv-option[aria-pressed="true"]{background:#185d56;border-color:#77efc9;color:#f5fffa;box-shadow:0 0 14px #34daa52a}
   #murSV21 .sv-timer{font-variant-numeric:tabular-nums;font-size:22px;font-weight:350;color:#e4f5fd;margin:2px 0 0;line-height:1.1;flex:none}
   #murSV21 .sv-scorebox{width:100%;max-width:360px;margin:5px auto 0;flex:none}
   #murSV21 .sv-scoreline{display:flex;justify-content:space-between;font-size:11px;color:#b1cdd6;margin:0 1px 4px}
   #murSV21 .sv-scoreline strong{color:#80f1b9;font-weight:600}
   #murSV21 .sv-track{height:5px;border-radius:7px;background:#254154;overflow:hidden}
   #murSV21 .sv-fill{height:100%;width:0;background:linear-gradient(90deg,#279e88,#94efb6);border-radius:7px}
   #murSV21 .sv-canvas{display:block;width:100%;height:0;min-height:0;max-height:none;flex:1 1 0;pointer-events:auto;touch-action:manipulation;cursor:pointer}
   #murSV21 .sv-canvas:focus-visible{outline:2px solid #79dabb;outline-offset:-3px}
   #murSV21 .sv-state{height:17px;min-height:17px;font-size:11px;color:#acc6d4;text-align:center;flex:none;line-height:17px}
   #murSV21 .sv-finger{flex:none;width:clamp(60px,10vh,80px);height:clamp(60px,10vh,80px);display:grid;place-items:center;color:#a1ffe0;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;background:radial-gradient(circle at 50% 40%,#1b5f55,#0c2b36 76%);border:1px solid #7de5c1;border-radius:50%;box-shadow:0 0 23px #33d39e31,inset 0 0 18px #66d6ac14;cursor:pointer;margin-top:1px;transition:box-shadow .12s,background .12s}
   #murSV21 .sv-finger svg{width:45%;height:45%}
   #murSV21 .sv-finger.sv-down{background:radial-gradient(circle,#278f70,#125445 76%);box-shadow:0 0 30px #4aeab388,inset 0 0 18px #8bffbc30}
   #murSV21 .sv-cta{margin-top:4px;font-size:13px;font-weight:600;text-align:center;flex:none;line-height:1.1}
   #murSV21 .sv-hint{margin-top:2px;font-size:11px;color:#a6c1d0;text-align:center;flex:none;line-height:1.1}
   #murSV21 .sv-foot{display:flex;flex:none;flex-direction:column;align-items:center;gap:5px;width:100%;margin-top:7px}
   #murSV21 .sv-meta{font-size:11px;color:#b0cfdb;font-variant-numeric:tabular-nums}
   #murSV21 .sv-actions{display:flex;gap:6px;justify-content:center;flex-wrap:nowrap;width:100%}
   #murSV21 .sv-action{border:1px solid #628391;border-radius:10px;background:#143245;color:#ecfbff;padding:8px 9px;font-size:12px;white-space:nowrap;flex:0 1 auto;min-height:34px}
   /* Commandes visuelles : même zone tactile, icônes accessibles et sans texte. */
   #murSV21 .sv-action.sv-icon-action{width:44px;height:38px;min-height:38px;padding:7px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 44px;border-radius:13px;touch-action:manipulation;transition:background .2s ease,border-color .2s ease,color .2s ease}
   #murSV21 .sv-icon-action svg{width:21px;height:21px;display:block;pointer-events:none}
   #murSV21 #svSound[aria-pressed="true"]{background:#195d53;border-color:#5ad8b4;color:#d5fff1}
   #murSV21 #svSound[aria-pressed="false"]{background:#283545;border-color:#64778c;color:#a7b8c7}
   #murSV21 #svReset{background:#193246;border-color:#628391;color:#d9effb}
   #murSV21 .sv-icon-action:focus-visible{outline:2px solid #a5e9d3;outline-offset:3px}
   
   #murSV21 .sv-note{font-size:9px;color:#85a5b5;text-align:center;max-width:350px;line-height:1.2;margin:0}
   #murSV21 .sv-finished{color:#85f5b7}
   #murSV21 .sv-info-backdrop{position:absolute;inset:0;z-index:12;background:rgba(1,10,22,.79);display:flex;align-items:center;justify-content:center;padding:calc(12px + env(safe-area-inset-top)) 16px calc(12px + env(safe-area-inset-bottom));backdrop-filter:blur(10px)}
   #murSV21 .sv-info-backdrop[hidden]{display:none}
   #murSV21 .sv-info-card{width:min(100%,390px);max-height:100%;overflow:auto;border:1px solid #60b6a5;border-radius:20px;background:linear-gradient(165deg,#163747,#0a2033);box-shadow:0 25px 65px #0009;padding:clamp(13px,2.5vh,20px);color:#eaf7ff}
   #murSV21 .sv-info-heading{display:flex;justify-content:space-between;gap:12px;align-items:center}
   #murSV21 .sv-info-heading h3{font-size:18px;margin:0;font-weight:600}
   #murSV21 .sv-info-card p{font-size:clamp(12px,1.7vh,14px);line-height:1.42;color:#c5e2e9;margin:10px 0}
   #murSV21 .sv-info-card strong{color:#9bf4c6}
   #murSV21 .sv-info-note{border-top:1px solid #3f7180;padding-top:9px;color:#a8c4cf!important;font-size:11px!important}
   #murSV21 .sv-info-ok{width:100%;border:1px solid #80e5b5;border-radius:12px;background:#227b68;color:white;font-weight:650;min-height:38px;cursor:pointer}
   #murSV21 .sv-results-backdrop{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;background:rgba(1,10,22,.79);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:16px calc(14px + env(safe-area-inset-right))}
   #murSV21 .sv-results-backdrop[hidden]{display:none}
   #murSV21 .sv-results-card{width:min(100%,390px);max-height:calc(100dvh - 32px);overflow:auto;background:linear-gradient(165deg,#143949,#0c2135 68%,#0b1727);border:1px solid rgba(132,244,194,.5);border-radius:22px;padding:clamp(16px,3vh,24px);box-shadow:0 30px 70px #0008,0 0 40px #22cc9721;text-align:center}
   #murSV21 .sv-results-label{font-size:11px;color:#99c5d0;letter-spacing:.16em;font-weight:600}
   #murSV21 .sv-results-card h3{font-size:clamp(21px,3.5vh,27px);font-weight:600;color:#edfaff;margin:9px 0 5px;line-height:1.15}
   #murSV21 .sv-results-percent{font-size:clamp(48px,9vh,72px);font-variant-numeric:tabular-nums;font-weight:650;color:#8cf6c1;line-height:1.05;margin:11px 0 2px;text-shadow:0 0 28px #4bdca04a}
   #murSV21 .sv-results-progress{height:7px;background:#243f4f;border-radius:8px;overflow:hidden;margin:14px 0}
   #murSV21 .sv-results-progress span{display:block;height:100%;width:0;background:linear-gradient(90deg,#28ac94,#9ff2bd);border-radius:8px}
   #murSV21 .sv-results-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}
   #murSV21 .sv-results-stat{border:1px solid #356073;background:#0d2739;border-radius:12px;padding:10px 5px}
   #murSV21 .sv-results-stat b{display:block;font-size:clamp(17px,3vh,22px);font-weight:650;color:#edfaff;font-variant-numeric:tabular-nums}
   #murSV21 .sv-results-stat small{display:block;margin-top:4px;color:#a0cad4;font-size:10px;line-height:1.2}
   #murSV21 .sv-results-explain{font-size:11px;line-height:1.4;color:#a5bfc9;margin:13px 1px 16px}
   #murSV21 .sv-results-buttons{display:flex;gap:9px;justify-content:center}
   #murSV21 .sv-results-buttons button{flex:1;border:1px solid #64889b;background:#12354a;color:#e8f9ff;border-radius:12px;min-height:43px;padding:10px 8px;font-size:12px;font-weight:600}
   #murSV21 .sv-results-buttons .sv-results-primary{background:#268870;border-color:#80e5b5;color:white}

   @media(max-width:380px){#murSV21 .sv-top-link{font-size:9px;padding:5px 7px}#murSV21 .sv-mark{font-size:10px;letter-spacing:.08em}#murSV21 .sv-results-buttons button{font-size:11px;padding:8px 3px}}
   @media(max-height:740px){#murSV21 .sv-shell{padding-top:calc(5px + env(safe-area-inset-top));padding-bottom:calc(5px + env(safe-area-inset-bottom))}#murSV21 .sv-note{display:none}#murSV21 .sv-options{margin-top:4px}#murSV21 .sv-foot{margin-top:4px;gap:4px}}
   @media(max-height:590px){#murSV21 .sv-sub{display:none}#murSV21 .sv-finger{width:54px;height:54px}#murSV21 .sv-cta{font-size:12px}#murSV21 .sv-hint{font-size:10px}#murSV21 .sv-option{min-height:27px;padding:4px 11px}#murSV21 .sv-action{min-height:30px;padding:6px 8px}#murSV21 .sv-timer{font-size:19px}}
   /* V21.13 : réserver physiquement la hauteur du menu fixe (60px + marges + safe area).
      La hauteur disponible du contenu diminue : la barre ne peut plus couvrir les commandes. */
   body.mur-sv-active #murSV21 .sv-shell{
     height:calc(100dvh - 80px - env(safe-area-inset-bottom))!important;
     max-height:calc(100dvh - 80px - env(safe-area-inset-bottom))!important;
     padding-bottom:5px!important;
   }
   body.mur-sv-active #murSV21 .sv-main-card{min-height:0;overflow:hidden}
   body.mur-sv-active #murSV21 .sv-canvas{min-height:0;flex-shrink:1}
   body.mur-sv-active #murSV21 .sv-foot{flex-shrink:0}
   @media(max-height:700px){
     body.mur-sv-active #murSV21 .sv-shell{height:calc(100dvh - 77px - env(safe-area-inset-bottom))!important;max-height:calc(100dvh - 77px - env(safe-area-inset-bottom))!important}
     body.mur-sv-active #murSV21 .sv-main-card{padding-top:3px;padding-bottom:3px}
     body.mur-sv-active #murSV21 .sv-finger{width:clamp(52px,8.2vh,68px);height:clamp(52px,8.2vh,68px)}
     body.mur-sv-active #murSV21 .sv-options{margin-top:3px}
     body.mur-sv-active #murSV21 .sv-foot{gap:3px;margin-top:3px}
   }
   @media(prefers-reduced-motion:reduce){#murSV21 .sv-finger{transition:none}}
  `;
  let escaped=[],lastGreen=0,clock=0;
  let activeTabbar=null;
  let menuRestoreTimer=0;
  const MENU_HIDE_MS=6500;
  function restoreTabbar(){
    if(menuRestoreTimer){clearTimeout(menuRestoreTimer);menuRestoreTimer=0;}
    document.body.classList.remove('mur-sv-menu-hidden');
    window.murRestoreNav?.();
  }
  function temporarilyHideTabbar(){
    if(!overlay||get('svInfo')?.hidden===false||get('svResults')?.hidden===false)return;
    if(typeof window.murTemporarilyHideNav==='function'){
      window.murTemporarilyHideNav();
      return;
    }
    document.body.classList.add('mur-sv-menu-hidden');
    if(menuRestoreTimer)clearTimeout(menuRestoreTimer);
    menuRestoreTimer=window.setTimeout(restoreTabbar,MENU_HIDE_MS);
  }
  const onTabbarNavigation=()=>{if(overlay)close();};
  let overlay=null,raf=0,prev=0,mode='timed',started=false,ended=false,down=false,pointer=null,elapsed=0,breath=0,cycles=0,angular=0,angle=.3,hiddenBefore=null;
  // 1 200 points exactement : 900 points de surface + 300 points
  // sur trois sphères concentriques. Le cœur reste géométrique, pas nuageux.
  // Les particules rouges/bleues quittant le cœur sont des traînées visuelles
  // temporaires (copie d'une particule convertie), sans modifier le score.
  const pts=[];
  const GOLD=Math.PI*(3-Math.sqrt(5));
  const OUTER=900, INNER=COUNT-OUTER;
  const innerRadii=[.29,.52,.74];
  for(let i=0;i<COUNT;i++){
    const surface=i<OUTER;
    const index=surface?i:i-OUTER;
    const shell=surface?0:Math.floor(index/100);
    const j=surface?index:index%100;
    const n=surface?OUTER:100;
    const y=1-2*(j+.5)/n;
    const a=j*GOLD+(surface?0:shell*.89+.42);
    const eq=Math.sqrt(Math.max(0,1-y*y));
    const radius=surface?1:innerRadii[shell];
    pts.push({x:radius*eq*Math.cos(a),y:radius*y,z:radius*eq*Math.sin(a),radius,
      outer:surface,greenRank:surface?INNER+((index*337)%OUTER):((index*173)%INNER),
      blue:((i*67+11)%17)<5,phase:((i*37)%101)/101});
  }
  const byRank=new Array(COUNT);
  for(const p of pts)byRank[p.greenRank]=p;
  const get=id=>overlay?.querySelector('#'+id);
  const isEnglish=()=>document.documentElement.lang.toLowerCase().startsWith('en');
  const t=(fr,en)=>isEnglish()?en:fr;
  // Sons synthetiques adaptes de la fonction playBreathSound de la respiration M.U.R.
  // Expiration sonore uniquement (doigt maintenu) ; inspiration silencieuse.
  // Se declenchent exclusivement apres une interaction de l'utilisateur.
  let soundOn=true, soundCtx=null, soundMaster=null, activeBreathSound=null;
  function ensureSound(){
    if(!soundOn)return null;
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return null;
    if(!soundCtx){soundCtx=new Ctx();soundMaster=soundCtx.createGain();soundMaster.gain.value=.55;soundMaster.connect(soundCtx.destination);}
    if(soundCtx.state==='suspended')soundCtx.resume().catch(()=>{});
    return soundCtx;
  }
  function stopPhaseSound(){
    if(!activeBreathSound)return;
    const s=activeBreathSound;activeBreathSound=null;
    try{const t=s.ctx.currentTime;s.g.gain.cancelScheduledValues(t);s.g.gain.setTargetAtTime(.0001,t,.065);s.node.stop(t+.25);}catch(_){}
  }
  function playPhaseSound(type){
    stopPhaseSound();
    // Inspiration : silence. L'expiration déclenche seule le son.
    if(type!=='expire')return;
    const ctx=ensureSound();if(!ctx)return;
    // Mêmes paramètres que le son respiratoire M.U.R. :
    // bruit blanc amplitude .7, filtre passe-bande Q=.8, gain maître .55.
    // Expiration : fréquence décroissante 760 -> 360 Hz.
    const duration=8;
    const len=Math.floor(ctx.sampleRate*2);
    const buffer=ctx.createBuffer(1,len,ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*.7;
    const node=ctx.createBufferSource();node.buffer=buffer;node.loop=true;
    const filter=ctx.createBiquadFilter();
    filter.type='bandpass';filter.Q.value=.8;
    const g=ctx.createGain();
    node.connect(filter);filter.connect(g);g.connect(soundMaster);
    const now=ctx.currentTime;
    filter.frequency.setValueAtTime(760,now);
    filter.frequency.linearRampToValueAtTime(360,now+duration);
    g.gain.setValueAtTime(.0001,now);
    g.gain.linearRampToValueAtTime(.13,now+.35);
    // Le son continue tant que la phase dure :
    // doigt levé = inspiration silencieuse ; doigt posé = expiration sonore.
    // Après la rampe initiale, le filtre reste sur sa fréquence d'arrivée.
    node.start(now);
    activeBreathSound={ctx,g,node,type};
  }
  function toggleSound(){
    soundOn=!soundOn;
    if(!soundOn)stopPhaseSound();
    const btn=get('svSound');
    if(btn){btn.innerHTML=soundOn?speakerOn:speakerOff;btn.setAttribute('aria-label',soundOn?t('Couper le son','Mute sound'):t('Activer le son','Enable sound'));btn.setAttribute('title',soundOn?t('Son activé','Sound on'):t('Son coupé','Sound off'));btn.setAttribute('aria-pressed',String(soundOn));}
    if(soundOn&&started&&!ended)playPhaseSound(down?'expire':'inspire');
  }
  function fingerUp(){down=false;pointer=null;get('svFinger')?.classList.remove('sv-down');}
  function setMode(m){
    if(started)return;
    mode=m;
    overlay.querySelectorAll('[data-sv-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.svMode===mode)));
    get('svTimer').textContent=mode==='timed'?'01:30':'∞';
  }
  function navigateTo(page){
    close();
    // Revenir aux écrans natifs de M.U.R. sans les modifier.
    // La rubrique Respiration conserve les protocoles et outils existants.
    try{
      if(typeof window.switchPageDirect==='function')window.switchPageDirect(page);
      else if(typeof window.showPage==='function')window.showPage(page);
    }catch(error){console.warn('M.U.R. : retour impossible',error);}
  }
  function showInfo(){restoreTabbar();
    const dialog=get('svInfo');if(!dialog)return;
    stopPhaseSound();fingerUp();dialog.hidden=false;
    get('svInfoClose')?.focus({preventScroll:true});
  }
  function hideInfo(){
    const dialog=get('svInfo');if(!dialog||dialog.hidden)return;
    dialog.hidden=true;
    get('svInfoBtn')?.focus({preventScroll:true});
    if(started&&!ended)playPhaseSound('inspire');
  }
  function hideResults(){
    const dialog=get('svResults');if(dialog)dialog.hidden=true;
  }
  function showResults(){restoreTabbar();
    const dialog=get('svResults');if(!dialog)return;
    const green=Math.min(COUNT,Math.round(COUNT*breath/GOAL));
    const percent=Math.round(100*breath/GOAL); // Score basé sur l'expiration cumulée, peut dépasser 100 en mode chronométré.
    const locale=isEnglish()?'en':'fr';
    get('svResultPercent').textContent=percent+' %';
    get('svResultFill').style.width=Math.min(100,percent)+'%';
    get('svResultPoints').textContent=green.toLocaleString(locale)+' / 1 200';
    get('svResultExpirations').textContent=String(cycles);
    get('svResultExhale').textContent=breath.toFixed(1).replace('.',isEnglish()?'.':',')+' s';
    get('svResultDuration').textContent=formatClock(elapsed);
    get('svResultTitle').textContent=mode==='timed'?t('90 secondes terminées','90 seconds complete'):t('Objectif atteint','Goal reached');
    dialog.hidden=false;
    get('svResultRestart')?.focus({preventScroll:true});
  }
  function finish(){stopPhaseSound();ended=true;started=false;fingerUp();get('svState').classList.add('sv-finished');refresh();showResults();}
  function refresh(){
    if(!overlay)return;
    const green=Math.min(COUNT,Math.round(COUNT*breath/GOAL));
    const percent=Math.round(100*breath/GOAL);
    get('svScore').textContent=`${green.toLocaleString(isEnglish()?'en':'fr')} / 1 200`;
    get('svPct').textContent=percent+' %';get('svFill').style.width=Math.min(100,percent)+'%';
    get('svBreath').textContent=breath.toFixed(1).replace('.',isEnglish()?'.':',')+' s';
    get('svCycles').textContent=String(cycles);
    get('svTimer').textContent=mode==='timed'?`${String(Math.floor(Math.max(0,90-elapsed)/60)).padStart(2,'0')}:${String(Math.ceil(Math.max(0,90-elapsed))%60).padStart(2,'0')}`:formatClock(elapsed);
    const label=ended?t('Séance terminée','Session complete'):down?t('Expiration · rotation de la sphère','Exhaling · sphere rotating'):started?t('Inspiration · sphère au ralentissement','Inhaling · sphere slowing down'):t('Choisissez un mode puis appuyez sur l’empreinte','Choose a mode then press the fingerprint');
    get('svState').textContent=label;
  }
  function formatClock(seconds){const n=Math.floor(seconds);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
  function render(ms){
    if(!overlay)return;
    const dt=Math.min(.055,(ms-(prev||ms))/1000);prev=ms;
    clock+=dt;
    if(started&&!ended&&get('svInfo')?.hidden!==false){elapsed+=dt;if(down)breath=mode==='timed'?breath+dt:Math.min(GOAL,breath+dt);if(mode==='timed'&&elapsed>=90){elapsed=90;finish();}else if(mode==='free'&&breath>=GOAL){finish();}}
    const target=down&&!ended?1.05:0;
    angular+=(target-angular)*Math.min(1,dt*(down?2.4:1.3));
    if(!down&&angular<.004)angular=0;
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)angle+=angular*dt;
    refresh();
    const canvas=get('svCanvas'),ctx=canvas.getContext('2d');
    const dpr=Math.min(window.devicePixelRatio||1,2),w=canvas.clientWidth||330,h=canvas.clientHeight||310;
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const cx=w/2,cy=h/2,R=Math.min(w*.38,h*.45,142);
    const bg=ctx.createRadialGradient(cx,cy,10,cx,cy,R*1.3);
    bg.addColorStop(0,'rgba(53,187,142,.08)');bg.addColorStop(1,'rgba(53,187,142,0)');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const ca=Math.cos(angle),sa=Math.sin(angle),ct=Math.cos(.15),st=Math.sin(.15);
    const green=Math.min(COUNT,Math.round(COUNT*breath/GOAL));
    const progress=green/COUNT;
    // Une conversion au vert libère une particule chaude qui voyage
    // réellement AU-DELÀ du contour de la sphère puis disparaît.
    // Un échantillon régulier évite les effets d'explosion ou de brouillard.
    if(green>lastGreen){
      for(let rank=lastGreen;rank<green;rank++){
        if(rank%2!==0)continue;
        const p=byRank[rank];
        if(!p)continue;
        const norm=Math.max(.0001,Math.hypot(p.x,p.y,p.z));
        escaped.push({dx:p.x/norm,dy:p.y/norm,dz:p.z/norm,
          born:clock,blue:p.blue,phase:p.phase});
      }
    }
    lastGreen=green;
    escaped=escaped.filter(p=>clock-p.born<3.1);
    const list=pts.map(p=>{
      const converted=p.greenRank<green;
      // Sphère régulière : aucun étirement radial permanent.
      const x=p.x*ca+p.z*sa,z=p.z*ca-p.x*sa;
      const y=p.y*ct-z*st,dep=p.y*st+z*ct;
      const k=3/(3-dep*.30);
      return {x:cx+x*R*k,y:cy+y*R*k,d:dep,converted,outer:p.outer,blue:p.blue};
    }).sort((a,b)=>a.d-b.d);
    for(const p of list){
      const front=Math.max(0,Math.min(1,(p.d+1)/2));
      ctx.globalAlpha=Math.min(1, (.22+.84*front)*(p.outer?1:.88));
      ctx.fillStyle=p.converted?'#62f2b4':(p.blue?'#6daeea':'#f17f82');
      const dotRadius=2*((p.outer?.55:.56)+(p.outer?1.02:.84)*front);
      ctx.beginPath();ctx.arc(p.x,p.y,dotRadius,0,Math.PI*2);ctx.fill();
    }
    // Trajectoires chaudes très visibles hors de la sphère : les particules
    // traversent le contour puis s'estompent. La rotation garde sa profondeur.
    for(const p of escaped){
      const age=clock-p.born;
      const q=age/3.1;
      const distance=.43+1.55*(1-Math.pow(1-q,1.32));
      const az=angle-age*.14;
      const c=Math.cos(az),s=Math.sin(az);
      const xx=(p.dx*c+p.dz*s)*distance;
      const zz=(p.dz*c-p.dx*s)*distance;
      const yy=p.dy*distance;
      const y=yy*ct-zz*st,dep=yy*st+zz*ct;
      const k=3/(3-dep*.30);
      const px=cx+xx*R*k,py=cy+y*R*k;
      const fade=Math.min(1,age/.28)*Math.pow(1-q,1.2);
      const color=p.blue?'#75bafb':'#ff8687';
      ctx.globalAlpha=.12+.52*fade;
      ctx.strokeStyle=color;ctx.lineWidth=2.2;
      const tail=9+18*q;
      const fromX=cx+(xx*(1-tail/(R*Math.max(distance,.1))))*R*k;
      const fromY=cy+(y*(1-tail/(R*Math.max(distance,.1))))*R*k;
      ctx.beginPath();ctx.moveTo(fromX,fromY);ctx.lineTo(px,py);ctx.stroke();
      ctx.globalAlpha=.90*fade;ctx.fillStyle=color;
      ctx.beginPath();ctx.arc(px,py,2.3+2.3*(1-q),0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    raf=requestAnimationFrame(render);
  }
  function start(){
    if(started)return;
    if(ended){hideResults();elapsed=0;breath=0;cycles=0;angular=0;ended=false;escaped=[];lastGreen=0;}
    started=true;get('svState').classList.remove('sv-finished');
  }
  let lastPointerPress=0;
  function press(e){
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(e.cancelable)e.preventDefault();
    if(down)return;
    lastPointerPress=Date.now();
    // Premier contact : déclenche séance + chronomètre + première expiration.
    if(!started)start();
    if(ended)return;
    down=true;pointer=e.pointerId??'touch';cycles++;
    const b=get('svFinger');b.classList.add('sv-down');
    playPhaseSound('expire');
    if(e.pointerId!==undefined)try{b.setPointerCapture(e.pointerId);}catch(_){}
  }
  function lift(e){if(!down)return;if(e&&e.pointerId!==undefined&&e.pointerId!==pointer)return;fingerUp();if(started&&!ended)playPhaseSound('inspire');else stopPhaseSound();}
  function close(){restoreTabbar();hideResults();stopPhaseSound();fingerUp();cancelAnimationFrame(raf);raf=0;prev=0;window.removeEventListener('blur',blurListener);document.removeEventListener('visibilitychange',hideListener);if(activeTabbar){activeTabbar.removeEventListener('click',onTabbarNavigation,true);activeTabbar=null;}document.body.classList.remove('mur-sv-active');overlay?.remove();overlay=null;document.body.style.overflow=hiddenBefore||'';}
  function blurListener(){stopPhaseSound();fingerUp();}
  function hideListener(){if(document.hidden){stopPhaseSound();fingerUp();}}
  function open(){
    if(overlay)return;
    hiddenBefore=document.body.style.overflow;document.body.style.overflow='hidden';
    restoreTabbar();document.body.classList.add('mur-sv-active');
    activeTabbar=document.querySelector('.tabbar');
    activeTabbar?.addEventListener('click',onTabbarNavigation,true);
    mode='timed';started=false;ended=false;down=false;elapsed=0;breath=0;cycles=0;angle=.3;angular=0;escaped=[];lastGreen=0;clock=0;
    overlay=document.createElement('section');overlay.id='murSV21';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',t('Souffle vivant','Living breath'));
    overlay.innerHTML=`<div class="sv-shell"><div class="sv-top"><div class="sv-mark"><button id="svGoHome" class="sv-brand-orb" type="button" aria-label="${t('Retour à l’accueil','Back to home')}">↶</button><span>${t('Urgence · Souffle vivant','Urgency · Living breath')}</span></div><div class="sv-top-actions"><button class="sv-info-trigger" id="svInfoBtn" type="button" aria-label="${t('Informations sur l’expiration','Exhalation information')}" aria-haspopup="dialog">i</button></div></div><div class="sv-main-card"><h2>${t('Souffle vivant','Living breath')}</h2><p class="sv-sub">${t('Votre souffle transforme la sphère','Your breath transforms the sphere')}</p><div class="sv-options"><button type="button" class="sv-option" data-sv-mode="timed" aria-pressed="true">${t('90 secondes','90 seconds')}</button><button type="button" class="sv-option" data-sv-mode="free" aria-pressed="false">${t('Mode libre','Free mode')}</button></div><div class="sv-timer" id="svTimer">01:30</div><div class="sv-scorebox"><div class="sv-scoreline"><span id="svScore">0 / 1 200</span><span>${t('Score','Score')} <strong id="svPct">0 %</strong></span></div><div class="sv-track"><div class="sv-fill" id="svFill"></div></div></div><canvas class="sv-canvas" id="svCanvas" aria-label="${t('Sphère animée de 1200 points','Animated sphere of 1200 points')}"></canvas><div class="sv-state" id="svState" aria-live="polite"></div><button id="svFinger" type="button" class="sv-finger" aria-label="${t('Maintenir pendant l’expiration','Hold while exhaling')}">${fingerprint}</button><div class="sv-cta">${t('Maintenez pour expirer','Hold to exhale')}</div><div class="sv-hint">${t('Relâchez pour inspirer','Release to inhale')}</div><div class="sv-foot"><div class="sv-meta">${t('Expiration cumulée','Total exhalation')}: <b id="svBreath">0,0 s</b> · ${t('Cycles','Cycles')}: <b id="svCycles">0</b></div><div class="sv-actions"><button class="sv-action sv-icon-action" id="svSound" type="button" aria-pressed="true" aria-label="${t('Couper le son','Mute sound')}" title="${t('Son activé','Sound on')}">${speakerOn}</button><button class="sv-action sv-icon-action" id="svReset" type="button" aria-label="${t('Réinitialiser la séance','Reset session')}" title="${t('Réinitialiser','Reset')}">${resetIcon}</button></div><div class="sv-note">${t('Appuyez pour entendre l’expiration ; relâchez pour inspirer en silence.','Hold to hear the exhale; release to inhale in silence.')}</div></div></div><div id="svInfo" class="sv-info-backdrop" hidden role="dialog" aria-modal="true" aria-labelledby="svInfoTitle"><div class="sv-info-card"><div class="sv-info-heading"><h3 id="svInfoTitle">${t('Pourquoi expirer ?','Why exhale?')}</h3><button id="svInfoClose" class="sv-close" type="button" aria-label="${t('Fermer les informations','Close information')}">×</button></div><p>${t('<strong>Inspirez</strong> naturellement, sans forcer, pendant que votre doigt est levé. La sphère ralentit.','<strong>Inhale</strong> naturally without forcing while your finger is released. The sphere slows down.')}</p><p>${t('<strong>Expirez</strong> lentement en maintenant le doigt sur l’empreinte. Le son accompagne l’expiration, la sphère accélère et les particules deviennent progressivement vertes.','<strong>Exhale</strong> slowly while holding the fingerprint button. The sound accompanies the exhale, the sphere speeds up and particles gradually turn green.')}</p><p>${t('<strong>Relâchez</strong> pour revenir à l’inspiration. Vous pouvez répéter ce cycle à votre rythme, sans blocage respiratoire volontaire.','<strong>Release</strong> to inhale again. Repeat at your own pace without deliberately holding your breath.')}</p><p>${t('Une expiration calme et confortable peut favoriser une sensation d’apaisement. Ne cherchez pas à expirer plus longtemps que ce qui vous est agréable.','A calm, comfortable exhale may promote a feeling of relaxation. Do not force a longer exhale than feels comfortable.')}</p><p class="sv-info-note">${t('La sphère devient entièrement verte à 100 %. En mode 90 secondes, le score peut ensuite dépasser 100 % si vous continuez à expirer. Il ne mesure ni la qualité respiratoire ni l’état du système nerveux autonome.','The sphere turns fully green at 100%. In 90-second mode, the score can then exceed 100% with additional exhalation. It does not measure breathing quality or autonomic nervous system state.')}</p><button id="svInfoOk" class="sv-info-ok" type="button">${t('Compris — revenir à l’exercice','Got it — back to exercise')}</button></div></div><div id="svResults" class="sv-results-backdrop" hidden role="dialog" aria-modal="true" aria-labelledby="svResultTitle"><div class="sv-results-card"><div class="sv-results-label">M.U.R. · ${t('BILAN DE SÉANCE','SESSION RESULTS')}</div><h3 id="svResultTitle">${t('Séance terminée','Session complete')}</h3><div id="svResultPercent" class="sv-results-percent">0 %</div><div class="sv-results-label">${t('SCORE D’EXPIRATION','EXHALATION SCORE')}</div><div class="sv-results-progress"><span id="svResultFill"></span></div><div class="sv-results-grid"><div class="sv-results-stat"><b id="svResultPoints">0 / 1 200</b><small>${t('Points verts','Green particles')}</small></div><div class="sv-results-stat"><b id="svResultExpirations">0</b><small>${t('Expirations (appuis)','Exhalations (holds)')}</small></div><div class="sv-results-stat"><b id="svResultExhale">0,0 s</b><small>${t('Expiration cumulée','Total exhalation')}</small></div><div class="sv-results-stat"><b id="svResultDuration">00:00</b><small>${t('Durée de séance','Session duration')}</small></div></div><p class="sv-results-explain">${t('Le score peut dépasser 100 % si vous poursuivez les expirations avant la fin des 90 secondes. La sphère reste entièrement verte à 100 %. Ce score repose uniquement sur le temps d’appui et ne mesure pas votre état neurovégétatif.','The score can exceed 100% when you continue exhaling before the 90-second session ends. The sphere stays fully green at 100%. This score only reflects hold time, not your autonomic state.')}</p><div class="sv-results-buttons"><button id="svResultClose" type="button">${t('Accueil','Home')}</button><button id="svResultRestart" class="sv-results-primary" type="button">${t('Respiration','Breathing')}</button></div></div></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('#svStart, .sv-start, [data-sv-start]').forEach(b=>b.remove());
    get('svGoHome').addEventListener('click',()=>navigateTo('home'));get('svInfoBtn').addEventListener('click',showInfo);get('svInfoClose').addEventListener('click',hideInfo);get('svInfoOk').addEventListener('click',hideInfo);get('svSound').addEventListener('click',toggleSound);
    get('svResultClose').addEventListener('click',()=>navigateTo('home'));get('svResultRestart').addEventListener('click',()=>navigateTo('breath'));
    get('svReset').addEventListener('click',()=>{hideResults();stopPhaseSound();fingerUp();elapsed=0;breath=0;cycles=0;ended=false;started=false;angular=0;escaped=[];lastGreen=0;get('svState').classList.remove('sv-finished');});
    overlay.querySelectorAll('[data-sv-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.svMode)));
    // Un tap au centre de la sphère masque le menu natif pendant 6,5 s.
    // L'empreinte reste dédiée à la respiration, sans déclenchement parasite.
    const sphere=get('svCanvas');
    sphere.tabIndex=0;
    sphere.setAttribute('role','button');
    sphere.setAttribute('aria-label',t('Masquer temporairement le menu du bas','Temporarily hide bottom navigation'));
    sphere.addEventListener('click',temporarilyHideTabbar);
    sphere.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();temporarilyHideTabbar();}});
    const finger=get('svFinger');
    if(window.PointerEvent){
      finger.addEventListener('pointerdown',press);
      finger.addEventListener('pointerup',lift);
      finger.addEventListener('pointercancel',lift);
      finger.addEventListener('lostpointercapture',lift);
    }else{
      // Anciennes versions de Safari iPad : événements Touch.
      finger.addEventListener('touchstart',e=>press({pointerId:'touch',cancelable:e.cancelable,preventDefault:()=>e.preventDefault()}),{passive:false});
      finger.addEventListener('touchend',()=>lift({pointerId:'touch'}));
      finger.addEventListener('touchcancel',()=>lift({pointerId:'touch'}));
      finger.addEventListener('mousedown',press);
      window.addEventListener('mouseup',lift);
    }
    // Fallback accessibilité et navigateurs qui ne relaient pas pointerdown.
    finger.addEventListener('click',()=>{
      if(Date.now()-lastPointerPress<750)return;
      if(!started&&!down){start();cycles++;playPhaseSound('expire');down=true;finger.classList.add('sv-down');setTimeout(()=>{if(down){fingerUp();playPhaseSound('inspire');}},180);}
    });
    finger.addEventListener('contextmenu',e=>e.preventDefault());
    window.addEventListener('blur',blurListener);document.addEventListener('visibilitychange',hideListener);
    prev=0;raf=requestAnimationFrame(render);
  }
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  function install(){
    // Appeler la nouvelle expérience depuis le bouton 'Mode rapide', sans toucher à la fonction native.
    window.murStartQuickMode=open;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.MURSOUFFLEVIVANT21={version:VERSION,open,close};
})();
