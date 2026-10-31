
/* M.U.R. — Extensions de l'application
   Video d'accueil avec son
   Back-office par appui long
   Gestion des contenus
*/

(() => {
  'use strict';

  const VIDEO = 'Logo_character_comes_to_life_20261031152523.mp4';
  const ADMIN_URL = 'admin.html';

  // VIDEO D'ACCUEIL
  function setupIntro() {
    const presentation = document.getElementById('presentation');
    if (!presentation || presentation.dataset.murVideoReady) return;

    presentation.dataset.murVideoReady = '1';

    // Reutilise le lecteur existant dans index.html.
    // Cela evite deux videos concurrentes.
    let video = document.getElementById('murIntroVideo');

    if (!video) {
      video = document.createElement('video');
      video.id = 'murIntroVideo';
      presentation.appendChild(video);
    }

    video.src = VIDEO;
    video.autoplay = false;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.background = '#040914';

    video.pause();
    try { video.currentTime = 0; } catch (e) {}

    presentation.classList.add('mur-video-presentation');
    presentation.classList.remove('hide');

    // Supprime uniquement les anciens boutons de video.
    presentation.querySelectorAll(
      '.mur-intro-skip, .mur-video-skip, .mur-sound-start'
    ).forEach(el => el.remove());

    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'mur-sound-start';
    start.textContent = '▶ Lire avec le son';

    Object.assign(start.style, {
      position: 'absolute',
      left: '50%',
      bottom: '90px',
      transform: 'translateX(-50%)',
      zIndex: '15',
      padding: '15px 22px',
      borderRadius: '30px',
      border: '1px solid rgba(255,255,255,.5)',
      background: 'rgba(7,17,31,.90)',
      color: 'white',
      fontSize: '14px',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
      cursor: 'pointer'
    });

    const skip = document.createElement('button');
    skip.type = 'button';
    skip.textContent = 'Passer ›';

    Object.assign(skip.style, {
      position: 'absolute',
      right: '20px',
      bottom: '25px',
      zIndex: '15',
      padding: '10px 17px',
      borderRadius: '25px',
      border: '1px solid rgba(255,255,255,.3)',
      background: 'rgba(7,17,31,.75)',
      color: 'white',
      cursor: 'pointer'
    });

    function closeIntro() {
      video.pause();
      presentation.classList.add('hide');

      if (typeof window.enterApp === 'function') {
        window.enterApp();
      }
    }

    start.addEventListener('click', () => {
      // L'interaction utilisateur autorise le son.
      video.pause();
      video.muted = false;
      video.volume = 1;

      try { video.currentTime = 0; } catch (e) {}

      const playback = video.play();

      if (playback && playback.then) {
        playback.then(() => {
          start.style.display = 'none';
        }).catch(() => {
          start.textContent = '▶ Reessayer avec le son';
        });
      } else {
        start.style.display = 'none';
      }
    });

    skip.addEventListener('click', closeIntro);

    video.addEventListener('ended', closeIntro);
    video.addEventListener('error', () => {
      start.textContent = 'Video indisponible — Passer';
      start.onclick = closeIntro;
    });

    presentation.append(start, skip);

    // Le logo peut relancer la presentation.
    window.openPresentation = function() {
      presentation.classList.remove('hide');
      video.pause();
      video.muted = true;
      try { video.currentTime = 0; } catch (e) {}
      start.style.display = '';
      start.textContent = '▶ Lire avec le son';
    };
  }

  // OUVERTURE DU BACK-OFFICE PAR APPUI LONG
  function setupAdmin() {
    const brand = document.querySelector('.top .brand');
    if (!brand || brand.dataset.adminReady) return;

    brand.dataset.adminReady = '1';

    let timer = null;
    let triggered = false;
    let x = 0;
    let y = 0;

    brand.style.cursor = 'pointer';
    brand.style.touchAction = 'manipulation';

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

      x = e.clientX;
      y = e.clientY;

      timer = setTimeout(() => {
        timer = null;
        triggered = true;

        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        window.location.assign(ADMIN_URL);
      }, 2000);
    });

    brand.addEventListener('pointermove', e => {
      if (
        Math.abs(e.clientX - x) > 12 ||
        Math.abs(e.clientY - y) > 12
      ) {
        cancel();
      }
    });

    [
      'pointerup',
      'pointercancel',
      'pointerleave'
    ].forEach(eventName => {
      brand.addEventListener(eventName, cancel);
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

  // CHARGEMENT DES DONNEES DU BACK-OFFICE
  async function applyContent() {
    try {
      const response = await fetch('mur-content.json', {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Contenu absent');
      }

      const data = await response.json();

      // QUESTIONNAIRE Ki.S
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

      // EXERCICES
      if (
        data.exercises &&
        typeof EXERCISES !== 'undefined'
      ) {
        Object.keys(EXERCISES).forEach(key => {
          const replacement = data.exercises[key];
          const original = EXERCISES[key];

          if (
            !replacement ||
            !original ||
            typeof replacement.title !== 'string'
          ) return;

          ['title', 'caption'].forEach(property => {
            if (typeof replacement[property] === 'string') {
              original[property] = replacement[property];
            }
          });

          ['files', 'sounds', 'why'].forEach(property => {
            if (Array.isArray(replacement[property])) {
              original[property] = replacement[property]
                .filter(value => typeof value === 'string');
            }
          });
        });
      }

      // PROTOCOLES RESPIRATOIRES
      if (
        data.breaths &&
        typeof BREATHS !== 'undefined'
      ) {
        Object.keys(BREATHS).forEach(key => {
          const replacement = data.breaths[key];
          const original = BREATHS[key];

          if (!replacement || !original) return;

          ['i', 'hi', 'e', 'ho', 'duration'].forEach(property => {
            if (
              Number.isFinite(replacement[property]) &&
              replacement[property] >= 0
            ) {
              original[property] = replacement[property];
            }
          });

          if (typeof replacement.msg === 'string') {
            original.msg = replacement.msg;
          }
        });
      }

      window.dispatchEvent(
        new Event('mur-content-loaded')
      );

    } catch (error) {
      console.info(
        'M.U.R. : contenu par defaut conserve',
        error.message
      );
    }
  }

  // DEMARRAGE
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
