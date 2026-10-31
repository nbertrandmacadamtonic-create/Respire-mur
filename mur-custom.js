
/*
 M.U.R. — Version vidéo corrigée
 - Lecture automatique et silencieuse
 - Bouton Commencer après la vidéo
 - Vidéo limitée à 680 px sur ordinateur
 - Accès back-office par appui long
 - Chargement des contenus
*/

(() => {
  'use strict';

  const VIDEO =
    'Logo_character_comes_to_life_20261031152523.mp4';

  const ADMIN_URL = 'admin.html';

  // =========================================
  // INTRODUCTION
  // =========================================

  function setupIntro() {
    const panel = document.getElementById('presentation');

    if (!panel || panel.dataset.murFixedIntro === '1') {
      return;
    }

    panel.dataset.murFixedIntro = '1';

    // On supprime le lecteur original.
    // L'ancien code ne peut donc plus fermer
    // automatiquement cette nouvelle vidéo.
    panel.replaceChildren();

    panel.classList.remove('hide');

    Object.assign(panel.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '99999',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '20px 15px',
      background: '#040914'
    });

    // Conteneur de la vidéo
    const frame = document.createElement('div');

    Object.assign(frame.style, {
      position: 'relative',
      width: '100%',
      maxWidth: '680px',
      maxHeight: '78dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: '16px',
      background: '#040914'
    });

    // Nouveau lecteur sans conflit avec index.html
    const video = document.createElement('video');

    video.id = 'murNewIntroVideo';
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
      maxWidth: '680px',
      height: 'auto',
      maxHeight: '78dvh',
      objectFit: 'contain',
      background: '#040914'
    });

    frame.appendChild(video);

    // Bouton Commencer séparé du lecteur
    const commencer = document.createElement('button');

    commencer.type = 'button';
    commencer.id = 'murCommencer';
    commencer.textContent = 'Commencer';

    Object.assign(commencer.style, {
      position: 'absolute',
      left: '50%',
      bottom: 'calc(35px + env(safe-area-inset-bottom))',
      transform: 'translateX(-50%)',
      zIndex: '100000',
      display: 'none',
      visibility: 'visible',
      opacity: '1',
      minWidth: '200px',
      minHeight: '56px',
      padding: '15px 32px',
      borderRadius: '999px',
      border: '1px solid #ffffff',
      background: '#ffffff',
      color: '#07111f',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontWeight: '900',
      boxShadow: '0 0 36px rgba(255,255,255,.28)',
      cursor: 'pointer'
    });

    // Bouton de secours si l'autoplay est bloqué
    const relancer = document.createElement('button');

    relancer.type = 'button';
    relancer.textContent = '▶ Lire la vidéo';

    Object.assign(relancer.style, {
      position: 'absolute',
      left: '50%',
      bottom: 'calc(35px + env(safe-area-inset-bottom))',
      transform: 'translateX(-50%)',
      zIndex: '100001',
      display: 'none',
      minWidth: '200px',
      minHeight: '54px',
      padding: '14px 25px',
      borderRadius: '999px',
      border: '1px solid #ffffff80',
      background: '#173450',
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: '800',
      cursor: 'pointer'
    });

    // Indication pour les lecteurs d'écran
    commencer.setAttribute(
      'aria-label',
      'Commencer et ouvrir l’application M.U.R.'
    );

    panel.append(frame, commencer, relancer);

    let completed = false;
    let playbackGeneration = 0;

    function showCommencer() {
      if (completed) return;

      completed = true;
      video.pause();

      // Rester sur la dernière image
      if (
        Number.isFinite(video.duration) &&
        video.duration > 0
      ) {
        try {
          video.currentTime = Math.max(
            0,
            video.duration - 0.04
          );
        } catch (e) {}
      }

      relancer.style.display = 'none';
      commencer.style.display = 'block';

      commencer.hidden = false;
      panel.classList.remove('hide');
    }

    function playIntro() {
      playbackGeneration++;
      const generation = playbackGeneration;

      completed = false;

      panel.classList.remove('hide');

      commencer.style.display = 'none';
      relancer.style.display = 'none';

      video.pause();
      video.muted = true;

      try {
        video.currentTime = 0;
      } catch (e) {}

      const promise = video.play();

      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {
          if (
            generation !== playbackGeneration ||
            completed
          ) return;

          relancer.style.display = 'block';
        });
      }
    }

    // Fin normale
    video.addEventListener('ended', showCommencer);

    // Sécurité : certains navigateurs ne déclenchent
    // pas immédiatement l'événement ended.
    video.addEventListener('timeupdate', () => {
      if (
        !completed &&
        Number.isFinite(video.duration) &&
        video.duration > 0 &&
        video.currentTime >= video.duration - 0.08
      ) {
        showCommencer();
      }
    });

    // Ne pas bloquer l'accès si la vidéo est absente
    video.addEventListener('error', showCommencer);

    relancer.addEventListener('click', playIntro);

    // Entrer seulement lorsqu'on appuie sur Commencer
    commencer.addEventListener('click', () => {
      video.pause();

      if (typeof window.enterApp === 'function') {
        window.enterApp();
      } else {
        panel.classList.add('hide');
      }
    });

    // Petit logo : relancer la vidéo
    window.openPresentation = playIntro;

    // Lecture initiale
    playIntro();
  }

  // =========================================
  // ACCES AU BACK-OFFICE
  // =========================================

  function setupAdmin() {
    const brand = document.querySelector('.top .brand');

    if (!brand || brand.dataset.murAdminV3) return;

    brand.dataset.murAdminV3 = '1';

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

    ['pointerup','pointercancel','pointerleave']
      .forEach(name => {
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

  // =========================================
  // CONTENUS DU BACK-OFFICE
  // =========================================

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
          ['text','a','f','p'].every(k =>
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

      // Exercices
      if (
        data.exercises &&
        typeof EXERCISES !== 'undefined'
      ) {
        Object.keys(EXERCISES).forEach(key => {
          const source = data.exercises[key];
          const target = EXERCISES[key];

          if (!source || !target) return;

          ['title','caption'].forEach(prop => {
            if (typeof source[prop] === 'string') {
              target[prop] = source[prop];
            }
          });

          ['files','sounds','why'].forEach(prop => {
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

          ['i','hi','e','ho','duration'].forEach(prop => {
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

  // =========================================
  // INITIALISATION
  // =========================================

  function init() {
    setupIntro();
    setupAdmin();
    applyContent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
