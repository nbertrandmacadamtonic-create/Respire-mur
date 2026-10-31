
/* M.U.R. — Extensions de l'application */
(() => {
  'use strict';

  const VIDEO = 'Logo_character_comes_to_life_20261031152523.mp4';

  // VIDEO D'ACCUEIL AVEC SON
  function intro() {
    const old = document.getElementById('presentation');
    if (!old || old.dataset.murVideoReady) return;

    old.dataset.murVideoReady = '1';
    old.innerHTML = '';
    old.classList.remove('hide');
    old.classList.add('mur-video-presentation');

    const video = document.createElement('video');
    video.src = VIDEO;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('webkit-playsinline', '');
    video.className = 'mur-video';

    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'mur-video-skip';
    skip.textContent = 'Passer ›';

    const close = () => {
      if (old.classList.contains('hide')) return;
      video.pause();

      if (typeof window.enterApp === 'function') {
        window.enterApp();
      } else {
        old.classList.add('hide');
      }
    };

    video.addEventListener('ended', close);
    video.addEventListener('error', close);
    skip.onclick = close;

    // Activation du son par interaction utilisateur
    const sound = document.createElement('button');
    sound.type = 'button';
    sound.className = 'mur-video-skip';
    sound.textContent = '🔊 Activer le son';
    sound.style.left = '20px';
    sound.style.right = 'auto';

    sound.addEventListener('click', async () => {
      video.pause();
      video.currentTime = 0;
      video.muted = false;
      video.volume = 1;
      sound.disabled = true;

      try {
        await video.play();
        sound.remove();
      } catch (e) {
        sound.disabled = false;
        sound.textContent = '▶ Lire avec le son';
      }
    });

    old.append(video, skip, sound);

    const p = video.play();
    if (p && p.catch) {
      p.catch(() => {
        skip.textContent = 'Entrer ›';
      });
    }
  }

  // CONTENU DU BACK-OFFICE
  async function applyContent() {
    try {
      const resp = await fetch('mur-content.json', {
        cache: 'no-store'
      });

      if (!resp.ok) {
        throw new Error('Contenu absent');
      }

      const data = await resp.json();

      // Questions Ki.S
      if (
        Array.isArray(data.questions) &&
        data.questions.length === 15 &&
        typeof KIS_QUESTIONS !== 'undefined'
      ) {
        const valid = data.questions.every(q =>
          ['text', 'a', 'f', 'p'].every(k =>
            typeof q[k] === 'string' && q[k].trim()
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
        Object.keys(EXERCISES).forEach(k => {
          const v = data.exercises[k];

          if (!v || typeof v.title !== 'string') return;

          ['title', 'caption'].forEach(prop => {
            if (typeof v[prop] === 'string') {
              EXERCISES[k][prop] = v[prop];
            }
          });

          ['files', 'sounds', 'why'].forEach(prop => {
            if (Array.isArray(v[prop])) {
              EXERCISES[k][prop] = v[prop].filter(
                x => typeof x === 'string'
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
        Object.keys(BREATHS).forEach(k => {
          const v = data.breaths[k];
          if (!v) return;

          ['i', 'hi', 'e', 'ho', 'duration'].forEach(p => {
            if (
              Number.isFinite(v[p]) &&
              v[p] >= 0
            ) {
              BREATHS[k][p] = v[p];
            }
          });

          if (typeof v.msg === 'string') {
            BREATHS[k].msg = v.msg;
          }
        });
      }

      window.dispatchEvent(
        new Event('mur-content-loaded')
      );

    } catch (e) {
      console.info(
        'M.U.R. : contenu par défaut conservé',
        e.message
      );
    }
  }

  // APPUI LONG SUR LE LOGO — BACK-OFFICE
  function installAdminLongPress() {
    const brand = document.querySelector('.top .brand');

    if (!brand || brand.dataset.murAdminLongPress) {
      return;
    }

    brand.dataset.murAdminLongPress = '1';

    let timer = null;
    let longTriggered = false;
    let pointerStart = null;

    const clear = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    brand.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !e.isPrimary) return;

      clear();
      longTriggered = false;
      pointerStart = {
        x: e.clientX,
        y: e.clientY
      };

      timer = setTimeout(() => {
        timer = null;
        longTriggered = true;

        if (navigator.vibrate) {
          navigator.vibrate(40);
        }

        window.location.href = 'admin.html';
      }, 2000);
    });

    brand.addEventListener('pointermove', e => {
      if (
        pointerStart &&
        Math.hypot(
          e.clientX - pointerStart.x,
          e.clientY - pointerStart.y
        ) > 14
      ) {
        clear();
      }
    });

    [
      'pointerup',
      'pointercancel',
      'pointerleave'
    ].forEach(name => {
      brand.addEventListener(name, () => {
        clear();
        pointerStart = null;
      });
    });

    // Appui court : comportement habituel
    brand.addEventListener('click', e => {
      if (!longTriggered) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      longTriggered = false;
    }, true);

    brand.addEventListener('contextmenu', e => {
      if (timer !== null || longTriggered) {
        e.preventDefault();
      }
    });
  }

  // INITIALISATION
  function init() {
    intro();
    applyContent();
    installAdminLongPress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
