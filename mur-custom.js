/* M.U.R. — Nouvelle introduction videointromur.mp4
   Lecture automatique silencieuse, son activable,
   bouton Commencer sur la dernière image.
   Back-office et contenus conservés.
*/
(() => {
  'use strict';

  const VIDEO = 'videointromur.mp4';
  const ADMIN_URL = 'admin.html';

  function setupIntro() {
    const panel = document.getElementById('presentation');
    if (!panel || panel.dataset.murIntro2026 === '1') return;
    panel.dataset.murIntro2026 = '1';

    // Retirer l'ancien lecteur et ses boutons. Le script d'origine
    // ne retrouvera plus murIntroVideo et ne pourra pas fermer
    // automatiquement cette nouvelle introduction.
    const previous = panel.querySelector('video');
    if (previous) previous.pause();
    panel.replaceChildren();
    panel.classList.remove('hide');
    panel.classList.add('mur-video-presentation');

    Object.assign(panel.style, {
      position: 'fixed', inset: '0', zIndex: '99999',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0', overflow: 'hidden', background: '#040914'
    });

    const frame = document.createElement('div');
    Object.assign(frame.style, {
      position: 'relative', width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    });

    const video = document.createElement('video');
    video.id = 'murWelcomeVideo2026';
    video.src = VIDEO;
    video.autoplay = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    Object.assign(video.style, {
      display: 'block', width: '100%', height: '100%',
      maxWidth: 'none', maxHeight: 'none',
      objectFit: 'contain', background: '#040914'
    });

    function button(label, extra) {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = label;
      Object.assign(el.style, {
        position: 'absolute', zIndex: '3', minHeight: '48px',
        padding: '12px 18px', borderRadius: '999px',
        border: '1px solid rgba(255,255,255,.65)',
        font: '800 14px system-ui, sans-serif', cursor: 'pointer',
        ...extra
      });
      return el;
    }

    const sound = button('🔊 Activer le son', {
      top: 'calc(18px + env(safe-area-inset-top))',
      right: 'calc(16px + env(safe-area-inset-right))',
      background: 'rgba(8,17,30,.82)', color: '#fff'
    });

    const commencer = button('Commencer', {
      left: '50%', bottom: 'calc(36px + env(safe-area-inset-bottom))',
      transform: 'translateX(-50%)', display: 'none',
      zIndex: '4', minWidth: '200px', minHeight: '56px',
      font: '900 18px system-ui, sans-serif',
      background: '#fff', color: '#07111f',
      boxShadow: '0 0 32px rgba(255,255,255,.28)'
    });
    commencer.id = 'murCommencer';

    const retry = button('▶ Lire la vidéo', {
      left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
      display: 'none', background: '#173450', color: '#fff'
    });

    frame.append(video, sound, commencer, retry);
    panel.appendChild(frame);

    let finished = false;
    let generation = 0;

    function showCommencer() {
      if (finished) return;
      finished = true;
      video.pause();
      // Garder le visuel final, sans redémarrer la lecture.
      if (Number.isFinite(video.duration) && video.duration > 0) {
        try { video.currentTime = Math.max(0, video.duration - 0.10); }
        catch (error) {}
      }
      sound.style.display = 'none';
      retry.style.display = 'none';
      commencer.style.display = 'block';
      panel.classList.remove('hide');
    }

    function playIntro(withSound = false) {
      const token = ++generation;
      finished = false;
      panel.classList.remove('hide');
      commencer.style.display = 'none';
      retry.style.display = 'none';
      sound.style.display = withSound ? 'none' : 'block';
      video.pause();
      video.muted = !withSound;
      if (withSound) video.removeAttribute('muted');
      else video.setAttribute('muted', '');
      video.volume = 1;
      try { video.currentTime = 0; } catch (error) {}
      const playing = video.play();
      if (playing && typeof playing.catch === 'function') {
        playing.catch(() => {
          if (token === generation && !finished) {
            retry.style.display = 'block';
          }
        });
      }
    }

    // Le clic est nécessaire pour autoriser le son sur iOS/Android.
    // La vidéo repart de 0 pour conserver toute la bande-son.
    sound.addEventListener('click', () => playIntro(true));
    retry.addEventListener('click', () => playIntro(true));
    video.addEventListener('ended', showCommencer);
    video.addEventListener('error', showCommencer);
    video.addEventListener('timeupdate', () => {
      if (!finished && Number.isFinite(video.duration) &&
          video.duration > 0 && video.currentTime >= video.duration - 0.08) {
        showCommencer();
      }
    });

    commencer.addEventListener('click', () => {
      video.pause();
      if (typeof window.enterApp === 'function') {
        window.enterApp();
      } else {
        panel.classList.add('hide');
      }
    });

    // Appui court sur le logo de l'application : revoir l'introduction.
    window.openPresentation = () => playIntro(false);
    playIntro(false);
  }

  function setupAdmin() {
    const brand = document.querySelector('.top .brand');
    if (!brand || brand.dataset.murAdminReady) return;
    brand.dataset.murAdminReady = '1';
    let timer = null;
    let triggered = false;
    let startX = 0, startY = 0;
    brand.style.cursor = 'pointer';
    brand.style.touchAction = 'manipulation';
    brand.style.userSelect = 'none';
    brand.style.webkitUserSelect = 'none';
    brand.style.webkitTouchCallout = 'none';
    const cancel = () => {
      if (timer !== null) { clearTimeout(timer); timer = null; }
    };
    brand.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !e.isPrimary) return;
      cancel(); triggered = false;
      startX = e.clientX; startY = e.clientY;
      timer = setTimeout(() => {
        timer = null; triggered = true;
        if (navigator.vibrate) navigator.vibrate(40);
        window.location.assign(ADMIN_URL);
      }, 2000);
    });
    brand.addEventListener('pointermove', e => {
      if (Math.abs(e.clientX - startX) > 14 ||
          Math.abs(e.clientY - startY) > 14) cancel();
    });
    ['pointerup','pointercancel','pointerleave'].forEach(name =>
      brand.addEventListener(name, cancel));
    brand.addEventListener('click', e => {
      if (!triggered) return;
      e.preventDefault(); e.stopImmediatePropagation(); triggered = false;
    }, true);
    brand.addEventListener('contextmenu', e => e.preventDefault());
  }

  async function applyContent() {
    try {
      const response = await fetch('mur-content.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Contenu absent');
      const data = await response.json();

      if (Array.isArray(data.questions) && data.questions.length === 15 &&
          typeof KIS_QUESTIONS !== 'undefined') {
        const valid = data.questions.every(q =>
          ['text','a','f','p'].every(k =>
            typeof q[k] === 'string' && q[k].trim().length > 0));
        if (valid) KIS_QUESTIONS.splice(0, KIS_QUESTIONS.length,
          ...data.questions.map(q => ({...q})));
      }

      if (data.exercises && typeof EXERCISES !== 'undefined') {
        Object.keys(EXERCISES).forEach(key => {
          const source = data.exercises[key], target = EXERCISES[key];
          if (!source || !target) return;
          ['title','caption'].forEach(prop => {
            if (typeof source[prop] === 'string') target[prop] = source[prop];
          });
          ['files','sounds','why'].forEach(prop => {
            if (Array.isArray(source[prop])) target[prop] =
              source[prop].filter(value => typeof value === 'string');
          });
        });
      }

      if (data.breaths && typeof BREATHS !== 'undefined') {
        Object.keys(BREATHS).forEach(key => {
          const source = data.breaths[key], target = BREATHS[key];
          if (!source || !target) return;
          ['i','hi','e','ho','duration'].forEach(prop => {
            if (Number.isFinite(source[prop]) && source[prop] >= 0)
              target[prop] = source[prop];
          });
          if (typeof source.msg === 'string') target.msg = source.msg;
        });
      }
      window.dispatchEvent(new Event('mur-content-loaded'));
    } catch (error) {
      console.info('M.U.R. : contenu par défaut conservé', error.message);
    }
  }

  function init() {
    setupIntro();
    setupAdmin();
    applyContent();
  }

  // Chargé en fin de index.html : aucun ancien gestionnaire vidéo
  // ne doit réattacher la nouvelle vidéo avant notre initialisation.
  if (document.getElementById('presentation')) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
  // M.U.R. bilingual module loaded after the application.
  const bilingualScript=document.createElement('script');
  bilingualScript.src='mur-bilingual.js';
  bilingualScript.defer=true;
  document.body.appendChild(bilingualScript);
})();
