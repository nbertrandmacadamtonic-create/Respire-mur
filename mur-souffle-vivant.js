/* M.U.R. V21.8 — Souffle vivant, module tactile autonome.
   Déploiement non destructif : surcharge uniquement l'entrée murStartQuickMode.
   1200 points 3D : surface régulière + cœur structuré en couronnes concentriques, inertie au relâchement.
   Score provisoire : 7 expirations de 8 s (56 s cumulées) = 100 %.
   La progression reste conservée entre les expirations. Aucun diagnostic médical.
*/
(()=>{
  'use strict';
  if(window.MURSOUFFLEVIVANT21)return;
  const VERSION='21.10-scores-popup';
  const COUNT=1200, REFERENCE_EXHALE_SECONDS=8, REFERENCE_EXHALES=7;
  const GOAL=REFERENCE_EXHALE_SECONDS*REFERENCE_EXHALES; // 56 s, valeur TEST ajustable après essais
  const fingerprint='<svg aria-hidden="true" viewBox="0 0 48 48" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M10 23c0-9 6-15 14-15s14 6 14 15"/><path d="M15 26v-3c0-6 4-10 9-10s9 4 9 10v5"/><path d="M20 30v-7a4 4 0 0 1 8 0v9"/><path d="M11 31v-7"/><path d="M16 35c3-4 3-7 3-11"/><path d="M24 22v8c0 6-2 10-5 13"/><path d="M32 34c-1 5-3 8-5 10"/><path d="M37 29c0 6-2 11-5 15"/></svg>';
  const css=`
   #murSV21{position:fixed;inset:0;z-index:10030;background:radial-gradient(ellipse at 50% 37%,#15344a 0%,#091d31 50%,#061220 100%);color:#eaf7ff;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',system-ui,sans-serif;overflow:hidden;overscroll-behavior:none;touch-action:manipulation}
   #murSV21 *{box-sizing:border-box}
   #murSV21 .sv-shell{width:min(100%,450px);height:100%;height:100dvh;min-height:0;margin:auto;padding:calc(9px + env(safe-area-inset-top)) 16px calc(8px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;overflow:hidden;gap:0}
   #murSV21 .sv-top{display:flex;justify-content:space-between;align-items:center;width:100%;gap:12px;flex:none;height:30px}
   #murSV21 .sv-mark{font-size:11px;letter-spacing:.13em;color:#b5d4dc}
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
   #murSV21 .sv-canvas{display:block;width:100%;height:0;min-height:0;max-height:none;flex:1 1 0;pointer-events:none}
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
   #murSV21 .sv-start{background:#2b9377;border-color:#7de6bc;color:#fff;font-weight:700}
   #murSV21 .sv-note{font-size:9px;color:#85a5b5;text-align:center;max-width:350px;line-height:1.2;margin:0}
   #murSV21 .sv-finished{color:#85f5b7}
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

   @media(max-height:740px){#murSV21 .sv-shell{padding-top:calc(5px + env(safe-area-inset-top));padding-bottom:calc(5px + env(safe-area-inset-bottom))}#murSV21 .sv-note{display:none}#murSV21 .sv-options{margin-top:4px}#murSV21 .sv-foot{margin-top:4px;gap:4px}}
   @media(max-height:590px){#murSV21 .sv-sub{display:none}#murSV21 .sv-finger{width:54px;height:54px}#murSV21 .sv-cta{font-size:12px}#murSV21 .sv-hint{font-size:10px}#murSV21 .sv-option{min-height:27px;padding:4px 11px}#murSV21 .sv-action{min-height:30px;padding:6px 8px}#murSV21 .sv-timer{font-size:19px}}
   @media(prefers-reduced-motion:reduce){#murSV21 .sv-finger{transition:none}}
  `;
  let escaped=[],lastGreen=0,clock=0;
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
  // Inspire : bruit blanc filtre 520 -> 900 Hz. Expire : 760 -> 360 Hz.
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
    const ctx=ensureSound();if(!ctx)return;
    // Mêmes paramètres que le son respiratoire M.U.R. :
    // bruit blanc amplitude .7, filtre passe-bande Q=.8, gain maître .55.
    // Inspiration : fréquence croissante 520 -> 900 Hz.
    // Expiration : fréquence décroissante 760 -> 360 Hz.
    const duration=type==='inspire'?4:8;
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
    if(type==='inspire'){
      filter.frequency.setValueAtTime(520,now);
      filter.frequency.linearRampToValueAtTime(900,now+duration);
    } else {
      filter.frequency.setValueAtTime(760,now);
      filter.frequency.linearRampToValueAtTime(360,now+duration);
    }
    g.gain.setValueAtTime(.0001,now);
    g.gain.linearRampToValueAtTime(.13,now+.35);
    // Le son continue tant que la phase dure :
    // doigt levé = inspiration ; doigt posé = expiration.
    // Après la rampe initiale, le filtre reste sur sa fréquence d'arrivée.
    node.start(now);
    activeBreathSound={ctx,g,node,type};
  }
  function toggleSound(){
    soundOn=!soundOn;
    if(!soundOn)stopPhaseSound();
    const btn=get('svSound');
    if(btn){btn.textContent=soundOn?t('Son activé','Sound on'):t('Son coupé','Sound off');btn.setAttribute('aria-pressed',String(soundOn));}
    if(soundOn&&started&&!ended)playPhaseSound(down?'expire':'inspire');
  }
  function fingerUp(){down=false;pointer=null;get('svFinger')?.classList.remove('sv-down');}
  function setMode(m){
    if(started)return;
    mode=m;
    overlay.querySelectorAll('[data-sv-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.svMode===mode)));
    get('svTimer').textContent=mode==='timed'?'01:30':'∞';
  }
  function hideResults(){
    const dialog=get('svResults');if(dialog)dialog.hidden=true;
  }
  function showResults(){
    const dialog=get('svResults');if(!dialog)return;
    const green=Math.min(COUNT,Math.round(COUNT*breath/GOAL));
    const percent=Math.round(100*green/COUNT);
    const locale=isEnglish()?'en':'fr';
    get('svResultPercent').textContent=percent+' %';
    get('svResultFill').style.width=percent+'%';
    get('svResultPoints').textContent=green.toLocaleString(locale)+' / 1 200';
    get('svResultExpirations').textContent=String(cycles);
    get('svResultExhale').textContent=breath.toFixed(1).replace('.',isEnglish()?'.':',')+' s';
    get('svResultDuration').textContent=formatClock(elapsed);
    get('svResultTitle').textContent=mode==='timed'?t('90 secondes terminées','90 seconds complete'):t('Objectif atteint','Goal reached');
    dialog.hidden=false;
    get('svResultRestart')?.focus({preventScroll:true});
  }
  function finish(){stopPhaseSound();ended=true;started=false;fingerUp();get('svState').classList.add('sv-finished');get('svStart').textContent=t('Nouvelle séance','New session');get('svStart').hidden=false;refresh();showResults();}
  function refresh(){
    if(!overlay)return;
    const green=Math.min(COUNT,Math.round(COUNT*breath/GOAL));
    const percent=Math.round(100*green/COUNT);
    get('svScore').textContent=`${green.toLocaleString(isEnglish()?'en':'fr')} / 1 200`;
    get('svPct').textContent=percent+' %';get('svFill').style.width=percent+'%';
    get('svBreath').textContent=breath.toFixed(1).replace('.',isEnglish()?'.':',')+' s';
    get('svCycles').textContent=String(cycles);
    get('svTimer').textContent=mode==='timed'?`${String(Math.floor(Math.max(0,90-elapsed)/60)).padStart(2,'0')}:${String(Math.ceil(Math.max(0,90-elapsed))%60).padStart(2,'0')}`:formatClock(elapsed);
    const label=ended?t('Séance terminée','Session complete'):down?t('Expiration · rotation de la sphère','Exhaling · sphere rotating'):started?t('Inspiration · sphère au ralentissement','Inhaling · sphere slowing down'):t('Choisissez un mode puis démarrez','Choose a mode then start');
    get('svState').textContent=label;
  }
  function formatClock(seconds){const n=Math.floor(seconds);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
  function render(ms){
    if(!overlay)return;
    const dt=Math.min(.055,(ms-(prev||ms))/1000);prev=ms;
    clock+=dt;
    if(started&&!ended){elapsed+=dt;if(down)breath=Math.min(GOAL,breath+dt);if(mode==='timed'&&elapsed>=90){elapsed=90;finish();}else if(mode==='free'&&breath>=GOAL){finish();}}
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
    started=true;get('svStart').hidden=true;get('svState').classList.remove('sv-finished');playPhaseSound('inspire');
  }
  function press(e){if(!started||ended||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();if(down)return;playPhaseSound('expire');down=true;pointer=e.pointerId;cycles++;const b=get('svFinger');b.classList.add('sv-down');try{b.setPointerCapture(e.pointerId);}catch(_){}}
  function lift(e){if(!down)return;if(e&&e.pointerId!==undefined&&e.pointerId!==pointer)return;fingerUp();if(started&&!ended)playPhaseSound('inspire');else stopPhaseSound();}
  function close(){hideResults();stopPhaseSound();fingerUp();cancelAnimationFrame(raf);raf=0;prev=0;window.removeEventListener('blur',fingerUp);document.removeEventListener('visibilitychange',hideListener);overlay?.remove();overlay=null;document.body.style.overflow=hiddenBefore||'';}
  function hideListener(){if(document.hidden){stopPhaseSound();fingerUp();}}
  function open(){
    if(overlay)return;
    hiddenBefore=document.body.style.overflow;document.body.style.overflow='hidden';
    mode='timed';started=false;ended=false;down=false;elapsed=0;breath=0;cycles=0;angle=.3;angular=0;escaped=[];lastGreen=0;clock=0;
    overlay=document.createElement('section');overlay.id='murSV21';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',t('Souffle vivant','Living breath'));
    overlay.innerHTML=`<div class="sv-shell"><div class="sv-top"><div class="sv-mark">M.U.R. · ${t('MODE RAPIDE','QUICK MODE')}</div><button class="sv-close" id="svClose" type="button" aria-label="${t('Fermer','Close')}">×</button></div><h2>${t('Souffle vivant','Living breath')}</h2><p class="sv-sub">${t('Votre souffle transforme la sphère','Your breath transforms the sphere')}</p><div class="sv-options"><button type="button" class="sv-option" data-sv-mode="timed" aria-pressed="true">${t('90 secondes','90 seconds')}</button><button type="button" class="sv-option" data-sv-mode="free" aria-pressed="false">${t('Mode libre','Free mode')}</button></div><div class="sv-timer" id="svTimer">01:30</div><div class="sv-scorebox"><div class="sv-scoreline"><span id="svScore">0 / 1 200</span><span><strong id="svPct">0 %</strong> ${t('verts','green')}</span></div><div class="sv-track"><div class="sv-fill" id="svFill"></div></div></div><canvas class="sv-canvas" id="svCanvas" aria-label="${t('Sphère animée de 1200 points','Animated sphere of 1200 points')}"></canvas><div class="sv-state" id="svState" aria-live="polite"></div><button id="svFinger" type="button" class="sv-finger" aria-label="${t('Maintenir pendant l’expiration','Hold while exhaling')}">${fingerprint}</button><div class="sv-cta">${t('Maintenez pour expirer','Hold to exhale')}</div><div class="sv-hint">${t('Relâchez pour inspirer','Release to inhale')}</div><div class="sv-foot"><div class="sv-meta">${t('Expiration cumulée','Total exhalation')}: <b id="svBreath">0,0 s</b> · ${t('Cycles','Cycles')}: <b id="svCycles">0</b></div><div class="sv-actions"><button class="sv-action sv-start" id="svStart" type="button">${t('Démarrer','Start')}</button><button class="sv-action" id="svSound" type="button" aria-pressed="true">${t('Son activé','Sound on')}</button><button class="sv-action" id="svReset" type="button">${t('Réinitialiser','Reset')}</button></div><div class="sv-note">${t('Démo sonore : doigt posé = expiration, doigt levé = inspiration. Les sons suivent les mêmes paramètres que M.U.R. ; soufflez sans forcer.','Sound demo: hold to exhale, release to inhale. Same sound synthesis parameters as M.U.R.; breathe gently.')}</div></div><div id="svResults" class="sv-results-backdrop" hidden role="dialog" aria-modal="true" aria-labelledby="svResultTitle"><div class="sv-results-card"><div class="sv-results-label">M.U.R. · ${t('BILAN DE SÉANCE','SESSION RESULTS')}</div><h3 id="svResultTitle">${t('Séance terminée','Session complete')}</h3><div id="svResultPercent" class="sv-results-percent">0 %</div><div class="sv-results-label">${t('PARTICULES DEVENUES VERTES','PARTICLES TURNED GREEN')}</div><div class="sv-results-progress"><span id="svResultFill"></span></div><div class="sv-results-grid"><div class="sv-results-stat"><b id="svResultPoints">0 / 1 200</b><small>${t('Points verts','Green particles')}</small></div><div class="sv-results-stat"><b id="svResultExpirations">0</b><small>${t('Expirations (appuis)','Exhalations (holds)')}</small></div><div class="sv-results-stat"><b id="svResultExhale">0,0 s</b><small>${t('Expiration cumulée','Total exhalation')}</small></div><div class="sv-results-stat"><b id="svResultDuration">00:00</b><small>${t('Durée de séance','Session duration')}</small></div></div><p class="sv-results-explain">${t('Ce score illustre votre progression dans l’exercice à partir du temps d’appui. Il ne mesure pas l’équilibre de votre système nerveux autonome.','This score illustrates your exercise progress using hold time. It does not measure autonomic nervous system balance.')}</p><div class="sv-results-buttons"><button id="svResultClose" type="button">${t('Retour à M.U.R.','Back to M.U.R.')}</button><button id="svResultRestart" class="sv-results-primary" type="button">${t('Recommencer','Start again')}</button></div></div></div></div>`;
    document.body.appendChild(overlay);
    get('svClose').addEventListener('click',close);get('svStart').addEventListener('click',start);get('svSound').addEventListener('click',toggleSound);
    get('svResultClose').addEventListener('click',close);get('svResultRestart').addEventListener('click',()=>{hideResults();start();});
    get('svReset').addEventListener('click',()=>{hideResults();stopPhaseSound();fingerUp();elapsed=0;breath=0;cycles=0;ended=false;started=false;angular=0;escaped=[];lastGreen=0;get('svStart').hidden=false;get('svStart').textContent=t('Démarrer','Start');get('svState').classList.remove('sv-finished');});
    overlay.querySelectorAll('[data-sv-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.svMode)));
    const finger=get('svFinger');finger.addEventListener('pointerdown',press);finger.addEventListener('pointerup',lift);finger.addEventListener('pointercancel',lift);finger.addEventListener('lostpointercapture',lift);finger.addEventListener('contextmenu',e=>e.preventDefault());
    window.addEventListener('blur',()=>{stopPhaseSound();fingerUp();});document.addEventListener('visibilitychange',hideListener);
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
