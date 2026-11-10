/* M.U.R. V22.1 — Exercices guidés : image vers sphère, voix et progression.
   Module additionnel non destructif. Aucun changement de index.html.
   L'animation s'appuie sur #visualAsset, #exerciseAudio, #exerciseDetail
   et les objets EXERCISES déjà présents dans l'application. */
(() => {
  'use strict';
  if (window.MUR_EXERCICES_SPHERE) return;
  const NS = 'mur-exsphere';
  const TOTAL = 1200;
  const TRANSFORM_SECONDS = 4.4;
  const DEFAULT_DURATION = 90;
  const COLORS = {rouge:[255,82,86],orange:[255,163,65],vert:[78,224,148],bleu:[83,157,244]};
  const GREEN=[80,235,155];
  let state = null, observed = null;
  const prefersReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
  const fmt=(x)=>Number.isFinite(x)?`${Math.floor(x/60)}:${String(Math.floor(x%60)).padStart(2,'0')}`:'--:--';
  function style(){
    if(document.getElementById(NS+'-style'))return;
    const el=document.createElement('style');el.id=NS+'-style';
    el.textContent=`
      #exerciseDetail .mur-exsphere-stage{position:relative;isolation:isolate;overflow:hidden;width:min(100%,460px);height:clamp(205px,42dvh,380px);min-height:205px;max-height:380px;border:1px solid rgba(169,219,240,.20);border-radius:22px;background:radial-gradient(ellipse at 50% 45%,#173b4a,#0b2130 62%,#071625);margin:8px auto 5px;touch-action:pan-y}
      #exerciseDetail .mur-exsphere-stage #visualAsset{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;min-height:0!important;object-fit:cover!important;border:0!important;border-radius:0!important;margin:0!important;transition:none!important;box-shadow:none!important;pointer-events:none!important;z-index:1}
      #exerciseDetail .mur-exsphere-stage canvas{display:block;width:100%;height:100%;position:absolute;inset:0;z-index:2;pointer-events:none}
      #exerciseDetail .mur-exsphere-caption{position:absolute;bottom:9px;left:50%;transform:translateX(-50%);z-index:4;max-width:95%;padding:6px 12px;border-radius:15px;background:rgba(7,18,32,.75);color:#e4f9f3;border:1px solid rgba(170,229,222,.2);font-size:11px;font-weight:700;text-align:center;white-space:nowrap;pointer-events:none}
      #exerciseDetail .mur-exsphere-controls{display:flex;align-items:center;justify-content:space-between;gap:8px;width:min(100%,460px);margin:4px auto 8px;color:#b8d5df;font-size:11px}
      #exerciseDetail .mur-exsphere-progress{height:5px;border-radius:9px;flex:1;background:rgba(129,164,185,.22);overflow:hidden}
      #exerciseDetail .mur-exsphere-progress>span{display:block;height:100%;width:0%;background:linear-gradient(90deg,var(--mur-sphere-start,#f66),#53e89f);transition:width .15s linear}
      #exerciseDetail .mur-exsphere-toggle{color:#d7f0ee;background:rgba(33,71,79,.6);border:1px solid rgba(104,198,181,.43);border-radius:13px;min-height:34px;padding:6px 11px;font-size:11px;font-weight:700;touch-action:manipulation}
      #exerciseDetail .mur-exsphere-toggle[aria-pressed="false"]{background:rgba(39,53,70,.45);border-color:rgba(145,168,188,.3)}
      @media(max-height:710px){#exerciseDetail .mur-exsphere-stage{height:clamp(175px,33dvh,255px);min-height:175px}}
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
      points.push({x:Math.cos(a)*r,y:z,z:Math.sin(a)*r,ix,iy,seed:i*1.61803398875,order:(i*491)%TOTAL,color:rgb});
    }
    return points;
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
    if(s.audio){s.audio.removeEventListener('play',s.onPlay);s.audio.removeEventListener('pause',s.onPause);s.audio.removeEventListener('ended',s.onEnded);s.audio.removeEventListener('loadedmetadata',s.onMetadata)}
    disconnectAudio(s);
    if(s.image){s.image.style.opacity='';s.image.style.filter='';if(s.stage?.contains(s.image))s.stage.parentNode?.insertBefore(s.image,s.stage)}
    s.stage?.remove();s.controls?.remove();state=null;
  }
  function attach(){
    const detail=document.getElementById('exerciseDetail'),audio=document.getElementById('exerciseAudio'),img=document.getElementById('visualAsset');
    if(!detail||!audio||!img||!detail.contains(audio)||!detail.contains(img))return;
    if(state?.audio===audio&&state?.image===img)return;
    detach();style();
    const key=window.currentExerciseKey||'',zone=zoneOf(key),color=COLORS[zone]||COLORS.rouge;
    const stage=document.createElement('div');stage.className='mur-exsphere-stage';stage.setAttribute('aria-label','Animation sphérique synchronisée avec la narration');
    const canvas=document.createElement('canvas');const caption=document.createElement('div');caption.className='mur-exsphere-caption';caption.textContent='Lancez l’audio pour transformer l’image';
    stage.style.setProperty('--mur-sphere-start',`rgb(${color.join(',')})`);
    img.parentNode.insertBefore(stage,img);stage.append(img,canvas,caption);
    const controls=document.createElement('div');controls.className='mur-exsphere-controls';
    controls.innerHTML='<span class="mur-exsphere-time">0:00 / --:--</span><div class="mur-exsphere-progress" aria-label="Progression de l’exercice"><span></span></div><button type="button" class="mur-exsphere-toggle" aria-pressed="true" title="Afficher ou masquer la sphère">Vue sphère · ON</button>';
    stage.after(controls);
    const s={key,zone,color,detail,audio,image:img,stage,canvas,caption,controls,ctx:canvas.getContext('2d'),points:makeParticles(color),raf:0,playedAt:null,started:false,enabled:true,analyser:null,frequency:null,voice:.11,analyserFrames:0,paused:false};
    state=s;
    const toggle=controls.querySelector('button');
    toggle.addEventListener('click',()=>{s.enabled=!s.enabled;toggle.setAttribute('aria-pressed',String(s.enabled));toggle.textContent=s.enabled?'Vue sphère · ON':'Vue sphère · OFF';if(!s.enabled){s.image.style.opacity='1';s.caption.textContent='Image de l’exercice'}else{s.caption.textContent=audio.paused?'Reprendre l’audio':'Sphère guidée par la voix'}});
    s.onPlay=()=>{s.started=true;s.paused=false;attachAnalyser(s);if(s.playedAt===null)s.playedAt=performance.now();};
    s.onPause=()=>{s.paused=true};
    s.onEnded=()=>{s.paused=true;s.ended=true;s.caption.textContent='Exercice terminé · progression complète';};
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
    const started=s.started, morph=started?smooth((current-.15)/TRANSFORM_SECONDS):0;
    const mix=s.ended?1:smooth(clamp((current-TRANSFORM_SECONDS)/Math.max(1,(s.audio.duration||DEFAULT_DURATION)-TRANSFORM_SECONDS)));
    // The photo visually dissolves into the same pixels' spatial cloud.
    s.image.style.opacity=(!s.enabled||!started)?'1':String(1-morph);
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
        const sx=(pt.ix-.5)*w*.86+cx,sy=(pt.iy-.5)*h*.86+cy;
        return {xx:sx+(xx-sx)*morph,yy:sy+(yy-sy)*morph,z,pt};
      });
      points.sort((a,b)=>a.z-b.z);
      const saturation=clamp(morph*2);
      for(const pnt of points){
        const pt=pnt.pt,green=pt.order<TOTAL*mix;
        const initial=pt.color;
        const amount=green?1:0;
        const rr=Math.round(initial[0]*(1-amount)+GREEN[0]*amount),gg=Math.round(initial[1]*(1-amount)+GREEN[1]*amount),bb=Math.round(initial[2]*(1-amount)+GREEN[2]*amount);
        const depth=(pnt.z+1)/2;
        c.globalAlpha=clamp((.4+.6*depth)*Math.max(.2,morph),0,1);
        c.fillStyle=`rgb(${rr},${gg},${bb})`;
        const radius=(.8+depth*1.7)*(.6+.4*saturation);
        c.beginPath();c.arc(pnt.xx,pnt.yy,radius,0,Math.PI*2);c.fill();
      }
      c.globalAlpha=1;
      if(!s.ended)s.caption.textContent=current<TRANSFORM_SECONDS?'L’image devient une sphère':s.audio.paused?'En pause':`Voix narrative · ${Math.round(mix*100)} % vers le vert`;
    }else if(!started)s.caption.textContent='Lancez l’audio pour transformer l’image';
    s.raf=requestAnimationFrame(next=>render(s,next));
  }
  function install(){
    const detail=document.getElementById('exerciseDetail');if(!detail)return;
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
  window.MUR_EXERCICES_SPHERE={version:'22.1',get active(){return !!state},refresh:attach,close:detach};
})();
