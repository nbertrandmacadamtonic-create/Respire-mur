/* M.U.R. V22.10 — Exercices guidés : image vers sphère, voix et progression.
   Module additionnel non destructif. Aucun changement de index.html.
   L'animation s'appuie sur #visualAsset, #exerciseAudio, #exerciseDetail
   et les objets EXERCISES déjà présents dans l'application. */
(() => {
  'use strict';
  if (window.MUR_EXERCICES_SPHERE) return;
  const NS = 'mur-exsphere';
  const TOTAL = 1200;
  const TRANSFORM_SECONDS = 5.4;
  const RETURN_SECONDS = 5.4;
  const DEFAULT_DURATION = 90;
  const COLORS = {rouge:[255,82,86],orange:[255,163,65],vert:[78,224,148],bleu:[83,157,244]};
  const GREEN=[80,235,155];
  let state = null, observed = null;
  let nativeExerciseOpen = null;
  const prefersReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
  const fmt=(x)=>Number.isFinite(x)?`${Math.floor(x/60)}:${String(Math.floor(x%60)).padStart(2,'0')}`:'--:--';
  function style(){
    if(document.getElementById(NS+'-style'))return;
    const el=document.createElement('style');el.id=NS+'-style';
    el.textContent=`
      /* V22.8 : fiche d'exercice recentrée verticalement, image agrandie.
         On centre l'ensemble dans la zone disponible, sans bloquer le scroll
         lorsque la légende ou « Pourquoi ça marche » s'agrandit. */
      #exercises.exercise-detail-open{scroll-padding-top:6px!important;scroll-padding-bottom:calc(90px + env(safe-area-inset-bottom))!important}
      #exercises.exercise-detail-open #exerciseDetail{
        padding:14px 10px 18px!important;gap:8px!important;
        align-items:center!important;justify-content:center!important;
        min-height:calc(100dvh - 178px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important;
        height:auto!important;scroll-margin-top:0!important;
      }
      #exercises.exercise-detail-open #exerciseDetail>h2{display:block!important;position:relative!important;order:0!important;width:100%!important;margin:0 auto 2px!important;padding:0!important;line-height:1.17!important;font-size:clamp(17px,2.35vh,23px)!important;text-align:center!important;flex:none!important;max-width:100%!important;white-space:normal!important;visibility:visible!important;opacity:1!important}
      #exercises.exercise-detail-open #exerciseDetail>.exercise-zone-line{order:1!important;margin:0 auto 2px!important;padding:0!important;line-height:1.15!important;font-size:10px!important;text-align:center!important;flex:none!important}
      #exercises.exercise-detail-open #exerciseDetail>.mur-exsphere-stage{order:2!important;max-height:min(52svh,440px)!important;margin:7px auto 5px!important}
      #exercises.exercise-detail-open #exerciseDetail>.mur-exsphere-controls{order:3!important;margin:1px auto 2px!important;gap:5px!important}
      #exercises.exercise-detail-open #exerciseDetail>.exercise-control-panel{order:4!important;gap:4px!important;margin:0!important;padding:3px 6px 6px!important;width:100%!important}
      #exercises.exercise-detail-open #exerciseDetail .exercise-free-caption{margin:0 auto 4px!important;padding:0!important;line-height:1.15!important;font-size:11px!important}
      #exercises.exercise-detail-open #exerciseDetail .exercise-audio-actions{margin:2px auto!important;padding:0!important;gap:9px!important}
      #exercises.exercise-detail-open #exerciseDetail .exercise-audio-actions button{min-height:36px!important;padding:7px 13px!important}
      #exercises.exercise-detail-open #exerciseDetail .why-toggle-btn{margin:3px auto!important;padding:7px 12px!important;min-height:33px!important}
      #exercises.exercise-detail-open #exerciseDetail .mur-exsphere-caption{font-size:10px!important;padding:4px 9px!important;bottom:6px!important}
      @media(max-height:700px){#exercises.exercise-detail-open #exerciseDetail>.mur-exsphere-stage{max-height:49svh!important}#exercises.exercise-detail-open #exerciseDetail{gap:5px!important;padding-top:8px!important;min-height:calc(100dvh - 155px - env(safe-area-inset-bottom))!important}#exercises.exercise-detail-open #exerciseDetail>.exercise-zone-line{font-size:9px!important}}
      @media(max-height:570px){#exercises.exercise-detail-open #exerciseDetail{justify-content:flex-start!important;min-height:0!important}#exercises.exercise-detail-open #exerciseDetail>.mur-exsphere-stage{max-height:45svh!important}}
      #exercises.exercise-detail-open #exerciseDetail #exerciseControlPanel{max-width:min(92vw,430px)!important}
      #exercises.exercise-detail-open #exerciseDetail .mur-exsphere-stage{box-shadow:0 12px 36px rgba(0,0,0,.24),0 0 28px rgba(60,220,168,.10)!important}
      #exercises.exercise-detail-open #exerciseDetail .exercise-image-close{z-index:8!important}
      #exerciseDetail .mur-exsphere-stage{position:relative;isolation:isolate;overflow:hidden;flex:none;width:min(92vw,440px);height:auto;aspect-ratio:1/1;min-height:0;max-height:56svh;border:1px solid rgba(169,219,240,.20);border-radius:20px;background:radial-gradient(ellipse at 50% 45%,#173b4a,#0b2130 62%,#071625);margin:8px auto 5px;touch-action:manipulation;cursor:pointer;-webkit-tap-highlight-color:transparent}
      #exercises.exercise-detail-open #exerciseDetail .mur-exsphere-stage #visualAsset.exercise-free-image,
      #exerciseDetail .mur-exsphere-stage #visualAsset{position:absolute!important;left:0!important;top:0!important;transform:none!important;display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;min-height:0!important;object-fit:contain!important;object-position:center!important;border:0!important;border-radius:0!important;margin:0!important;transition:none!important;box-shadow:none!important;outline:0!important;animation:none!important;pointer-events:none!important;z-index:1}
      #exerciseDetail .mur-exsphere-stage canvas{display:block;width:100%;height:100%;position:absolute;inset:0;z-index:2;pointer-events:none}
      #exerciseDetail .mur-exsphere-caption{position:absolute;bottom:9px;left:50%;transform:translateX(-50%);z-index:4;max-width:95%;padding:6px 12px;border-radius:15px;background:rgba(7,18,32,.75);color:#e4f9f3;border:1px solid rgba(170,229,222,.2);font-size:11px;font-weight:700;text-align:center;white-space:nowrap;pointer-events:none}
      #exerciseDetail .mur-exsphere-stage:focus-visible{outline:2px solid #85e9bd;outline-offset:3px}
      #exerciseDetail .mur-exsphere-controls{display:flex;align-items:center;justify-content:space-between;gap:8px;width:min(100%,460px);margin:4px auto 8px;color:#b8d5df;font-size:11px}
      #exerciseDetail .mur-exsphere-progress{height:5px;border-radius:9px;flex:1;background:rgba(129,164,185,.22);overflow:hidden}
      #exerciseDetail .mur-exsphere-progress>span{display:block;height:100%;width:0%;background:linear-gradient(90deg,var(--mur-sphere-start,#f66),#53e89f);transition:width .15s linear}
      /* Plein écran progressif, sans déplacer le lecteur audio ni modifier index.html. */
      body.mur-exsphere-fullscreen{overflow:hidden!important}
      body.mur-exsphere-fullscreen .tabbar{visibility:hidden!important;pointer-events:none!important}
      .mur-exsphere-stage.mur-exsphere-zoom{
        position:fixed!important;margin:0!important;min-height:0!important;max-height:none!important;
        max-width:none!important;aspect-ratio:auto!important;border-radius:0!important;
        z-index:12010!important;overflow:hidden!important;
        transition:left .7s cubic-bezier(.22,1,.36,1),top .7s cubic-bezier(.22,1,.36,1),
          width .7s cubic-bezier(.22,1,.36,1),height .7s cubic-bezier(.22,1,.36,1),border-radius .7s ease!important;
      }
      .mur-exsphere-stage.mur-exsphere-zoom #visualAsset{object-fit:contain!important}
      .mur-exsphere-stage.mur-exsphere-zoom .mur-exsphere-caption{bottom:calc(94px + env(safe-area-inset-bottom))!important;white-space:normal!important}
      /* Le stage est déplacé sous body : il ne peut plus être masqué par le fond. */
      .mur-exsphere-fs-scrim{position:fixed;inset:0;background:#061523;z-index:12000}
      body>.mur-exsphere-stage.mur-exsphere-zoom{position:fixed!important;z-index:12010!important;box-sizing:border-box!important;display:block!important;visibility:visible!important;opacity:1!important;background:radial-gradient(ellipse at 50% 45%,#173b4a,#0b2130 62%,#071625)!important}
      body>.mur-exsphere-stage.mur-exsphere-zoom #visualAsset{position:absolute!important;inset:0!important;display:block!important;visibility:visible!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important;opacity:1;z-index:1!important;pointer-events:none!important}
      body>.mur-exsphere-stage.mur-exsphere-zoom canvas{position:absolute!important;inset:0!important;display:block!important;width:100%!important;height:100%!important;z-index:2!important;pointer-events:none!important}
      body>.mur-exsphere-stage.mur-exsphere-zoom .mur-exsphere-caption{position:absolute!important;left:50%!important;bottom:calc(94px + env(safe-area-inset-bottom))!important;transform:translateX(-50%)!important;z-index:4!important;max-width:95%!important;padding:6px 12px!important;border-radius:15px!important;background:rgba(7,18,32,.75)!important;color:#e4f9f3!important;text-align:center!important;font-size:11px!important;font-weight:700!important;white-space:normal!important;pointer-events:none!important}

      .mur-exsphere-fs-bar{
        position:fixed;z-index:12030;left:0;right:0;top:0;bottom:0;
        pointer-events:none;color:white;font-family:inherit;
      }
      .mur-exsphere-fs-bar button{
        pointer-events:auto;position:absolute;border:1px solid rgba(150,226,213,.5);
        background:rgba(9,32,45,.85);color:#f2fffb;border-radius:999px;
        min-height:46px;padding:10px 18px;font-size:13px;font-weight:750;
        box-shadow:0 8px 25px #0007;backdrop-filter:blur(8px);
      }
      .mur-exsphere-fs-close{top:calc(12px + env(safe-area-inset-top));right:16px}
      .mur-exsphere-fs-play{bottom:calc(23px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);min-width:148px}
      @media(prefers-reduced-motion:reduce){.mur-exsphere-stage.mur-exsphere-zoom{transition-duration:.01s!important}}
      /* On conserve le lecteur audio et sa boucle infinie natifs, sous la photo. */
      #exerciseDetail .exercise-audio-actions{display:flex!important;visibility:visible!important;opacity:1!important;align-items:center;justify-content:center;gap:12px}
      #exerciseDetail .exercise-audio-actions #exercisePlayBtn{display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center;justify-content:center}


    `;
    document.head.appendChild(el);
  }
  function zoneOf(key){
    try{const collection=typeof EXERCISES!=='undefined'?EXERCISES:window.EXERCISES;return String(collection?.[key]?.zone||'rouge').toLowerCase()}catch(e){return 'rouge'}
  }
  function makeParticles(rgb){
    const points=[];
    for(let i=0;i<TOTAL;i++){
      const q=(i+.5)/TOTAL,z=1-2*q,r=Math.sqrt(1-z*z),a=i*2.3999632297;
      const ix=((i*73)%1200)/1200,iy=((i*191+47)%1200)/1200;
      points.push({x:Math.cos(a)*r,y:z,z:Math.sin(a)*r,ix,iy,pixel:null,seed:i*1.61803398875,order:(i*491)%TOTAL,color:rgb});
    }
    return points;
  }
  function sizeStage(s){
    if(!s.stage?.isConnected||s.fullscreen)return;
    const img=s.image;
    // Même taille que la photo native de la fiche, mais jamais rognée.
    const naturalW=img.naturalWidth||320,naturalH=img.naturalHeight||320;
    const ratio=clamp(naturalW/naturalH,.45,2.0);
    // Réserver le titre, la légende, les commandes et la navigation fixe.
    // Sur les écrans hauts, utiliser la place laissée libre sous l'image.
    const viewportW=document.documentElement.clientWidth||window.innerWidth;
    const viewportH=window.visualViewport?.height||window.innerHeight;
    const detailW=s.detail?.clientWidth||viewportW;
    const allowedW=Math.min(viewportW*.92,Math.max(180,detailW-24),440);
    const allowedH=Math.max(115,Math.min(viewportH*.52,440,viewportH-235));
    const height=Math.max(110,Math.min(allowedH,allowedW/ratio));
    const width=Math.min(allowedW,height*ratio);
    s.stage.style.setProperty('width',`${Math.round(width)}px`);
    s.stage.style.setProperty('height',`${Math.round(height)}px`);
    s.stage.style.setProperty('aspect-ratio',`${naturalW} / ${naturalH}`);
    samplePhoto(s);
  }
  function samplePhoto(s){
    const img=s.image;
    if(!img.complete||!img.naturalWidth)return;
    const oc=document.createElement('canvas');oc.width=260;oc.height=260;
    const cx=oc.getContext('2d',{willReadFrequently:true});
    if(!cx)return;
    // Fit image *entirely* on a transparent surface, like object-fit:contain.
    const ratio=Math.min(260/img.naturalWidth,260/img.naturalHeight);
    const iw=img.naturalWidth*ratio,ih=img.naturalHeight*ratio;
    const ox=(260-iw)/2,oy=(260-ih)/2;
    try{
      cx.drawImage(img,ox,oy,iw,ih);
      const pixels=cx.getImageData(0,0,260,260).data;
      let seed=777;
      const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
      for(const pt of s.points){
        const px=Math.floor(ox+rnd()*iw),py=Math.floor(oy+rnd()*ih),idx=(py*260+px)*4;
        pt.ix=px/260;pt.iy=py/260;
        pt.pixel=[pixels[idx],pixels[idx+1],pixels[idx+2]];
      }
      s.hasPhotoPixels=true;
    }catch(error){
      // Images externes sans CORS : animation colorée préservée, jamais de blocage audio.
      s.hasPhotoPixels=false;
    }
  }
  function disconnectAudio(s){
    if(s.analyser){try{s.analyser.disconnect()}catch(e){}}
    // MediaElementSource is left connected to destination until the element is removed.
    s.analyser=null;s.frequency=null;
  }
  function attachAnalyser(s){
    if(s.analyser||!s.audio)return;
    // WebAudio must not alter cross-origin playback: these URLs are deliberately skipped.
    try{
      const raw=s.audio.currentSrc||s.audio.src;
      const u=new URL(raw,location.href);
      if(u.origin!==location.origin)return;
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)return;
      const ctx=window.__murExerciseAudioCtx || (window.__murExerciseAudioCtx = new AudioContext());
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
      let source=s.audio.__murSphereMediaSource;
      if(!source){source=ctx.createMediaElementSource(s.audio);s.audio.__murSphereMediaSource=source;source.connect(ctx.destination)}
      const analyser=ctx.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.79;
      source.connect(analyser);
      s.analyser=analyser;s.frequency=new Uint8Array(analyser.frequencyBinCount);
    }catch(err){s.analyser=null;s.frequency=null}
  }
  const ZOOM_MS=700;
  function resetDocumentScroll(){
    // Seule la fenêtre est remise à zéro : on ne touche pas au scroll des contenus
    // des tests, de l'historique, ni aux modales autonomes.
    try { window.scrollTo({left:0,top:0,behavior:'instant'}); }
    catch(e){try{window.scrollTo(0,0)}catch(_) {}}
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
  }

  function endFullscreen(s, {pause=true}={}){
    if(!s)return;
    if(s.zoomTimer){clearTimeout(s.zoomTimer);s.zoomTimer=0;}
    s.zooming=false;s.visualHold=false;
    if(pause && s.audio && !s.audio.paused){
      // Le lecteur natif reste maître de la lecture et de ses états.
      if(typeof window.toggleExerciseAudio==='function')window.toggleExerciseAudio();
      else s.audio.pause();
    }
    if(s.volumeBeforeZoom!==undefined){s.audio.volume=s.volumeBeforeZoom;s.volumeBeforeZoom=undefined;}
    s.fsScrim?.remove();s.fsToolbar?.remove();
    s.fsScrim=null;s.fsToolbar=null;
    document.body.classList.remove('mur-exsphere-fullscreen');
    s.stage?.classList.remove('mur-exsphere-zoom');
    // Remettre le même stage et son image au même emplacement, sans les recréer.
    if(s.stage && s.fsPlaceholder?.parentNode){
      s.fsPlaceholder.parentNode.insertBefore(s.stage,s.fsPlaceholder);
      s.fsPlaceholder.remove();
    }
    s.fsPlaceholder=null;
    for(const prop of ['left','top','right','bottom','width','height','borderRadius','zIndex'])s.stage?.style.removeProperty(prop);
    s.fullscreen=false;
    if(s.stage?.isConnected)sizeStage(s);
    // Aucun scroll de page déclenché à la sortie du plein écran.
  }
  function startAudioFromFullscreen(s){
    if(state!==s||!s.fullscreen)return;
    if(s.audio.ended){try{s.audio.currentTime=0;}catch(e){}}
    if(s.audio.paused){
      if(typeof window.toggleExerciseAudio==='function')window.toggleExerciseAudio();
      else s.audio.play().catch(()=>{s.caption.textContent='Touchez Lecture pour démarrer le son';});
    }
    s.fsPlay && (s.fsPlay.textContent='Pause / Lecture');
  }
  function enterFullscreen(s){
    if(state!==s || s.fullscreen || s.zooming)return;
    const box=s.stage.getBoundingClientRect();
    s.fullscreen=true;s.zooming=true;s.visualHold=true;
    const scrim=document.createElement('div');scrim.className='mur-exsphere-fs-scrim';
    const toolbar=document.createElement('div');toolbar.className='mur-exsphere-fs-bar';
    const close=document.createElement('button');close.type='button';close.className='mur-exsphere-fs-close';close.textContent='← Retour';close.setAttribute('aria-label','Revenir à la fiche exercice');
    const play=document.createElement('button');play.type='button';play.className='mur-exsphere-fs-play';play.textContent='Lecture / Pause';play.setAttribute('aria-label','Lecture ou pause de l’exercice');
    toolbar.append(close,play);document.body.append(scrim,toolbar);
    s.fsScrim=scrim;s.fsToolbar=toolbar;s.fsPlay=play;
    close.addEventListener('click',()=>endFullscreen(s));
    play.addEventListener('click',()=>{
      if(s.zooming)return;
      if(typeof window.toggleExerciseAudio==='function')window.toggleExerciseAudio();
      else if(s.audio.paused)s.audio.play().catch(()=>{});else s.audio.pause();
    });
    // Un élément fixed dans un parent transformé ou isolé reste prisonnier
    // de son contexte d'empilement : déplacer le vrai stage sous body.
    const placeholder=document.createElement('span');
    placeholder.className='mur-exsphere-fs-placeholder';
    placeholder.setAttribute('aria-hidden','true');
    placeholder.style.cssText=`display:block;width:${box.width}px;height:${box.height}px;flex:none;visibility:hidden`;
    s.stage.parentNode.insertBefore(placeholder,s.stage);
    s.fsPlaceholder=placeholder;
    document.body.appendChild(s.stage);
    document.body.classList.add('mur-exsphere-fullscreen');
    s.stage.classList.add('mur-exsphere-zoom');
    Object.assign(s.stage.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px',borderRadius:'20px'});
    s.caption.textContent='Agrandissement de l’image…';
    // Déclencher la lecture dans le geste tactile pour iOS/Safari.
    // Son à zéro durant le zoom, puis recommencer à 0 à plein écran.
    const wasPaused=s.audio.paused;
    if(wasPaused){
      s.volumeBeforeZoom=s.audio.volume;
      s.audio.volume=0;
      if(typeof window.toggleExerciseAudio==='function')window.toggleExerciseAudio();
      else s.audio.play().catch(()=>{});
    }
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(state!==s||!s.fullscreen)return;
      Object.assign(s.stage.style,{left:'0px',top:'0px',width:'100vw',height:'100dvh',borderRadius:'0px'});
    }));
    s.zoomTimer=window.setTimeout(()=>{
      if(state!==s||!s.fullscreen)return;
      s.zoomTimer=0;s.zooming=false;
      if(wasPaused){try{s.audio.currentTime=0;}catch(e){};s.audio.volume=s.volumeBeforeZoom;s.volumeBeforeZoom=undefined;}
      s.visualHold=false;
      if(s.audio.paused){s.caption.textContent='Appuyer sur Lecture pour démarrer';}
      else{s.caption.textContent='L’image devient une sphère';}
    },prefersReduced()?30:ZOOM_MS+80);
  }
  function detach(){
    const s=state;if(!s)return;
    cancelAnimationFrame(s.raf);
    endFullscreen(s,{pause:false});
    if(s.stage){s.stage.removeEventListener('click',s.onStageClick);s.stage.removeEventListener('keydown',s.onStageKeydown)}
    if(s.audio){s.audio.removeEventListener('play',s.onPlay);s.audio.removeEventListener('pause',s.onPause);s.audio.removeEventListener('ended',s.onEnded);s.audio.removeEventListener('loadedmetadata',s.onMetadata)}
    disconnectAudio(s);
    if(s.image){s.image.style.opacity='';s.image.style.filter='';if(s.stage?.contains(s.image))s.stage.parentNode?.insertBefore(s.image,s.stage)}
    if(s.onImageLoad)s.image.removeEventListener('load',s.onImageLoad);
    if(s.onResize)window.removeEventListener('resize',s.onResize);
    s.stage?.remove();s.controls?.remove();state=null;
  }
  function attach(){
    const detail=document.getElementById('exerciseDetail'),audio=document.getElementById('exerciseAudio'),img=document.getElementById('visualAsset');
    if(!detail||!audio||!img||!detail.contains(audio)||!detail.contains(img))return;
    if(state?.audio===audio&&state?.image===img)return;
    detach();style();
    const key=window.currentExerciseKey||'',zone=zoneOf(key),color=COLORS[zone]||COLORS.rouge;
    const stage=document.createElement('div');stage.className='mur-exsphere-stage';stage.setAttribute('aria-label','Appuyer sur la photo pour lancer l’exercice guidé');stage.setAttribute('role','button');stage.setAttribute('tabindex','0');
    const canvas=document.createElement('canvas');const caption=document.createElement('div');caption.className='mur-exsphere-caption';caption.textContent='Toucher la photo pour démarrer';
    stage.style.setProperty('--mur-sphere-start',`rgb(${color.join(',')})`);
    img.parentNode.insertBefore(stage,img);stage.append(img,canvas,caption);
    const controls=document.createElement('div');controls.className='mur-exsphere-controls';
    controls.innerHTML='<span class="mur-exsphere-time">0:00 / --:--</span><div class="mur-exsphere-progress" aria-label="Progression de l’exercice"><span></span></div>';
    stage.after(controls);
    const s={key,zone,color,detail,audio,image:img,stage,canvas,caption,controls,ctx:canvas.getContext('2d'),points:makeParticles(color),raf:0,playedAt:null,started:false,enabled:true,analyser:null,frequency:null,voice:.11,analyserFrames:0,paused:false,returnAt:null,reverseProgress:0,fullscreen:false,zooming:false,visualHold:false,zoomTimer:0};
    state=s;
    s.onImageLoad=()=>sizeStage(s);s.onResize=()=>sizeStage(s);
    img.addEventListener('load',s.onImageLoad);window.addEventListener('resize',s.onResize,{passive:true});
    sizeStage(s);
    // Le clic photo est un raccourci : le lecteur natif et le bouton infini restent visibles.
    const startFromPhoto=()=>{
      if(s.returnAt!==null)return;
      if(!s.fullscreen){enterFullscreen(s);return;}
      if(s.zooming)return;
      if(typeof window.toggleExerciseAudio==='function')window.toggleExerciseAudio();
      else if(s.audio.paused)s.audio.play().catch(()=>{});else s.audio.pause();
    };
    s.onStageClick=(event)=>{event.stopPropagation();startFromPhoto()};
    s.onStageKeydown=(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();startFromPhoto()}};
    stage.addEventListener('click',s.onStageClick);
    stage.addEventListener('keydown',s.onStageKeydown);
    s.onPlay=()=>{s.started=true;s.ended=false;s.paused=false;s.returnAt=null;s.reverseProgress=0;attachAnalyser(s);if(s.playedAt===null)s.playedAt=performance.now();};
    s.onPause=()=>{s.paused=true};
    s.onEnded=()=>{
      if(s.audio.loop)return;
      s.paused=true;s.ended=true;s.returnAt=performance.now();
      s.caption.textContent='Retour à l’image…';
    };
    s.onMetadata=()=>updateUI(s);
    audio.addEventListener('play',s.onPlay);audio.addEventListener('pause',s.onPause);audio.addEventListener('ended',s.onEnded);audio.addEventListener('loadedmetadata',s.onMetadata);
    if(!audio.paused)s.onPlay();
    s.raf=requestAnimationFrame(t=>render(s,t));
  }
  function updateUI(s){
    const d=Number.isFinite(s.audio.duration)&&s.audio.duration>0?s.audio.duration:DEFAULT_DURATION;
    const current=s.ended?d:Math.max(0,s.audio.currentTime||0);
    const p=clamp(current/d);
    s.controls.querySelector('.mur-exsphere-time').textContent=`${fmt(current)} / ${Number.isFinite(s.audio.duration)?fmt(d):'--:--'}`;
    s.controls.querySelector('.mur-exsphere-progress>span').style.width=(p*100).toFixed(1)+'%';
    return {current,d,p};
  }
  function render(s,t){
    if(state!==s)return;
    const canvas=s.canvas,c=s.ctx,w=Math.max(s.stage.clientWidth,1),h=Math.max(s.stage.clientHeight,1),dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    }
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    const {current,p}=updateUI(s);
    // À la fin de l'enregistrement on rejoue exactement la métamorphose en sens inverse,
    // en conservant la sphère verte jusqu'au début de la transition de retour.
    const reverse=s.returnAt===null?0:smooth(clamp((t-s.returnAt)/(RETURN_SECONDS*1000)));
    const started=s.started && !s.visualHold;
    const forward=started?smooth((current-.15)/TRANSFORM_SECONDS):0;
    const morph=forward*(1-reverse);
    const mix=s.ended?1:smooth(clamp((current-TRANSFORM_SECONDS)/Math.max(1,(s.audio.duration||DEFAULT_DURATION)-TRANSFORM_SECONDS)));
    if(s.returnAt!==null&&reverse>=1){
      s.started=false;s.ended=false;s.returnAt=null;s.reverseProgress=0;s.playedAt=null;s.voice=.11;
      s.image.style.opacity='1';s.image.style.filter='none';
      s.caption.textContent='Toucher la photo pour recommencer';
      s.caption.style.opacity='1';
      c.clearRect(0,0,w,h);
      s.raf=requestAnimationFrame(next=>render(s,next));return;
    }
    // The photo visually dissolves into the same pixels' spatial cloud.
    s.image.style.opacity=(!s.enabled||!started)?'1':String(1-smooth(clamp((morph-.08)/.85)));
    s.image.style.filter=s.enabled&&started?`saturate(${1+.3*morph}) brightness(${1+.2*morph})`:'none';
    if(started&&s.enabled){
      let level=s.voice;
      if(s.analyser&&!s.audio.paused){
        try{
          s.analyser.getByteFrequencyData(s.frequency);
          let energy=0;for(let i=1;i<Math.min(100,s.frequency.length);i++)energy+=s.frequency[i];
          let raw=energy/(Math.min(100,s.frequency.length)-1)/255;
          if(raw>.006)s.analyserFrames++;
          if(s.analyserFrames>2)level=clamp(raw*2.4,.06,.9);
        }catch(e){}
      }else if(!s.audio.paused){level=.18+.15*Math.abs(Math.sin(current*2.13)+.5*Math.sin(current*4.8))}
      if(s.audio.paused&&!s.ended)level=.055;
      s.voice+=(level-s.voice)*.13;
      const baseR=Math.min(w*.36,h*.38,155),cx=w*.5,cy=h*.49;
      const rot=prefersReduced()?0:current*.21;
      const cr=Math.cos(rot),sr=Math.sin(rot);
      const points=s.points.map(pt=>{
        const x=pt.x*cr-pt.z*sr,z=pt.x*sr+pt.z*cr;
        const wiggle=1+(prefersReduced()?0:(.03+s.voice*.17)*Math.sin(pt.seed*1.8+current*3.1)*(.4+.6*morph));
        const zoom=1+.14*z;
        const xx=cx+x*baseR*zoom*wiggle,yy=cy+pt.y*baseR*zoom*wiggle;
        // Map of points from the original rectangle smoothly bends into the sphere.
        const sx=pt.ix*w,sy=pt.iy*h;
        return {xx:sx+(xx-sx)*morph,yy:sy+(yy-sy)*morph,z,pt};
      });
      points.sort((a,b)=>a.z-b.z);
      const saturation=clamp(morph*2);
      for(const pnt of points){
        const pt=pnt.pt,green=pt.order<TOTAL*mix;
        const initial=pt.color;
        const amount=green?(1-reverse):0;
        const base=pt.pixel||initial;
        const fromPhoto=Math.max(reverse,1-smooth(clamp((morph-.15)/.85)));
        const rr=Math.round((base[0]*fromPhoto+initial[0]*(1-fromPhoto))*(1-amount)+GREEN[0]*amount);
        const gg=Math.round((base[1]*fromPhoto+initial[1]*(1-fromPhoto))*(1-amount)+GREEN[1]*amount);
        const bb=Math.round((base[2]*fromPhoto+initial[2]*(1-fromPhoto))*(1-amount)+GREEN[2]*amount);
        const depth=(pnt.z+1)/2;
        c.globalAlpha=clamp((.4+.6*depth)*smooth(clamp((morph+.05)*2.5)),0,1);
        c.fillStyle=`rgb(${rr},${gg},${bb})`;
        const radius=(.8+depth*1.7)*(.6+.4*saturation);
        c.beginPath();c.arc(pnt.xx,pnt.yy,radius,0,Math.PI*2);c.fill();
      }
      c.globalAlpha=1;
      if(!s.ended)s.caption.textContent=current<TRANSFORM_SECONDS?'L’image devient une sphère':s.audio.paused?'En pause':`Voix narrative · ${Math.round(mix*100)} % vers le vert`;
    }else if(!started && !s.visualHold && !s.fullscreen)s.caption.textContent='Toucher la photo pour ouvrir en plein écran';
    s.raf=requestAnimationFrame(next=>render(s,next));
  }
  // L'ouverture native construisait d'abord la fiche ancienne, puis le
  // MutationObserver la convertissait au frame suivant. Sur mobile cela
  // produisait un ecran parasite et parfois un scroll anime visible.
  // On prepare la sphere de maniere SYNCHRONE au meme appel openExercise.
  function bridgeOpenExercise(){
    if(typeof window.openExercise!=='function')return;
    if(window.openExercise.__murSphereImmediate)return;
    const original=window.openExercise;
    nativeExerciseOpen=original;
    function openWithSphere(...args){
      const detail=document.getElementById('exerciseDetail');
      let ownScroll=false;
      // L'application appelle scrollIntoView({behavior:"smooth",block:"start"}).
      // Ce scroll déplace le document ENTIER, et ses effets survivent au plein écran.
      // Neutralisation strictement limitée à l'appel natif d'ouverture de fiche.
      if(detail){
        try{
          detail.scrollIntoView=function(){ /* aucun scroll global */ };
          ownScroll=true;
        }catch(e){}
      }
      // Supprimer une éventuelle animation de scroll héritée d'un exercice précédent.
      resetDocumentScroll();
      try{return original.apply(this,args)}
      finally{
        if(ownScroll){try{delete detail.scrollIntoView}catch(e){}}
        attach();
        resetDocumentScroll();
        requestAnimationFrame(()=>{if(document.getElementById('exercises')?.classList.contains('active'))resetDocumentScroll();});
      }
    }
    openWithSphere.__murSphereImmediate=true;
    window.openExercise=openWithSphere;
  }
  function install(){
    const detail=document.getElementById('exerciseDetail');if(!detail)return;
    bridgeOpenExercise();
    if(observed===detail)return;
    observed=detail;
    const obs=new MutationObserver(()=>{
      if(state?.fullscreen)return; // stage temporairement placé sous body
      if(!document.getElementById('exerciseAudio')){if(state)detach();return}
      attach();
    });
    // Changer d'onglet pendant le plein écran doit nettoyer immédiatement l'overlay.
    const pages=document.querySelectorAll('.app > .page');
    const navObserver=new MutationObserver(()=>{
      if(!document.getElementById('exercises')?.classList.contains('active')){
        if(state?.fullscreen)endFullscreen(state,{pause:true});
        document.body.classList.remove('mur-exsphere-fullscreen');
        if(window.scrollY>0)resetDocumentScroll();
      }
    });
    pages.forEach(page=>navObserver.observe(page,{attributes:true,attributeFilter:['class']}));
    obs.observe(detail,{childList:true,subtree:true});attach();
    window.addEventListener('pagehide',()=>{if(state)cancelAnimationFrame(state.raf)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.MUR_EXERCICES_SPHERE={version:'22.11',get active(){return !!state},refresh:attach,close:detach};
})();
