
/*
 M.U.R. — Extensions
 Version : vidéo automatique + Commencer

 - Vidéo lancée automatiquement sans son
 - Dernière image conservée
 - Bouton Commencer après la vidéo
 - Largeur réduite sur ordinateur
 - Appui long sur logo : back-office
 - Chargement des contenus du back-office
*/

(() => {
  'use strict';

  const VIDEO =
    'Logo_character_comes_to_life_20261031152523.mp4';

  const ADMIN_URL = 'admin.html';

  // ====================================
  // 1. INTRODUCTION VIDEO
  // ====================================

  function setupIntro() {
    const panel = document.getElementById('presentation');

    if (!panel || panel.dataset.murIntroReady === '1') {
      return;
    }

    panel.dataset.murIntroReady = '1';

    // Supprime l'ancien lecteur et ses boutons.
    // Le nouveau lecteur possède un identifiant différent
    // pour éviter la fermeture automatique de index.html.
    panel.replaceChildren();

    panel.classList.remove('hide');
    panel.classList.add('mur-video-presentation');

    Object.assign(panel.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      padding: '20px',
      background: '#040914',
      overflow: 'hidden'
    });

    // Bloc vidéo plus étroit sur ordinateur
    const frame = document.createElement('div');

    Object.assign(frame.style, {
      position: 'relative',
      width: '100%',
      maxWidth: '720px',
      maxHeight: '82dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: '18px',
      background: '#040914'
    });

    const video = document.createElement('video');

    video.id = 'murWelcomeVideo';
    video.src = VIDEO;
    video.autoplay = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';

    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    video.setAttribute(
      'aria-label',
      'Animation de présentation M.U.R.'
    );

    Object.assign(video.style, {
      display: 'block',
      width: '100%',
      height: 'auto',
      maxHeight: '82dvh',
      objectFit: 'contain',
      background: '#040914'
    });

    // Bouton Commencer
    const commencer = document.createElement('button');

    commencer.type = 'button';
    commencer.textContent = 'Commencer';
    commencer.className = 'mur-commencer';

    Object.assign(commencer.style, {
      position: 'absolute',
      left: '50%',
      bottom: 'max(22px, 5%)',
      transform: 'translateX(-50%)',
      zIndex: '100',
      display: 'none',
      minWidth: '190px',
      minHeight: '54px',
      padding: '14px 30px',
      border: '1px solid rgba(255,255,255,.7)',
      borderRadius: '999px',
      background: '#ffffff',
      color: '#07111f',
      font: '900 17px system-ui, sans-serif',
      boxShadow: '0 0 35px rgba(255,255,255,.3)',
      cursor: 'pointer'
    });

    // Secours en cas de blocage de lecture automatique
    const replay = document.createElement('button');

    replay.type = 'button';
    replay.textContent = '▶ Lire la vidéo';

    Object.assign(replay.style, {
      position: 'absolute',
      left: '50%',
      bottom: 'max(22px, 5%)',
      transform: 'translateX(-50%)',
      zIndex: '101',
      display: 'none',
      minWidth: '190px',
      minHeight: '52px',
      padding: '13px 25px',
      border: '1px solid #ffffff70',
      borderRadius: '999px',
      background: '#142740',
      color: 'white',
      font: '800 15px system-ui, sans-serif',
      cursor: 'pointer'
    });

    frame.append(video, commencer, replay);
    panel.appendChild(frame);

    function showCommencer() {
      video.pause();
      replay.style.display = 'none';
      commencer.style.display = 'block';
    }

    function startVideo() {
      panel.classList.remove('hide');

      commencer.style.display = 'none';
      replay.style.display = 'none';

      video.pause();
      video.muted = true;

      try {
        video.currentTime = 0;
      } catch (e) {}

      const p = video.play();

      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          replay.style.display = 'block';
        });
      }
    }

    // Le nouveau lecteur n'a pas les anciens
    // gestionnaires de fermeture automatique.
    video.addEventListener('ended', showCommencer);

    video.addEventListener('error', () => {
      // En cas d'erreur, l'utilisateur peut entrer.
      showCommencer();
    });

    replay.addEventListener('click', startVideo);

    commencer.addEventListener('click', () => {
      video.pause();

      // Appel du mécanisme d'accueil original.
      if (typeof window.enterApp === 'function') {
        window.enterApp();
      } else {
        panel.classList.add('hide');
      }
    });

    // Appui court sur le petit logo :
    // revoir toute l'introduction.
    window.openPresentation = startVideo;

    // Démarrage immédiat
    startVideo();
  }

  // ====================================
  // 2. ACCES AU BACK-OFFICE
  // ====================================

  function setupAdmin() {
    const brand = document.querySelector('.top .brand');

    if (!brand || brand.dataset.adminReady === '1') {
      return;
    }

    brand.dataset.adminReady = '1';

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

  // ====================================
  // 3. CONTENUS DU BACK-OFFICE
  // ====================================

  async function applyContent() {
    try {
      const response = await fetch('mur-content.json', {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Fichier absent');
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

      // Exercices et médias
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
                v => typeof v === 'string'
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

  // ====================================
  // 4. DEMARRAGE
  // ====================================

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
