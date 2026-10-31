/* M.U.R. — extensions sans changement du coeur de l'application */
(() => {
  'use strict';
  const VIDEO='Logo_character_comes_to_life_20261031152523.mp4';
  function intro(){
    const old=document.getElementById('presentation');
    if(!old || old.dataset.murVideoReady)return;
    old.dataset.murVideoReady='1';
    old.innerHTML='';
    old.classList.remove('hide');
    old.classList.add('mur-video-presentation');
    const video=document.createElement('video');
    video.src=VIDEO; video.autoplay=true; video.muted=true;video.playsInline=true;video.preload='auto';
    video.setAttribute('webkit-playsinline','');video.className='mur-video';
    const skip=document.createElement('button');skip.type='button';skip.className='mur-video-skip';skip.textContent='Passer ›';
    const close=()=>{if(old.classList.contains('hide'))return;video.pause();if(typeof window.enterApp==='function')window.enterApp();else old.classList.add('hide')};
    video.addEventListener('ended',close);video.addEventListener('error',close);skip.onclick=close;
    old.append(video,skip);
    const p=video.play();if(p&&p.catch)p.catch(()=>{skip.textContent='Entrer ›'});
  }
  async function applyContent(){
    try{
      const resp=await fetch('mur-content.json',{cache:'no-store'});
      if(!resp.ok)throw new Error('Fichier contenu absent');
      const data=await resp.json();
      if(Array.isArray(data.questions)&&data.questions.length===15&&typeof KIS_QUESTIONS!=='undefined'){
        const valid=data.questions.every(q=>['text','a','f','p'].every(k=>typeof q[k]==='string'&&q[k].trim()));
        if(valid)KIS_QUESTIONS.splice(0,KIS_QUESTIONS.length,...data.questions.map(q=>({...q})));
      }
      if(data.exercises&&typeof EXERCISES!=='undefined'){
        Object.keys(EXERCISES).forEach(k=>{
          const v=data.exercises[k]; if(!v||typeof v.title!=='string')return;
          ['title','caption'].forEach(prop=>{if(typeof v[prop]==='string')EXERCISES[k][prop]=v[prop]});
          ['files','sounds','why'].forEach(prop=>{if(Array.isArray(v[prop]))EXERCISES[k][prop]=v[prop].filter(x=>typeof x==='string')});
        });
      }
      if(data.breaths&&typeof BREATHS!=='undefined'){
        Object.keys(BREATHS).forEach(k=>{
          const v=data.breaths[k];if(!v)return;
          ['i','hi','e','ho','duration'].forEach(p=>{if(Number.isFinite(v[p])&&v[p]>=0)BREATHS[k][p]=v[p]});
          if(typeof v.msg==='string')BREATHS[k].msg=v.msg;
        });
      }
      window.dispatchEvent(new Event('mur-content-loaded'));
    }catch(e){console.info('M.U.R. : contenu par defaut conserve',e.message)}
  }
  // Initialisation apres le code historique, sans ecraser les donnees stockees des utilisateurs.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{intro();applyContent()});
  else {intro();applyContent()}
})();
