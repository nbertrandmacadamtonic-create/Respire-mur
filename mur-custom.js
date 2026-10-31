
/*
 M.U.R. — Nouvelle introduction
 Vidéo : videointromur.mp4
 Lecture automatique, son activable,
 Commencer à la fin.
*/

(() => {
  'use strict';

  const VIDEO = 'videointromur.mp4';
  const ADMIN_URL = 'admin.html';

  // INTRODUCTION
  function setupIntro() {
    const panel =
      document.getElementById('presentation');

    if (!panel || panel.dataset.murIntro2026 === '1') {
      return;
    }

    panel.dataset.murIntro2026 = '1';

    // Retirer l'ancien lecteur et ses événements.
    const previous = panel.querySelector('video');

    if (previous) previous.pause();

    panel.replaceChildren();
    panel.classList.remove('hide');
    panel.classList.add('mur-video-presentation');

    Object.assign(panel.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '99999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      overflow: 'hidden',
      background: '#040914'
    });

    // Conserver les proportions de la vidéo.
    const frame = document.createElement('div');

    Object.assign(frame.style, {
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
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
      display: 'block',
      width: '100%',
      height: '100%',
      maxWidth: 'none',
      maxHeight: 'none',
      objectFit: 'contain',
      background: '#040914'
    });

    function button(label, extra) {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = label;

      Object.assign(el.style, {
        position: 'absolute',
        zIndex: '3',
        minHeight: '48px',
        padding: '12px 18px',
        borderRadius: '999px',
        border: '1px solid rgba(255,255,255,.65)',
        font: '800 14px system-ui, sans-serif',
        cursor: 'pointer',
        ...extra
      });

      return el;
    }

    // ACTIVER LE SON
    const sound = button('🔊 Activer le son', {
      top: 'calc(18px + env(safe-area-inset-top))',
      right: 'calc(16px + env(safe-area-inset-right))',
      background: 'rgba(8,17,30,.82)',
      color: '#fff'
    });

    // COMMENCER
    const commencer = button('Commencer', {
      left: '50%',
      bottom: 'calc(36px + env(safe-area-inset-bottom))',
      transform: 'translateX(-50%)',
      display: 'none',
      zIndex: '4',
      minWidth: '200px',
      minHeight: '56px',
      font: '900 18px system-ui, sans-serif',
      background: '#fff',
      color: '#07111f',
      boxShadow: '0 0 32px rgba(255,255,255,.28)'
    });

    commencer.id = 'murCommencer';

    // BOUTON DE SECOURS
    const retry = button('▶ Lire la vidéo', {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'none',
      background: '#173450',
      color: '#fff'
    });

    frame.append(video, sound, commencer, retry);
    panel.appendChild(frame);

    let finished = false;
    let generation = 0;

    function showCommencer() {
      if (finished) return;

      finished = true;
      video.pause();

      // Garder la dernière image visible.
      if (
        Number.isFinite(video.duration) &&
        video.duration > 0
      ) {
        try {
          video.currentTime = Math.max(
            0,
            video.duration - 0.10
          );
        } catch (error) {}
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

      if (withSound) {
        video.removeAttribute('muted');
      } else {
        video.setAttribute('muted', '');
      }

      video.volume = 1;

      try {
        video.currentTime = 0;
      } catch (error) {}

      const playing = video.play();

      if (
        playing &&
        typeof playing.catch === 'function'
      ) {
        playing.catch(() => {
          if (token === generation && !finished) {
            retry.style.display = 'block';
          }
        });
      }
    }

    // Un clic relance la vidéo avec toute sa bande-son.
    sound.addEventListener('click', () => {
      playIntro(true);
    });

    retry.addEventListener('click', () => {
      playIntro(true);
    });

    video.addEventListener('ended', showCommencer);
    video.addEventListener('error', showCommencer);

    video.addEventListener('timeupdate', () => {
      if (
        !finished &&
        Number.isFinite(video.duration) &&
        video.duration > 0 &&
        video.currentTime >= video.duration - 0.08
      ) {
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

    // Un appui court sur le logo relance l'introduction.
    window.openPresentation = () => playIntro(false);

    playIntro(false);
  }

  // ACCÈS AU BACK-OFFICE
  function setupAdmin() {
    const brand = document.querySelector('.top .brand');

    if (!brand || brand.dataset.murAdminReady) return;

    brand.dataset.murAdminReady = '1';

    let timer = null;
    let triggered = false;
    let startX = 0;
    let startY = 0;

    brand.style.cursor = 'pointer';
    brand.style.touchAction = 'manipulation';
    brand.style.userSelect = 'none';
    brand.style.webkitUserSelect = 'none';
    brand.style.webkitTouchCallout = 'none';

    function cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    brand.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !e.isPrimary) return;

      cancel();
      triggered = false;
      startX = e.clientX;
      startY = e.clientY;

      timer = setTimeout(() => {
        timer = null;
        triggered = true;

        if (navigator.vibrate) {
          navigator.vibrate(40);
        }

        window.location.assign(ADMIN_URL);
      }, 2000);
    });

    brand.addEventListener('pointermove', e => {
      if (
        Math.abs(e.clientX - startX) > 14 ||
        Math.abs(e.clientY - startY) > 14
      ) {
        cancel();
      }
    });

    [
      'pointerup',
      'pointercancel',
      'pointerleave'
    ].forEach(name => {
      brand.addEventListener(name, cancel);
    });

    brand.addEventListener('click', e => {
      if (!triggered) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      triggered = false;
    }, true);

    brand.addEventListener('contextmenu', e => {
      e.preventDefault();
    });
  }

  // CONTENUS DU BACK-OFFICE
  async function applyContent() {
    try {
      const response = await fetch(
        'mur-content.json',
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error('Contenu absent');
      }

      const data = await response.json();

      // Questions ki.S
      if (
        Array.isArray(data.questions) &&
        data.questions.length === 15 &&
        typeof KIS_QUESTIONS !== 'undefined'
      ) {
        const valid = data.questions.every(q =>
          ['text', 'a', 'f', 'p'].every(k =>
            typeof q[k] === 'string' &&
            q[k].trim().length > 0
          )
        );

        if (valid) {
          KIS_QUESTIONS.splice(
            0,
            KIS_QUESTIONS.length,
            ...data.questions.map(q => ({ ...q }))
          );
        }
      }

      // Exercices, images et sons
      if (
        data.exercises &&
        typeof EXERCISES !== 'undefined'
      ) {
        Object.keys(EXERCISES).forEach(key => {
          const source = data.exercises[key];
          const target = EXERCISES[key];

          if (!source || !target) return;

          ['title', 'caption'].forEach(prop => {
            if (typeof source[prop] === 'string') {
              target[prop] = source[prop];
            }
          });

          ['files', 'sounds', 'why'].forEach(prop => {
            if (Array.isArray(source[prop])) {
              target[prop] = source[prop].filter(
                value => typeof value === 'string'
              );
            }
          });
        });
      }

      // Protocoles respiratoires
      if (
        data.breaths &&
        typeof BREATHS !== 'undefined'
      ) {
        Object.keys(BREATHS).forEach(key => {
          const source = data.breaths[key];
          const target = BREATHS[key];

          if (!source || !target) return;

          ['i', 'hi', 'e', 'ho', 'duration'].forEach(prop => {
            if (
              Number.isFinite(source[prop]) &&
              source[prop] >= 0
            ) {
              target[prop] = source[prop];
            }
          });

          if (typeof source.msg === 'string') {
            target.msg = source.msg;
          }
        });
      }

      window.dispatchEvent(
        new Event('mur-content-loaded')
      );

    } catch (error) {
      console.info(
        'M.U.R. : contenu par défaut conservé',
        error.message
      );
    }
  }

  // INITIALISATION
  function init() {
    setupIntro();
    setupAdmin();
    applyContent();
  }

  // Le script se charge à la fin de index.html.
  if (document.getElementById('presentation')) {
    init();
  } else {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  }

})();
