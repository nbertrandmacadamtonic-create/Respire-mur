/* M.U.R. V22.6 — Exercices guidés : image vers sphère, voix et progression.
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
      #exerciseDetail .mur-exsphere-stage{position:relative;isolation:isolate;overflow:hidden;flex:none;width:min(76vw,320px);height:auto;aspect-ratio:1/1;min-height:0;max-height:54svh;border:1px solid rgba(169,219,240,.20);border-radius:20px;background:radial-gradient(ellipse at 50% 45%,#173b4a,#0b2130 62%,#071625);margin:8px auto 5px;touch-action:manipulation;cursor:pointer;-webkit-tap-highlight-color:transparent}
      #exercises.exercise-detail-open #exerciseDetail .mur-exsphere-stage #visualAsset.exercise-free-image,
      #exerciseDetail .mur-exsphere-stage #visualAsset{position:absolute!important;left:0!important;top:0!important;transform:none!important;display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;min-height:0!important;object-fit:contain!important;object-position:center!important;border:0!important;border-radius:0!important;margin:0!important;transition:none!important;box-shadow:none!important;outline:0!important;animation:none!important;pointer-events:none!important;z-index:1}
      #exerciseDetail .mur-exsphere-stage canvas{display:block;width:100%;height:100%;position:absolute;inset:0;z-index:2;pointer-events:none}
      #exerciseDetail .mur-exsphere-caption{position:absolute;bottom:9px;left:50%;transform:translateX(-50%);z-index:4;max-width:95%;padding:6px 12px;border-radius:15px;background:rgba(7,18,32,.75);color:#e4f9f3;border:1px solid rgba(170,229,222,.2);font-size:11px;font-weight:700;text-align:center;white-space:nowrap;pointer-events:none}
      #exerciseDetail .mur-exsphere-stage:focus-visible{outline:2px solid #85e9bd;outline-offset:3px}
      #exerciseDetail .mur-exsphere-controls{display:flex;align-items:center;justify-content:space-between;gap:8px;width:min(100%,460px);margin:4px auto 8px;color:#b8d5df;font-size:11px}
      #exerciseDetail .mur-exsphere-progress{height:5px;border-radius:9px;flex:1;background:rgba(129,164,185,.22);overflow:hidden}
      #exerciseDetail .mur-exsphere-progress>span{display:block;height:100%;width:0%;background:linear-gradient(90deg,var(--mur-sphere-start,#f66),#53e89f);transition:width .15s linear}
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
    if(!s.stage?.isConnected)return;
    const img=s.image;
    // Même taille que la photo native de la fiche, mais jamais rognée.
    const naturalW=img.naturalWidth||320,naturalH=img.naturalHeight||320;
    const ratio=clamp(naturalW/naturalH,.45,2.0);
    const allowedW=Math.min(window.innerWidth*.76,320);
    const allowedH=Math.min(window.innerHeight*.54,window.innerHeight-220);
    const height=Math.max(140,Math.min(allowedH,allowedW/ratio));
    const width=height*ratio;
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
  function detach(){
    const s=state;if(!s)return;
    cancelAnimationFrame(s.raf);
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
    const s={key,zone,color,detail,audio,image:img,stage,canvas,caption,controls,ctx:canvas.getContext('2d'),points:makeParticles(color),raf:0,playedAt:null,started:false,enabled:true,analyser:null,frequency:null,voice:.11,analyserFrames:0,paused:false,returnAt:null,reverseProgress:0};
    state=s;
    s.onImageLoad=()=>sizeStage(s);s.onResize=()=>sizeStage(s);
    img.addEventListener('load',s.onImageLoad);window.addEventListener('resize',s.onResize,{passive:true});
    sizeStage(s);
    // Le clic photo est un raccourci : le lecteur natif et le bouton infini restent visibles.
    const startFromPhoto=()=>{
      // Photo et bouton Lecture/Pause commandent le même lecteur natif.
      if(s.returnAt!==null)return; // Laisser le retour vers la photo se terminer.
      if(s.audio.ended){
        s.ended=false;s.returnAt=null;s.reverseProgress=0;s.started=false;s.playedAt=null;
        try{s.audio.currentTime=0;}catch(e){}
      }
      if(typeof window.toggleExerciseAudio==='function')window.toggleExerciseAudio();
      else if(s.audio.paused)s.audio.play().catch(()=>{s.caption.textContent='Lecture indisponible';});
      else s.audio.pause();
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
    const started=s.started;
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
    }else if(!started)s.caption.textContent='Toucher la photo pour démarrer';
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
      // L'ancienne fiche invoque scrollIntoView({behavior:"smooth"}) :
      // cela fait traverser l'ecran precedent avant d'arriver a la fiche.
      // Convertir ce seul scroll en deplacement instantane, sans agir ailleurs.
      if(detail){
        const originalScroll=detail.scrollIntoView;
        try{
          detail.scrollIntoView=function(options){
            const opts=options&&typeof options==='object'?{...options,behavior:'instant'}:{behavior:'instant',block:'start'};
            return originalScroll.call(this,opts);
          };
          ownScroll=true;
        }catch(e){}
      }
      try{return original.apply(this,args)}
      finally{
        if(ownScroll){try{delete detail.scrollIntoView}catch(e){}}
        // Meme tick : photo, cadre et sphere sont deja dans leur etat final
        // avant que le navigateur n'ait la possibilite de peindre la page.
        attach();
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
      if(!document.getElementById('exerciseAudio')){if(state)detach();return}
      attach();
    });
    obs.observe(detail,{childList:true,subtree:true});attach();
    window.addEventListener('pagehide',()=>{if(state)cancelAnimationFrame(state.raf)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.MUR_EXERCICES_SPHERE={version:'22.6',get active(){return !!state},refresh:attach,close:detach};
})();
