/*
 M.U.R. — Introduction videointromur.mp4
 - Lecture automatique, son activable par clic
 - Bouton « Passer » visible pendant le film
 - Bouton « Commencer » sur la dernière image
 - Back-office, tests et contenus conservés
 - Compatible avec le module de traduction FR/EN
*/

/* Compatibilité avec deux fonctions encore appelées par index.html mais
   absentes de sa version actuelle. Sans elles, showPage s'interrompt. */
if (typeof window.ensureExercisesNavAccessible !== 'function') {
  window.ensureExercisesNavAccessible = function ensureExercisesNavAccessible() {
    const button = document.getElementById('navExercises');
    if (!button) return;
    let unlocked = false;
    try {
      unlocked = typeof window.testsAreUnlocked === 'function' && window.testsAreUnlocked();
    } catch (error) {}
    button.classList.toggle('locked', !unlocked);
    button.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
    if (unlocked) button.removeAttribute('disabled');
  };
}

if (typeof window.installPresentationFallback !== 'function') {
  window.installPresentationFallback = function installPresentationFallback() {
    /* La présentation est déjà sécurisée par setupIntro dans ce fichier. */
  };
}

/* Stabilise l'état visuel du cadre après chaque navigation. La version
   actuelle de showPage ne retire pas toujours home-active en quittant
   l'accueil, ce qui mélange les règles de plusieurs écrans. */
(() => {
  function syncStableNavigationFrame() {
    const active = document.querySelector('.app > .page.active');
    if (!active) return;
    const isHome = active.id === 'home';
    document.body.classList.toggle('home-active', isHome);
    document.body.dataset.murActivePage = active.id;
    document.body.style.overflow = isHome ? 'hidden' : '';
  }

  function installStableNavigationFrame() {
    const pages = document.querySelectorAll('.app > .page');
    if (!pages.length || document.body.dataset.murStableFrame === '1') return;
    document.body.dataset.murStableFrame = '1';

    const observer = new MutationObserver(() => requestAnimationFrame(syncStableNavigationFrame));
    pages.forEach(page => observer.observe(page, {
      attributes: true,
      attributeFilter: ['class']
    }));

    document.addEventListener('click', event => {
      if (event.target.closest?.('.tabbar button,.mur-orb-choice,.mur-section-brand-orb')) {
        requestAnimationFrame(syncStableNavigationFrame);
        setTimeout(syncStableNavigationFrame, 80);
      }
    });
    window.addEventListener('pageshow', syncStableNavigationFrame);
    syncStableNavigationFrame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installStableNavigationFrame, { once: true });
  } else {
    installStableNavigationFrame();
  }
})();

(() => {
  'use strict';

  const VIDEO = 'videointromur.mp4';
  const ADMIN_URL = 'admin.html';

  function setupIntro() {
    const panel = document.getElementById('presentation');
    if (!panel || panel.dataset.murIntro2026 === '1') return;
    panel.dataset.murIntro2026 = '1';

    // Retirer l'ancien lecteur pour éviter que ses événements
    // ne ferment cette nouvelle introduction automatiquement.
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
        touchAction: 'manipulation',
        ...extra
      });
      return el;
    }

    // En haut à gauche : permet d'ouvrir directement l'application.
    const skip = button('Passer', {
      top: 'calc(18px + env(safe-area-inset-top))',
      left: 'calc(16px + env(safe-area-inset-left))',
      zIndex: '5', minHeight: '44px', padding: '9px 18px',
      background: 'rgba(8,17,30,.85)', color: '#fff'
    });
    skip.id = 'murIntroSkip';
    skip.setAttribute('aria-label', "Passer la vidéo d'introduction");

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

    frame.append(video, skip, sound, commencer, retry);
    panel.appendChild(frame);

    let finished = false;
    let dismissed = false;
    let generation = 0;

    // Utilisé par « Passer » ET « Commencer ».
    // Conserve le comportement historique : informations à la
    // première utilisation, puis entrée normale dans M.U.R.
    function enterApplication() {
      if (dismissed) return;
      dismissed = true;
      ++generation;
      video.pause();
      skip.style.display = 'none';
      sound.style.display = 'none';
      retry.style.display = 'none';
      commencer.style.display = 'none';
      if (typeof window.enterApp === 'function') {
        window.enterApp();
      } else {
        panel.classList.add('hide');
      }
    }

    function showCommencer() {
      if (finished || dismissed) return;
      finished = true;
      video.pause();
      // Garder le visuel final, sans redémarrer la lecture.
      if (Number.isFinite(video.duration) && video.duration > 0) {
        try { video.currentTime = Math.max(0, video.duration - 0.10); }
        catch (error) {}
      }
      skip.style.display = 'none';
      sound.style.display = 'none';
      retry.style.display = 'none';
      commencer.style.display = 'block';
      panel.classList.remove('hide');
    }

    function playIntro(withSound = false) {
      const token = ++generation;
      dismissed = false;
      finished = false;
      panel.classList.remove('hide');
      skip.style.display = 'block';
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
          if (token === generation && !finished && !dismissed) {
            retry.style.display = 'block';
          }
        });
      }
    }

    // Le navigateur autorise l'activation de la bande-son après clic.
    sound.addEventListener('click', () => playIntro(true));
    retry.addEventListener('click', () => playIntro(true));
    skip.addEventListener('click', enterApplication);
    commencer.addEventListener('click', enterApplication);
    video.addEventListener('ended', showCommencer);
    video.addEventListener('error', showCommencer);
    video.addEventListener('timeupdate', () => {
      if (!finished && !dismissed && Number.isFinite(video.duration) &&
          video.duration > 0 && video.currentTime >= video.duration - 0.08) {
        showCommencer();
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
  const bilingualScript = document.createElement('script');
  bilingualScript.src = 'mur-bilingual.js';
  bilingualScript.defer = true;
  document.body.appendChild(bilingualScript);
})();

/* =========================================================
   MODE RAPIDE — 1 minute 30 de respiration + 1 exercice
   ========================================================= */
(() => {
  'use strict';

  let quickModeActive = false;
  let quickModeStarting = false;
  let quickBreathTimer = 0;
  let quickBreathStartedAt = 0;
  let quickBreathPhase = '';

  const QUICK_BREATHS = {
    bleu:   { zone: 'Blue',   color: '#3b82f6', inhale: 5, exhale: 3, key: 'boost',    message: 'Gentle activation' },
    vert:   { zone: 'Green',  color: '#22c55e', inhale: 5, exhale: 5, key: '365',      message: 'Balance and stability' },
    orange: { zone: 'Orange', color: '#f59e0b', inhale: 4, exhale: 6, key: 'regulate', message: 'Gentle regulation' },
    rouge:  { zone: 'Red',    color: '#ef4444', inhale: 3, exhale: 8, key: 'frein',    message: 'Slow activation' }
  };

  function isEnglish() {
    return String(document.documentElement.lang || '').toLowerCase().startsWith('en');
  }

  function refreshQuickModeLabels() {
    const en = isEnglish();
    const pill = document.getElementById('murQuickModePill');
    if (pill) {
      pill.textContent = en ? 'QUICK MODE · EXIT' : 'MODE RAPIDE · QUITTER';
      pill.setAttribute('aria-label', en ? 'Exit quick mode' : 'Quitter le mode rapide');
    }
  }

  function showQuickMessage(message) {
    if (typeof window.showLockedMessage === 'function') {
      window.showLockedMessage(message);
      return;
    }
    const notice = document.getElementById('navNotice');
    if (!notice) return;
    notice.textContent = message;
    notice.classList.add('show');
    window.setTimeout(() => notice.classList.remove('show'), 3200);
  }

  function setQuickModeState(active) {
    quickModeActive = active;
    document.body.classList.toggle('mur-quick-mode-active', active);
  }

  function stopDirectQuickBreathing() {
    if (quickBreathTimer) window.clearInterval(quickBreathTimer);
    if (typeof window.stopSound === 'function') window.stopSound();
    quickBreathTimer = 0;
    quickBreathStartedAt = 0;
    quickBreathPhase = '';
  }

  function exitQuickMode() {
    stopDirectQuickBreathing();
    quickModeStarting = false;
    setQuickModeState(false);
    if (typeof window.stopBreathVoices === 'function') window.stopBreathVoices();

    const orb = document.getElementById('orb');
    if (orb) {
      orb.style.transitionDuration = '.35s';
      orb.style.transform = 'scale(.80)';
    }
    const homeCircle = document.getElementById('homeCircle');
    if (homeCircle) homeCircle.classList.remove('breathing');
    const stopButton = document.getElementById('stopBreathBtn');
    if (stopButton) stopButton.hidden = true;

    if (typeof window.switchPageDirect === 'function') window.switchPageDirect('home');
    else if (typeof window.showPage === 'function') window.showPage('home');
    if (typeof window.refreshHome === 'function') window.refreshHome();
  }

  function quickZoneKey() {
    let zone = null;
    try {
      const current = typeof window.getCurrentNeuroRecommendation === 'function'
        ? window.getCurrentNeuroRecommendation()
        : null;
      zone = current?.zone || null;
    } catch (error) {}

    if (!zone) {
      try { zone = JSON.parse(localStorage.getItem('murLastNeuro') || 'null')?.zone || null; }
      catch (error) {}
    }

    const raw = String(zone?.key || zone?.name || 'vert').toLowerCase();
    if (raw.includes('bleu')) return 'bleu';
    if (raw.includes('rouge')) return 'rouge';
    if (raw.includes('orange')) return 'orange';
    return 'vert';
  }

  function openQuickExercise() {
    if (!quickModeActive) return;

    let zoneKey = null;
    if (typeof window.getRecommendedExerciseZoneKey === 'function') {
      zoneKey = window.getRecommendedExerciseZoneKey();
    }

    let choices = [];
    if (zoneKey && typeof ZONES !== 'undefined') {
      const zone = ZONES.find(item => item.key === zoneKey);
      if (zone && Array.isArray(zone.items)) choices = zone.items.slice();
    }
    if (!choices.length && zoneKey && typeof EXERCISES !== 'undefined') {
      choices = Object.keys(EXERCISES).filter(key => EXERCISES[key]?.zone === zoneKey);
    }

    /* Évite de proposer deux fois de suite le même exercice dans une couleur. */
    const memoryKey = 'murQuickLastExercise_' + (zoneKey || 'default');
    const previous = localStorage.getItem(memoryKey);
    const available = choices.length > 1 ? choices.filter(key => key !== previous) : choices;
    const randomIndex = available.length
      ? Math.floor(Math.random() * available.length)
      : -1;
    const exerciseKey = randomIndex >= 0 ? available[randomIndex] : null;
    if (exerciseKey) localStorage.setItem(memoryKey, exerciseKey);

    const en = isEnglish();
    showQuickMessage(en
      ? 'Breathing complete. Your exercise is ready.'
      : 'Respiration terminée. Votre exercice est prêt.');

    window.setTimeout(() => {
      if (typeof window.switchPageDirect === 'function') {
        window.switchPageDirect('exercises');
      } else if (typeof window.showPage === 'function') {
        window.showPage('exercises');
      }

      if (typeof window.renderExerciseList === 'function') window.renderExerciseList();
      if (typeof window.ensureExercisesVisibleAndRendered === 'function') {
        window.ensureExercisesVisibleAndRendered();
      }

      window.setTimeout(() => {
        if (exerciseKey && typeof window.openExercise === 'function') {
          window.openExercise(exerciseKey);
          /* La fiche vient d'être créée : on lance immédiatement son audio
             et son halo, sans demander un second appui. */
          window.setTimeout(() => {
            const audio = document.getElementById('exerciseAudio');
            if (!audio || !audio.paused) return;
            if (typeof window.toggleExerciseAudio === 'function') {
              window.toggleExerciseAudio();
            } else {
              const pending = audio.play();
              if (pending && typeof pending.catch === 'function') pending.catch(() => {});
            }
          }, 180);
        } else if (typeof window.openRecommendedExercises === 'function') {
          window.openRecommendedExercises();
        }
        setQuickModeState(false);
      }, 180);
    }, 450);
  }

  function configureAndStartQuickBreathing() {
    if (!quickModeStarting) return;
    quickModeStarting = false;

    try {
      stopDirectQuickBreathing();
      if (typeof window.stopBreathVoices === 'function') window.stopBreathVoices();
      /* Initialisé pendant le toucher sur l'orbe : les navigateurs mobiles
         autorisent ainsi les sons de souffle, sans lancer les voix. */
      if (typeof window.initAudio === 'function') window.initAudio();

      const zoneKey = quickZoneKey();
      const profile = QUICK_BREATHS[zoneKey];
      const en = isEnglish();
      const names = {
        bleu: en ? 'Blue' : 'Bleu', vert: en ? 'Green' : 'Vert',
        orange: 'Orange', rouge: en ? 'Red' : 'Rouge'
      };

      document.documentElement.style.setProperty('--accent', profile.color);
      document.querySelectorAll('.dot').forEach(dot => { dot.style.background = profile.color; });

      const zoneLabel = document.getElementById('breathZone');
      if (zoneLabel) zoneLabel.textContent = names[zoneKey];
      const cycle = document.getElementById('cycleLabel');
      if (cycle) cycle.textContent = `${profile.inhale} / 0 / ${profile.exhale} / 0`;
      const message = document.getElementById('breathMessage');
      if (message) message.textContent = en
        ? `${names[zoneKey]} quick breathing · ${profile.message}.`
        : `${names[zoneKey]} · respiration rapide adaptée à votre résultat NeuroFlex.`;

      const select = document.getElementById('protocolSelect');
      if (select) select.value = profile.key;
      const stopButton = document.getElementById('stopBreathBtn');
      if (stopButton) stopButton.hidden = false;
      const homeCircle = document.getElementById('homeCircle');
      if (homeCircle) homeCircle.classList.add('breathing');

      const progress = document.getElementById('progressCircle');
      const circumference = 2 * Math.PI * 98;
      if (progress) {
        progress.style.strokeDasharray = String(circumference);
        progress.style.strokeDashoffset = String(circumference);
      }

      quickBreathStartedAt = performance.now();

      const tick = () => {
        if (!quickModeActive) {
          stopDirectQuickBreathing();
          return;
        }

        const elapsed = Math.max(0, (performance.now() - quickBreathStartedAt) / 1000);
        const remaining = Math.max(0, 90 - elapsed);
        const timeLeft = document.getElementById('timeLeft');
        if (timeLeft) {
          const seconds = Math.ceil(remaining);
          timeLeft.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        }
        if (progress) progress.style.strokeDashoffset = String(circumference * (remaining / 90));

        const cycleDuration = profile.inhale + profile.exhale;
        const cyclePosition = elapsed % cycleDuration;
        const phase = cyclePosition < profile.inhale ? 'inhale' : 'exhale';
        if (phase !== quickBreathPhase) {
          quickBreathPhase = phase;
          const duration = phase === 'inhale' ? profile.inhale : profile.exhale;
          const orb = document.getElementById('orb');
          const phaseText = document.getElementById('phaseText');
          const phaseHint = document.getElementById('phaseHint');
          if (phaseText) phaseText.textContent = phase === 'inhale'
            ? (en ? 'Inhale' : 'Inspirez')
            : (en ? 'Exhale' : 'Expirez');
          if (phaseHint) phaseHint.textContent = phase === 'inhale'
            ? (en ? 'Let the circle expand gently.' : 'Laissez le cercle s’ouvrir doucement.')
            : (en ? 'Let the air flow out slowly.' : 'Laissez l’air sortir lentement.');
          if (orb) {
            orb.style.transitionDuration = duration + 's';
            orb.style.transform = phase === 'inhale' ? 'scale(1.34)' : 'scale(.68)';
          }
          if (typeof window.playBreathSound === 'function') {
            window.playBreathSound(phase === 'inhale' ? 'inspire' : 'expire', duration);
          }
        }

        if (remaining <= 0) {
          stopDirectQuickBreathing();
          if (homeCircle) homeCircle.classList.remove('breathing');
          if (stopButton) stopButton.hidden = true;
          if (typeof window.addHistory === 'function') {
            window.addHistory({
              type: 'breath', title: en ? 'Quick breathing' : 'Respiration rapide',
              detail: `${names[zoneKey]} · 1 min 30`, minutes: 1.5, color: profile.color
            });
          }
          openQuickExercise();
        }
      };

      tick();
      quickBreathTimer = window.setInterval(tick, 200);
    } catch (error) {
      console.error('M.U.R. mode rapide :', error);
      stopDirectQuickBreathing();
      quickModeStarting = false;
      setQuickModeState(false);
      showQuickMessage(isEnglish()
        ? 'Quick mode could not start.'
        : "Le mode rapide n'a pas pu démarrer.");
    }
  }

  function startQuickMode() {
    if (quickModeStarting) return;

    /* Un essai interrompu ne doit jamais bloquer les suivants. */
    if (quickModeActive) {
      stopDirectQuickBreathing();
      setQuickModeState(false);
    }

    if (typeof window.testsAreUnlocked === 'function' && !window.testsAreUnlocked()) {
      showQuickMessage(isEnglish()
        ? 'Complete both NeuroFlex tests first.'
        : "Réalisez d'abord les deux tests NeuroFlex.");
      if (typeof window.openTestsMenuAlways === 'function') {
        window.setTimeout(() => window.openTestsMenuAlways(), 650);
      }
      return;
    }

    quickModeStarting = true;
    setQuickModeState(true);
    if (typeof window.switchPageDirect === 'function') window.switchPageDirect('breath');
    else if (typeof window.showPage === 'function') window.showPage('breath');
    /* Démarrage dans le geste utilisateur : indispensable sur iPhone et
       certains navigateurs pour autoriser immédiatement le son et l'animation. */
    configureAndStartQuickBreathing();
  }

  function installQuickMode() {
    if (document.getElementById('murQuickModePill')) return;

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.id = 'murQuickModePill';
    pill.className = 'mur-quick-mode-pill';
    pill.textContent = 'MODE RAPIDE · QUITTER';
    pill.setAttribute('aria-label', 'Quitter le mode rapide');
    pill.addEventListener('click', exitQuickMode);
    document.body.appendChild(pill);

    /* On prolonge proprement la fin native de respiration afin de conserver
       la voix, l'historique, les statistiques et le Wake Lock existants. */
    if (typeof window.finishBreathing === 'function' && !window.finishBreathing.murQuickWrapped) {
      const nativeFinish = window.finishBreathing;
      const wrappedFinish = async function murQuickFinishBreathing(...args) {
        const result = await nativeFinish.apply(this, args);
        if (quickModeActive) openQuickExercise();
        return result;
      };
      wrappedFinish.murQuickWrapped = true;
      window.finishBreathing = wrappedFinish;
    }

    /* En mode rapide, la transition vers l'exercice est immédiate :
       aucune présentation vocale d'entrée ni de sortie. */
    if (typeof window.playBreathVoiceRobust === 'function' && !window.playBreathVoiceRobust.murQuickWrapped) {
      const nativeRobustVoice = window.playBreathVoiceRobust;
      const wrappedRobustVoice = function murQuickRobustVoice(audioId, ...args) {
        if (quickModeActive && audioId === 'breathOutroAudio') return Promise.resolve(false);
        return nativeRobustVoice.call(this, audioId, ...args);
      };
      wrappedRobustVoice.murQuickWrapped = true;
      window.playBreathVoiceRobust = wrappedRobustVoice;
    }

    if (typeof window.stopBreathing === 'function' && !window.stopBreathing.murQuickWrapped) {
      const nativeStop = window.stopBreathing;
      const wrappedStop = function murQuickStopBreathing(...args) {
        stopDirectQuickBreathing();
        quickModeStarting = false;
        setQuickModeState(false);
        return nativeStop.apply(this, args);
      };
      wrappedStop.murQuickWrapped = true;
      window.stopBreathing = wrappedStop;
    }

    new MutationObserver(refreshQuickModeLabels).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
    refreshQuickModeLabels();
  }

  /* Appelé par l'orbe centrale lorsque le menu radial est ouvert. */
  window.murStartQuickMode = startQuickMode;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installQuickMode, { once: true });
  } else {
    installQuickMode();
  }
})();

/* =========================================================
   ANGLAIS — correctif des textes dynamiques non traduits
   ========================================================= */
(() => {
  'use strict';

  const EN = new Map(Object.entries({
    'Refaire': 'Retake',
    'Voir la synthèse': 'View summary',
    'Voir la synthese': 'View summary',
    'Statistiques': 'Statistics',
    'Jour': 'Day',
    'Mois': 'Month',
    'Annee': 'Year',
    'Année': 'Year',
    "Lancer l'audio": 'Play audio',
    'Lancer l’audio': 'Play audio',
    "Arrêter l'audio": 'Stop audio',
    'Arrêter l’audio': 'Stop audio',
    'Pourquoi ca marche ?': 'Why does it work?',
    'Pourquoi ça marche ?': 'Why does it work?',
    'Pret': 'Ready',
    'Prêt': 'Ready',
    'Termine': 'Finished',
    'Terminé': 'Finished',
    'Lecture en cours': 'Playing',
    'Réessayez': 'Try again',
    'Reessayez': 'Try again',
    'Respiration terminée. Votre exercice est prêt.': 'Breathing complete. Your exercise is ready.',
    'Vert : respiration reguliere, stable et facile a tenir. Recommandation ajustee par le resultat NeuroFlex.':
      'Green: steady, regular breathing that is easy to maintain. Recommendation adjusted to your NeuroFlex result.',
    "Orange : l'expiration devient plus longue pour reguler la montee. Recommandation ajustee par le resultat NeuroFlex.":
      'Orange: a longer exhale helps regulate rising activation. Recommendation adjusted to your NeuroFlex result.',
    "Rouge : expiration longue pour freiner franchement l'activation. Recommandation ajustee par le resultat NeuroFlex.":
      'Red: a long exhale helps slow activation. Recommendation adjusted to your NeuroFlex result.',
    "Bleu : inspiration plus longue, pour remettre de l'elan sans brusquer le systeme. Recommandation ajustee par le resultat NeuroFlex.":
      'Blue: a longer inhale restores momentum gently. Recommendation adjusted to your NeuroFlex result.',
    'Vert : respiration reguliere, stable et facile a tenir.':
      'Green: steady, regular breathing that is easy to maintain.',
    "Orange : l'expiration devient plus longue pour reguler la montee.":
      'Orange: a longer exhale helps regulate rising activation.',
    "Rouge : expiration longue pour freiner franchement l'activation.":
      'Red: a long exhale helps slow activation.',
    "Bleu : inspiration plus longue, pour remettre de l'elan sans brusquer le systeme.":
      'Blue: a longer inhale restores momentum gently.'
  }));

  const COLOR_WORDS = {
    bleu: 'Blue', bleue: 'Blue', vert: 'Green', verte: 'Green',
    orange: 'Orange', rouge: 'Red'
  };

  function englishActive() {
    const stored = localStorage.getItem('mur-ui-language') ||
      localStorage.getItem('murLanguage') || localStorage.getItem('murLang');
    const englishButton = document.querySelector('[data-language="en"]');
    const pickerSaysEnglish = englishButton && (
      englishButton.getAttribute('aria-pressed') === 'true' ||
      englishButton.classList.contains('active') ||
      englishButton.classList.contains('selected')
    );
    return pickerSaysEnglish ||
      String(stored || document.documentElement.lang || 'fr').toLowerCase().startsWith('en');
  }

  function colour(value) {
    return COLOR_WORDS[String(value || '').trim().toLowerCase()] || value;
  }

  function translateDynamic(text) {
    const exact = EN.get(text);
    if (exact) return exact;

    let match = text.match(/^Dernier r[ée]sultat\s*:\s*([+−-]?\d+)\s*-\s*(BLEUE|VERTE|ORANGE|ROUGE)$/i);
    if (match) return `Latest result: ${match[1]} · ${colour(match[2])}`;

    match = text.match(/^(\d+)\s+(test|pratique)\s*-\s*(Bleu|Bleue|Vert|Verte|Orange|Rouge)$/i);
    if (match) return `${match[1]} ${match[2] === 'test' ? 'test' : 'practice'} · ${colour(match[3])}`;

    match = text.match(/^Moyenne\s+([+−-]?\d+)\s*-\s*dernier\s+([+−-]?\d+)\s*-\s*premier rep[eè]re$/i);
    if (match) return `Average ${match[1]} · latest ${match[2]} · baseline`;

    match = text.match(/^Zone\s+(rouge|orange|vert|bleu)\s*-\s*exercice audio$/i);
    if (match) return `${colour(match[1])} zone · audio exercise`;

    match = text.match(/^S[ée]ance respiration\s*-\s*zone\s+(BLEUE|VERTE|ORANGE|ROUGE)$/i);
    if (match) return `Breathing session · ${colour(match[1])} zone`;

    return text;
  }

  function translateNode(node) {
    const original = node.nodeValue;
    const trimmed = original.trim();
    if (!trimmed) return;
    const translated = translateDynamic(trimmed);
    if (translated === trimmed) return;
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    node.nodeValue = leading + translated + trailing;
  }

  let scheduled = false;
  function repairEnglish() {
    scheduled = false;
    if (!englishActive() || !document.body) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const tag = node.parentElement?.tagName;
        return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT'
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateNode);

    document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(element => {
      ['aria-label', 'title', 'placeholder'].forEach(attribute => {
        const value = element.getAttribute(attribute);
        if (!value) return;
        const translated = translateDynamic(value.trim());
        if (translated !== value.trim()) element.setAttribute(attribute, translated);
      });
    });
  }

  function repairEnglishTestButtons() {
    if (!englishActive()) return;
    document.querySelectorAll('#tests button, #tests .test-menu-card').forEach(element => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        const value = node.nodeValue.trim();
        if (value === 'Refaire') node.nodeValue = node.nodeValue.replace('Refaire', 'Retake');
        if (value === 'Voir la synthèse' || value === 'Voir la synthese') {
          node.nodeValue = node.nodeValue.replace(value, 'View summary');
        }
      });
    });
  }

  function scheduleRepair() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      repairEnglish();
      repairEnglishTestButtons();
      setTimeout(repairEnglishTestButtons, 60);
      setTimeout(repairEnglishTestButtons, 220);
    });
  }

  function installEnglishRepair() {
    repairEnglish();
    repairEnglishTestButtons();
    new MutationObserver(scheduleRepair).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    new MutationObserver(scheduleRepair).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-language]')) setTimeout(scheduleRepair, 40);
    });
    window.addEventListener('storage', scheduleRepair);
    window.addEventListener('mur-content-loaded', scheduleRepair);

    /* Les cartes de tests sont régulièrement reconstruites par l'application.
       Ce contrôle léger ne parcourt que leurs trois boutons. */
    window.setInterval(repairEnglishTestButtons, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installEnglishRepair, { once: true });
  } else {
    installEnglishRepair();
  }
})();

/* =============================================================
   M.U.R. V78 — PETITES SPHERES MULTIPOINTS SUR LES RUBRIQUES
   Une vraie sphere 3D en 280 points, couleurs de l'univers.
   Souffle vivant conserve son propre composant V72.
   ============================================================= */
(() => {
  'use strict';
  if (window.MUR_SECTION_PARTICLES_V78) return;
  const SECTIONS = {
    tests:     { color:'#1887ff', fr:'Mesurer', en:'Measure' },
    breath:    { color:'#00eb89', fr:'Respirer', en:'Breathe' },
    exercises: { color:'#ff7f14', fr:'Exercices', en:'Exercises' },
    stats:     { color:'#ff2e8a', fr:'Stats', en:'Stats' },
    settings:  { color:'#53b5ff', fr:'Réglages', en:'Settings' }
  };
  const COUNT=280, GOLD=Math.PI*(3-Math.sqrt(5)), TAU=Math.PI*2;
  const POINTS=Array.from({length:COUNT},(_,i)=>{
    const y=1-2*(i+.5)/COUNT, radius=Math.sqrt(1-y*y),theta=i*GOLD;
    return {x:radius*Math.cos(theta),y,z:radius*Math.sin(theta)};
  });
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const light=(v,f)=>v.map(c=>Math.round(c+(255-c)*f));
  let active=null, orb=null, canvas=null, ctx=null, frame=0;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const language=()=>String(localStorage.getItem('murLanguage')||localStorage.getItem('murLang')||document.documentElement.lang||'fr').toLowerCase().startsWith('en')?'en':'fr';
  function render(t){
    frame=requestAnimationFrame(render);
    if(!active||document.hidden||!orb?.isConnected||!ctx)return;
    const size=40,dpr=Math.min(window.devicePixelRatio||1,2);
    const physical=Math.round(size*dpr);
    if(canvas.width!==physical||canvas.height!==physical){canvas.width=canvas.height=physical;}
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,size,size);
    const near=light(rgb(active.color),.46),far=rgb(active.color);
    const angle=reduced?.matches?.36:t*.00032;
    const ca=Math.cos(angle),sa=Math.sin(angle);
    ctx.globalCompositeOperation='lighter';
    for(const p of POINTS){
      const x=p.x*ca-p.z*sa,z=p.x*sa+p.z*ca;
      const k=2.8/(2.8-z*.28),depth=(z+1)*.5;
      const col=far.map((v,i)=>Math.round(v+(near[i]-v)*depth));
      ctx.globalAlpha=.36+.61*depth;
      ctx.fillStyle=`rgb(${col.join(',')})`;
      ctx.beginPath();ctx.arc(20+x*16.1*k,20+p.y*16.1*k,.43+depth*.48,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
  }
  function init(){
    const brand=document.querySelector('.app > .top .brand');
    const title=brand?.querySelector('h1');
    if(!brand||!title)return;
    // Ne pas monter deux moteurs de sphère sur le même en-tête.
    if(brand.dataset.murSectionBrandReady==='1')return;
    brand.dataset.murSectionBrandReady='1';
    const originalTitle=title.innerHTML;
    const style=document.createElement('style');
    style.id='mur-section-points-v78-css';
    style.textContent=`
      .app > .top .brand.mur-section-brand{display:flex!important;align-items:center!important;gap:9px!important}
      .app > .top .brand.mur-section-brand > img.logo{display:none!important}
      .app > .top .brand .mur-section-brand-orb{
        display:block!important;position:relative!important;flex:0 0 40px!important;
        width:40px!important;height:40px!important;min-width:40px!important;
        overflow:visible!important;background:none!important;border:0!important;
        box-shadow:none!important;border-radius:50%!important;cursor:pointer!important;
        padding:0!important;opacity:1!important;
      }
      .app > .top .brand .mur-section-brand-orb::before,
      .app > .top .brand .mur-section-brand-orb::after{content:none!important;display:none!important}
      .app > .top .brand .mur-section-brand-orb .mur-section-points-v78{
        display:block!important;width:40px!important;height:40px!important;
        background:none!important;pointer-events:none!important;
      }
      .app > .top .brand .mur-section-brand-orb:focus-visible{outline:2px solid #d4f6ff!important;outline-offset:3px!important}
    `;
    document.head.appendChild(style);
    orb=document.createElement('span');
    orb.className='mur-section-brand-orb';
    orb.setAttribute('role','button');orb.tabIndex=0;
    orb.setAttribute('title',"Retour à l'accueil");
    canvas=document.createElement('canvas');
    canvas.className='mur-section-points-v78';canvas.setAttribute('aria-hidden','true');
    orb.appendChild(canvas);
    ctx=canvas.getContext('2d',{alpha:true});
    const goHome=e=>{e.preventDefault();e.stopPropagation();window.showPage?.('home');};
    orb.addEventListener('pointerdown',e=>e.stopPropagation());
    orb.addEventListener('click',goHome);
    orb.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){goHome(e);}});
    function refresh(){
      const page=document.querySelector('.app > .page.active');
      const section=page&&SECTIONS[page.id];
      if(!section){
        active=null;brand.classList.remove('mur-section-brand');orb.remove();title.innerHTML=originalTitle;
        return;
      }
      active=section;
      brand.classList.add('mur-section-brand');
      if(!orb.isConnected)brand.insertBefore(orb,brand.firstChild);
      title.textContent=section[language()];
      orb.setAttribute('aria-label',language()==='en'?'Back to home':"Retour à l'accueil");
    }
    document.querySelectorAll('.app > .page').forEach(page=>{
      new MutationObserver(refresh).observe(page,{attributes:true,attributeFilter:['class']});
    });
    new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-language]'))setTimeout(refresh,0);});
    window.addEventListener('storage',refresh);
    document.addEventListener('visibilitychange',refresh);
    refresh();
    if(ctx)frame=requestAnimationFrame(render);
    window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;},{once:true});
  }
  window.MUR_SECTION_PARTICLES_V78={version:78,points:COUNT,sections:Object.keys(SECTIONS)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

/* =============================================================
   M.U.R. — ETAPE B | ORBE RADIALE
   Tap : ouvre les quatre univers. Glissement : la rotation native
   reste intacte. Aucune logique de test ou de contenu n'est remplacee.
   ============================================================= */
(() => {
  'use strict';

  const ITEMS = [
    { page: 'tests', labels: { fr: 'Mesurer', en: 'Measure' } },
    { page: 'breath', labels: { fr: 'Respirer', en: 'Breathe' } },
    { page: 'exercises', labels: { fr: 'Exercices', en: 'Exercises' } },
    { page: 'stats', labels: { fr: 'Stats', en: 'Stats' } }
  ];

  function initMurOrbMenu() {
    const circle = document.getElementById('homeCircle');
    if (!circle || circle.dataset.murOrbMenuReady === '1') return;
    circle.dataset.murOrbMenuReady = '1';

    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'mur-orb-backdrop';
    backdrop.setAttribute('aria-label', 'Fermer le menu');
    backdrop.tabIndex = -1;

    const menu = document.createElement('div');
    menu.className = 'mur-orb-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Univers M.U.R.');
    menu.setAttribute('aria-hidden', 'true');

    const connectors = document.createElement('div');
    connectors.className = 'mur-orb-connectors';
    connectors.setAttribute('aria-hidden', 'true');
    connectors.innerHTML = `
      <div class="mur-orbit-line"></div>
    `;

    const quickCenter = document.createElement('button');
    quickCenter.type = 'button';
    quickCenter.className = 'mur-orb-official-logo mur-orb-quick-center';
    quickCenter.setAttribute('role', 'menuitem');
    quickCenter.innerHTML = '<strong>Mode rapide</strong><small>1:30 + exercice</small>';
    quickCenter.tabIndex = -1;
    menu.append(connectors, quickCenter);

    const buttons = ITEMS.map((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mur-orb-choice';
      button.dataset.page = item.page;
      button.dataset.index = String(index);
      button.setAttribute('role', 'menuitem');
      button.tabIndex = -1;
      menu.appendChild(button);
      return button;
    });

    document.body.append(backdrop, menu);

    let open = false;
    let closeTimer = 0;

    function language() {
      const stored = localStorage.getItem('murLanguage') || localStorage.getItem('murLang');
      const htmlLang = document.documentElement.lang;
      return String(stored || htmlLang || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
    }

    function refreshLabels() {
      const lang = language();
      buttons.forEach((button, index) => {
        button.textContent = ITEMS[index].labels[lang];
        button.setAttribute('aria-label', ITEMS[index].labels[lang]);
      });
      backdrop.setAttribute('aria-label', lang === 'en' ? 'Close menu' : 'Fermer le menu');
      menu.setAttribute('aria-label', lang === 'en' ? 'M.U.R. sections' : 'Univers M.U.R.');
      quickCenter.querySelector('strong').textContent = lang === 'en' ? 'Quick mode' : 'Mode rapide';
      quickCenter.querySelector('small').textContent = lang === 'en' ? '1:30 + exercise' : '1:30 + exercice';
      quickCenter.setAttribute('aria-label', lang === 'en'
        ? 'Start quick mode: 1 minute 30 breathing and one exercise'
        : 'Lancer le mode rapide : 1 minute 30 de respiration et un exercice');
      const trigger = circle.querySelector('.mur-orb-start-trigger');
      if (trigger) {
        trigger.textContent = lang === 'en' ? 'Tap to begin' : 'Appuyer pour commencer';
        trigger.dataset.subtitle = lang === 'en' ? 'Discover the sections' : 'Découvrir les univers';
        trigger.setAttribute('aria-label', trigger.textContent);
      }
    }

    function placeMenu() {
      const rect = circle.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const horizontalLimit = Math.max(102, Math.min(centerX, innerWidth - centerX) - 48);
      const verticalLimit = Math.max(102, Math.min(centerY, innerHeight - centerY) - 48);
      const radius = Math.max(102, Math.min(142, rect.width * .57, horizontalLimit, verticalLimit));
      menu.style.left = centerX + 'px';
      menu.style.top = centerY + 'px';
      menu.style.setProperty('--mur-orb-radius', radius + 'px');
    }

    function stopCloseTimer() {
      if (closeTimer) window.clearTimeout(closeTimer);
      closeTimer = 0;
    }

    function scheduleClose() {
      stopCloseTimer();
      closeTimer = window.setTimeout(closeMenu, 15000);
    }

    function openMenu() {
      if (open) return;
      open = true;
      refreshLabels();
      const quickUnlocked = typeof window.testsAreUnlocked !== 'function' || window.testsAreUnlocked();
      quickCenter.classList.toggle('is-locked', !quickUnlocked);
      quickCenter.setAttribute('aria-disabled', quickUnlocked ? 'false' : 'true');
      buttons.forEach(button => {
        const locked = button.dataset.page !== 'tests' && !quickUnlocked;
        button.classList.toggle('is-locked', locked);
        button.setAttribute('aria-disabled', locked ? 'true' : 'false');
      });
      placeMenu();
      menu.classList.add('is-open');
      backdrop.classList.add('is-open');
      circle.classList.add('mur-menu-open');
      circle.dispatchEvent(new CustomEvent('mur-orb-transition', { detail: { open: true } }));
      menu.setAttribute('aria-hidden', 'false');
      circle.setAttribute('aria-expanded', 'true');
      buttons.forEach(button => { button.tabIndex = 0; });
      quickCenter.tabIndex = 0;
      scheduleClose();
    }

    function closeMenu(options = {}) {
      if (!open) return;
      open = false;
      stopCloseTimer();
      menu.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      circle.classList.remove('mur-menu-open');
      circle.dispatchEvent(new CustomEvent('mur-orb-transition', { detail: { open: false } }));
      menu.setAttribute('aria-hidden', 'true');
      circle.setAttribute('aria-expanded', 'false');
      quickCenter.tabIndex = -1;
      buttons.forEach(button => {
        button.tabIndex = -1;
        button.classList.remove('is-activating');
      });
      if (options.focusCircle) circle.focus?.({ preventScroll: true });
    }

    function navigate(page) {
      closeMenu();
      if (page === 'tests' && typeof window.openTestsMenuAlways === 'function') {
        window.openTestsMenuAlways();
      } else if (typeof window.showPage === 'function') {
        window.showPage(page);
      }
    }

    buttons.forEach(button => {
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        stopCloseTimer();
        button.classList.add('is-activating');
        window.setTimeout(() => navigate(button.dataset.page), 170);
      });
      button.addEventListener('pointerenter', scheduleClose);
      button.addEventListener('focus', scheduleClose);
    });

    quickCenter.addEventListener('pointerdown', event => event.stopPropagation());
    quickCenter.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      stopCloseTimer();
      closeMenu();
      /* Aucun délai ici : le geste doit rester actif pour que le navigateur
         autorise le démarrage sonore automatique de la respiration. */
      window.murStartQuickMode?.();
    });

    backdrop.addEventListener('click', () => closeMenu());
    window.addEventListener('resize', () => { if (open) placeMenu(); }, { passive: true });
    window.addEventListener('orientationchange', () => { if (open) setTimeout(placeMenu, 100); });
    document.addEventListener('keydown', event => {
      if (!open) return;
      if (event.key === 'Escape') closeMenu({ focusCircle: true });
    });

    document.querySelectorAll('.tabbar button').forEach(button => {
      button.addEventListener('click', () => closeMenu());
    });

    circle.setAttribute('aria-haspopup', 'menu');
    circle.setAttribute('aria-expanded', 'false');
    circle.removeAttribute('tabindex');

    const startTrigger = document.createElement('button');
    startTrigger.type = 'button';
    startTrigger.className = 'mur-orb-start-trigger';
    startTrigger.textContent = 'Appuyer pour commencer';
    startTrigger.dataset.subtitle = 'Découvrir les univers';
    startTrigger.setAttribute('aria-label', 'Appuyer pour commencer');
    startTrigger.addEventListener('pointerdown', event => event.stopPropagation());
    startTrigger.addEventListener('pointermove', event => event.stopPropagation());
    startTrigger.addEventListener('pointerup', event => event.stopPropagation());
    startTrigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      window.homeCircleOpen?.(event);
    });
    circle.appendChild(startTrigger);

    /* L'attribut onclick de index.html appelle ce nom au moment du tap.
       Le glissement natif positionne homeDragJustEnded, que l'on respecte. */
    window.homeCircleOpen = function murHomeCircleOpen(event) {
      if (window.homeDragJustEnded) {
        window.homeDragJustEnded = false;
        event?.preventDefault?.();
        return;
      }
      event?.preventDefault?.();
      open ? closeMenu() : openMenu();
    };

    window.addEventListener('storage', refreshLabels);
    new MutationObserver(refreshLabels).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
    refreshLabels();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMurOrbMenu, { once: true });
  } else {
    initMurOrbMenu();
  }
})();

/* =============================================================
   M.U.R. V21.9 — Urgence / Mode rapide : Souffle vivant
   Charge le module de respiration au toucher apres le script principal.
   Les tests, la respiration 365, les exercices et le back-office sont conserves.
   ============================================================= */
(() => {
  'use strict';
  const SCRIPT_ID = 'murSouffleVivant218Script';
  const FILE = 'mur-souffle-vivant.js?v=22.9';
  function loadSouffleVivant() {
    if (document.getElementById(SCRIPT_ID) || window.MURSOUFFLEVIVANT21) return;
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = FILE;
    s.async = false;
    s.onerror = () => console.error('M.U.R. : chargement de Souffle vivant impossible.');
    document.head.appendChild(s);
  }
  // Evite que l'ancien Mode rapide reprenne la main lors de DOMContentLoaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSouffleVivant, {once: true});
  } else {
    loadSouffleVivant();
  }
})();


/* =============================================================
   M.U.R. V21.15 — MENU TEMPORAIRE SUR TOUTES LES RUBRIQUES
   Accueil : le menu reste visible.
   Mesurer, Respirer, Exercices, Stats et Urgence : un tap sur
   une zone libre centrale masque le menu pour 6,5 secondes.
   Aucun appui sur une commande, un test ou un formulaire
   ne déclenche ce raccourci.
   ============================================================= */
(() => {
  'use strict';
  const TIMEOUT_MS = 6500;
  const STYLE_ID = 'murNavAutoHideStyle215';
  let restoreTimer = 0;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body .tabbar {
      transition: opacity .28s ease, visibility .28s ease, transform .28s ease !important;
    }
    body.mur-nav-temporary-hidden .tabbar,
    body.mur-sv-active.mur-nav-temporary-hidden .tabbar {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transform: translateX(-50%) translateY(76px) !important;
    }
  `;
  document.head.appendChild(style);

  function isHome() {
    if (document.body.classList.contains('mur-sv-active')) return false;
    const active = document.querySelector('.app > .page.active');
    return !active || active.id === 'home';
  }
  function restore() {
    if (restoreTimer) window.clearTimeout(restoreTimer);
    restoreTimer = 0;
    document.body.classList.remove('mur-nav-temporary-hidden');
  }
  function hide() {
    if (isHome()) { restore(); return; }
    document.body.classList.add('mur-nav-temporary-hidden');
    if (restoreTimer) window.clearTimeout(restoreTimer);
    restoreTimer = window.setTimeout(restore, TIMEOUT_MS);
  }
  // Exposé pour l'écran Urgence : un seul délai et une seule animation.
  window.murTemporarilyHideNav = hide;
  window.murRestoreNav = restore;

  function onDocumentClick(event) {
    if (isHome()) { restore(); return; }
    if (event.defaultPrevented) return;
    if (document.querySelector('#svInfo:not([hidden]), #svResults:not([hidden])')) return;
    const node = event.target;
    if (!(node instanceof Element)) return;
    // Respecte les interactions de tous les écrans et les gestes de respiration.
    if (node.closest('button, a, input, textarea, select, label, summary, [role="button"], [role="link"], [role="slider"], [contenteditable], [onclick], .tabbar, .modal, [role="dialog"]:not(#murSV21), #svFinger')) return;
    // Pour Urgence, seul le canvas central est un raccourci :
    // le module le traite déjà lui-même (on unifie son minuteur ci-dessous).
    if (document.body.classList.contains('mur-sv-active')) return;
    const x = event.clientX / Math.max(1, window.innerWidth);
    const y = event.clientY / Math.max(1, window.innerHeight);
    if (x < .18 || x > .82 || y < .16 || y > .81) return;
    hide();
  }
  document.addEventListener('click', onDocumentClick, false);
  // Un retour à l'accueil doit immédiatement réafficher le menu.
  function checkPage() { if (isHome()) restore(); }
  function init() {
    document.querySelectorAll('.app > .page').forEach(page => {
      new MutationObserver(checkPage).observe(page, {attributes:true,attributeFilter:['class']});
    });
    document.querySelector('.tabbar')?.addEventListener('click', restore, true);
    window.addEventListener('pageshow', checkPage);
    checkPage();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else init();
})();


/* M.U.R. V22.6 — ouverture directe de la fiche sans ecran intermediaire. */
(() => {
  const load = () => {
    if(document.querySelector('script[data-mur-exsphere]')) return;
    const script=document.createElement('script');
    script.dataset.murExsphere='22.7';
    script.src='mur-exercices-sphere.js?v=22.7';
    script.defer=true;
    document.head.appendChild(script);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', load, {once:true});
  else load();
})();


/* =============================================================
   M.U.R. V33 — ACCUEIL SPHERE 3D 2400 PARTICULES
   Suppression du bandeau. Appel a l'action agrandi sous la sphère.
   Ajout limité à mur-custom.js.
   ============================================================= */
(() => {
  'use strict';
  const COUNT=2400, STYLE_ID='murHomeParticlesV33Style';
  if(window.MUR_HOME_PARTICLES_V33) return;
  const TAU=Math.PI*2, GOLD=Math.PI*(3-Math.sqrt(5));
  const points=Array.from({length:COUNT},(_,i)=>{
    const y=1-2*(i+.5)/COUNT, rad=Math.sqrt(Math.max(0,1-y*y));
    const a=i*GOLD;
    return {x:rad*Math.cos(a),y,z:rad*Math.sin(a),phase:(i*67%101)/101};
  });
  const palettes={
    bleu:[59,150,247],vert:[85,233,153],orange:[255,165,63],rouge:[255,88,100]
  };
  const css=`
    #home #homeCircle.mur-home-2400,
    #home #homeCircle.mur-home-2400.ready{
      position:relative!important;isolation:isolate!important;overflow:hidden!important;
      background:transparent!important;border:0!important;box-shadow:none!important;
      cursor:pointer!important;touch-action:none!important;
    }
    #home #homeCircle.mur-home-2400::before,
    #home #homeCircle.mur-home-2400::after{content:none!important;display:none!important}
    main.app #home.page.active > section.home-wheel-card.card:has(#homeCircle.mur-home-2400){
      overflow:hidden!important;isolation:isolate!important;
      display:flex!important;flex-direction:column!important;align-items:center!important;
      justify-content:flex-start!important;gap:0!important;
      padding:14px 12px 20px!important;
    }
    #home #homeCircle.mur-home-2400{margin:4px auto 0!important;flex:0 0 auto!important;align-self:center!important}
    #home #homeCircle.mur-home-2400 .mur-home-2400-canvas{
      position:absolute!important;left:50%!important;top:50%!important;
      width:100%!important;height:100%!important;
      transform:translate(-50%,-50%)!important;max-width:100%!important;
      pointer-events:none!important;z-index:1!important;display:block!important;
    }
    #home #homeCircle.mur-home-2400 .home-circle-text,
    #home #homeCircle.mur-home-2400 .home-cursor{display:none!important}
    #home #homeCircle.mur-home-2400 .mur-orb-start-trigger{
      position:absolute!important;inset:0!important;top:0!important;left:0!important;
      transform:none!important;width:100%!important;height:100%!important;
      min-height:0!important;min-width:0!important;padding:0!important;
      border:0!important;background:transparent!important;box-shadow:none!important;
      color:transparent!important;text-shadow:none!important;font-size:0!important;
      pointer-events:none!important;opacity:0!important;
    }
    #home #homeCircle.mur-home-2400 .mur-orb-start-trigger::before,
    #home #homeCircle.mur-home-2400 .mur-orb-start-trigger::after{display:none!important}
    main.app #home.page.active > section.home-wheel-card.card #homeHint.home-hint{
      position:relative!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;
      display:flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;
      align-self:center!important;
      width:min(86%,260px)!important;max-width:260px!important;
      min-height:48px!important;margin:16px auto 0 auto!important;padding:10px 14px!important;
      border-radius:999px!important;border:1px solid rgba(140,230,190,.34)!important;
      background:rgba(12,43,48,.68)!important;color:#f4fffa!important;
      font-size:clamp(15px,4vw,18px)!important;font-weight:800!important;
      line-height:1.2!important;text-align:center!important;
      white-space:normal!important;cursor:pointer!important;
      z-index:3!important;user-select:none!important;
      text-shadow:0 1px 4px rgba(0,0,0,.35)!important;
      transform:none!important;
    }
    main.app #home.page.active > section.home-wheel-card.card #homeHint.home-hint:focus-visible{
      outline:2px solid #a5f2d1!important;outline-offset:3px!important;
    }
    #home #homeCircle.mur-home-2400.mur-menu-open .mur-home-2400-canvas,
    #home #homeCircle.mur-home-2400.mur-particles-transitioning .mur-home-2400-canvas{opacity:0!important}
    .mur-home-particle-burst{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;z-index:10011!important;pointer-events:none!important;display:none}
    body.mur-burst-opening .mur-orb-choice,
    body.mur-burst-opening .mur-orb-quick-center{
      animation:mur-reveal-choice .34s ease-out both!important;
      animation-delay:.14s!important;
    }
    @keyframes mur-reveal-choice{
      0%{opacity:0;filter:blur(5px)}
      50%{opacity:.68;filter:blur(1px)}
      100%{opacity:1;filter:blur(0)}
    }
    @media(max-height:690px){
      main.app #home.page.active > section.home-wheel-card.card:has(#homeCircle.mur-home-2400){padding:8px 10px 12px!important}
      main.app #home.page.active > section.home-wheel-card.card #homeHint.home-hint{min-height:38px!important;margin-top:12px!important;padding:6px 12px!important;font-size:14px!important}
    }
    @media(prefers-reduced-motion:reduce){#home #homeCircle.mur-home-2400 .mur-home-2400-canvas{transition:none!important}}
  `;
  function addStyle(){if(document.getElementById(STYLE_ID))return;const el=document.createElement('style');el.id=STYLE_ID;el.textContent=css;document.head.appendChild(el);}
  function getColor(circle){
    let s=circle.style.getPropertyValue('--home-color').trim();
    if(!s) s=getComputedStyle(circle).getPropertyValue('--home-color').trim();
    let rgb=null;
    if(s.startsWith('#')){const h=s.slice(1);if(h.length===6)rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));}
    if(!rgb&&/^rgba?\(/.test(s))rgb=s.match(/[\d.]+/g)?.slice(0,3).map(Number);
    if(!rgb)rgb=palettes.vert;
    return rgb;
  }
  function lighten(rgb,factor=.38){
    return rgb.map(v=>Math.max(0,Math.min(255,Math.round(v+(255-v)*factor))));
  }
  function install(){
    const circle=document.getElementById('homeCircle');
    if(!circle||circle.dataset.murHome2400==='1')return;
    addStyle();circle.dataset.murHome2400='1';circle.classList.add('mur-home-2400');
    const trigger=circle.querySelector('.mur-orb-start-trigger');
    if(trigger){
      trigger.textContent='';
      trigger.dataset.subtitle='';
      trigger.setAttribute('aria-label','Appuyer pour commencer');
      trigger.setAttribute('title','Appuyer pour commencer');
    }
    // Le libellé de l'accueil existe déjà en dehors de la sphère : on le
    // réutilise pour éviter tout débordement et toute duplication visuelle.
    const homeHint=document.getElementById('homeHint');
    if(homeHint){
      const refreshLabel=()=>{
        const en=String(document.documentElement.lang||'').toLowerCase().startsWith('en');
        homeHint.textContent=en?'Tap to begin':'Appuyer pour commencer';
        homeHint.setAttribute('aria-label',homeHint.textContent);
      };
      homeHint.setAttribute('role','button');
      homeHint.tabIndex=0;
      homeHint.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        window.homeCircleOpen?.(event);
      });
      homeHint.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){
          event.preventDefault();event.stopPropagation();
          window.homeCircleOpen?.(event);
        }
      });
      new MutationObserver(refreshLabel).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
      refreshLabel();
    }
    const canvas=document.createElement('canvas');canvas.className='mur-home-2400-canvas';
    canvas.setAttribute('aria-hidden','true');circle.prepend(canvas);
    const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
    let phase=0,previous=0,raf=0;
    let lastRgb=null, color=[...palettes.vert];
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
    function draw(t){
      raf=requestAnimationFrame(draw);
      if(!circle.isConnected || document.hidden || !document.getElementById('home')?.classList.contains('active') || document.body.classList.contains('mur-five-open')){previous=t;return;}
      const dt=Math.max(0,Math.min(.05,(t-(previous||t))/1000));previous=t;
      if(!reduce.matches&&!circle.classList.contains('mur-menu-open')) phase+=dt*.23;
      const w=canvas.clientWidth||310,h=canvas.clientHeight||310;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      const cw=Math.round(w*dpr),ch=Math.round(h*dpr);
      if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      const actual=getColor(circle);
      const signature=actual.join(',');if(lastRgb!==signature){lastRgb=signature;color=actual;}
      const [r,g,b]=color;
      const light=lighten(color,.42);
      if(homeHint){
        homeHint.style.setProperty('border-color',`rgba(${light[0]},${light[1]},${light[2]},.40)`,'important');
      }
      const cx=w/2,cy=h/2,R=Math.min(w,h)*.405;
      const glow=ctx.createRadialGradient(cx,cy,R*.12,cx,cy,R*1.45);
      glow.addColorStop(0,`rgba(${light[0]},${light[1]},${light[2]},.07)`);
      glow.addColorStop(.70,`rgba(${r},${g},${b},.18)`);
      glow.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
      const ca=Math.cos(phase),sa=Math.sin(phase);
      const pts=points.map(p=>{
        const xx=p.x*ca-p.z*sa, zz=p.x*sa+p.z*ca;
        const perspective=2.9/(2.9-zz*.26);
        return {x:cx+xx*R*perspective,y:cy+p.y*R*perspective,z:zz,phase:p.phase};
      }).sort((a,b)=>a.z-b.z);
      for(const p of pts){
        const depth=(p.z+1)/2;
        const size=.65+depth*1.1;
        const shimmer=.85+.15*Math.sin(t*.0012+p.phase*TAU);
        ctx.globalAlpha=(.28+.68*depth)*shimmer;
        ctx.fillStyle=depth>.8?`rgb(${light[0]},${light[1]},${light[2]})`:`rgb(${r},${g},${b})`;
        ctx.beginPath();ctx.arc(p.x,p.y,size,0,TAU);ctx.fill();
      }
      ctx.globalAlpha=1;
      ctx.save();
      ctx.shadowColor=`rgba(${r},${g},${b},.38)`;
      ctx.shadowBlur=28;
      const halo=ctx.createRadialGradient(cx,cy+R*1.02,0,cx,cy+R*1.02,R*.70);
      halo.addColorStop(0,`rgba(${light[0]},${light[1]},${light[2]},.38)`);
      halo.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=halo;
      ctx.beginPath();
      ctx.ellipse(cx,cy+R*1.02,R*.55,R*.14,0,0,TAU);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle=`rgba(${light[0]},${light[1]},${light[2]},.24)`;
      ctx.lineWidth=1.15;
      ctx.beginPath();
      ctx.ellipse(cx,cy,R*1.08,R*1.08,0,0,TAU);
      ctx.stroke();
      ctx.restore();
    }
    raf=requestAnimationFrame(draw);
    window.addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.MUR_HOME_PARTICLES_V33={particles:COUNT,sphereRotation:'clockwise',band:'removed',cta:'lower-centered-below-sphere',menuTransition:'particle-dispersion-1000ms'};
})();



/* =============================================================
   M.U.R. V87 — URGENCE PLUS DENSE
   La sphère de 2400 points se dissout ; 5 sphères denses naissent du nuage.
   Les clics sont transmis aux commandes natives existantes.
   Aucun changement index.html / tests / respiration / historique.
   ============================================================= */
(() => {
  'use strict';
  if(window.MUR_HOME_FIVE_V87)return;
  const N=2400, PER=350, CENTER_PER=1200, OPEN_MS=2350, CLOSE_MS=1550;
  const TAU=Math.PI*2, GOLD=Math.PI*(3-Math.sqrt(5));
  const GROUPS=[
    {key:'quick',fr:'Urgence',en:'Urgent',icon:'ϟ',rgb:[239,78,91]},
    {key:'tests',fr:'Mesurer',en:'Measure',icon:'⌁',rgb:[59,130,246]},
    {key:'breath',fr:'Respirer',en:'Breathe',icon:'◌',rgb:[34,197,128]},
    {key:'exercises',fr:'Exercices',en:'Exercises',icon:'✦',rgb:[245,158,68]},
    {key:'stats',fr:'Stats',en:'Stats',icon:'▥',rgb:[218,94,156]}
  ];
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  // Deux populations distinctes : 2400 points de la sphère source et
  // 1200 points au centre, 350 par sphère périphérique (sans scission).
  const sourcePoints=Array.from({length:N},(_,i)=>{
    const y=1-2*(i+.5)/N,r=Math.sqrt(1-y*y),a=i*GOLD;
    return {x:r*Math.cos(a),y,z:r*Math.sin(a),seed:((i*67)%1009)/1009};
  });
  const miniPoints=GROUPS.flatMap((g,index)=>{
    const count=index===0?CENTER_PER:PER;
    return Array.from({length:count},(_,j)=>{
      const y=1-2*(j+.5)/count,r=Math.sqrt(1-y*y),a=j*GOLD;
      return {x:r*Math.cos(a),y,z:r*Math.sin(a),g:index,seed:(((j+index*127)*127)%1021)/1021};
    });
  });
  function init(){
    const circle=document.getElementById('homeCircle');
    const home=document.getElementById('home');
    const nativeMenu=document.querySelector('.mur-orb-menu');
    if(!circle||!home||!nativeMenu||circle.dataset.murFiveV87)return;
    circle.dataset.murFiveV87='1';
    const style=document.createElement('style');
    style.id='mur-five-spheres-v87-css';
    style.textContent=`
      body.mur-five-open .mur-orb-menu{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
      body.mur-five-open .mur-home-particle-burst{display:none!important}
      body.mur-five-open #homeCircle{visibility:visible!important}
      body.mur-five-open #homeCircle .mur-home-2400-canvas{opacity:0!important}
      body.mur-five-open .mur-orb-backdrop{z-index:10005!important}
      .mur-five-layer{position:fixed!important;inset:0!important;z-index:10030!important;pointer-events:none!important;display:none!important;overflow:hidden!important}
      .mur-five-layer.is-visible{display:block!important}
      .mur-five-layer canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
      .mur-five-target{position:absolute;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);width:104px;height:104px;border:0;border-radius:50%;color:#fff;background:transparent;cursor:pointer;pointer-events:auto;opacity:0;transition:opacity .25s ease;touch-action:manipulation;-webkit-tap-highlight-color:transparent;text-shadow:0 2px 8px #001c31;font-family:inherit;overflow:visible}
      .mur-five-target.ready{opacity:1}
      .mur-five-target .mur-five-icon{font-size:25px;line-height:1;font-weight:750;filter:drop-shadow(0 0 6px currentColor)}
      .mur-five-target .mur-five-label{position:absolute;top:calc(100% + 7px);left:50%;transform:translateX(-50%);display:block;min-width:max-content;max-width:124px;padding:5px 9px;border-radius:10px;background:rgba(5,17,32,.90);border:1px solid rgba(255,255,255,.24);box-shadow:0 2px 12px rgba(0,0,0,.38);font-size:15px;font-weight:800;letter-spacing:.015em;line-height:1.2;text-align:center;white-space:nowrap;color:#fff;text-shadow:0 1px 4px #000;pointer-events:none}
      .mur-five-target.is-locked{opacity:.50;filter:grayscale(.55)}
      .mur-five-target:focus-visible{outline:2px solid #fff;outline-offset:4px}
      @media(max-width:370px){.mur-five-target .mur-five-label{font-size:13px;padding:4px 7px}.mur-five-target .mur-five-icon{font-size:22px}}
    `;
    document.head.appendChild(style);
    const layer=document.createElement('div');layer.className='mur-five-layer';
    layer.setAttribute('aria-label','Menu M.U.R. en sphères de particules');
    const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');layer.appendChild(canvas);
    const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
    const buttons=GROUPS.map((g,i)=>{
      const b=document.createElement('button');b.type='button';b.className='mur-five-target';
      // V73 : aucune icône dans les cinq sphères du menu.
      // Les libellés sous les sphères et les zones cliquables sont conservés.
      b.dataset.key=g.key;
      b.innerHTML='<span class="mur-five-label"></span>';

      b.addEventListener('pointerdown',e=>e.stopPropagation());
      b.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        const native=g.key==='quick'?nativeMenu.querySelector('.mur-orb-quick-center'):nativeMenu.querySelector(`.mur-orb-choice[data-page="${g.key}"]`);
        if(native){native.click();}else if(g.key==='quick'){window.murStartQuickMode?.();}
      });
      layer.appendChild(b);return b;
    });
    document.body.appendChild(layer);
    let open=false, progress=0, from=0,to=0,start=0,duration=OPEN_MS,raf=0,prev=0;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const isEn=()=>String(document.documentElement.lang||'fr').toLowerCase().startsWith('en');
    function refreshLabels(){GROUPS.forEach((g,i)=>{buttons[i].querySelector('.mur-five-label').textContent=isEn()?g.en:g.fr;buttons[i].setAttribute('aria-label',isEn()?g.en:g.fr)})}
    refreshLabels();
    new MutationObserver(refreshLabels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    function layout(time=0){
      const w=innerWidth,h=innerHeight,small=w<390;
      // Même centre que la sphère réellement affichée (et non le centre de l'écran).
      const rect=circle.getBoundingClientRect();
      const cx=rect.left+rect.width/2;
      const cy=rect.top+rect.height/2;
      const radius=small?33:39;
      const centerRadius=small?37:44;
      // Adaptation à la place disponible autour de la sphère sur mobile.
      const edge=Math.min(cx,w-cx,cy,h-cy);
      const orbitR=Math.max(82,Math.min(small?119:147,edge-radius-10));
      // Positionnement fixe : haut, gauche, droite, bas.
      const coords=[[cx,cy]];
      const offsets=[-Math.PI/2, Math.PI, 0, Math.PI/2];
      offsets.forEach(off=>coords.push([cx+Math.cos(off)*orbitR, cy+Math.sin(off)*orbitR]));
      coords.forEach((p,i)=>{
        const rr=i===0?centerRadius:radius;
        buttons[i].style.left=p[0]+'px';buttons[i].style.top=p[1]+'px';buttons[i].style.width=(rr*2+14)+'px';buttons[i].style.height=(rr*2+14)+'px';
      });
      return {coords,radius,centerRadius,orbitR,cx,cy};
    }
    function homeColor(){
      const raw=(circle.style.getPropertyValue('--home-color')||getComputedStyle(circle).getPropertyValue('--home-color')).trim();
      if(/^#[0-9a-f]{6}$/i.test(raw))return [1,3,5].map(i=>parseInt(raw.slice(i,i+2),16));
      if(/^#[0-9a-f]{3}$/i.test(raw))return [1,2,3].map(i=>parseInt(raw[i]+raw[i],16));
      if(/^rgba?\(/.test(raw))return (raw.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
      return [85,233,153];
    }
    function size(){const dpr=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
      ctx.setTransform(dpr,0,0,dpr,0,0);return {w,h};}
    function draw(time){
      if(!layer.isConnected)return;
      const {w,h}=size();ctx.clearRect(0,0,w,h);
      const {coords,radius,centerRadius,orbitR,cx,cy}=layout(time);
      const rect=circle.getBoundingClientRect();
      const hx=cx,hy=cy;
      const hr=Math.min(rect.width,rect.height)*.405;
      const color=homeColor();
      const ca=Math.cos(time*.00023),sa=Math.sin(time*.00023);
      const cb=Math.cos(time*.00030),sb=Math.sin(time*.00030);
      // Phase 1: la grande sphère demeure à sa place et perd ses points,
      // en ordre irrégulier, avec un léger envol radial puis extinction.
      // Aucune division en cinq sous-ensembles.
      const sourceFade=ease(Math.min(1,progress/.79));
      if(sourceFade<1){
        ctx.save();ctx.globalCompositeOperation='lighter';
        for(const p of sourcePoints){
          const threshold=.035+p.seed*.91;
          const life=(sourceFade-threshold);
          if(life>.19)continue;
          const xx=p.x*ca-p.z*sa,zz=p.x*sa+p.z*ca;
          const perspective=2.9/(2.9-zz*.26);
          const scatter=life>0?Math.min(1,life/.19):0;
          const drift=1+scatter*(.27+.33*p.seed);
          const x=hx+xx*hr*perspective*drift;
          const y=hy+p.y*hr*perspective*drift;
          const depth=(zz+1)/2;
          ctx.globalAlpha=(.35+.60*depth)*(1-scatter);
          ctx.fillStyle=`rgb(${color.join(',')})`;
          ctx.beginPath();ctx.arc(x,y,.85+depth*1.3,0,TAU);ctx.fill();
        }
        ctx.restore();
      }
      // V50 : quatre fins arcs lumineux orbitent AUTOUR des petites sphères fixes.
      // La sphère elle-même et l'anneau global ne tournent plus.
      if(progress>.25){
        ctx.save();
        ctx.globalCompositeOperation='lighter';
        const alpha=ease(Math.min(1,Math.max(0,(progress-.25)/.50)));
        for(let i=1;i<5;i++){
          const g=GROUPS[i],p=coords[i],angle=time*.00105+i*.83;
          const orbit=radius+8;
          // Un arc fin, avec une petite tête lumineuse, tourne régulièrement.
          ctx.lineWidth=1.65;
          ctx.lineCap='round';
          ctx.strokeStyle=`rgba(${g.rgb.join(',')},${(.85*alpha).toFixed(3)})`;
          ctx.beginPath();ctx.arc(p[0],p[1],orbit,angle,angle+Math.PI*.66);ctx.stroke();
          ctx.fillStyle=`rgba(${g.rgb.join(',')},${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p[0]+orbit*Math.cos(angle+Math.PI*.66),p[1]+orbit*Math.sin(angle+Math.PI*.66),2.25,0,TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      // Condensation indépendante : centre à 1200 points, satellites à 350 points,
      // plus serrés et plus lumineux que dans la V38.
      const grown=ease(Math.max(0,Math.min(1,(progress-.22)/.73)));
      if(grown>0){
        ctx.save();ctx.globalCompositeOperation='lighter';
        for(const p of miniPoints){
          const threshold=.07+p.seed*.65;
          let appear=ease(Math.max(0,Math.min(1,(grown-threshold)/.20)));
          // La boule rouge abandonne ses propres points. Une fraction du
          // nuage reste autour d'elle, au lieu d'une boule centrale intacte.
          const erosion=p.g===0?ease(Math.max(0,Math.min(1,(progress-.50)/.43))):0;
          const gone=p.g===0&&p.seed<erosion*.53;
          if(gone)continue;
          if(appear<=0)continue;
          const g=GROUPS[p.g],c=coords[p.g];
          const xx=p.g===0 ? p.x*cb-p.z*sb : p.x;
          const zz=p.g===0 ? p.x*sb+p.z*cb : p.z;
          const perspective=2.9/(2.9-zz*.22);
          const R=p.g===0?centerRadius:radius;
          const cloudScale=1+(1-appear)*(.62+.46*p.seed);
          const x=c[0]+xx*R*perspective*cloudScale;
          const y=c[1]+p.y*R*perspective*cloudScale;
          const depth=(zz+1)/2;
          // Profondeur et lumière identiques au langage visuel de Respiration :
          // points lointains plus sombres, points proches adoucis.
          const tone=.64+.36*depth;
          const shade=g.rgb.map(v=>Math.round(v*tone));
          const lit=shade.map(v=>Math.round(v+(255-v)*(.05+.19*depth)));
          ctx.globalAlpha=appear*(.50+.42*depth);
          ctx.fillStyle=`rgb(${lit.join(',')})`;
          ctx.beginPath();ctx.arc(x,y,.85+depth*1.28,0,TAU);ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      buttons.forEach((b,i)=>{
        const show=progress>.76;
        b.classList.toggle('ready',show);
        b.style.pointerEvents=(show&&open)?'auto':'none';
        const locked=(i>0&&typeof window.testsAreUnlocked==='function'&&!window.testsAreUnlocked());
        b.classList.toggle('is-locked',locked);b.setAttribute('aria-disabled',String(locked));
        b.tabIndex=show&&open?0:-1;
      });
    }
    function tick(t){
      const frac=Math.min(1,(t-start)/duration);
      progress=from+(to-from)*ease(frac);
      draw(t);
      if(frac<1){raf=requestAnimationFrame(tick);return;}
      raf=0;
      if(!open){layer.classList.remove('is-visible');document.body.classList.remove('mur-five-open');}
      else{raf=requestAnimationFrame(idle);}
    }
    function idle(t){
      if(!open)return;
      if(document.hidden){raf=requestAnimationFrame(idle);return;}
      if(!home.classList.contains('active')){setOpen(false);return;}
      draw(t);raf=requestAnimationFrame(idle);
    }
    function setOpen(value){
      if(!home.classList.contains('active')&&value)return;
      if(raf)cancelAnimationFrame(raf);
      open=value;
      from=progress;to=value?1:0;
      duration=(value?OPEN_MS:CLOSE_MS)*Math.max(.12,Math.abs(to-from));
      start=performance.now();
      if(value){layer.classList.add('is-visible');document.body.classList.add('mur-five-open');}
      if(reduced?.matches){progress=to;draw(start);if(!value){layer.classList.remove('is-visible');document.body.classList.remove('mur-five-open');}return;}
      raf=requestAnimationFrame(tick);
    }
    circle.addEventListener('mur-orb-transition',e=>setOpen(!!e.detail?.open));
    document.querySelectorAll('.tabbar button').forEach(b=>b.addEventListener('click',()=>{if(open)setOpen(false)},{passive:true}));
    window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);layer.remove();document.body.classList.remove('mur-five-open')});
    window.addEventListener('resize',()=>{if(open||progress)layout()},{passive:true});
    window.MUR_HOME_FIVE_V87={sourceParticles:N,particlesPerSphere:PER,centralSphereParticles:CENTER_PER,smallSpheres:5,openMs:OPEN_MS,closeMs:CLOSE_MS,layout:'static-four-spheres-no-links-white-breath-no-red-halo'};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* ============================================================
   M.U.R. V35 — Affichage des scores NeuroFlex sur une ligne.
   Correctif CSS non destructif : aucun calcul ni HTML modifié.
   ============================================================ */
(() => {
  'use strict';
  const id = 'mur-neuroflex-score-nowrap-v35';
  if (document.getElementById(id)) return;
  const css = document.createElement('style');
  css.id = id;
  css.textContent = `
    /* La synthèse alloue assez de place aux scores à deux chiffres. */
    #testResultView #resultSynthesisBlock.result-step.open .result-score-row {
      grid-template-columns: minmax(78px,auto) minmax(0,1fr) !important;
    }
    #testResultView #resultSynthesisBlock #neuroScore,
    #testResultView #resultNowBlock #resultNowScore,
    #testResultView #resultSynthesisBlock .synth-grid-clean .result-detail-chip:nth-child(3) b {
      white-space:nowrap !important;
      overflow-wrap:normal !important;
      word-break:keep-all !important;
      hyphens:none !important;
      font-variant-numeric:tabular-nums;
    }
    #testResultView #resultSynthesisBlock.result-step.open .result-score-row #neuroScore {
      display:inline-block !important;
      min-width:max-content !important;
      font-size:clamp(29px,8vw,38px) !important;
    }
    @media(max-width:390px) {
      #testResultView #resultSynthesisBlock.result-step.open .result-score-row {
        grid-template-columns:minmax(72px,auto) minmax(0,1fr) !important;
      }
    }
  `;
  document.head.appendChild(css);
})();


/* ============================================================
   M.U.R. V85 — RESPIRATION NEUROFLEX PUIS COULEUR DU PROTOCOLE
   950 particules, 3D en rotation lente, dilatation pilotee par
   les phases de respiration existantes (sans modifier les cycles,
   l'audio, les pauses, les commandes ou index.html).
   ============================================================ */
(() => {
  'use strict';
  if (window.MUR_BREATH_PARTICLE_ORB_V85) return;
  const COUNT = 950;
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const TWO_PI = Math.PI * 2;
  const points = Array.from({length: COUNT}, (_, i) => {
    const y = 1 - 2 * (i + .5) / COUNT;
    const a = i * GOLDEN;
    const r = Math.sqrt(1 - y*y);
    return {x:r*Math.cos(a), y:y, z:r*Math.sin(a)};
  });
  function init(){
    const orb = document.getElementById('orb');
    const page = document.getElementById('breath');
    if (!orb || !page || orb.querySelector('.mur-breath-points-v53')) return;
    const css = document.createElement('style');
    css.id = 'mur-breath-particle-v53-css';
    css.textContent = `
      #breath #orb.mur-breath-particle-orb {
        position:relative!important;
        isolation:isolate!important;
        background:transparent!important;
        box-shadow:none!important;
        overflow:visible!important;
        border:0!important;
      }
      #breath #orb.mur-breath-particle-orb .mur-breath-points-v53 {
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        z-index:0!important;
        pointer-events:none!important;
        border-radius:50%!important;
      }
      /* Texte réellement séparé de la sphère pour éviter les variations de taille. */
      #breath #phaseText.mur-breath-label-v53 {
        position:relative!important;
        display:table!important;
        margin:22px auto 14px!important;
        max-width:min(90vw,260px)!important;
        width:max-content!important;
        min-width:132px!important;
        padding:9px 18px!important;
        border-radius:999px!important;
        background:rgba(4,25,30,.80)!important;
        border:1px solid rgba(123,255,214,.35)!important;
        color:#f4fffb!important;
        font-size:clamp(16px,4.2vw,20px)!important;
        font-weight:900!important;
        line-height:1.2!important;
        letter-spacing:.015em!important;
        text-align:center!important;
        white-space:nowrap!important;
        text-shadow:0 1px 8px #061d1b!important;
        box-shadow:0 6px 18px rgba(0,0,0,.16)!important;
        z-index:3!important;
      }
      #breath.breath-immersive #orb.mur-breath-particle-orb {box-shadow:none!important;}
      #breath.breath-immersive #phaseText.mur-breath-label-v53 {margin-top:26px!important;font-size:20px!important;}
    `;
    document.head.appendChild(css);
    const canvas = document.createElement('canvas');
    canvas.className = 'mur-breath-points-v53';
    canvas.setAttribute('aria-hidden','true');
    const ctx = canvas.getContext('2d', {alpha:true});
    if (!ctx) return;
    orb.insertBefore(canvas,orb.firstChild);
    orb.classList.add('mur-breath-particle-orb');
    // Déplace le vrai libellé hors du bouton-orbe ; il reste piloté par
    // tous les cycles natifs et par le mode rapide via son id d'origine.
    const phaseText=document.getElementById('phaseText');
    const stage=orb.closest('.breath-stage');
    if(phaseText && stage && phaseText.parentElement===orb){
      stage.insertAdjacentElement('afterend',phaseText);
      phaseText.classList.add('mur-breath-label-v53');
    }
    // Renforce légèrement l'amplitude sans changer ni la durée ni les pauses.
    // Les scripts de respiration écrivent transform=scale(...) sur l'orbe.
    const boostBreathAmplitude=()=>{
      const value=orb.style.transform||'';
      const match=value.match(/^scale\(\s*([0-9.]+)\s*\)$/);
      if(!match)return;
      const scale=Number(match[1]);
      let desired=null;
      if(scale>=1.32 && scale<=1.36)desired=1.44;
      else if(scale>=.66 && scale<=.70)desired=.61;
      if(desired!==null && Math.abs(scale-desired)>.005)
        orb.style.transform='scale('+desired+')';
    };
    const breathingObserver=new MutationObserver(boostBreathAmplitude);
    breathingObserver.observe(orb,{attributes:true,attributeFilter:['style']});
    boostBreathAmplitude();
    window.addEventListener('pagehide',()=>breathingObserver.disconnect(),{once:true});

    let raf = 0;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    function parseRGB(str){
      const s=String(str||'').trim();
      if(/^#[0-9a-f]{6}$/i.test(s)) return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
      if(/^#[0-9a-f]{3}$/i.test(s)) return [1,2,3].map(i=>parseInt(s[i]+s[i],16));
      if(/^rgba?\(/i.test(s)) return (s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
      return null;
    }
    function mix(a,b,t){return a.map((v,i)=>Math.round(v*(1-t)+b[i]*t));}
    function clamp(v){return Math.max(0,Math.min(255,Math.round(v)));}
    function tint(rgb,f){return rgb.map(v=>clamp(v+(255-v)*f));}
    function shade(rgb,f){return rgb.map(v=>clamp(v*(1-f)));}
    // Priorité à la couleur NeuroFlex effectivement utilisée pour la boule d'accueil.
    // Même source de couleur, donc même résultat, sans recalculer les scores.
    const scorePalette={
      bleu:[59,150,247], vert:[85,233,153],
      orange:[255,165,63], rouge:[255,88,100]
    };
    // V74 : priorité absolue à la zone NeuroFlex mémorisée.
    // Les changements de couleur de navigation ne modifient plus cette boule.
    function neuroFlexColor(){
      let zone=null;
      try {
        const saved=JSON.parse(localStorage.getItem('murLastNeuro')||'null');
        zone=saved?.zone||null;
      } catch(e) {}
      if(!zone){
        try {zone=window.getCurrentNeuroRecommendation?.()?.zone || null;} catch(e) {}
      }
      const key=String(zone?.key||zone?.name||zone||'').toLowerCase();
      const c=String(zone?.color||'').trim();
      // When the test supplies a genuine zone color, prefer that exact value.
      // The URL parameter, navigation state and CSS --accent are irrelevant.
      const parsed=parseRGB(c);
      if(parsed && parsed.length===3 && parsed.every(Number.isFinite))return parsed;
      if(key.includes('bleu')||key.includes('blue'))return scorePalette.bleu;
      if(key.includes('orange'))return scorePalette.orange;
      if(key.includes('rouge')||key.includes('red'))return scorePalette.rouge;
      if(key.includes('vert')||key.includes('green'))return scorePalette.vert;
      return scorePalette.vert;
    }
    // V85 — La couleur NeuroFlex est celle d'arrivée sur Respiration.
    // Une sélection volontaire sur la barre/les cartes prend la couleur du protocole.
    // La navigation seule ne doit jamais simuler une sélection.
    const protocolPalette={
      boost:[59,130,246], '365':[34,197,94], coherence:[34,197,94],
      square:[34,197,94], regulate:[245,158,11],
      frein:[239,68,68], '478':[239,68,68], sleep:[99,102,241]
    };
    const slider=document.getElementById('breathSlider');
    const protocol=document.getElementById('protocolSelect');
    let selectedProtocolColor=null;
    let displayColor=null,fromColor=null,toColor=null,colorChangedAt=0;
    function colorForProtocol(){
      const key=protocol?.value || '365';
      const activeCard=document.getElementById('breathCard_'+key);
      const css=activeCard ? getComputedStyle(activeCard).getPropertyValue('--family-color') : '';
      const rgb=parseRGB(css);
      if(rgb&&rgb.length===3&&rgb.every(Number.isFinite))return rgb;
      return protocolPalette[key]||neuroFlexColor();
    }
    function beginColorChange(target,now=performance.now()){
      const next=[...target];
      if(toColor && next.every((v,i)=>v===toColor[i]))return;
      fromColor=[...(displayColor||neuroFlexColor())];
      toColor=next;
      colorChangedAt=now;
    }
    function intentionalSelection(){
      // Les fonctions natives changeSlider/selectBreath ont mis à jour le select.
      queueMicrotask(()=>{
        if(!page.classList.contains('active'))return;
        selectedProtocolColor=colorForProtocol();
        beginColorChange(selectedProtocolColor);
      });
    }
    slider?.addEventListener('input',intentionalSelection);
    slider?.addEventListener('change',intentionalSelection);
    protocol?.addEventListener('change',intentionalSelection);
    page.addEventListener('click',e=>{
      if(e.target.closest?.('.breath-choice'))intentionalSelection();
    });
    let pageWasActive=page.classList.contains('active');
    new MutationObserver(()=>{
      const active=page.classList.contains('active');
      if(active&&!pageWasActive){
        selectedProtocolColor=null;
        beginColorChange(neuroFlexColor());
      }
      pageWasActive=active;
    }).observe(page,{attributes:true,attributeFilter:['class']});
    function render(t){
      raf = requestAnimationFrame(render);
      if (document.hidden || !page.classList.contains('active')) return;
      const rect = orb.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const sz = Math.max(64,orb.offsetWidth);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(sz*dpr);
      if (canvas.width!==width || canvas.height!==width) {
        canvas.width=width;canvas.height=width;
      }
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,sz,sz);
      const center=sz*.5, radius=sz*.415;
      const angle = reduced?.matches ? .36 : t*.00021;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const tilt = .17;
      const ct=Math.cos(tilt),st=Math.sin(tilt);
      const targetColor=selectedProtocolColor||neuroFlexColor();
      if(!displayColor){displayColor=[...targetColor];fromColor=[...targetColor];toColor=[...targetColor];}
      if(targetColor.some((v,i)=>v!==toColor[i]))beginColorChange(targetColor,t);
      const t01=colorChangedAt ? Math.max(0,Math.min(1,(t-colorChangedAt)/450)) : 1;
      const smooth=t01*t01*(3-2*t01);
      displayColor=mix(fromColor,toColor,smooth);
      const base=displayColor;
      orb.dataset.murBreathColorMode=selectedProtocolColor?'protocol':'neuroflex';
      orb.dataset.murNeuroflexColor=neuroFlexColor().join(',');
      const near=tint(base,.42), far=shade(base,.18);
      ctx.globalCompositeOperation='lighter';
      for(const p of points){
        const x = p.x*cos - p.z*sin;
        const z = p.x*sin + p.z*cos;
        const y2 = p.y*ct-z*st;
        const z2 = p.y*st+z*ct;
        const perspective = 2.9/(2.9-z2*.30);
        const sx=center+x*radius*perspective;
        const sy=center+y2*radius*perspective;
        const depth=(z2+1)*.5;
        const glow=.26+depth*.72;
        const rr=Math.round(far[0]+(near[0]-far[0])*depth);
        const gg=Math.round(far[1]+(near[1]-far[1])*depth);
        const bb=Math.round(far[2]+(near[2]-far[2])*depth);
        ctx.globalAlpha=glow;
        ctx.fillStyle=`rgb(${rr},${gg},${bb})`;
        ctx.beginPath();
        ctx.arc(sx,sy,.55+depth*.92,0,TWO_PI);
        ctx.fill();
      }
      ctx.globalAlpha=1;
      ctx.globalCompositeOperation='source-over';
    }
    raf=requestAnimationFrame(render);
    window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;},{once:true});
    window.MUR_BREATH_PARTICLE_ORB_V85={points:COUNT, breathingAnimation:'native-orb-transform-enhanced', rotation:'slow', phaseText:'separate-below-orb', color:'neuroflex-then-user-selected-protocol'};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();


/* ================================================================
   M.U.R. V62 - Bouton information carre uniforme
   Sans changement index.html. Contenu distant en lecture uniquement.
   ================================================================ */
(() => {
  'use strict';
  if (window.MUR_PAGE_INFO_V59) return;
  const PAGES = {
    home: ['Accueil','Home'], tests:['Tests NeuroFlex','NeuroFlex tests'],
    breath:['Respiration','Breathing'], exercises:['Exercices','Exercises'],
    stats:['Historique et statistiques','History and statistics'],
    settings:['Réglages','Settings']
  };
  const DEFAULT = {
    home:{fr:'M.U.R. vous aide à mieux comprendre votre fonctionnement neurovégétatif et à choisir des exercices adaptés à votre état.',en:'M.U.R. helps you understand your autonomic nervous system and choose exercises suited to your current state.'},
    tests:{fr:'Ki.S explore votre tendance habituelle. Ici & Maintenant décrit votre état du moment. Leur synthèse oriente vos exercices NeuroFlex. Ces tests ne constituent pas un diagnostic médical.',en:'Ki.S explores your usual tendencies. Here & Now describes your current state. Their synthesis helps guide NeuroFlex exercises. These tests are not a medical diagnosis.'},
    breath:{fr:'Suivez la sphère : elle grandit lorsque vous inspirez et diminue lorsque vous expirez. Adaptez le rythme à votre confort, sans forcer.',en:'Follow the sphere: it expands as you inhale and contracts as you exhale. Adjust the pace to your comfort without forcing.'},
    exercises:{fr:'Choisissez un exercice adapté à votre tendance NeuroFlex. Installez-vous confortablement et interrompez l’exercice si vous ressentez une gêne.',en:'Choose an exercise suited to your NeuroFlex state. Make yourself comfortable and stop if you feel discomfort.'},
    stats:{fr:'Retrouvez ici votre historique, vos scores et leurs évolutions. Ces tendances sont des repères de suivi personnel.',en:'Find your history, scores and changes over time. These trends support personal tracking.'},
    settings:{fr:'Réglez votre profil et personnalisez votre expérience M.U.R.',en:'Edit your profile and personalize your M.U.R. experience.'}
  };
  const remote={};let busy=false;
  function language(){const s=localStorage.getItem('mur-ui-language')||localStorage.getItem('murLanguage')||localStorage.getItem('murLang')||document.documentElement.lang||'fr';return /^en/i.test(s)?'en':'fr';}
  function supa(){
    const candidates=[window.MURCloud?.client,window.murSupabase,window.murSupabaseClient,window.supabaseClient,window.MUR_SUPABASE_CLIENT,window.murDB,window.sb,window._supabase];
    return candidates.find(x=>x&&typeof x.from==='function')||null;
  }
  async function load(){
    const db=supa();if(!db||busy)return;
    busy=true;
    try{
      const {data,error}=await db.from('mur_page_informations').select('page_key,title_fr,title_en,body_fr,body_en,is_published').eq('is_published',true);
      if(error)throw error;
      if(Array.isArray(data))data.forEach(r=>{if(PAGES[r.page_key])remote[r.page_key]=r;});
    }catch(err){console.warn('[MUR information] Texte local conservé :',err?.message||err);}
    finally{busy=false;}
  }
  function activePage(){return document.querySelector('section.page.active')?.id||'home';}
  function title(id,lang){const r=remote[id]||{};return (r['title_'+lang]||PAGES[id]?.[lang==='fr'?0:1]||'Information');}
  function content(id,lang){const r=remote[id]||{};return (r['body_'+lang]||DEFAULT[id]?.[lang]||'');}
  function close(){const m=document.getElementById('murInfoUnifiedModalV58');if(m){m.hidden=true;document.body.classList.remove('mur-info-open');}}
  function open(id){id=PAGES[id]?id:activePage();const lang=language(),m=document.getElementById('murInfoUnifiedModalV58');if(!m)return;
    m.querySelector('.mur-info-title').textContent=title(id,lang);
    const body=m.querySelector('.mur-info-content');body.replaceChildren();
    // Paragraphes en texte brut : aucun HTML arbitraire venant du back-office.
    content(id,lang).split(/\n\s*\n/).filter(Boolean).forEach(para=>{const p=document.createElement('p');p.textContent=para;body.appendChild(p);});
    m.querySelector('.mur-info-close').textContent=lang==='fr'?'Compris':'Got it';
    m.hidden=false;document.body.classList.add('mur-info-open');m.querySelector('.mur-info-close-x').focus();
  }
  function install(){if(document.getElementById('murInfoUnifiedModalV58'))return;
    const style=document.createElement('style');style.id='mur-info-unified-style-v58';style.textContent=`
      #appInfoBtn,#testsInfoBtn{display:none!important;visibility:hidden!important;pointer-events:none!important}
      .mur-info-page-button{position:absolute!important;right:14px!important;top:12px!important;z-index:90!important;width:38px!important;height:38px!important;display:grid!important;place-items:center!important;border-radius:10px!important;border:1px solid rgba(255,255,255,.36)!important;background:rgba(10,32,52,.84)!important;color:#fff!important;font-size:19px!important;font-family:Arial,sans-serif!important;font-weight:800!important;line-height:1!important;box-shadow:0 5px 18px rgba(0,0,0,.30)!important;cursor:pointer!important;touch-action:manipulation!important}
      .mur-info-page-button:focus-visible{outline:3px solid #79e8d8!important;outline-offset:3px!important}
      section.page{position:relative!important}
      /* Accueil : utiliser l’emplacement du bouton info historique,
         à gauche du bouton Profil, dans la barre de titre. */
      #home .home-title{position:relative!important}
      #home .home-title>.mur-info-page-button{position:absolute!important;top:4px!important;right:52px!important;left:auto!important;width:42px!important;height:42px!important;min-width:42px!important;min-height:42px!important;border-radius:10px!important;margin:0!important;transform:none!important;z-index:30!important}
      @media(max-width:380px){#home .home-title>.mur-info-page-button{top:3px!important;right:46px!important;width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;border-radius:10px!important}}
      /* Respiration : masquer seulement la pastille de zone dans l'en-tête.
         Le score et les couleurs de l'orbe restent inchangés. */
      #breath>.card>.status>.badge:has(#breathZone){display:none!important}
      /* Reglages : masquer l'ancien bouton X sous le nouveau bouton Information. */
      #settings > section.card:first-child > .status > button.icon-btn[onclick*="showPage"]{display:none!important}
      section.page:not(.active) .mur-info-page-button{display:none!important}
      .mur-info-screen[hidden]{display:none!important}
      .mur-info-screen{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:22px 15px;background:rgba(3,10,20,.82);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
      .mur-info-panel{position:relative;width:min(550px,100%);max-height:min(80dvh,760px);overflow:auto;border-radius:20px;background:linear-gradient(145deg,#132a41,#081522);border:1px solid rgba(155,223,225,.32);padding:28px 22px 23px;color:#f6fafc;box-shadow:0 25px 80px rgba(0,0,0,.56)}
      .mur-info-title{margin:0 38px 17px 0;font-size:22px;line-height:1.2;color:white}
      .mur-info-content{font-size:15px;line-height:1.65;white-space:normal}
      .mur-info-content p{margin:0 0 13px}.mur-info-close-x{position:absolute;right:12px;top:12px;border:1px solid #556b7e;background:#162d43;color:#fff;border-radius:50%;width:34px;height:34px;font-size:23px;cursor:pointer}
      .mur-info-close{display:block;margin:20px auto 0;padding:10px 26px;border:1px solid #68d6c5;border-radius:30px;color:#fff;background:#12665f;font-weight:750;cursor:pointer}
    `;document.head.appendChild(style);
    Object.keys(PAGES).forEach(id=>{
      const pg=document.getElementById(id);if(!pg)return;
      const b=document.createElement('button');b.type='button';b.className='mur-info-page-button';b.textContent='i';b.setAttribute('aria-label',language()==='fr'?'Informations sur cette page':'Information about this page');
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open(id);});
      const mount=id==='home'?(pg.querySelector('.home-title')||pg):pg;
      mount.appendChild(b);
    });
    /* Le retour X de Reglages est redondant et chevauche le bouton i. */
    const oldSettingsClose=document.querySelector('#settings > section.card:first-child > .status > button.icon-btn[onclick*="showPage"]');
    if(oldSettingsClose) oldSettingsClose.remove();
        const m=document.createElement('div');m.id='murInfoUnifiedModalV58';m.className='mur-info-screen';m.hidden=true;m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Informations M.U.R.');
    m.innerHTML='<div class="mur-info-panel"><button type="button" class="mur-info-close-x" aria-label="Fermer">×</button><h2 class="mur-info-title"></h2><div class="mur-info-content"></div><button type="button" class="mur-info-close">Compris</button></div>';
    m.querySelector('.mur-info-close-x').addEventListener('click',close);m.querySelector('.mur-info-close').addEventListener('click',close);m.addEventListener('click',e=>{if(e.target===m)close();});document.body.appendChild(m);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden)close();});
    // Les boutons historiques sont masqués et remplacés, les fenêtres de première visite ne sont pas modifiées.
    load();setTimeout(load,1400);setTimeout(load,5000);
  }
  window.MUR_PAGE_INFO_V59={open,close,reload:load,pages:Object.keys(PAGES)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();


/* =============================================================
   M.U.R. V73 — STABILISATION ANTI-DOUBLONS
   Neutralisation ciblée de l'ancien visuel V24 et des contrôles
   redondants. Les scripts de navigation, les données, l'audio,
   le back-office et la respiration sont conservés.
   ============================================================= */
(() => {
  'use strict';
  if (window.MUR_STABILISATION_V66) return;
  window.MUR_STABILISATION_V66 = {version:'66', scope:'visual-and-navigation-compatibility'};

  function install(){
    if (document.getElementById('mur-stabilisation-v66-css')) return;
    const style=document.createElement('style');
    style.id='mur-stabilisation-v66-css';
    style.textContent=`
      /* Ancienne photographie animée V24 : aucun rendu concurrent de la sphère multipoints. */
      #home #homeCircle > .mur-sphere-photo-v24,
      #home #homeCircle.mur-menu-open > .mur-sphere-photo-v24{
        display:none!important;visibility:hidden!important;opacity:0!important;
        animation:none!important;pointer-events:none!important
      }
      /* Conserver le moteur natif comme routeur invisible du menu à cinq sphères. */
      body.mur-five-open .mur-orb-menu,
      body.mur-five-open .mur-orb-connectors,
      body.mur-five-open .mur-orbit-line,
      body.mur-five-open .mur-orb-quick-center,
      body.mur-five-open .mur-orb-choice{
        opacity:0!important;visibility:hidden!important;pointer-events:none!important
      }
      body.mur-five-open .mur-home-particle-burst{display:none!important}
      /* Seul le bouton d'information unifié est affiché sur les pages standard. */
      #home #appInfoBtn,#tests #testsInfoBtn{display:none!important;visibility:hidden!important;pointer-events:none!important}
      .mur-info-page-button{border-radius:10px!important}
      /* L'ancienne croix de Réglages n'a plus de rôle face au bouton i. */
      #settings > section.card:first-child > .status > button.icon-btn[onclick*="showPage"]{
        display:none!important;visibility:hidden!important;pointer-events:none!important
      }
    `;
    document.head.appendChild(style);

    // Supprimer uniquement l'ancien graphique de la V24, jamais l'orbe multipoints.
    const oldImages=document.querySelectorAll('#home #homeCircle > .mur-sphere-photo-v24');
    oldImages.forEach(image=>image.remove());

    // Supprimer précisément l'ancienne croix de la page Réglages,
    // y compris si cet écran est reconstruit plus tard par l'application.
    const settings=document.getElementById('settings');
    if(settings){
      const obsoleteSelector=':scope > section.card:first-child > .status > button.icon-btn[onclick*="showPage"]';
      const cleanup=()=>settings.querySelectorAll(obsoleteSelector).forEach(btn=>btn.remove());
      cleanup();
      const observer=new MutationObserver(mutations=>{
        if(mutations.some(m=>m.addedNodes.length)) cleanup();
      });
      observer.observe(settings,{subtree:true,childList:true});
      window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
    }

    // Les fenêtres d'aide historiques ne doivent pas se retrouver au-dessus
    // d'un autre écran après une navigation. Ne touche pas à la présentation.
    const unified=document.getElementById('murInfoUnifiedModalV58');
    if(unified){
      document.querySelector('.tabbar')?.addEventListener('click',()=>{
        if(!unified.hidden) window.MUR_PAGE_INFO_V59?.close?.();
      },true);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();


/* ============================================================
   M.U.R. V76 — LOGO ACCUEIL & COULEUR NEUROFLEX VERIFIABLE
   Aucun changement index.html. Scope strict a l'accueil.
   ============================================================ */
(() => {
  'use strict';
  if(window.MUR_FIX_V76)return;
  window.MUR_FIX_V76={version:'76',features:['home-logo','neuroflex-breath-color']};
  const logoCSS=document.createElement('style');
  logoCSS.id='mur-v76-home-logo-css';
  logoCSS.textContent=`
    main.app:has(> #home.page.active) > header.top .brand > img.logo,
    main.app:has(> #home.page.active) > .top .brand > img.logo {
      display:block!important;
      width:76px!important;height:76px!important;min-width:76px!important;
      max-width:76px!important;max-height:76px!important;
      border-radius:19px!important;object-fit:contain!important;
    }
    main.app:has(> #home.page.active) > header.top .brand > div,
    main.app:has(> #home.page.active) > .top .brand > div,
    #home.page.active .home-title > .title-kicker {display:none!important}
    @media(max-width:380px){
      main.app:has(> #home.page.active) > .top .brand > img.logo{
        width:66px!important;height:66px!important;min-width:66px!important;max-width:66px!important;
      }
    }
  `;
  document.head.appendChild(logoCSS);
  const home=document.getElementById('home');
  const brand=document.querySelector('main.app > header.top .brand');
  const logo=brand?.querySelector('img.logo');
  const logoText=brand?.querySelector('div');
  const kicker=home?.querySelector('.home-title > .title-kicker');
  if(!home||!logo)return;
  const apply=()=>{
    const active=home.classList.contains('active');
    const dimension=window.matchMedia('(max-width:380px)').matches?'66px':'76px';
    if(active){
      ['width','height','min-width','max-width','max-height'].forEach(k=>logo.style.setProperty(k,dimension,'important'));
      logo.style.setProperty('display','block','important');
      if(logoText)logoText.style.setProperty('display','none','important');
      if(kicker)kicker.style.setProperty('display','none','important');
    } else {
      ['width','height','min-width','max-width','max-height','display'].forEach(k=>logo.style.removeProperty(k));
      if(logoText)logoText.style.removeProperty('display');
      if(kicker)kicker.style.removeProperty('display');
    }
  };
  new MutationObserver(apply).observe(home,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',apply,{passive:true});
  apply();
})();




/* ================================================================
   M.U.R. V85 — RESPIRATION PLEIN ECRAN AGRANDIE, UN SEUL LAYOUT
   Rétablit la carte native : aucun portail ni déplacement DOM.
   Remplace les couches de styles V77/V79/V81/V82/V83 ; conserve
   la couleur NeuroFlex, les rythmes, les sons et le geste tactile.
   ================================================================ */
(() => {
  'use strict';
  if(window.MUR_BREATH_FULLSCREEN_V85) return;
  window.MUR_BREATH_FULLSCREEN_V85={version:84,mode:'fixed-native-card',reparenting:false};
  const style=document.createElement('style');
  style.id='mur-breath-fullscreen-v85-css';
  style.textContent=`
    /* Le premier panneau de réglages est seulement masqué en séance. */
    #breath.page.active.breath-immersive{
      position:relative!important;inset:auto!important;
      transform:none!important;overflow:visible!important;
      z-index:auto!important;
    }
    /* Une UNIQUE carte de séance, fixée à la fenêtre (sans la déplacer). */
    #breath.page.active.breath-immersive > section.card:last-child{
      position:fixed!important;
      top:0!important;left:0!important;right:0!important;bottom:0!important;
      inset:0!important;
      transform:none!important;
      width:100vw!important;height:100vh!important;height:100dvh!important;
      min-width:0!important;min-height:0!important;
      max-width:none!important;max-height:none!important;
      margin:0!important;
      padding:clamp(12px,2dvh,22px)!important;
      box-sizing:border-box!important;
      display:flex!important;flex-direction:column!important;
      justify-content:space-between!important;align-items:center!important;
      gap:clamp(6px,1.4dvh,14px)!important;
      overflow:hidden!important;
      z-index:12040!important;
      border:0!important;border-radius:0!important;
      background:radial-gradient(ellipse at 50% 45%,#152f46 0%,#091b2e 65%,#050c18 100%)!important;
      box-shadow:none!important;
      isolation:isolate!important;
    }
    #breath.page.active.breath-immersive > section.card:last-child > .mini-info{
      position:relative!important;inset:auto!important;transform:none!important;
      display:grid!important;grid-template-columns:1fr 1fr!important;
      flex:0 0 auto!important;order:0!important;
      width:min(92%,540px)!important;max-width:540px!important;
      height:auto!important;margin:0 auto!important;z-index:5!important;
    }
    #breath.page.active.breath-immersive .mini-info .info-box{
      padding:clamp(9px,1.5dvh,15px) clamp(14px,2vw,22px)!important;
    }
    #breath.page.active.breath-immersive .breath-stage{
      position:relative!important;inset:auto!important;top:auto!important;left:auto!important;
      transform:none!important;translate:none!important;
      order:1!important;flex:1 1 0!important;
      display:flex!important;align-items:center!important;justify-content:center!important;
      width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;
      margin:0!important;padding:0!important;
      overflow:visible!important;z-index:2!important;
    }
    /* L'orb natif est animé par transform:scale() : marge pour scale(1.44). */
    #breath.page.active.breath-immersive #orb.mur-breath-particle-orb{
      position:relative!important;inset:auto!important;
      width:min(65vw,43dvh,450px)!important;
      height:min(65vw,43dvh,450px)!important;
      min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;
      flex:0 0 auto!important;margin:0!important;padding:0!important;
      transform-origin:center center!important;
      border:0!important;background:transparent!important;box-shadow:none!important;
      overflow:visible!important;isolation:isolate!important;
    }
    #breath.page.active.breath-immersive .breath-stage > svg.ring{
      position:absolute!important;top:50%!important;left:50%!important;
      width:min(80vw,54dvh,500px)!important;
      height:min(80vw,54dvh,500px)!important;
      max-width:none!important;max-height:none!important;
      transform:translate(-50%,-50%) rotate(-90deg)!important;
      opacity:.15!important;pointer-events:none!important;
    }
    #breath.page.active.breath-immersive #phaseText.mur-breath-label-v53{
      position:relative!important;inset:auto!important;top:auto!important;left:auto!important;
      transform:none!important;translate:none!important;
      order:2!important;flex:0 0 auto!important;display:block!important;
      width:max-content!important;min-width:132px!important;max-width:90%!important;
      margin:0 auto!important;padding:9px 18px!important;
      text-align:center!important;font-size:clamp(16px,2.3vw,22px)!important;
      white-space:nowrap!important;z-index:5!important;
    }
    #breath.page.active.breath-immersive #phaseHint{
      position:relative!important;inset:auto!important;top:auto!important;left:auto!important;
      transform:none!important;order:3!important;flex:0 0 auto!important;
      margin:0 auto!important;padding:0 4px!important;
      width:min(92%,620px)!important;max-width:620px!important;
      text-align:center!important;font-size:clamp(12px,1.7vw,15px)!important;
      line-height:1.35!important;z-index:4!important;
    }
    #breath.page.active.breath-immersive .breath-action-row{
      position:relative!important;inset:auto!important;top:auto!important;left:auto!important;
      transform:none!important;order:4!important;flex:0 0 auto!important;
      display:flex!important;justify-content:center!important;align-items:center!important;
      width:min(92%,520px)!important;min-height:50px!important;
      margin:0 auto!important;padding:0!important;z-index:5!important;
    }
    #breath.page.active.breath-immersive #stopBreathBtn:not([hidden]){
      display:block!important;min-height:44px!important;min-width:140px!important;
    }
    #breath.page.active.breath-immersive .orb-sound-btn{
      position:absolute!important;top:8px!important;right:8px!important;z-index:7!important;
    }
    body.breath-immersive-global .tabbar{
      opacity:0!important;visibility:hidden!important;pointer-events:none!important;
    }
    @media(max-height:560px){
      #breath.page.active.breath-immersive > section.card:last-child{
        padding:7px!important;gap:3px!important;
      }
      #breath.page.active.breath-immersive #orb.mur-breath-particle-orb{
        width:min(48vw,31dvh,230px)!important;height:min(48vw,31dvh,230px)!important;
      }
    }

    @media(max-width:720px){
      #breath.page.active.breath-immersive #orb.mur-breath-particle-orb{
        width:min(59vw,39dvh,350px)!important;
        height:min(59vw,39dvh,350px)!important;
      }
      #breath.page.active.breath-immersive > section.card:last-child > .mini-info{
        width:min(100%,370px)!important;max-width:370px!important;
      }
      #breath.page.active.breath-immersive .breath-action-row{
        width:min(100%,380px)!important;
      }
    }
  `;
  document.head.appendChild(style);
})();


/* M.U.R. V89 — cartes symboliques ki.S: recto/verso après les 15 réponses.
   Ne modifie pas les seuils/score ki.S, ni les conseils après Ici & Maintenant.
   La version actuelle du calcul détermine CINQ catégories, non sept.
   Les deux autres visuels sont fournis pour une future évolution du questionnaire. */
(function(){
  'use strict';
  const cards={
    pose:{title:'Le Posé',key:'pose'},
    fun_pose:{title:'Le Posé–Funambule',key:'pose_funambule'},
    fun_equilibre:{title:'Le Funambule',key:'funambule'},
    fun_fonceur:{title:'Le Funambule–Fonceur',key:'funambule_fonceur'},
    fonceur:{title:'Le Fonceur',key:'fonceur'},
    pose_fonceur:{title:'Le Posé–Fonceur',key:'pose_fonceur'},
    equilibre:{title:'L’Équilibré',key:'equilibre'}
  };
  const path='images/kis/';
  const css=document.createElement('style');
  css.id='mur-kis-cards-v89';
  css.textContent=`
    .mur-kis-flip-v89{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;margin:10px auto 2px;max-width:470px}
    .mur-kis-flip-v89 .mur-kis-card-btn{display:block;appearance:none;background:transparent;border:0;padding:0;margin:0 auto;cursor:pointer;max-width:100%;width:min(100%,335px);border-radius:20px;box-shadow:0 12px 32px rgba(0,0,0,.22);overflow:hidden}
    .mur-kis-flip-v89 .mur-kis-card-btn:focus-visible{outline:3px solid #8ac8d2;outline-offset:4px}
    .mur-kis-flip-v89 .mur-kis-card-image{display:block;width:100%;height:auto;object-fit:contain}
    .mur-kis-flip-v89 .mur-kis-card-hint{font-size:12px;letter-spacing:.025em;color:#c8d7e2;text-align:center;margin:0!important}
    .mur-kis-flip-v89 .mur-kis-card-actions{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;width:100%}
    .mur-kis-flip-v89 .mur-kis-card-actions button{min-height:42px;padding:10px 15px;border:1px solid rgba(125,198,207,.46);border-radius:12px;background:rgba(12,41,62,.9);color:#effbff;font-size:14px;font-weight:600;cursor:pointer}
    .mur-kis-flip-v89 .mur-kis-card-actions button.mur-kis-next{background:#1e6472;color:#fff}
    #resultKisDetail .mur-kis-flip-v89,#kisResult .mur-kis-flip-v89{max-width:430px}
    @media(max-width:490px){.mur-kis-flip-v89 .mur-kis-card-btn{width:min(80vw,330px)}}
    @media(prefers-reduced-motion:reduce){.mur-kis-flip-v89 *{transition:none!important;animation:none!important}}
  `;
  document.head.appendChild(css);
  const original=typeof window.profileCardHTML==='function'?window.profileCardHTML:null;
  window.profileCardHTML=function(score){
    // ki.S current scalar score: >=8 Posé; 3..7 Posé–Funambule;
    // -2..2 Funambule; -7..-3 Funambule–Fonceur; <=-8 Fonceur.
    const value=Number(score);
    if(!Number.isFinite(value)) return original?original(score):'';
    const key=value>=8?'pose':value>2?'fun_pose':value<=-8?'fonceur':value<-2?'fun_fonceur':'fun_equilibre';
    const stored=(typeof kisResult!=='undefined' && kisResult && kisResult.cardKey) ? kisResult.cardKey : null;
    const card=cards[stored]||cards[key];
    const front=path+card.key+'-recto.png';
    const back=path+card.key+'-verso.png';
    return `<section class="mur-kis-flip-v89" data-mur-kis-card="${card.key}" data-mur-kis-side="recto" aria-label="Carte ki.S : ${card.title}">
      <button class="mur-kis-card-btn" type="button" data-mur-kis-flip aria-label="Retourner la carte ${card.title}">
        <img class="mur-kis-card-image" src="${front}" data-front="${front}" data-back="${back}" alt="Recto de la carte ki.S ${card.title}" loading="eager" decoding="async">
      </button>
      <p class="mur-kis-card-hint">Votre profil de fond · Touchez la carte pour découvrir son verso</p>
      <div class="mur-kis-card-actions"><button type="button" data-mur-kis-flip>Voir le verso</button><button class="mur-kis-next" type="button" data-mur-kis-next>Continuer vers Ici & Maintenant</button></div>
    </section>`;
  };
  document.addEventListener('click',function(e){
    const next=e.target.closest('[data-mur-kis-next]');
    if(next){if(typeof window.openTestStep==='function')window.openTestStep('now');return;}
    const flip=e.target.closest('[data-mur-kis-flip]');
    if(!flip)return;
    const root=flip.closest('.mur-kis-flip-v89');if(!root)return;
    const img=root.querySelector('.mur-kis-card-image');if(!img)return;
    const verso=root.dataset.murKisSide!=='verso';
    img.src=verso?img.dataset.back:img.dataset.front;
    img.alt=(verso?'Verso':'Recto')+' de la carte ki.S '+cards[Object.keys(cards).find(k=>cards[k].key===root.dataset.murKisCard)]?.title;
    root.dataset.murKisSide=verso?'verso':'recto';
    root.querySelector('.mur-kis-card-hint').textContent=verso?'Votre profil de fond · Touchez pour revoir le recto':'Votre profil de fond · Touchez la carte pour découvrir son verso';
    const btn=root.querySelector('.mur-kis-card-actions [data-mur-kis-flip]');btn.textContent=verso?'Voir le recto':'Voir le verso';
  });
})();


/* M.U.R. V90 — sept cartes ki.S et avatars évolutifs.
 * Le score historique reste inchangé. Le profil symbolique utilise les 15 réponses.
 * L'état Ici & Maintenant ne modifie que le halo coloré de l'avatar.
 * Un ancien résultat sans les réponses détaillées conserve sa catégorie héritée.
 */
(function(){
  'use strict';
  const profiles={
    pose:'Le Posé', funambule:'Le Funambule', fonceur:'Le Fonceur',
    pose_funambule:'Le Posé–Funambule', pose_fonceur:'Le Posé–Fonceur',
    funambule_fonceur:'Le Funambule–Fonceur', equilibre:'L’Équilibré'
  };
  const reference=[
    ['pose',[10,2.5,2.5]],['funambule',[2.5,10,2.5]],
    ['fonceur',[2.5,2.5,10]],['pose_funambule',[6.5,6.5,2]],
    ['pose_fonceur',[6.5,2,6.5]],['funambule_fonceur',[2,6.5,6.5]],
    ['equilibre',[5,5,5]]
  ];
  function calculate(responses){
    if(!Array.isArray(responses)||responses.length!==15||
       responses.some(v=>v!==-1&&v!==0&&v!==1))return null;
    const counts=[responses.filter(v=>v===1).length,responses.filter(v=>v===0).length,responses.filter(v=>v===-1).length];
    const d=ref=>ref.reduce((sum,value,i)=>sum+(counts[i]-value)**2,0);
    const chosen=reference.reduce((best,item)=>d(item[1])<d(best[1])?item:best);
    return {cardKey:chosen[0],counts:{pose:counts[0],funambule:counts[1],fonceur:counts[2]},scoreHistorique:counts[0]-counts[2]};
  }
  window.MUR_KIS_V90_CALCULATE=calculate;
  const legacyFromScore=score=>score>=8?'pose':score>2?'pose_funambule':score<=-8?'fonceur':score<-2?'funambule_fonceur':'funambule';
  function saved(){try{return JSON.parse(localStorage.getItem('murKis')||'null')}catch(_){return null}}
  function now(){try{return JSON.parse(localStorage.getItem('murNow')||'null')}catch(_){return null}}
  const colors={bleu:'#538fc6',vert:'#5baf96',orange:'#d0a067',rouge:'#c96e72'};
  function getState(){
    const k=saved();if(!k)return null;
    const key=profiles[k.cardKey]?k.cardKey:legacyFromScore(Number(k.score)||0);
    const n=now();const zone=n && n.zone;
    const zk=zone && String(zone.key||'').toLowerCase();
    return {key,title:profiles[key],zone:colors[zk]?zk:null,color:colors[zk]||'#619db4',counts:k.counts||null,legacy:!k.cardKey};
  }
  function avatarHTML(s,cls){
    return `<span class="mur-v90-avatar ${cls||''}" style="--mur-v90-halo:${s.color}">
      <img src="images/kis/avatars/${s.key}.webp" alt="Avatar ${s.title}" loading="lazy" />
    </span>`;
  }
  const css=document.createElement('style');css.id='mur-kis-v90-style';css.textContent=`
    .mur-v90-avatar{display:inline-flex;position:relative;align-items:center;justify-content:center;flex:none;width:104px;height:104px;border-radius:50%;background:radial-gradient(circle, color-mix(in srgb,var(--mur-v90-halo) 25%,#061522) 0%,#061522 72%);box-shadow:0 0 0 2px var(--mur-v90-halo),0 0 20px color-mix(in srgb,var(--mur-v90-halo) 45%,transparent);overflow:hidden}
    .mur-v90-avatar img{display:block;width:100%;height:100%;object-fit:contain}
    .mur-v90-profile{margin-top:16px;padding:18px;display:flex;align-items:center;gap:18px;border:1px solid rgba(117,174,185,.35);border-radius:18px;background:linear-gradient(120deg,rgba(7,32,48,.88),rgba(15,49,65,.55));color:#ecf7fa}
    .mur-v90-profile strong{display:block;font-size:20px;font-weight:600}
    .mur-v90-profile p{margin:5px 0!important;font-size:13px;color:#c1d6e0;line-height:1.45}
    .mur-v90-profile small{display:block;color:#b3cbd6;font-size:11px}
    #homeProfileBtn.mur-v90-has-avatar{padding:2px;overflow:visible}
    #homeProfileBtn.mur-v90-has-avatar>svg{display:none!important}
    #homeProfileBtn .mur-v90-avatar{width:100%;height:100%;min-width:32px;min-height:32px;box-shadow:0 0 0 1px var(--mur-v90-halo),0 0 9px var(--mur-v90-halo)}
    @media(max-width:520px){.mur-v90-profile{gap:12px;padding:12px}.mur-v90-avatar{width:74px;height:74px}.mur-v90-profile strong{font-size:17px}}
  `;document.head.appendChild(css);
  function renderAvatar(){
    const state=getState();
    const home=document.getElementById('homeProfileBtn');
    if(home){
      const old=home.querySelector('.mur-v90-avatar');if(old)old.remove();
      home.classList.toggle('mur-v90-has-avatar',!!state);
      if(state){home.insertAdjacentHTML('beforeend',avatarHTML(state,'mur-v90-home-avatar'));home.setAttribute('aria-label','Profil : '+state.title)}
    }
    const page=document.getElementById('settings');if(!page)return;
    let box=document.getElementById('mur-v90-profile-card');
    if(!box){box=document.createElement('div');box.id='mur-v90-profile-card';
      const first=page.querySelector('.card');if(first)first.appendChild(box);}
    if(!state){box.innerHTML='<p class="help" style="margin-top:15px">Votre avatar apparaîtra après le test ki.S.</p>';return}
    const status=state.zone?'Ici & Maintenant : zone '+state.zone+'.':'Réalisez Ici & Maintenant pour colorer votre avatar.';
    box.innerHTML=`<div class="mur-v90-profile" data-mur-v95-open role="button" tabindex="0" aria-label="Voir la carte complète de mon profil ki.S">${avatarHTML(state)}<div><small>MON PROFIL ki.S</small><strong>${state.title}</strong><p>${status}</p><small>${state.legacy?'Ancien résultat : refaites ki.S pour un calcul sur les 15 réponses.':'Profil de fond : évolue lorsque vous refaites ki.S.'}</small><button type="button" class="mur-v95-open" data-mur-v95-open>Voir ma carte ki.S</button></div></div>`;
  }
  window.MUR_KIS_V90_RENDER_AVATAR=renderAvatar;
  // Interception minimale : on garde le moteur et les fonctions de synthèse existants.
  if(typeof window.finishKis==='function'){
    const oldFinish=window.finishKis;
    window.finishKis=function(){
      let details=null;
      try{details=calculate(kisAnswers.slice())}catch(_){details=null}
      const previous=(typeof kisResult!=='undefined' && !!kisResult);
      const ret=oldFinish.apply(this,arguments);
      if(details&&!previous){
        try{
          const current=saved();
          if(current&&Number(current.score)===details.scoreHistorique){
            const enriched={...current,...details,cardVersion:7};
            localStorage.setItem('murKis',JSON.stringify(enriched));
            if(typeof kisResult!=='undefined')kisResult=enriched;
            if(typeof renderProgressiveResult==='function')renderProgressiveResult();
          }
        }catch(e){console.warn('ki.S V90: sauvegarde carte',e)}
      }
      renderAvatar();return ret;
    };
  }
  if(typeof window.finishNow==='function'){
    const oldNow=window.finishNow;
    window.finishNow=function(){const ret=oldNow.apply(this,arguments);renderAvatar();return ret};
  }
  if(typeof window.showPage==='function'){
    const oldShow=window.showPage;
    window.showPage=function(){const ret=oldShow.apply(this,arguments);renderAvatar();return ret};
  }
  // Rafraîchir également après récupération éventuelle des données locales/du compte.
  if(typeof window.loadAll==='function'){
    const oldLoad=window.loadAll;
    window.loadAll=function(){const ret=oldLoad.apply(this,arguments);renderAvatar();return ret};
  }
  window.addEventListener('storage',e=>{if(['murKis','murNow'].includes(e.key))renderAvatar()});
  renderAvatar();
})();


/* M.U.R. V93 — ki.S : une reponse suffit, avance automatique, zero saut sans reponse.
   Aucun clic de validation supplementaire, resultat affiche apres la 15e reponse. */
(function(){
  'use strict';
  if(typeof window.answerKis!=='function')return;
  let transitionPending=false;
  window.answerKis=function(value){
    if(typeof kisResult!=='undefined'&&kisResult){
      if(typeof renderKisLocked==='function')renderKisLocked();
      return;
    }
    if(transitionPending)return;
    if(value!==-1&&value!==0&&value!==1)return;
    if(typeof kisAnswers==='undefined'||typeof kisIndex==='undefined')return;
    const questionIndex=kisIndex;
    kisAnswers[questionIndex]=value;
    const buttons=Array.from(document.querySelectorAll('#kisBox .kis-choice'));
    buttons.forEach((btn,i)=>{
      const selected=i===(value===-1?0:value===0?1:2);
      btn.classList.toggle('selected',selected);
      btn.setAttribute('aria-pressed',String(selected));
    });
    const warning=document.getElementById('kisMissingAnswer');
    if(warning)warning.textContent='';
    if(typeof updateKisValidateState==='function')updateKisValidateState();
    transitionPending=true;
    setTimeout(function(){
      try{
        if(typeof kisResult!=='undefined'&&kisResult)return;
        if(kisIndex!==questionIndex)return;
        if(kisAnswers[questionIndex]===null)return;
        if(questionIndex<14){
          kisIndex=questionIndex+1;
          if(typeof renderKis==='function')renderKis();
        }else if(kisAnswers.length===15&&kisAnswers.every(v=>v!==null)){
          if(typeof finishKis==='function')finishKis();
        }
      }finally{transitionPending=false;}
    },240);
  };
  // Les controles natifs prevKis/nextKis bloquent toujours une question non repondue.
  if(typeof window.renderKis==='function'){
    const previous=window.renderKis;
    window.renderKis=function(){
      const ret=previous.apply(this,arguments);
      const label=document.querySelector('#kisNavRow button:nth-child(2)');
      if(label&&typeof kisIndex!=='undefined')label.textContent=kisIndex===14?'Dernière question':'Suivant';
      const validate=document.getElementById('kisValidateBtn');
      if(validate&&!((typeof kisResult!=='undefined')&&kisResult))validate.style.display='none';
      return ret;
    };
  }
})();

/* M.U.R. V92 — Cartes ki.S reconstruites et interaction fiable.
   Les sept categories et les avatars V90 restent inchanges. */
(function(){
 'use strict';
 const names={pose:'Le Posé',funambule:'Le Funambule',fonceur:'Le Fonceur',pose_funambule:'Posé–Funambule',pose_fonceur:'Posé–Fonceur',funambule_fonceur:'Funambule–Fonceur',equilibre:'L’Équilibré'};
 const legacy=n=>n>=8?'pose':n>2?'pose_funambule':n<=-8?'fonceur':n<-2?'funambule_fonceur':'funambule';
 function cardState(){
   let k=null;try{k=(typeof kisResult!=='undefined'&&kisResult)||JSON.parse(localStorage.getItem('murKis')||'null')}catch(_){}
   if(!k)return null;
   const key=names[k.cardKey]?k.cardKey:legacy(Number(k.score)||0);
   return {key,name:names[key]};
 }
 const style=document.createElement('style');style.id='mur-kis-v92-style';style.textContent=`
 #testResultView #resultKisBlock.open{height:auto!important;max-height:none!important;min-height:0!important;overflow:visible!important;}
 #testResultView #resultKisBlock.open .result-step-body{overflow:visible!important;max-height:none!important;}
 #testResultView #resultKisBlock.open #resultKisDetail{display:block!important;overflow:visible!important;max-height:none!important;}
 .mur-kis-v92-card{max-width:460px;width:100%;margin:14px auto;display:flex;flex-direction:column;align-items:center;gap:12px;}
 .mur-kis-v92-flip{display:block;width:min(100%,375px);border:0;background:none;padding:0;cursor:pointer;line-height:0;border-radius:22px;overflow:hidden;box-shadow:0 12px 35px #0008;}
 .mur-kis-v92-flip img{display:block;width:100%;height:auto;aspect-ratio:720/1060;object-fit:fill;}
 .mur-kis-v92-card .mur-kis-v92-actions{display:flex;flex-wrap:wrap;gap:9px;justify-content:center;}
 .mur-kis-v92-actions button{cursor:pointer;border-radius:12px;min-height:43px;padding:9px 15px;border:1px solid #83aeb9;background:#143d50;color:#f4f9fc;font-size:14px;font-weight:650;}
 .mur-kis-v92-actions .mur-kis-v92-next{background:#286075;}
 .mur-kis-v92-hint{font-size:13px;color:#bfd3dc;text-align:center;margin:0;line-height:1.4;}
 .mur-kis-v92-mini{display:inline-flex;align-items:center;flex:none;border:1px solid #5a8997;background:#0b2535;border-radius:10px;padding:3px;margin:3px 5px 3px auto;cursor:pointer;}
 .mur-kis-v92-mini img{width:47px;height:66px;display:block;object-fit:contain;border-radius:6px;}
 @media(max-width:480px){.mur-kis-v92-flip{width:min(100%,310px)}.mur-kis-v92-mini img{width:38px;height:54px}}
 `;document.head.appendChild(style);
 // Remplace la carte issue de la vieille planche et évite l'ancien calcul à cinq sorties.
 window.profileCardHTML=function(){
  const state=cardState();if(!state)return '';
  const path='images/kis/'+state.key;
  return `<div class="mur-kis-v92-card" data-mur-kis-v92="${state.key}" data-side="recto">
    <button type="button" class="mur-kis-v92-flip" data-mur-v92-flip aria-label="Retourner la carte ${state.name}">
     <img src="${path}-recto.png" data-front="${path}-recto.png" data-back="${path}-verso.png" alt="Recto ${state.name}" loading="eager" />
    </button>
    <p class="mur-kis-v92-hint">Touchez la carte pour découvrir votre profil.</p>
    <div class="mur-kis-v92-actions"><button type="button" data-mur-v92-flip>Voir le verso</button><button type="button" class="mur-kis-v92-next" data-mur-v92-next>Continuer vers Ici & Maintenant</button></div>
   </div>`;
 };
 // Capture avant le stopPropagation des boutons natifs et l'onclick du bloc résultat.
 document.addEventListener('click',function(e){
   const flip=e.target.closest('[data-mur-v92-flip]');
   const next=e.target.closest('[data-mur-v92-next]');
   const thumb=e.target.closest('[data-mur-v92-mini]');
   if(!flip&&!next&&!thumb)return;
   e.preventDefault();e.stopImmediatePropagation();
   if(next){if(typeof openTestStep==='function')openTestStep('now');return;}
   if(thumb){
      if(typeof resultStepOpen!=='undefined')resultStepOpen.kis=true;
      const block=document.getElementById('resultKisBlock');if(block)block.classList.add('open');
      if(typeof renderResultStepDetails==='function')renderResultStepDetails();
      return;
   }
   const root=flip.closest('.mur-kis-v92-card');if(!root)return;
   const img=root.querySelector('img');if(!img)return;
   const back=root.dataset.side!=='verso';root.dataset.side=back?'verso':'recto';
   img.src=back?img.dataset.back:img.dataset.front;
   img.alt=(back?'Verso ':'Recto ')+(cardState()?.name||'ki.S');
   root.querySelector('.mur-kis-v92-hint').textContent=back?'Touchez pour revoir le recto.':'Touchez la carte pour découvrir votre profil.';
   root.querySelector('.mur-kis-v92-actions [data-mur-v92-flip]').textContent=back?'Voir le recto':'Voir le verso';
 },true);
 function miniature(){
   const state=cardState(), block=document.getElementById('resultKisBlock');if(!block)return;
   const header=block.querySelector('.result-step-top');if(!header)return;
   let mini=header.querySelector('.mur-kis-v92-mini');
   if(!state){if(mini)mini.remove();return;}
   if(!mini){mini=document.createElement('button');mini.type='button';mini.className='mur-kis-v92-mini';mini.setAttribute('data-mur-v92-mini','');header.appendChild(mini)}
   mini.setAttribute('aria-label','Voir la carte '+state.name);
   mini.innerHTML=`<img src="images/kis/${state.key}-recto.png" alt="Miniature ${state.name}" loading="eager">`;
   if(typeof resultStepOpen!=='undefined'&&resultStepOpen.kis)block.classList.add('open');
 }
 if(typeof window.renderProgressiveResult==='function'){
   const prev=window.renderProgressiveResult;
   window.renderProgressiveResult=function(){const ret=prev.apply(this,arguments);miniature();return ret};
 }
 if(typeof window.renderResultStepDetails==='function'){
   const prev=window.renderResultStepDetails;
   window.renderResultStepDetails=function(){const ret=prev.apply(this,arguments);miniature();return ret};
 }
 // Sécurité au chargement : miniature aussi pour un résultat ki.S déjà enregistré.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',miniature);else miniature();
})();


/* M.U.R. V94 — ki.S : carte résultat compacte, sans défilement.
   Miniature dans le bloc réduit uniquement ; la grande carte s'ajuste à la fenêtre.
   Conserve la navigation V93, le calcul à sept profils et le retournement V92. */
(function(){
  'use strict';
  if(document.getElementById('mur-kis-compact-v94'))return;
  const css=document.createElement('style');
  css.id='mur-kis-compact-v94';
  css.textContent=`
    /* Répare la règle V92 qui laissait le contenu sortir de la fenêtre. */
    #testResultView #resultKisBlock.result-step.open{
      display:flex!important;
      flex-direction:column!important;
      align-items:stretch!important;
      overflow:hidden!important;
      height:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 16px)!important;
      min-height:0!important;
      max-height:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 16px)!important;
      top:calc(env(safe-area-inset-top,0px) + 4px)!important;
      bottom:auto!important;
      box-sizing:border-box!important;
      padding:12px 16px!important;
      gap:0!important;
    }
    #testResultView #resultKisBlock.result-step.open .result-step-side{display:none!important;}
    #testResultView #resultKisBlock.result-step.open .result-step-body{
      display:flex!important;
      flex-direction:column!important;
      min-height:0!important;
      flex:1 1 auto!important;
      overflow:hidden!important;
      max-height:100%!important;
      width:100%!important;
    }
    #testResultView #resultKisBlock.result-step.open .result-step-top{
      flex:0 0 auto!important;
      padding-right:32px!important;
      gap:5px!important;
      min-height:28px!important;
    }
    #testResultView #resultKisBlock.result-step.open .result-step-top h3{font-size:clamp(16px,2.8vh,22px)!important;line-height:1.1!important;}
    #testResultView #resultKisBlock.result-step.open .result-main{
      flex:0 0 auto!important;
      font-size:clamp(15px,2.8vh,23px)!important;
      line-height:1.08!important;
      margin:3px 0!important;
    }
    /* Les explications restent sur le verso ; pas de doublons au-dessus. */
    #testResultView #resultKisBlock.result-step.open #resultKisText,
    #testResultView #resultKisBlock.result-step.open .result-profile-line{display:none!important;}
    #testResultView #resultKisBlock.result-step.open #resultKisDetail{
      display:flex!important;
      flex:1 1 auto!important;
      min-height:0!important;
      width:100%!important;
      max-height:none!important;
      overflow:hidden!important;
      border-top:0!important;
      padding:0!important;
      margin:0!important;
      justify-content:center!important;
      align-items:stretch!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-card{
      display:flex!important;
      flex:1 1 auto!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      min-height:0!important;
      max-height:100%!important;
      margin:0 auto!important;
      padding:3px 0 2px!important;
      gap:clamp(4px,1vh,9px)!important;
      box-sizing:border-box!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      flex:0 1 auto!important;
      min-height:0!important;
      max-height:calc(100% - 77px)!important;
      max-width:min(100%,420px)!important;
      width:auto!important;
      height:auto!important;
      box-shadow:0 9px 20px #0005!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip img{
      display:block!important;
      height:auto!important;
      width:auto!important;
      max-height:min(58dvh,calc(100dvh - 205px))!important;
      max-width:min(100%,420px)!important;
      object-fit:contain!important;
      aspect-ratio:720/1060!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-hint{
      flex:0 0 auto!important;
      font-size:11px!important;
      line-height:1.15!important;
      margin:0!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-actions{
      display:flex!important;
      flex:0 0 auto!important;
      gap:7px!important;
      width:100%!important;
      margin:0!important;
      flex-wrap:nowrap!important;
      justify-content:center!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-actions button{
      font-size:clamp(10px,1.8vh,13px)!important;
      padding:6px 9px!important;
      min-height:36px!important;
      max-width:55%!important;
      line-height:1.2!important;
    }
    /* Masquer la miniature en grand écran, l'afficher dans le résultat condensé. */
    #testResultView #resultKisBlock.open .mur-kis-v92-mini{display:none!important;}
    #testResultView #resultKisBlock:not(.open) .mur-kis-v92-mini{display:inline-flex!important;}
    @media(max-height:690px){
      #testResultView #resultKisBlock.result-step.open{padding:7px 12px!important;}
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip img{max-height:min(52dvh,calc(100dvh - 165px))!important;}
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-hint{display:none!important;}
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-actions button{min-height:32px!important;}
    }
    @media(max-width:420px){
      #testResultView #resultKisBlock.result-step.open{width:calc(100vw - 12px)!important;max-width:calc(100vw - 12px)!important;padding:10px 11px!important;}
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip img{max-width:min(78vw,350px)!important;}
    }
  `;
  document.head.appendChild(css);
})();


/* M.U.R. V97 — Liaison directe entre Réglages > Mon profil ki.S et la carte complète.
   La fiche entière est cliquable. Carte affichée dans un dialogue autonome sous body.
   Aucun changement des scores, questionnaires, assets ou des pages existantes. */
(function(){
  'use strict';
  if(window.MUR_PROFILE_CARD_V97)return;
  const names={pose:'Le Posé',funambule:'Le Funambule',fonceur:'Le Fonceur',pose_funambule:'Le Posé–Funambule',pose_fonceur:'Le Posé–Fonceur',funambule_fonceur:'Le Funambule–Fonceur',equilibre:'L’Équilibré'};
  const legacy=n=>n>=8?'pose':n>2?'pose_funambule':n<=-8?'fonceur':n<-2?'funambule_fonceur':'funambule';
  const read=()=>{try{return JSON.parse(localStorage.getItem('murKis')||'null')}catch(_){return null}};
  let current=null, side='recto', previousFocus=null;
  const modal=document.createElement('section');
  modal.id='mur-v97-profile-modal';
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-label','Carte de mon profil ki.S');
  modal.setAttribute('aria-hidden','true');
  modal.hidden=true;
  modal.innerHTML=`<div class="mur-v97-inner"><div class="mur-v97-header"><button type="button" data-v97-back>← Mon profil</button><strong class="mur-v97-title"></strong><span aria-hidden="true"></span></div><button type="button" class="mur-v97-image-button" data-v97-flip aria-label="Retourner la carte"><img class="mur-v97-image" alt="Carte ki.S"></button><div class="mur-v97-footer"><button type="button" data-v97-flip class="mur-v97-flip">Voir le verso</button></div></div>`;
  const style=document.createElement('style');style.id='mur-v97-profile-css';style.textContent=`
    #mur-v90-profile-card .mur-v90-profile[data-mur-v95-open]{cursor:pointer;transition:border-color .2s,box-shadow .2s;position:relative}
    #mur-v90-profile-card .mur-v90-profile[data-mur-v95-open]:hover{border-color:rgba(140,226,229,.77);box-shadow:0 0 17px rgba(82,170,193,.12)}
    #mur-v90-profile-card .mur-v90-profile[data-mur-v95-open]:focus-visible{outline:2px solid #a1d8e8;outline-offset:3px}
    #mur-v90-profile-card [data-mur-v95-open].mur-v95-open{display:inline-block;margin:12px 0 0;padding:10px 14px;min-height:42px;border:1px solid #689cac;background:#133e53;color:white;border-radius:12px;font-size:14px;font-weight:650;cursor:pointer}
    #mur-v97-profile-modal[hidden]{display:none!important}
    #mur-v97-profile-modal{position:fixed!important;inset:0!important;width:100vw!important;width:100dvw!important;height:100vh!important;height:100dvh!important;z-index:2147483640!important;background:rgba(4,13,24,.98)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:calc(9px + env(safe-area-inset-top,0px)) 12px calc(9px + env(safe-area-inset-bottom,0px))!important;box-sizing:border-box!important;isolation:isolate;overflow:hidden!important}
    #mur-v97-profile-modal .mur-v97-inner{display:flex;flex-direction:column;gap:9px;align-items:center;max-width:480px;width:100%;height:100%;min-height:0;color:#e9f5fa}
    #mur-v97-profile-modal .mur-v97-header{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;width:100%;align-items:center;flex:none}
    #mur-v97-profile-modal .mur-v97-title{text-align:center;font-size:clamp(14px,2.2vh,20px);font-weight:600;line-height:1.2}
    #mur-v97-profile-modal button{font-family:inherit;cursor:pointer;color:#f4fbff;border-radius:11px}
    #mur-v97-profile-modal [data-v97-back],#mur-v97-profile-modal .mur-v97-flip{border:1px solid #588da0;background:#143b50;padding:9px 11px;min-height:39px;font-size:14px;font-weight:600}
    #mur-v97-profile-modal .mur-v97-image-button{display:flex;justify-content:center;align-items:center;min-height:0;min-width:0;flex:1 1 auto;width:100%;background:transparent;border:0;padding:0;overflow:hidden}
    #mur-v97-profile-modal .mur-v97-image{display:block;max-height:100%;max-width:100%;width:auto;height:auto;object-fit:contain;border-radius:13px;box-shadow:0 12px 30px #0007}
    #mur-v97-profile-modal .mur-v97-footer{display:flex;justify-content:center;flex:none;width:100%}
    #mur-v97-profile-modal button:focus-visible{outline:2px solid #ade6ed;outline-offset:2px}
    @media(max-height:570px){#mur-v97-profile-modal{padding-top:4px!important;padding-bottom:4px!important}#mur-v97-profile-modal [data-v97-back],#mur-v97-profile-modal .mur-v97-flip{padding:5px 8px;min-height:32px}}
  `;
  document.head.appendChild(style);document.body.appendChild(modal);
  const img=modal.querySelector('.mur-v97-image');
  function render(){
    if(!current)return;
    img.src='images/kis/'+current.key+'-'+side+'.png';
    img.alt=(side==='recto'?'Recto':'Verso')+' de '+current.name;
    modal.querySelector('.mur-v97-title').textContent=current.name;
    modal.querySelector('.mur-v97-flip').textContent=side==='recto'?'Voir le verso':'Voir le recto';
  }
  function open(){
    const k=read();if(!k){return false}
    const key=names[k.cardKey]?k.cardKey:legacy(Number(k.score)||0);
    current={key,name:names[key]};side='recto';previousFocus=document.activeElement;
    render();
    modal.hidden=false;modal.setAttribute('aria-hidden','false');
    modal.querySelector('[data-v97-back]').focus({preventScroll:true});
    return true;
  }
  function close(){
    modal.hidden=true;modal.setAttribute('aria-hidden','true');current=null;
    // Conserver la navigation Réglages, même si le contenu a été mis à jour.
    if(document.getElementById('settings') && !document.getElementById('settings').classList.contains('active') && typeof window.showPage==='function'){
      window.showPage('settings');
    }
    if(previousFocus?.isConnected && typeof previousFocus.focus==='function')previousFocus.focus({preventScroll:true});
  }
  function flip(){if(!current)return;side=side==='recto'?'verso':'recto';render()}
  // Capture du clic AVANT les gestionnaires historiques de la page Réglages.
  document.addEventListener('click',function(e){
    if(!modal.hidden){
      if(e.target.closest('[data-v97-back]')){e.preventDefault();e.stopImmediatePropagation();close();return}
      if(e.target.closest('[data-v97-flip]')){e.preventDefault();e.stopImmediatePropagation();flip();return}
      if(e.target===modal){e.preventDefault();e.stopImmediatePropagation();close()}
      return;
    }
    if(e.target.closest('#mur-v90-profile-card [data-mur-v95-open]')){
      e.preventDefault();e.stopImmediatePropagation();open();
    }
  },true);
  document.addEventListener('keydown',function(e){
    if(!modal.hidden){
      if(e.key==='Escape'){e.preventDefault();close();return}
      if(e.key==='Tab'){
        const buttons=[...modal.querySelectorAll('button')];
        if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons[buttons.length-1].focus()}
        else if(!e.shiftKey&&document.activeElement===buttons[buttons.length-1]){e.preventDefault();buttons[0].focus()}
      }
      return;
    }
    if((e.key==='Enter'||e.key===' ')&&document.activeElement?.matches('#mur-v90-profile-card .mur-v90-profile[data-mur-v95-open]')){
      e.preventDefault();open();
    }
  });
  img.addEventListener('error',function(){
    console.warn('M.U.R. V97: image de carte introuvable',img.src);
  });
  window.MUR_PROFILE_CARD_V97={open,close,flip};
})();


/* ==============================================================
   M.U.R. V108 — Ici & Maintenant : logos sur axe réel des curseurs
   multipoints, avec curseurs qui changent de couleur selon la valeur.
   ============================================================== */
(function(){
 'use strict';
 if(window.MUR_NOW_V112)return;
 window.MUR_NOW_V112=true;
 const specs=[
   {id:'nowEnergy',box:'nowIntensity_energy',cls:'energy',name:'Énergie',color:'#d9a46c'},
   {id:'nowBreath',box:'nowIntensity_breath',cls:'breath',name:'Respiration',color:'#61c4bc'},
   {id:'nowMind',box:'nowIntensity_mind',cls:'mind',name:'Mental',color:'#9884cb'},
   {id:'nowBody',box:'nowIntensity_body',cls:'body',name:'Corps',color:'#78b994'}
 ];
 const css=document.createElement('style');css.id='mur-now-v108-style';
 css.textContent=`
   /* V107 : disposition unique, sans superposition de règles successives. */
   #testNow .card{background:linear-gradient(160deg,#0a243b 0%,#0a1b2e 58%,#0b2135 100%)!important;border:1px solid rgba(89,160,200,.3)!important;box-shadow:inset 0 0 30px rgba(40,124,177,.055)!important}
   #testNow .test-page-status{position:relative;isolation:isolate;padding:2px 5px 8px!important;margin-bottom:5px!important}
   #testNow .test-page-status::after{content:'';position:absolute;pointer-events:none;right:12px;top:-7px;width:112px;height:82px;border-radius:50%;background:radial-gradient(ellipse,rgba(48,126,193,.16),transparent 72%);z-index:-1}
   #testNow .page-title h2{font-weight:850!important;letter-spacing:-.035em!important;font-size:clamp(26px,5.7vw,36px)!important}
   #testNow .page-title .title-sub{font-size:13px!important;opacity:.8}
   #testNow .mur-now-v96-grid{display:flex;flex-direction:column;gap:8px;width:100%;min-width:0}
   #testNow .mur-now-v96-panel{
     --mur-panel-color:#65bcc6;
     box-sizing:border-box!important;
     position:relative!important;
     display:grid!important;
     grid-template-columns:74px minmax(0,1fr)!important;
     grid-template-rows:auto auto!important;
     grid-template-areas:'mur-icon mur-slider' 'mur-icon mur-info'!important;
     column-gap:9px!important;
     align-items:center!important;
     width:100%!important;
     min-height:107px!important;
     margin:0!important;
     padding:10px 12px!important;
     border-radius:20px!important;
     border:1px solid rgba(111,170,211,.26)!important;
     background:linear-gradient(135deg,rgba(19,53,80,.82),rgba(9,33,55,.9))!important;
     box-shadow:inset 0 1px 0 rgba(255,255,255,.035)!important;
   }
   #testNow .mur-now-v96-panel::after{content:'';pointer-events:none;position:absolute;right:10px;top:7px;width:52px;height:28px;opacity:.20;background:radial-gradient(ellipse,var(--mur-panel-color),transparent 65%);filter:blur(12px)}
   #testNow .mur-now-v96-panel .mur-now-v96-symbol{
     box-sizing:border-box!important;
     grid-area:mur-icon!important;
     position:relative!important;
     inset:auto!important;
     display:flex!important;
     align-items:center!important;
     justify-content:center!important;
     justify-self:center!important;
     align-self:center!important;
     width:68px!important;
     height:68px!important;
     min-width:0!important;
     min-height:0!important;
     margin:0!important;
     padding:0!important;
     overflow:hidden!important;
     transform:translateY(var(--mur-icon-axis-shift, 0px))!important;
     will-change:transform;
   }
   #testNow .mur-now-v96-panel .mur-now-v96-symbol img.mur-now-v102-emblem{
     position:static!important;
     display:block!important;
     width:68px!important;
     height:68px!important;
     max-width:100%!important;
     max-height:100%!important;
     min-width:0!important;
     min-height:0!important;
     object-fit:contain!important;
     object-position:center center!important;
     border-radius:50%!important;
     margin:0!important;
     padding:0!important;
     transform:none!important;
     filter:drop-shadow(0 0 3px rgba(100,190,215,.16));
   }
   #testNow .mur-now-v96-panel .scale{
     grid-area:mur-slider!important;
     box-sizing:border-box!important;
     position:relative!important;
     width:100%!important;
     min-width:0!important;
     margin:0!important;
     padding:0!important;
     border:0!important;
     border-radius:0!important;
     background:transparent!important;
     box-shadow:none!important;
   }
   #testNow .mur-now-v96-panel .scale label.mini-label{display:block!important;font-size:15px!important;line-height:1.15!important;font-weight:760!important;color:#f0f6fa!important;margin:0 0 11px!important;letter-spacing:0!important}
   #testNow .mur-now-v96-slider-wrap{position:relative;width:100%;height:22px;display:flex;align-items:center}
   #testNow .mur-now-v96-slider-wrap input[type=range]{position:relative;z-index:2;display:block;width:100%;height:12px!important;margin:0!important;padding:0!important;cursor:pointer;border-radius:999px;background:linear-gradient(90deg,#368cf1 0%,#21b7a9 24%,#32c66a 42%,#d0cc3c 57%,#f19d36 76%,#e9545c 100%)!important;outline-offset:6px;transition:box-shadow .16s ease}
   #testNow .mur-now-v96-slider-wrap input[type=range]::-webkit-slider-thumb{-webkit-appearance:none!important;appearance:none!important;width:31px!important;height:31px!important;border-radius:50%!important;background:transparent!important;border:0!important;box-shadow:none!important}
   #testNow .mur-now-v96-slider-wrap input[type=range]::-moz-range-thumb{width:31px!important;height:31px!important;border-radius:50%!important;background:transparent!important;border:0!important;box-shadow:none!important}
   #testNow .mur-now-v96-thumb{position:absolute;top:50%;left:50%;width:40px;height:40px;transform:translate(-50%,-50%);pointer-events:none;z-index:3;transition:left .12s ease-out}
   #testNow .mur-now-v96-thumb canvas{display:block;width:40px;height:40px}
   #testNow .mur-now-v96-panel .now-intensity{
     grid-area:mur-info!important;
     box-sizing:border-box!important;
     position:relative!important;
     width:100%!important;
     min-width:0!important;
     display:block!important;
     margin:9px 0 0!important;
     padding:6px 10px!important;
     border:1px solid rgba(139,183,213,.2)!important;
     border-radius:12px!important;
     background:rgba(188,209,237,.085)!important;
     box-shadow:none!important;
     line-height:1.23!important;
     transition:border-color .16s ease,background-color .16s ease;
   }
   #testNow .mur-now-v96-panel .now-intensity-top{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:0!important}
   #testNow .mur-now-v96-panel .now-intensity-top span:first-child{font-size:12.5px!important;font-weight:800!important;color:#f7fbff!important;line-height:1.2!important}
   #testNow .mur-now-v96-panel .now-intensity-top span:last-child{font-size:11px!important;color:#b9cbd8!important;line-height:1.2!important;opacity:1!important}
   #testNow .mur-now-v96-panel:focus-within{border-color:rgba(142,202,242,.6)!important}
   #testNow .mur-now-v96-panel .scale input[type=range]:focus-visible{outline:2px solid #e0f9ff}
   @media(min-width:680px){
     #testNow .mur-now-v96-panel{grid-template-columns:88px minmax(0,1fr)!important;padding:12px 18px!important;column-gap:14px!important}
     #testNow .mur-now-v96-panel .mur-now-v96-symbol,#testNow .mur-now-v96-panel .mur-now-v96-symbol img.mur-now-v102-emblem{width:78px!important;height:78px!important}
     #testNow .mur-now-v96-panel .scale label.mini-label{font-size:17px!important}
     #testNow .mur-now-v96-panel .now-intensity{padding:8px 12px!important}
   }
   @media(max-width:390px){
     #testNow .mur-now-v96-grid{gap:6px}
     #testNow .mur-now-v96-panel{grid-template-columns:54px minmax(0,1fr)!important;column-gap:7px!important;padding:8px 9px!important;min-height:95px!important;border-radius:16px!important}
     #testNow .mur-now-v96-panel .mur-now-v96-symbol,#testNow .mur-now-v96-panel .mur-now-v96-symbol img.mur-now-v102-emblem{width:49px!important;height:49px!important}
     #testNow .mur-now-v96-panel .scale label.mini-label{font-size:14px!important;margin-bottom:8px!important}
     #testNow .mur-now-v96-panel .now-intensity{margin-top:7px!important;padding:5px 8px!important}
     #testNow .mur-now-v96-thumb,#testNow .mur-now-v96-thumb canvas{width:35px;height:35px}
   }
   @media(prefers-reduced-motion:reduce){#testNow .mur-now-v96-thumb{transition:none}}
 `;
 document.head.appendChild(css);
 let drawings=[];
 const axes=[];
 function alignLogoAxes(){
   for(const entry of axes){
     const logo=entry.icon,bar=entry.wrap;
     if(!logo.isConnected||!bar.isConnected)continue;
     const a=logo.getBoundingClientRect(),b=bar.getBoundingClientRect();
     if(!a.width||!a.height||!b.width||!b.height)continue;
     // Undo the current transform before computing a new one, to prevent cumulative drift.
     const previous=Number(logo.dataset.murAxisShift||0);
     const unshiftedCenter=a.top+a.height/2-previous;
     const delta=Math.round((b.top+b.height/2-unshiftedCenter)*10)/10;
     if(Math.abs(delta-previous)>.3){
       logo.dataset.murAxisShift=String(delta);
       logo.style.setProperty('--mur-icon-axis-shift',delta+'px');
     }
   }
 }
 const sliderPalette=['#4a93f0','#2eb8b2','#6dc76a','#eeab3e','#eb5b5d'];
 function hexToRgb(hex){const m=String(hex).trim().match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:{r:123,g:197,b:244};}
 function rgba(hex,a){const c=hexToRgb(hex);return 'rgba('+c.r+','+c.g+','+c.b+','+a+')';}
 function sliderAccent(input){const v=Math.max(0,Math.min(4,Math.round(Number(input.value)||0)));return ['#368cf1','#21b7a9','#32c66a','#f19d36','#e9545c'][v];}
 function init(){
   const root=document.querySelector('#testNow .card');
   if(!root||root.querySelector('.mur-now-v96-grid'))return;
   const first=document.getElementById(specs[0].id)?.closest('.scale');
   if(!first)return;
   const grid=document.createElement('div');grid.className='mur-now-v96-grid';root.insertBefore(grid,first);
   for(const spec of specs){
     const input=document.getElementById(spec.id),scale=input?.closest('.scale'),info=document.getElementById(spec.box);
     if(!input||!scale||!info)continue;
     const panel=document.createElement('div');panel.className='mur-now-v96-panel mur-now-v96-'+spec.cls;
     panel.style.setProperty('--mur-panel-color',spec.color);
     const icon=document.createElement('div');icon.className='mur-now-v96-symbol';icon.setAttribute('aria-hidden','true');
     const emblem=document.createElement('img');
     emblem.className='mur-now-v102-emblem';
     emblem.src='images/ici-maintenant/'+spec.cls+'.png';
     emblem.alt='';emblem.decoding='async';emblem.loading='eager';
     icon.appendChild(emblem);
     const wrap=document.createElement('div');wrap.className='mur-now-v96-slider-wrap';
     input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
     const thumb=document.createElement('span');thumb.className='mur-now-v96-thumb';thumb.setAttribute('aria-hidden','true');
     const tc=document.createElement('canvas');tc.width=96;tc.height=96;thumb.appendChild(tc);wrap.appendChild(thumb);
     grid.appendChild(panel);panel.append(icon,scale,info);
     axes.push({icon,wrap});
     const label=scale.querySelector('label');if(label){label.setAttribute('for',spec.id);label.textContent=spec.name;}
     const thumbDraw={ctx:tc.getContext('2d'),canvas:tc,color:'#7bc5f4',seed:spec.cls+'thumb',thumb:true};
     drawings.push(thumbDraw);
     const applyAccent=(accent)=>{
       panel.style.setProperty('--mur-panel-color',accent);
       thumbDraw.color=accent;
       thumb.style.filter='drop-shadow(0 0 6px '+rgba(accent,.58)+')';
       input.style.boxShadow='inset 0 0 0 1px rgba(255,255,255,.08), 0 0 0 1px '+rgba(accent,.18)+', 0 0 10px '+rgba(accent,.12);
       info.style.borderColor=rgba(accent,.28);
       info.style.background=rgba(accent,.09);
       const spans=info.querySelectorAll('.now-intensity-top span');
       if(spans[0]){spans[0].style.color=accent;spans[0].style.textShadow='0 0 10px '+rgba(accent,.18);}
       if(spans[1]){spans[1].style.color=rgba(accent,.88);spans[1].style.textShadow='0 0 8px '+rgba(accent,.12);}
     };
     const update=()=>{
       const min=Number(input.min)||0,max=Number(input.max)||4,range=Math.max(.001,max-min);
       const pct=Math.max(0,Math.min(1,(Number(input.value)-min)/range));
       // The visual thumb centre travels from half of native thumb width to the other edge.
       thumb.style.left='calc('+ (pct*100).toFixed(2)+'% + '+ (15.5-31*pct).toFixed(2)+'px)';
       const currentAccent=sliderAccent(input);
       applyAccent(currentAccent);
       if(typeof window.MUR_V114_PAINT_LOGO==='function')window.MUR_V114_PAINT_LOGO(spec.cls,currentAccent);
     };
     input.addEventListener('input',update);input.addEventListener('change',update);
     update();
   }
   if(!drawings.length)return;
   // Recalculate when the test page appears and on resize / orientation changes.
   window.addEventListener('resize',alignLogoAxes,{passive:true});
   document.addEventListener('visibilitychange',alignLogoAxes,{passive:true});
   const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   let raf=0,last=0,lastAlign=-1000;
   function frame(t){
     const active=document.querySelector('#testNow')?.offsetParent!==null&&!document.hidden;
     if(active&&t-lastAlign>250){lastAlign=t;alignLogoAxes();}
     if(active&&(t-last>45||reduced)){
       last=t;
       for(const d of drawings)draw(d,reduced?0:t*.00020);
     }
     if(!reduced)raf=requestAnimationFrame(frame);
   }
   if(reduced){alignLogoAxes();for(const d of drawings)draw(d,0)}
   else raf=requestAnimationFrame(frame);
 }
 function draw(d,phase){
   const {ctx,canvas,color,thumb,seed}=d;if(!ctx)return;
   const s=canvas.width,cx=s/2,cy=s/2,R=s*(thumb?.39:.38);
   ctx.clearRect(0,0,s,s);
   const glow=ctx.createRadialGradient(cx,cy,3,cx,cy,R*1.23);
   glow.addColorStop(0,'rgba(15,54,83,.45)');glow.addColorStop(.65,'rgba(11,31,54,.27)');glow.addColorStop(1,'rgba(11,31,54,0)');
   ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,R*1.21,0,Math.PI*2);ctx.fill();
   const n=thumb?320:220;let lum=[];
   const rotate=phase+(seed.length*.49), cs=Math.cos(rotate),sn=Math.sin(rotate);
   for(let i=0;i<n;i++){
     const y=1-2*(i+.5)/n, rr=Math.sqrt(1-y*y),a=i*2.39996323;
     const x=rr*Math.cos(a),z=rr*Math.sin(a),xx=x*cs-z*sn,zz=x*sn+z*cs;
     lum.push({x:cx+R*xx,y:cy+R*y,z:zz});
   }
   lum.sort((a,b)=>a.z-b.z);
   for(const p of lum){
     const front=(p.z+1)/2;ctx.globalAlpha=.15+.78*front;ctx.fillStyle=color;
     ctx.beginPath();ctx.arc(p.x,p.y,(thumb?.78:1.3)+front*(thumb?.82:1.05),0,Math.PI*2);ctx.fill();
   }
   ctx.globalAlpha=1;
   ctx.strokeStyle=color;ctx.globalAlpha=thumb?.48:.22;ctx.lineWidth=thumb?1.8:1.2;
   ctx.beginPath();ctx.arc(cx,cy,R*1.045,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* ============================================================
   M.U.R. V98 — Texte de résultat Ici & Maintenant adaptatif
   à la zone colorée, sans changer le calcul ni les exercices.
   ============================================================ */
(function(){
  'use strict';
  if(window.MUR_NOW_RESULT_V98)return;
  window.MUR_NOW_RESULT_V98=true;

  const messages={
    bleu:{
      short:"Votre énergie semble basse aujourd’hui. Accordez-vous une relance progressive, sans vous brusquer.",
      long:"Vous êtes dans une phase de faible mobilisation. Votre priorité du moment : retrouver progressivement de l’élan et de la disponibilité, à votre rythme."
    },
    vert:{
      short:"Vous semblez disposer d’un bon équilibre aujourd’hui. Profitez de cette stabilité et entretenez-la.",
      long:"Votre état du moment paraît relativement stable et disponible. C’est une bonne occasion de préserver vos repères et votre régularité."
    },
    orange:{
      short:"La tension semble monter. Un moment pour ralentir peut vous aider à retrouver de la marge.",
      long:"Votre état suggère une activation plus importante. Votre priorité : réduire progressivement la pression et vous accorder une pause avant de poursuivre."
    },
    rouge:{
      short:"Votre niveau de tension semble élevé. Donnez-vous la priorité de ralentir et de souffler.",
      long:"Vous rapportez un état de forte activation. Privilégiez une pause et un rythme confortable, sans forcer. Si un exercice vous gêne, arrêtez-le."
    }
  };
  const style=document.createElement('style');
  style.id='mur-now-result-v98-style';
  style.textContent=`
    #resultNowBlock.mur-now-v98-ready #resultNowText{
      color:#ecf4fb!important;
      border-left:3px solid var(--result-color,#6aaec7);
      background:color-mix(in srgb,var(--result-color,#6aaec7) 10%,transparent);
      border-radius:0 10px 10px 0;
      padding:9px 11px!important;
      line-height:1.45!important;
      font-size:clamp(12px,2.6vw,14px)!important;
    }
    #resultNowBlock.mur-now-v98-ready #resultNowScore{
      color:var(--result-color,#eaf3f8)!important;
    }
    #resultNowBlock.mur-now-v98-ready .result-detail-grid .result-detail-chip:first-child{
      border-color:var(--result-color,#6aaec7);
    }
  `;
  document.head.appendChild(style);
  function refresh(){
    const block=document.getElementById('resultNowBlock');
    const target=document.getElementById('resultNowText');
    if(!block||!target)return;
    let stored=null;
    try{stored=JSON.parse(localStorage.getItem('murNow')||'null')}catch(e){}
    const zone=stored?.zone;
    const key=String(zone?.key||'').toLowerCase();
    const msg=messages[key];
    if(!msg){block.classList.remove('mur-now-v98-ready');return;}
    const color=(typeof zone.color==='string'&&/^#[0-9a-f]{3,8}$/i.test(zone.color))?zone.color:'#6aaec7';
    if(block.style.getPropertyValue('--result-color')!==color)block.style.setProperty('--result-color',color);
    if(!block.classList.contains('mur-now-v98-ready'))block.classList.add('mur-now-v98-ready');
    const open=block.classList.contains('open');
    const wanted=open?msg.long:msg.short;
    if(target.textContent!==wanted)target.textContent=wanted;
  }
  function start(){
    const block=document.getElementById('resultNowBlock');
    if(!block)return;
    let scheduled=false;
    const schedule=()=>{
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(()=>{scheduled=false;refresh()});
    };
    new MutationObserver(schedule).observe(block,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style']});
    document.addEventListener('click',schedule,true);
    document.addEventListener('change',schedule,true);
    window.addEventListener('storage',schedule);
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();


/* ============================================================
   M.U.R. V112 — Ici & Maintenant: colour specificity and FR/EN
   20 level labels and 20 hints; scores remain unchanged.
   ============================================================ */
(function(){
  'use strict';
  if(window.MUR_NOW_TEXT_V112)return;
  window.MUR_NOW_TEXT_V112=true;
  const css=document.createElement('style');
  css.id='mur-now-level-colours-v112';
  css.textContent=`
   #testNow .mur-now-v96-panel .now-intensity .now-intensity-top span:first-child {
     color: var(--mur-panel-color, #6dc76a) !important;
     text-shadow:0 0 8px color-mix(in srgb, var(--mur-panel-color, #6dc76a) 25%, transparent) !important;
   }
   #testNow .mur-now-v96-panel .now-intensity .now-intensity-top span:last-child {
     color: var(--mur-panel-color, #6dc76a) !important;
     opacity:.85 !important;
     text-shadow:none !important;
   }
  `;
  document.head.appendChild(css);
  const levels={
    nowEnergy:[
      ['Très bas','Besoin d’activation douce','Very low','Gentle activation needed'],
      ['Bas','Relance progressive','Low','Gradual activation'],
      ['Stable','Zone d’équilibre','Steady','Balanced zone'],
      ['Élevé','Activation présente','High','Feeling activated'],
      ['Très élevé','Trop d’activation possible','Very high','Possible overactivation']
    ],
    nowBreath:[
      ['Très lente','Ralentissement marqué','Very slow','Marked slowing'],
      ['Lente','Respiration basse','Slow','Slow breathing'],
      ['Stable','Rythme disponible','Steady','Comfortable rhythm'],
      ['Courte','Tension qui monte','Shallow','Rising tension'],
      ['Très courte','Alerte respiratoire','Very shallow','Breathing feels strained']
    ],
    nowMind:[
      ['Éteint','Peu d’élan mental','Drained','Low mental energy'],
      ['Ralenti','Attention basse','Slowed down','Low alertness'],
      ['Clair','Mental stable','Clear','Steady mind'],
      ['Chargé','Pensées rapides','Busy','Racing thoughts'],
      ['Saturé','Trop de bruit intérieur','Overloaded','Mental overload']
    ],
    nowBody:[
      ['Lourd','Tonus bas','Heavy','Low muscle tone'],
      ['Relâché','Corps calme','Relaxed','Body feels calm'],
      ['Disponible','Bon appui corporel','Ready','Feeling physically ready'],
      ['Tendu','Tension présente','Tense','Physical tension'],
      ['Crispé','Alerte corporelle','Tight','Body feels on alert']
    ]
  };
  const keys={nowEnergy:'nowIntensity_energy',nowBreath:'nowIntensity_breath',nowMind:'nowIntensity_mind',nowBody:'nowIntensity_body'};
  function isEnglish(){
    let stored='';
    try{stored=localStorage.getItem('mur-ui-language')||localStorage.getItem('murLanguage')||localStorage.getItem('murLang')||'';}catch(_e){}
    const choice=document.querySelector('[data-language="en"]');
    if(choice&&(choice.getAttribute('aria-pressed')==='true'||choice.classList.contains('active')||choice.classList.contains('selected')))return true;
    const lang=String(stored||document.documentElement.lang||'fr').toLowerCase();
    return lang.startsWith('en');
  }
  let scheduled=false;
  function refresh(){
    scheduled=false;
    const en=isEnglish();
    for(const [inputId,boxId] of Object.entries(keys)){
      const input=document.getElementById(inputId),box=document.getElementById(boxId);
      if(!input||!box)continue;
      const idx=Math.max(0,Math.min(4,Math.round(Number(input.value)||0)));
      const item=levels[inputId][idx];
      const spans=box.querySelectorAll('.now-intensity-top span');
      const title=en?item[2]:item[0],hint=en?item[3]:item[1];
      if(spans[0]&&spans[0].textContent!==title)spans[0].textContent=title;
      if(spans[1]&&spans[1].textContent!==hint)spans[1].textContent=hint;
      const label=document.querySelector('label[for="'+inputId+'"]');
      const names={nowEnergy:['Énergie','Energy'],nowBreath:['Respiration','Breathing'],nowMind:['Mental','Mind'],nowBody:['Corps','Body']};
      if(label){const name=names[inputId][en?1:0];if(label.textContent!==name)label.textContent=name;}
    }
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(refresh);}
  function init(){
    for(const [inputId,boxId] of Object.entries(keys)){
      const input=document.getElementById(inputId),box=document.getElementById(boxId);
      if(input){input.addEventListener('input',schedule);input.addEventListener('change',schedule);}
      if(box)new MutationObserver(schedule).observe(box,{childList:true,subtree:true,characterData:true});
    }
    new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    document.addEventListener('click',event=>{if(event.target.closest('[data-language], [data-lang], [onclick*="lang"], [onclick*="Lang"]'))setTimeout(schedule,0);},true);
    window.addEventListener('storage',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* ============================================================
   M.U.R. V113 — Réparation des liens vers les images ki.S.
   Accepte les cartes en PNG (V101) ou WebP (V89/V92), sans
   renommer ni modifier les images déjà installées.
   L'avatar reste au format WebP. Les chemins restent ancrés à
   l'emplacement de mur-custom.js pour GitHub Pages.
   ============================================================ */
(function(){
 'use strict';
 if(window.MUR_KIS_IMAGES_V113)return;
 window.MUR_KIS_IMAGES_V113=true;
 const scriptElement=[...document.querySelectorAll('script[src]')].reverse().find(s=>/mur-custom(?:\.min)?\.js(?:\?|$)/i.test(s.getAttribute('src')||''));
 const root=new URL('./',scriptElement?.src||document.baseURI);
 const keys=new Set(['pose','funambule','fonceur','pose_funambule','pose_fonceur','funambule_fonceur','equilibre']);
 function normalizedPath(url){try{return new URL(url,document.baseURI).pathname;}catch(_){return '';}}
 const pathPrefix='/images/kis/';
 const tried=new WeakMap();
 document.addEventListener('error',function(event){
   const img=event.target;
   if(!(img instanceof HTMLImageElement))return;
   const pathname=normalizedPath(img.src);
   const pos=pathname.lastIndexOf(pathPrefix);
   if(pos<0)return;
   const basename=pathname.substring(pos+pathPrefix.length);
   const match=/^(?:avatars\/)?([a-z_]+?)(?:-(recto|verso))?\.(png|webp)$/i.exec(basename);
   if(!match||!keys.has(match[1]))return;
   const name=match[1],side=match[2],ext=match[3].toLowerCase();
   const candidates=side
     ? [`images/kis/${name}-${side}.png`,`images/kis/${name}-${side}.webp`]
     : [`images/kis/avatars/${name}.webp`,`images/kis/avatars/${name}.png`];
   const attempted=tried.get(img)||new Set();
   attempted.add(new URL(img.src,document.baseURI).href);
   for(const relative of candidates){
     const absolute=new URL(relative,root).href;
     if(!attempted.has(absolute)){
       tried.set(img,attempted);
       img.src=absolute;
       return;
     }
   }
   // No matching file was located. Leave a visible clue for troubleshooting.
   console.warn('[M.U.R. ki.S V113] Image non trouvée :',basename,'— vérifier images/kis/ et les extensions .png/.webp sur GitHub.');
 },true);
})();


/* ================================================================
   M.U.R. V114 — Logos des 4 curseurs = couleurs exactes de la barre.
   Dessins PNG inchangés ; teinte générée localement à l'écran.
   Les 4 choix sont sauvegardés uniquement lors de Valider
   Ici & Maintenant ; mini-logos retrouvés dans la synthèse.
   ================================================================ */
(function(){
 'use strict';
 if(window.MUR_NOW_LOGOS_V114)return;
 window.MUR_NOW_LOGOS_V114=true;
 const COLORS=['#368cf1','#21b7a9','#32c66a','#f19d36','#e9545c'];
 const ITEMS=[
   {id:'nowEnergy',key:'energy',fr:'Énergie',en:'Energy'},
   {id:'nowBreath',key:'breath',fr:'Respiration',en:'Breathing'},
   {id:'nowMind',key:'mind',fr:'Mental',en:'Mind'},
   {id:'nowBody',key:'body',fr:'Corps',en:'Body'}
 ];
 // Always relative to the JS asset location, for GitHub Pages sub-paths.
 const activeScript=[...document.querySelectorAll('script[src]')].reverse().find(x=>/mur-custom(?:\.min)?\.js(?:\?|$)/i.test(x.getAttribute('src')||''));
 const rootUrl=new URL('./',activeScript?.src||document.baseURI);
 const sources=new Map(), processed=new Map();
 function source(key){
   if(!sources.has(key)){
     sources.set(key,new Promise(resolve=>{
       const image=new Image();
       image.onload=()=>{
         try{
           const c=document.createElement('canvas');c.width=c.height=192;
           const context=c.getContext('2d',{willReadFrequently:true});
           if(!context){resolve(null);return;}
           context.drawImage(image,0,0,c.width,c.height);
           resolve(context.getImageData(0,0,c.width,c.height));
         }catch(e){console.warn('[M.U.R. V114] PNG non recolorable',key,e);resolve(null);}
       };
       image.onerror=()=>{console.warn('[M.U.R. V114] Logo manquant',key);resolve(null);};
       image.src=new URL('images/ici-maintenant/'+key+'.png',rootUrl).href;
     }));
   }
   return sources.get(key);
 }
 function hexRGB(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
 function imageFor(key,color){
   const cacheKey=key+'-'+color;
   if(!processed.has(cacheKey))processed.set(cacheKey,source(key).then(data=>{
     if(!data)return null;
     const c=document.createElement('canvas');c.width=c.height=192;
     const context=c.getContext('2d');if(!context)return null;
     const out=context.createImageData(192,192),rgba=out.data,raw=data.data;
     const [r,g,b]=hexRGB(color);
     for(let i=0;i<raw.length;i+=4){
       const brightness=Math.max(raw[i],raw[i+1],raw[i+2]);
       // Remove dark source pixels while preserving the original bright
       // particle silhouette and their individual luminosity.
       const intensity=Math.max(0,Math.min(1,(brightness-14)/205));
       const light=.45+.55*intensity;
       rgba[i]=Math.round(r*light);rgba[i+1]=Math.round(g*light);rgba[i+2]=Math.round(b*light);
       rgba[i+3]=Math.round(raw[i+3]*Math.pow(intensity,.88));
     }
     context.putImageData(out,0,0);
     return c.toDataURL('image/png');
   }));
   return processed.get(cacheKey);
 }
 function paintElement(img,key,color){
   if(!img||!COLORS.includes(color))return;
   const token=key+'/'+color;
   if(img.dataset.murV114Token===token)return;
   img.dataset.murV114Token=token;
   imageFor(key,color).then(uri=>{
     if(uri&&img.isConnected&&img.dataset.murV114Token===token){
       if(img.src!==uri)img.src=uri;
       img.style.filter='drop-shadow(0 0 5px '+color+'77)';
     }
   }).catch(e=>console.warn('[M.U.R. V114] Logo',key,e));
 }
 window.MUR_V114_PAINT_LOGO=function(key,color){
   const icon=document.querySelector('#testNow .mur-now-v96-'+key+' img.mur-now-v102-emblem');
   paintElement(icon,key,color);
 };
 function values(){
   const result={};
   for(const x of ITEMS){const input=document.getElementById(x.id);if(!input)return null;
     result[x.key]=Math.max(0,Math.min(4,Math.round(Number(input.value)||0)));
   }
   return result;
 }
 function validLevels(v){return !!v&&ITEMS.every(x=>Number.isInteger(v[x.key])&&v[x.key]>=0&&v[x.key]<=4);}
 function readNow(){try{return JSON.parse(localStorage.getItem('murNow')||'null');}catch(_){return null;}}
 function readNeuro(){try{return JSON.parse(localStorage.getItem('murLastNeuro')||'null');}catch(_){return null;}}
 function currentLevels(){
   const saved=readNow();return saved&&validLevels(saved.levels)?saved.levels:null;
 }
 function english(){
   let stored='';try{stored=localStorage.getItem('mur-ui-language')||localStorage.getItem('murLanguage')||localStorage.getItem('murLang')||'';}catch(_){}
   const sel=document.querySelector('[data-language="en"]');
   if(sel&&(sel.getAttribute('aria-pressed')==='true'||sel.classList.contains('active')||sel.classList.contains('selected')))return true;
   return String(stored||document.documentElement.lang||'fr').toLowerCase().startsWith('en');
 }
 function renderStrip(blockId,anchor,kind){
   const block=document.getElementById(blockId);if(!block)return;
   const old=block.querySelector(':scope .mur-now-v114-strip');
   const levels=currentLevels(),neuro=readNeuro();
   // Never infer 4 individual answers from the old single aggregate score.
   const savedNow=readNow();
   const allowed=!!levels&&(kind!=='synth'||(neuro&&neuro.zone&&Number(neuro.nowScore)===Number(savedNow?.score)));
   if(!allowed){if(old)old.remove();return;}
   const placement=block.querySelector(anchor);if(!placement)return;
   const lang=english()?'en':'fr';
   const signature=ITEMS.map(x=>x.key+':'+levels[x.key]).join('|')+'|'+lang;
   let strip=old;
   if(!strip){strip=document.createElement('div');strip.className='mur-now-v114-strip';strip.setAttribute('aria-label',lang==='en'?'Your current state':'Votre état du moment');
     placement.insertAdjacentElement('afterend',strip);
   }
   if(strip.dataset.signature===signature)return;
   strip.dataset.signature=signature;
   strip.replaceChildren();
   for(const item of ITEMS){
     const level=levels[item.key],color=COLORS[level];
     const cell=document.createElement('div');cell.className='mur-now-v114-mini';
     const img=document.createElement('img');img.alt='';img.decoding='async';img.width=42;img.height=42;
     img.dataset.murV114Token='';
     const label=document.createElement('span');label.textContent=item[lang];
     cell.append(img,label);strip.appendChild(cell);
     paintElement(img,item.key,color);
   }
 }
 let framePending=false;
 function schedule(){
   if(framePending)return;framePending=true;
   requestAnimationFrame(()=>{
     framePending=false;
     renderStrip('resultNowBlock','.result-step-top','now');
     renderStrip('resultSynthesisBlock','.result-score-row','synth');
   });
 }
 const css=document.createElement('style');css.id='mur-now-v114-style';
 css.textContent=`
  #testNow .mur-now-v96-panel .mur-now-v96-symbol img.mur-now-v102-emblem{transition:filter .15s ease;object-fit:contain!important}
  #testResultView .mur-now-v114-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:8px 2px 6px;margin:7px 0 2px;border-radius:12px;background:rgba(14,36,57,.35);max-width:100%}
  #testResultView .mur-now-v114-mini{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-align:center}
  #testResultView .mur-now-v114-mini img{display:block;width:clamp(33px,9vw,50px);height:clamp(33px,9vw,50px);object-fit:contain;flex:none}
  #testResultView .mur-now-v114-mini span{font-size:clamp(9px,2.4vw,11px);line-height:1.15;color:#c9d9e6;white-space:normal;overflow-wrap:anywhere}
 `;
 document.head.appendChild(css);
 function init(){
   for(const x of ITEMS){
     const input=document.getElementById(x.id);if(!input)continue;
     const update=()=>window.MUR_V114_PAINT_LOGO(x.key,COLORS[Math.max(0,Math.min(4,Math.round(Number(input.value)||0)))]);
     input.addEventListener('input',update);input.addEventListener('change',update);
     update();
   }
   // Wrap the existing save action rather than changing the test calculations.
   if(typeof window.finishNow==='function'){
     const original=window.finishNow;
     window.finishNow=function(){
       const chosen=values();
       const ret=original.apply(this,arguments);
       if(validLevels(chosen)){
         const saved=readNow();
         if(saved&&typeof saved.score==='number'){
           saved.levels=chosen;
           localStorage.setItem('murNow',JSON.stringify(saved));
         }
       }
       schedule();
       return ret;
     };
   }
   const result=document.getElementById('testResultView');
   if(result){
     const obs=new MutationObserver(schedule);
     // Result logic rewrites the detailed chips; rebuild the strips only
     // when their content actually changes.
     obs.observe(result,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
   }
   document.addEventListener('click',event=>{
     if(event.target.closest('#resultNowBlock,#resultSynthesisBlock,[data-language],[data-lang]'))schedule();
   },true);
   document.addEventListener('visibilitychange',schedule);
   window.addEventListener('storage',schedule);
   schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

/* M.U.R. V116 — Carte ki.S uniquement : affichage compact dans Résultat et Profil.
   Les illustrations, la navigation et la carte Tendance de l'accueil restent inchangées. */
(function(){
  'use strict';
  if(document.getElementById('mur-kis-compact-v116'))return;
  const style=document.createElement('style');
  style.id='mur-kis-compact-v116';
  style.textContent=`
    /* Fiche ki.S après le questionnaire : garder l'image entière sans scrolling. */
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-card{
      width:100%!important;max-width:350px!important;
      gap:5px!important;margin:0 auto!important;padding:0!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip{
      width:auto!important;max-width:min(100%,290px)!important;
      height:auto!important;max-height:min(47dvh,calc(100dvh - 225px))!important;
      flex:0 1 auto!important;box-shadow:0 5px 13px rgba(0,0,0,.25)!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip img{
      display:block!important;width:auto!important;height:auto!important;
      max-width:min(100%,290px)!important;
      max-height:min(47dvh,calc(100dvh - 225px))!important;
      object-fit:contain!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-hint{
      font-size:10px!important;line-height:1.1!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-actions{
      gap:6px!important;margin:0!important;
    }
    /* Même principe quand la carte ki.S est ouverte depuis Mon profil. */
    #mur-v97-profile-modal .mur-v97-inner{max-width:390px!important;gap:7px!important;}
    #mur-v97-profile-modal .mur-v97-image-button{min-height:0!important;flex:1 1 auto!important;}
    #mur-v97-profile-modal .mur-v97-image{
      max-width:min(72vw,310px)!important;
      max-height:min(66dvh,calc(100dvh - 155px))!important;
      width:auto!important;height:auto!important;object-fit:contain!important;
    }
    @media(max-width:520px){
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip,
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip img{
        max-width:min(64vw,245px)!important;
        max-height:min(42dvh,calc(100dvh - 205px))!important;
      }
      #mur-v97-profile-modal .mur-v97-image{
        max-width:min(72vw,290px)!important;
        max-height:min(62dvh,calc(100dvh - 150px))!important;
      }
    }
    @media(max-height:650px){
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip,
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip img{
        max-height:39dvh!important;
      }
      #mur-v97-profile-modal .mur-v97-image{max-height:56dvh!important;}
    }
  `;
  document.head.appendChild(style);
})();


/* ===============================================================
   M.U.R. V117 — Etapes 1/2/3 du menu Mesurer : orbes multipoints.
   Une seule tendance NeuroFlex pour les trois pastilles ;
   sans resultat NeuroFlex enregistre : couleur verte.
   Ne modifie pas la navigation ni le calcul des tests.
   =============================================================== */
(function(){
  'use strict';
  if(window.MUR_TEST_STEP_ORBS_V117)return;
  window.MUR_TEST_STEP_ORBS_V117=true;
  const style=document.createElement('style');
  style.id='mur-test-step-orbs-v117';
  style.textContent=`
    #tests #testMenuKis .test-menu-num.mur-step-orb-v117,
    #tests #testMenuNow .test-menu-num.mur-step-orb-v117,
    #tests #testMenuResult .test-menu-num.mur-step-orb-v117{
      width:44px!important;height:44px!important;min-width:44px!important;
      border-radius:50%!important;display:grid!important;place-items:center!important;
      position:relative!important;overflow:visible!important;
      border:1px solid color-mix(in srgb,var(--mur-orb-color,#55b994) 45%,transparent)!important;
      background:radial-gradient(circle,rgba(8,28,44,.9),rgba(5,20,34,.74))!important;
      box-shadow:0 0 16px color-mix(in srgb,var(--mur-orb-color,#55b994) 27%,transparent)!important;
      color:transparent!important;font-size:0!important;line-height:0!important;
      padding:0!important;margin:0!important;
    }
    #tests #testMenuKis .test-menu-num.mur-step-orb-v117::before,
    #tests #testMenuNow .test-menu-num.mur-step-orb-v117::before,
    #tests #testMenuResult .test-menu-num.mur-step-orb-v117::before,
    #tests #testMenuKis .test-menu-num.mur-step-orb-v117::after,
    #tests #testMenuNow .test-menu-num.mur-step-orb-v117::after,
    #tests #testMenuResult .test-menu-num.mur-step-orb-v117::after{
      content:none!important;display:none!important;
    }
    #tests .test-menu-num.mur-step-orb-v117 > svg{display:none!important}
    #tests .test-menu-num.mur-step-orb-v117 > canvas{
      display:block!important;width:42px!important;height:42px!important;
      position:relative!important;inset:auto!important;margin:0!important;
      pointer-events:none!important;opacity:1!important;
    }
    #tests .test-menu-card:has(.mur-step-orb-v117){
      grid-template-columns:48px minmax(0,1fr) 22px!important;
    }
    @media(max-width:400px){
      #tests .test-menu-card:has(.mur-step-orb-v117){
        grid-template-columns:46px minmax(0,1fr) 22px!important;
      }
    }
  `;
  document.head.appendChild(style);
  const targets=['testMenuKis','testMenuNow','testMenuResult'];
  const palette={
    bleu:'#538fc6',blue:'#538fc6',
    vert:'#5baf96',verte:'#5baf96',green:'#5baf96',
    orange:'#d0a067',
    rouge:'#c96e72',red:'#c96e72'
  };
  function currentColor(){
    let saved=null;
    try{saved=JSON.parse(localStorage.getItem('murLastNeuro')||'null');}catch(_){return palette.vert;}
    if(!saved||!saved.zone)return palette.vert;
    const zone=saved.zone;
    const key=String(zone.key||zone.name||zone||'').trim().toLowerCase();
    // Le résultat est déterminé par sa zone, pas par la position du curseur.
    for(const k of Object.keys(palette))if(key===k||key.includes(k))return palette[k];
    const color=String(zone.color||'');
    if(/^#[0-9a-f]{6}$/i.test(color))return color;
    return palette.vert;
  }
  const dots=[];
  for(let i=0;i<280;i++){
    const y=1-2*(i+.5)/280;
    const a=i*2.399963229728653;
    const r=Math.sqrt(Math.max(0,1-y*y));
    dots.push([r*Math.cos(a),y,r*Math.sin(a)]);
  }
  const views=[];
  function mount(){
    for(const id of targets){
      const marker=document.querySelector('#'+id+' .test-menu-num');
      if(!marker||marker.querySelector('canvas.mur-step-orb-canvas-v117'))continue;
      marker.classList.add('mur-step-orb-v117');
      const canvas=document.createElement('canvas');
      canvas.className='mur-step-orb-canvas-v117';
      canvas.width=112;canvas.height=112;
      canvas.setAttribute('aria-hidden','true');
      marker.appendChild(canvas);
      views.push({marker,ctx:canvas.getContext('2d'),id});
    }
  }
  function paint(ctx,color,time,offset){
    if(!ctx)return;
    const w=112, cx=56,cy=56,R=46;
    ctx.clearRect(0,0,w,w);
    let rgb=[91,175,150];
    const match=color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if(match)rgb=[1,2,3].map(i=>parseInt(match[i],16));
    const glow=ctx.createRadialGradient(cx,cy,3,cx,cy,53);
    glow.addColorStop(0,'rgba('+rgb.join(',')+',.15)');
    glow.addColorStop(1,'rgba('+rgb.join(',')+',0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,w);
    const angle=time*.00012+offset;
    const cos=Math.cos(angle),sin=Math.sin(angle);
    const pts=dots.map(([x,y,z])=>({x:cx+R*(x*cos-z*sin),y:cy+R*y,z:x*sin+z*cos}));
    pts.sort((a,b)=>a.z-b.z);
    ctx.fillStyle=color;
    for(const p of pts){
      const front=(p.z+1)/2;
      ctx.globalAlpha=.22+.74*front;
      ctx.beginPath();ctx.arc(p.x,p.y,.8+front*.55,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  let color='';
  function sync(){
    mount();
    const next=currentColor();
    if(next===color)return;
    color=next;
    for(const view of views)view.marker.style.setProperty('--mur-orb-color',color);
  }
  function start(){
    sync();
    let last=0;
    function animate(t){
      if(t-last>55){
        last=t;
        if(document.getElementById('tests')?.classList.contains('active')&&!document.hidden){
          sync();
          views.forEach((view,i)=>paint(view.ctx,color,t,i*.5));
        }
      }
      window.requestAnimationFrame(animate);
    }
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
      views.forEach((view,i)=>paint(view.ctx,color,0,i*.5));
    }else window.requestAnimationFrame(animate);
    window.addEventListener('storage',sync);
    window.addEventListener('focus',sync);
    document.addEventListener('click',sync,true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();


/* ============================================================
   M.U.R. V118 — Fiches de détail NeuroFlex compactes sur mobile.
   Corrige les hauteurs forcées de index.html (notamment Synthèse)
   sans modifier l'état des étapes, les scores, ni les cartes ki.S.
   ============================================================ */
(function(){
  'use strict';
  if(document.getElementById('mur-result-details-mobile-v118'))return;
  const style=document.createElement('style');
  style.id='mur-result-details-mobile-v118';
  style.textContent=`
    @media (max-width: 600px){
      /* Même fenêtre compacte pour le détail des 3 étapes. */
      #testResultView #resultKisBlock.result-step.open,
      #testResultView #resultNowBlock.result-step.open,
      #testResultView #resultSynthesisBlock.result-step.open{
        position:fixed!important;
        box-sizing:border-box!important;
        left:50%!important;
        right:auto!important;
        top:calc(env(safe-area-inset-top, 0px) + 7dvh)!important;
        bottom:auto!important;
        transform:translateX(-50%)!important;
        width:min(90vw,370px)!important;
        max-width:min(90vw,370px)!important;
        height:auto!important;
        min-height:0!important;
        max-height:min(78dvh,660px)!important;
        padding:12px 12px 15px!important;
        margin:0!important;
        border-radius:21px!important;
        display:block!important;
        overflow-x:hidden!important;
        overflow-y:auto!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior:contain!important;
      }
      #testResultView .result-step.open .result-step-body,
      #testResultView #resultSynthesisBlock.result-step.open .result-step-body{
        min-height:0!important;height:auto!important;
        width:100%!important;max-width:100%!important;
        padding-bottom:4px!important;
        display:block!important;
      }
      #testResultView .result-step.open .result-step-top{
        margin:0 0 7px!important;
        padding:0 0 7px!important;
      }
      #testResultView .result-step.open .result-step-top h3{
        font-size:clamp(17px,4.8vw,21px)!important;
        line-height:1.14!important;
      }
      #testResultView .result-step.open .result-step-top::before{
        margin-bottom:3px!important;font-size:9px!important;
      }
      #testResultView .result-step.open .result-step-top::after{
        margin-top:4px!important;
      }
      #testResultView .result-step.open .result-badge{
        padding:3px 7px!important;margin-top:3px!important;font-size:9px!important;
      }
      #testResultView .result-step.open .result-main{
        font-size:clamp(17px,5vw,23px)!important;
        line-height:1.15!important;
        margin-top:3px!important;
      }
      #testResultView .result-step.open .result-text{
        font-size:11px!important;line-height:1.28!important;
        margin:5px 0!important;
      }
      #testResultView .result-step.open .result-step-detail{
        margin-top:6px!important;padding-top:6px!important;
        min-height:0!important;flex:none!important;
      }
      #testResultView .result-step.open .result-detail-grid{
        gap:6px!important;margin-top:6px!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
      }
      #testResultView .result-step.open .result-detail-chip{
        min-width:0!important;padding:7px!important;border-radius:11px!important;
      }
      #testResultView .result-step.open .result-detail-chip b{
        font-size:11px!important;line-height:1.23!important;
      }
      #testResultView .result-step.open .result-detail-chip small{
        font-size:9px!important;line-height:1.2!important;
      }
      #testResultView #resultSynthesisBlock.result-step.open .result-gauge{
        margin-top:4px!important;padding-top:0!important;
      }
      #testResultView #resultSynthesisBlock.result-step.open .result-score-row{
        margin-top:5px!important;padding:7px!important;
      }
      #testResultView #resultSynthesisBlock.result-step.open .result-final-actions.ready{
        margin-top:8px!important;padding-top:6px!important;
      }
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip,
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip img{
        max-height:min(38dvh,300px)!important;
        max-width:min(62vw,240px)!important;
      }
      #testResultView .result-step.open .result-close-btn{
        position:sticky!important;float:right!important;
        top:0!important;right:0!important;z-index:10!important;
      }
    }
    @media(max-width:600px) and (max-height:700px){
      #testResultView #resultKisBlock.result-step.open,
      #testResultView #resultNowBlock.result-step.open,
      #testResultView #resultSynthesisBlock.result-step.open{
        top:calc(env(safe-area-inset-top,0px) + 4dvh)!important;
        max-height:77dvh!important;
      }
      #testResultView .result-step.open .result-detail-grid{
        gap:5px!important;
      }
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip,
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip img{
        max-height:34dvh!important;
      }
    }
  `;
  document.head.appendChild(style);
})();


/* ============================================================
   M.U.R. V119 — Parcours Mesurer : étapes numérotées et flèches.
   1 / 2 / 3 au centre des sphères multipoints existantes.
   Suppression des traits verticaux (y compris progression) ;
   deux flèches descendantes entre les étapes.
   ============================================================ */
(function(){
  'use strict';
  if(window.MUR_TEST_STEPS_V119)return;
  window.MUR_TEST_STEPS_V119=true;
  const style=document.createElement('style');
  style.id='mur-test-steps-arrows-v119';
  style.textContent=`
    /* Neutraliser tous les traits de la frise, même ceux de progression. */
    #tests .test-menu-grid::before,
    #tests .test-menu-grid::after,
    #tests.tests-screen-menu .test-menu-grid::before,
    #tests.tests-screen-menu .test-menu-grid::after,
    #tests #testsMenu .test-menu-grid::before,
    #tests #testsMenu .test-menu-grid::after,
    #tests #testsMenu.progress-0 .test-menu-grid::after,
    #tests #testsMenu.progress-1 .test-menu-grid::after,
    #tests #testsMenu.progress-2 .test-menu-grid::after,
    #tests #testsMenu.progress-3 .test-menu-grid::after{
      content:none!important;display:none!important;width:0!important;
      height:0!important;background:none!important;box-shadow:none!important;
    }
    /* Faire de la place entre les 3 étapes pour les flèches. */
    #tests.tests-screen-menu #testsMenu .test-menu-grid,
    #tests #testsMenu .test-menu-grid{
      row-gap:27px!important;
      overflow:visible!important;
    }
    /* Flèches entre étapes : le lien est un sens de progression, pas un trait. */
    #tests.tests-screen-menu #testMenuKis::after,
    #tests.tests-screen-menu #testMenuNow::after,
    #tests #testMenuKis::after,
    #tests #testMenuNow::after{
      content:'↓'!important;
      position:absolute!important;
      display:flex!important;align-items:center!important;justify-content:center!important;
      left:25px!important;bottom:-27px!important;
      width:24px!important;height:25px!important;
      color:#71c4bd!important;font-family:Arial,sans-serif!important;
      font-size:25px!important;font-weight:500!important;line-height:1!important;
      text-shadow:0 0 9px rgba(93,184,176,.35)!important;
      background:none!important;border:0!important;box-shadow:none!important;
      opacity:1!important;pointer-events:none!important;
      transform:none!important;z-index:10!important;
    }
    /* Numéro centré par-dessus le canvas animé : couleur de l'orb conservée. */
    #tests .test-menu-num.mur-step-orb-v117{
      isolation:isolate!important;position:relative!important;
      overflow:hidden!important;
    }
    #tests .test-menu-num.mur-step-orb-v117 > canvas{
      position:absolute!important;inset:0!important;z-index:1!important;
      width:100%!important;height:100%!important;
    }
    #tests .test-menu-num .mur-v119-step-number{
      position:absolute!important;inset:0!important;z-index:3!important;
      display:flex!important;justify-content:center!important;align-items:center!important;
      margin:0!important;padding:0!important;
      font-size:17px!important;font-weight:800!important;line-height:1!important;
      font-family:inherit!important;letter-spacing:0!important;
      color:#f9fdff!important;
      text-shadow:0 1px 5px #061b2f,0 0 9px #061b2f!important;
      pointer-events:none!important;
    }
    @media(max-width:390px){
      #tests.tests-screen-menu #testMenuKis::after,
      #tests.tests-screen-menu #testMenuNow::after{
        left:23px!important;
      }
      #tests .test-menu-num .mur-v119-step-number{font-size:16px!important;}
    }
  `;
  document.head.appendChild(style);
  function mount(){
    const ids=['testMenuKis','testMenuNow','testMenuResult'];
    ids.forEach((id,i)=>{
      const marker=document.querySelector('#'+id+' .test-menu-num');
      if(!marker||marker.querySelector('.mur-v119-step-number'))return;
      const label=document.createElement('span');
      label.className='mur-v119-step-number';
      label.textContent=String(i+1);
      label.setAttribute('aria-hidden','true');
      marker.appendChild(label);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();


/* =============================================================
   M.U.R. V120 — Résultat NeuroFlex : trois sphères numérotées
   et deux flèches de progression. Même logique que le menu V119.
   Présentation uniquement : ne touche ni aux scores ni aux clics.
   ============================================================= */
(function(){
  'use strict';
  if(window.MUR_RESULT_STEPS_V120)return;
  window.MUR_RESULT_STEPS_V120=true;
  const css=document.createElement('style');
  css.id='mur-result-steps-v120';
  css.textContent=`
    #testResultView .result-progress-list.mur-v120-steps{gap:0!important;}
    #testResultView .result-progress-list.mur-v120-steps > .mur-v120-arrow{
      height:28px!important;min-height:28px!important;
      display:flex!important;align-items:center!important;justify-content:flex-start!important;
      padding-left:25px!important;box-sizing:border-box!important;
      color:#71c4bd!important;font-size:24px!important;line-height:1!important;
      text-shadow:0 0 8px rgba(113,196,189,.28);
      pointer-events:none!important;user-select:none!important;
    }
    #testResultView .result-progress-list.mur-v120-steps > .mur-v120-arrow > span{
      width:29px!important;height:27px!important;display:grid!important;place-items:center!important;
    }
    #testResultView .result-step:not(.open) .result-step-side{gap:0!important;padding-top:0!important;}
    #testResultView .result-step:not(.open) .result-step-number.mur-v120-number{
      position:relative!important;display:grid!important;place-items:center!important;
      width:44px!important;height:44px!important;min-width:44px!important;
      overflow:hidden!important;border-radius:50%!important;padding:0!important;
      background:radial-gradient(circle,#0b2b37 0%,#061723 78%)!important;
      border:1px solid color-mix(in srgb,var(--mur-v120-orb-color,#5baf96) 48%,transparent)!important;
      box-shadow:0 0 13px color-mix(in srgb,var(--mur-v120-orb-color,#5baf96) 22%,transparent)!important;
      font-size:0!important;line-height:0!important;color:transparent!important;
      filter:none!important;
    }
    #testResultView .result-step:not(.open) .result-step-number.mur-v120-number::before,
    #testResultView .result-step:not(.open) .result-step-number.mur-v120-number::after{
      display:none!important;content:none!important;
    }
    #testResultView .result-step-number.mur-v120-number > canvas{
      display:block!important;position:absolute!important;inset:0!important;
      width:100%!important;height:100%!important;pointer-events:none!important;
    }
    #testResultView .result-step-number.mur-v120-number > .mur-v120-digit{
      position:absolute!important;inset:0!important;display:flex!important;
      align-items:center!important;justify-content:center!important;
      color:#f7fcff!important;font-size:17px!important;font-weight:800!important;
      line-height:1!important;text-shadow:0 1px 5px #071d2b,0 0 7px #071d2b!important;
      pointer-events:none!important;
    }
    #testResultView .result-step:not(.open) .result-step-state{display:none!important;}
    #testResultView .result-progress-list.mur-v120-steps:has(.result-step.open) > .mur-v120-arrow{
      display:none!important;height:0!important;min-height:0!important;
    }
    @media(max-width:390px){
      #testResultView .result-progress-list.mur-v120-steps > .mur-v120-arrow{padding-left:23px!important;}
      #testResultView .result-step-number.mur-v120-number > .mur-v120-digit{font-size:16px!important;}
    }
  `;
  document.head.appendChild(css);
  const ids=['resultKisBlock','resultNowBlock','resultSynthesisBlock'];
  const palette={bleu:'#538fc6',blue:'#538fc6',vert:'#5baf96',verte:'#5baf96',green:'#5baf96',orange:'#d0a067',rouge:'#c96e72',red:'#c96e72'};
  const views=[];
  const dots=Array.from({length:280},(_,i)=>{
    const y=1-2*(i+.5)/280,a=i*2.399963229728653,r=Math.sqrt(Math.max(0,1-y*y));
    return [r*Math.cos(a),y,r*Math.sin(a)];
  });
  function color(){
    try{
      const saved=JSON.parse(localStorage.getItem('murLastNeuro')||'null');
      if(!saved||!saved.zone)return palette.vert;
      const z=saved.zone,key=String(z.key||z.name||z||'').toLowerCase();
      for(const name of Object.keys(palette))if(key===name||key.includes(name))return palette[name];
      if(/^#[\da-f]{6}$/i.test(z.color||''))return z.color;
    }catch(_){}
    return palette.vert;
  }
  function mount(){
    const list=document.querySelector('#testResultView .result-progress-list');
    if(!list)return;
    list.classList.add('mur-v120-steps');
    ids.forEach((id,i)=>{
      const card=document.getElementById(id),badge=card?.querySelector('.result-step-number');
      if(!card||!badge||badge.classList.contains('mur-v120-number'))return;
      badge.classList.add('mur-v120-number');
      badge.textContent='';
      const canvas=document.createElement('canvas');canvas.width=112;canvas.height=112;
      canvas.setAttribute('aria-hidden','true');
      const digit=document.createElement('span');digit.className='mur-v120-digit';
      digit.textContent=String(i+1);digit.setAttribute('aria-hidden','true');
      badge.append(canvas,digit);
      views.push({badge,ctx:canvas.getContext('2d'),offset:i*.5});
    });
    ['resultKisBlock','resultNowBlock'].forEach(id=>{
      const card=document.getElementById(id);
      if(!card||card.nextElementSibling?.classList.contains('mur-v120-arrow'))return;
      const arrow=document.createElement('div');arrow.className='mur-v120-arrow';
      arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<span>↓</span>';
      card.insertAdjacentElement('afterend',arrow);
    });
  }
  function draw(ctx,hex,t,offset){
    if(!ctx)return;
    const W=112,C=56,R=46;ctx.clearRect(0,0,W,W);
    const m=hex.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    const rgb=m?[1,2,3].map(i=>parseInt(m[i],16)):[91,175,150];
    const glow=ctx.createRadialGradient(C,C,2,C,C,53);
    glow.addColorStop(0,'rgba('+rgb.join(',')+',.13)');
    glow.addColorStop(1,'rgba('+rgb.join(',')+',0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,W);
    const a=t*.00012+offset,cs=Math.cos(a),sn=Math.sin(a);
    const pts=dots.map(([x,y,z])=>({x:C+R*(x*cs-z*sn),y:C+R*y,z:x*sn+z*cs}));
    pts.sort((p,q)=>p.z-q.z);ctx.fillStyle=hex;
    for(const p of pts){const v=(p.z+1)/2;ctx.globalAlpha=.2+.76*v;
      ctx.beginPath();ctx.arc(p.x,p.y,.8+v*.58,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
  }
  let previous='';
  function sync(){
    mount();const c=color();if(c===previous)return;previous=c;
    views.forEach(v=>v.badge.style.setProperty('--mur-v120-orb-color',c));
  }
  function init(){
    sync();
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if(reduced){views.forEach(v=>draw(v.ctx,previous,0,v.offset));}
    else{
      let last=0;
      function frame(t){
        if(t-last>55){last=t;
          if(!document.hidden && document.querySelector('#testResultView')?.offsetParent!==null){
            sync();views.forEach(v=>draw(v.ctx,previous,t,v.offset));
          }
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    window.addEventListener('focus',sync);
    window.addEventListener('storage',sync);
    document.addEventListener('click',sync,true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* ============================================================
   M.U.R. V121 — Image ki.S agrandie SANS agrandir le cadre.
   Résultat NeuroFlex et profil : aucune modification du panneau
   externe ; seule l'image exploite mieux l'espace disponible.
   ============================================================ */
(function(){
  'use strict';
  if(document.getElementById('mur-kis-image-only-v121'))return;
  const st=document.createElement('style');
  st.id='mur-kis-image-only-v121';
  st.textContent=`
    /* La zone et le cadre ouverts sont conservés (dimensions V118). */
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-card{
      width:100%!important;
      max-width:100%!important;
      flex:1 1 auto!important;
      min-height:0!important;
      gap:5px!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip{
      max-width:min(100%,360px)!important;
      max-height:calc(100% - 65px)!important;
      width:auto!important;
      height:auto!important;
      flex:0 1 auto!important;
      min-height:0!important;
      overflow:hidden!important;
    }
    #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip img{
      width:auto!important;
      height:auto!important;
      max-width:min(82vw,360px)!important;
      max-height:min(54dvh,calc(100dvh - 175px))!important;
      object-fit:contain!important;
      display:block!important;
    }
    /* Même logique depuis Mon profil : la fenêtre ne grandit pas. */
    #mur-v97-profile-modal .mur-v97-image{
      width:auto!important;height:auto!important;
      max-width:min(82vw,335px)!important;
      max-height:min(69dvh,calc(100dvh - 135px))!important;
      object-fit:contain!important;
    }
    @media(max-width:520px){
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip{
        max-width:min(100%,330px)!important;
        max-height:calc(100% - 65px)!important;
      }
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip img{
        max-width:min(78vw,325px)!important;
        max-height:min(49dvh,calc(100dvh - 160px))!important;
      }
      #mur-v97-profile-modal .mur-v97-image{
        max-width:min(78vw,320px)!important;
        max-height:min(66dvh,calc(100dvh - 135px))!important;
      }
    }
    @media(max-width:600px) and (max-height:700px){
      #testResultView #resultKisBlock.result-step.open .mur-kis-v92-flip img{
        max-height:43dvh!important;
      }
      #mur-v97-profile-modal .mur-v97-image{max-height:60dvh!important;}
    }
  `;
  document.head.appendChild(st);
})();


/* ===========================================================
   M.U.R. V122 — Retournement 3D des cartes ki.S.
   Anime le bouton-carte existant sans changer son cadre,
   ses dimensions, ses images ni ses gestionnaires recto/verso.
   =========================================================== */
(function(){
  'use strict';
  if(window.MUR_KIS_FLIP_3D_V122) return;
  window.MUR_KIS_FLIP_3D_V122 = true;

  const css = document.createElement('style');
  css.id = 'mur-kis-flip-3d-v122';
  css.textContent = `
    .mur-kis-v92-card, #mur-v97-profile-modal .mur-v97-inner {
      perspective: 1000px;
    }
    .mur-kis-v92-flip, #mur-v97-profile-modal .mur-v97-image-button {
      transform-style: preserve-3d;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      transform-origin: center center;
      will-change: transform;
    }
    @media (prefers-reduced-motion: reduce) {
      .mur-kis-v92-flip, #mur-v97-profile-modal .mur-v97-image-button {
        transition: none !important;
        will-change: auto;
      }
    }
  `;
  document.head.appendChild(css);

  let replaying = false;
  const busy = new WeakSet();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // La capture sur window précède les gestionnaires historiques sur document.
  window.addEventListener('click', function(e){
    if(replaying || reduced.matches) return;
    const trigger = e.target instanceof Element
      ? e.target.closest('[data-mur-v92-flip], [data-v97-flip]')
      : null;
    if(!trigger) return;

    const result = trigger.closest('.mur-kis-v92-card');
    const profileModal = trigger.closest('#mur-v97-profile-modal');
    if(!result && (!profileModal || profileModal.hidden)) return;

    const visual = result
      ? result.querySelector('.mur-kis-v92-flip')
      : profileModal.querySelector('.mur-v97-image-button');
    if(!visual) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    if(busy.has(visual)) return;
    busy.add(visual);

    const time = 230;
    const easing = 'cubic-bezier(.42,0,.58,1)';
    visual.style.transition = 'transform ' + time + 'ms ' + easing;
    visual.style.transform = 'rotateY(90deg)';

    window.setTimeout(function(){
      // Le gestionnaire existant change l'image et le libellé à mi-rotation.
      visual.style.transition = 'none';
      visual.style.transform = 'rotateY(-90deg)';
      replaying = true;
      try {
        trigger.click();
      } finally {
        replaying = false;
      }
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          visual.style.transition = 'transform ' + time + 'ms ' + easing;
          visual.style.transform = 'rotateY(0deg)';
          window.setTimeout(function(){
            visual.style.transition = '';
            visual.style.transform = '';
            busy.delete(visual);
          }, time + 35);
        });
      });
    }, time);
  }, true);
})();


/* ===============================================================
   M.U.R. V123 — Résultat NeuroFlex : couleur des sphères calée
   sur la tendance NeuroFlex et suppression des petites flèches.
   Garde les sphères numérotées de la V120.
   =============================================================== */
(function(){
  'use strict';
  if(window.MUR_RESULT_STEPS_V123)return;
  window.MUR_RESULT_STEPS_V123=true;

  const style=document.createElement('style');
  style.id='mur-result-steps-v123';
  style.textContent=`
    #testResultView .result-progress-list.mur-v120-steps > .mur-v120-arrow{
      display:none!important;
      width:0!important;height:0!important;min-height:0!important;
      padding:0!important;margin:0!important;overflow:hidden!important;
    }
  `;
  document.head.appendChild(style);

  function parseRGB(str){
    const s=String(str||'').trim();
    if(/^#[0-9a-f]{6}$/i.test(s)) return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
    if(/^#[0-9a-f]{3}$/i.test(s)) return [1,2,3].map(i=>parseInt(s[i]+s[i],16));
    if(/^rgba?\(/i.test(s)) return (s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
    return null;
  }
  function toHex(rgb){
    return '#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  }
  function trendColor(){
    const palette={bleu:[59,150,247],vert:[85,233,153],orange:[255,165,63],rouge:[255,88,100]};
    let zone=null;
    try{ zone=JSON.parse(localStorage.getItem('murLastNeuro')||'null')?.zone||null; }catch(_){ }
    if(!zone){
      try{ zone=window.getCurrentNeuroRecommendation?.()?.zone || null; }catch(_){ }
    }
    const key=String(zone?.key||zone?.name||zone||'').toLowerCase();
    const c=String(zone?.color||'').trim();
    const parsed=parseRGB(c);
    if(parsed && parsed.length===3 && parsed.every(Number.isFinite)) return toHex(parsed);
    if(key.includes('bleu')||key.includes('blue')) return toHex(palette.bleu);
    if(key.includes('orange')) return toHex(palette.orange);
    if(key.includes('rouge')||key.includes('red')) return toHex(palette.rouge);
    if(key.includes('vert')||key.includes('green')) return toHex(palette.vert);
    return toHex(palette.vert);
  }
  function sync(){
    const c=trendColor();
    document.querySelectorAll('#testResultView #resultNowBlock .result-step-number.mur-v120-number, #testResultView #resultSynthesisBlock .result-step-number.mur-v120-number').forEach(el=>{
      if(el.style.getPropertyValue('--mur-v120-orb-color')!==c) el.style.setProperty('--mur-v120-orb-color',c);
    });
    document.querySelectorAll('#testResultView .result-progress-list.mur-v120-steps > .mur-v120-arrow').forEach(el=>el.remove());
  }
  function init(){
    sync();
    const root=document.getElementById('testResultView');
    if(root){
      const obs=new MutationObserver(sync);
      obs.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
    window.addEventListener('focus',sync);
    window.addEventListener('storage',sync);
    document.addEventListener('click',sync,true);
    document.addEventListener('visibilitychange',sync);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();


/* ===============================================================
   M.U.R. V124 — Dans Résultat NeuroFlex, la sphère n°1 prend la
   même couleur que le résultat ki.S. Les sphères 2 et 3 gardent
   la couleur de la tendance NeuroFlex.
   =============================================================== */
(function(){
  'use strict';
  if(window.MUR_RESULT_KIS_COLOR_V124)return;
  window.MUR_RESULT_KIS_COLOR_V124=true;

  const style=document.createElement('style');
  style.id='mur-result-kis-color-v124';
  style.textContent=`
    #testResultView #resultKisBlock .result-step-number.mur-v120-number > canvas:first-of-type{
      visibility:hidden!important;
    }
    #testResultView #resultKisBlock .result-step-number.mur-v120-number > canvas.mur-v124-kis-canvas{
      visibility:visible!important;display:block!important;position:absolute!important;inset:0!important;
      width:100%!important;height:100%!important;pointer-events:none!important;
    }
  `;
  document.head.appendChild(style);

  const fallback={
    pose:'#538fc6',
    pose_funambule:'#4ea7b2',
    funambule:'#5baf96',
    pose_fonceur:'#7a87c9',
    funambule_fonceur:'#d0a067',
    fonceur:'#c96e72',
    equilibre:'#5baf96'
  };
  const dots=Array.from({length:280},(_,i)=>{
    const y=1-2*(i+.5)/280,a=i*2.399963229728653,r=Math.sqrt(Math.max(0,1-y*y));
    return [r*Math.cos(a),y,r*Math.sin(a)];
  });
  let currentColor='#5baf96';
  let ready=false;

  function hex(n){return Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0');}
  function rgbToHex(r,g,b){return '#'+hex(r)+hex(g)+hex(b);}
  function parseRGB(str){
    const s=String(str||'').trim();
    if(/^#[0-9a-f]{6}$/i.test(s)) return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
    if(/^#[0-9a-f]{3}$/i.test(s)) return [1,2,3].map(i=>parseInt(s[i]+s[i],16));
    if(/^rgba?\(/i.test(s)) return (s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
    return null;
  }
  function sampleAccent(img){
    try{
      const c=document.createElement('canvas');
      const w=32,h=48;c.width=w;c.height=h;
      const ctx=c.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(img,0,0,w,h);
      const data=ctx.getImageData(0,0,w,h).data;
      let sr=0,sg=0,sb=0,sw=0;
      for(let i=0;i<data.length;i+=4){
        const a=data[i+3]; if(a<80) continue;
        const r=data[i],g=data[i+1],b=data[i+2];
        const max=Math.max(r,g,b), min=Math.min(r,g,b), sat=max-min;
        if(max<58 || sat<18) continue; // ignore dark grey background
        const weight=(sat/255)*0.9 + (max/255)*0.7;
        sr+=r*weight; sg+=g*weight; sb+=b*weight; sw+=weight;
      }
      if(sw>0) return rgbToHex(sr/sw,sg/sw,sb/sw);
    }catch(_){ }
    return null;
  }
  function cardKey(){
    try{
      const k=JSON.parse(localStorage.getItem('murKis')||'null');
      return k?.cardKey || null;
    }catch(_){ return null; }
  }
  function candidateImages(){
    const key=cardKey();
    const list=[];
    const visible=document.querySelector('#resultKisBlock .mur-kis-v92-mini img, #resultKisBlock .mur-kis-v92-flip img, #kisResult .mur-kis-card-image');
    if(visible?.currentSrc || visible?.src) list.push(visible.currentSrc || visible.src);
    if(key){
      list.push('images/kis/'+key+'-recto.png');
      list.push('images/kis/'+key+'-recto.webp');
    }
    return [...new Set(list.filter(Boolean))];
  }
  function draw(ctx,hexColor,t,offset){
    if(!ctx)return;
    const W=112,C=56,R=46;ctx.clearRect(0,0,W,W);
    const rgb=parseRGB(hexColor)||[91,175,150];
    const glow=ctx.createRadialGradient(C,C,2,C,C,53);
    glow.addColorStop(0,'rgba('+rgb.join(',')+',.13)');
    glow.addColorStop(1,'rgba('+rgb.join(',')+',0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,W);
    const a=t*.00012+offset,cs=Math.cos(a),sn=Math.sin(a);
    const pts=dots.map(([x,y,z])=>({x:C+R*(x*cs-z*sn),y:C+R*y,z:x*sn+z*cs}));
    pts.sort((p,q)=>p.z-q.z);ctx.fillStyle=hexColor;
    for(const p of pts){const v=(p.z+1)/2;ctx.globalAlpha=.2+.76*v;ctx.beginPath();ctx.arc(p.x,p.y,.8+v*.58,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
  }
  function ensureCanvas(){
    const badge=document.querySelector('#testResultView #resultKisBlock .result-step-number.mur-v120-number');
    if(!badge) return null;
    let cnv=badge.querySelector('canvas.mur-v124-kis-canvas');
    if(!cnv){
      cnv=document.createElement('canvas');
      cnv.className='mur-v124-kis-canvas';
      cnv.width=112; cnv.height=112; cnv.setAttribute('aria-hidden','true');
      const digit=badge.querySelector('.mur-v120-digit');
      if(digit) badge.insertBefore(cnv,digit);
      else badge.appendChild(cnv);
    }
    return {badge, ctx:cnv.getContext('2d')};
  }
  function updateColor(hexColor){
    currentColor=hexColor || currentColor || '#5baf96';
    const pair=ensureCanvas();
    if(pair && pair.badge.style.getPropertyValue('--mur-v120-orb-color')!==currentColor) pair.badge.style.setProperty('--mur-v120-orb-color', currentColor);
    ready=true;
  }
  function resolveKisColor(){
    const key=cardKey();
    const visible=document.querySelector('#resultKisBlock .mur-kis-v92-mini img, #resultKisBlock .mur-kis-v92-flip img, #kisResult .mur-kis-card-image');
    if(visible && visible.complete && visible.naturalWidth){
      const c=sampleAccent(visible);
      if(c){ updateColor(c); return; }
    }
    const sources=candidateImages();
    if(!sources.length){ updateColor(fallback[key]||'#5baf96'); return; }
    let i=0;
    (function tryNext(){
      if(i>=sources.length){ updateColor(fallback[key]||'#5baf96'); return; }
      const img=new Image();
      img.onload=()=>{ updateColor(sampleAccent(img) || fallback[key] || '#5baf96'); };
      img.onerror=()=>{ i++; tryNext(); };
      img.src=sources[i++];
    })();
  }
  let lastImageSignature='';
  function sync(){
    ensureCanvas();
    const signature=cardKey()+'|'+candidateImages().join('|');
    if(signature===lastImageSignature)return;
    lastImageSignature=signature;
    resolveKisColor();
  }
  function init(){
    sync();
    const root=document.getElementById('testResultView');
    if(root){
      const obs=new MutationObserver(sync);
      obs.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','src']});
    }
    window.addEventListener('focus',sync);
    window.addEventListener('storage',sync);
    document.addEventListener('click',sync,true);
    let last=0;
    function frame(t){
      if(!document.hidden){
        const pair=ensureCanvas();
        if(pair && ready && t-last>55){
          last=t;
          if(pair.badge.style.getPropertyValue('--mur-v120-orb-color')!==currentColor)
            pair.badge.style.setProperty('--mur-v120-orb-color', currentColor);
          draw(pair.ctx,currentColor,t,0);
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

/* ================================================================
   M.U.R. V129 — Écran de choix obligatoire avant Résultat NeuroFlex
   Base V126 après correction du blocage. Aucun changement Supabase.
   La couleur est déterminée uniquement par les quatre curseurs.
   ================================================================ */
(function(){
'use strict';
if(window.MUR_NUANCES_V129) return;
window.MUR_NUANCES_V129=true;
const KEY='murNowNuanceV129';
  const DATA={
    blue_calm:{zone:'bleu',color:'#36b6ef',fr:'Calme et détendu',en:'Calm and relaxed',shortFr:'Bleu calme',shortEn:'Calm blue',
      descriptionFr:'Vous décrivez un état calme, confortable, avec une disponibilité préservée. Un niveau d’activation bas n’est pas nécessairement un manque d’énergie.',
      descriptionEn:'You describe a calm, comfortable state with preserved availability. Low activation does not necessarily mean low energy.',
      adviceFr:'Préservez cet état : respiration naturelle, pause agréable, récupération et attention à vos sensations. Il n’est pas utile de vous stimuler systématiquement.',
      adviceEn:'Preserve this state with natural breathing, comfortable breaks and recovery. There is no need to increase activation systematically.',
      exerciseFr:'Lac tranquille — maintien de la stabilité',exerciseEn:'Quiet lake — maintain steadiness',exercise:'lac',exerciseZone:'vert',symbol:'lotus'},
    blue_tired:{zone:'bleu',color:'#478fec',fr:'Fatigué, en manque d’énergie',en:'Tired, low on energy',shortFr:'Bleu ralenti',shortEn:'Slowed blue',
      descriptionFr:'Vous décrivez un ralentissement ressenti, un manque d’élan ou de disponibilité. Le tableau de référence recommande ici une augmentation progressive de l’énergie.',
      descriptionEn:'You describe feeling slowed or lacking energy. The source chart suggests gently increasing activation in such a state.',
      adviceFr:'Commencez par le repos si nécessaire, puis privilégiez la lumière du jour et une mobilisation douce, sans effort brutal. Une fatigue inhabituelle ou persistante mérite une évaluation.',
      adviceEn:'Rest if needed; try daylight and gentle movement without forcing. Unusual or persistent fatigue needs assessment.',
      exerciseFr:'Lumière du matin — activation progressive',exerciseEn:'Morning light — gentle activation',exercise:'lumiere',exerciseZone:'bleu',symbol:'battery'},
    red_tense:{zone:'rouge',color:'#ff9150',fr:'En surtension',en:'Highly tense',shortFr:'Rouge activé',shortEn:'Activated red',
      descriptionFr:'Vous décrivez une mobilisation intense avec tension corporelle, agitation ou impression d’être débordé. La priorité est de réduire progressivement la sollicitation.',
      descriptionEn:'You describe intense activation, physical tension or feeling overwhelmed. The priority is to gradually reduce demands.',
      adviceFr:'Ralentissez si cela vous convient : appuis stables, relâchement des épaules et expiration naturelle, sans apnée ni respiration forcée. Arrêtez en cas d’inconfort.',
      adviceEn:'Slow down comfortably: stable support, relaxing the shoulders and natural, unforced exhalation. Stop if uncomfortable.',
      exerciseFr:'Pause vagale — ralentissement confortable',exerciseEn:'Vagal pause — comfortable slowing',exercise:'pause',exerciseZone:'rouge',symbol:'chevrons'},
    red_frozen:{zone:'rouge',color:'#f25b7b',fr:'Figé, bloqué',en:'Frozen, unable to act',shortFr:'Rouge figé',shortEn:'Frozen red',
      descriptionFr:'Vous décrivez un sentiment de blocage malgré une forte surcharge ressentie. Cela ne démontre ni une réponse nerveuse particulière ni une crise de panique.',
      descriptionEn:'You describe feeling unable to act despite intense distress. This does not establish a specific neural response or a panic attack.',
      adviceFr:'Privilégiez les repères extérieurs : regarder autour de vous, identifier des éléments rassurants, sentir le sol sous les pieds, puis bouger doucement si possible. Ne forcez pas la respiration. Une incapacité réelle et soudaine à bouger nécessite une évaluation médicale urgente.',
      adviceEn:'Use external grounding: look around, notice reassuring objects, feel the ground beneath your feet, and move gently if possible. Do not force breathing. Sudden genuine inability to move needs urgent medical assessment.',
      exerciseFr:'Ancrage — retrouver des repères concrets',exerciseEn:'Grounding — find concrete points of reference',exercise:'ancrage',exerciseZone:'rouge',symbol:'pause'}
  };
  const profiles={
    pose:['Votre tendance ki.S invite à observer le passage entre repos et mobilisation.','Your ki.S profile invites you to notice changes between rest and action.'],
    funambule:['Observez vos fluctuations et ce qui vous aide à retrouver une sensation de stabilité.','Notice changes in your state and what helps you regain steadiness.'],
    fonceur:['Tenez compte des signaux corporels et de vos besoins de récupération, sans viser la performance.','Pay attention to bodily signals and recovery needs rather than performance.'],
    pose_funambule:['Observez la différence entre votre recherche de stabilité et votre état du moment.','Notice the contrast between your wish for steadiness and your current state.'],
    pose_fonceur:['Explorez les transitions entre disponibilité et mobilisation.','Explore transitions between availability and activation.'],
    funambule_fonceur:['Soyez attentif aux variations et à la possibilité de ralentir.','Notice changes in activation and opportunities to slow down.'],
    equilibre:['Comparez ce ressenti avec votre disponibilité habituelle.','Compare this experience with your usual sense of availability.']
  };

const keysByZone={bleu:['blue_calm','blue_tired'],rouge:['red_tense','red_frozen']};
const css=document.createElement('style');css.id='mur-v129-style';
css.textContent=`
 #mur-v129-gate{position:fixed!important;inset:0!important;z-index:2147483000!important;display:flex!important;align-items:center;justify-content:center;overflow-y:auto;overscroll-behavior:contain;background:linear-gradient(155deg,#061526,#0c263c 68%,#09182a);color:#eaf7fb;box-sizing:border-box;padding:max(18px,env(safe-area-inset-top)) 15px max(18px,env(safe-area-inset-bottom));}
 #mur-v129-gate .mur-v129-panel{width:min(100%,470px);max-height:100%;overflow-y:auto;padding:19px 15px;background:linear-gradient(135deg,#102940,#0a1c2d);border:1px solid rgba(106,177,194,.5);border-radius:21px;box-shadow:0 20px 80px #0009;box-sizing:border-box;}
 #mur-v129-gate .mur-v129-overline{font-size:11px;font-weight:800;letter-spacing:.15em;color:#69cfb3;text-transform:uppercase;}
 #mur-v129-gate h2{color:#fff;font-size:clamp(21px,5vw,27px);line-height:1.18;margin:7px 0 7px!important;}
 #mur-v129-gate p{font-size:13px;color:#c5dce8;line-height:1.5;margin:7px 0 13px!important;}
 #mur-v129-gate .mur-v129-zone{display:inline-flex;padding:5px 10px;margin-bottom:9px;border:1px solid var(--mur-zone-color);color:var(--mur-zone-color);border-radius:20px;font-weight:750;font-size:12px;}
 #mur-v129-gate .mur-v129-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:15px 0;}
 #mur-v129-gate .mur-v129-choice{background:#091c2e;border:1px solid #416279;border-radius:16px;color:#fff;padding:12px 7px;min-height:170px;display:flex;flex-direction:column;align-items:center;gap:7px;text-align:center;cursor:pointer;box-sizing:border-box;}
 #mur-v129-gate .mur-v129-choice[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 15%,#091c2e);border:2px solid var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 25%,transparent)}
 #mur-v129-gate .mur-v128-icon{width:70px;height:70px;flex:none;}
 #mur-v129-gate .mur-v129-choice strong{font-size:13px;line-height:1.3;}
 #mur-v129-gate .mur-v129-choice small{color:#b0c5d4;font-size:10px;line-height:1.35;}
 #mur-v129-gate .mur-v129-confirm{width:100%;background:linear-gradient(100deg,#43d694,#35b6c8);color:#07182a;border:0;border-radius:13px;min-height:48px;font-size:15px;font-weight:800;cursor:pointer;}
 #mur-v129-gate .mur-v129-confirm:disabled{opacity:.35;cursor:not-allowed;filter:grayscale(1);}
 #mur-v129-gate .mur-v129-note{font-size:10px;color:#a9bfcb;margin-top:10px;line-height:1.45;}
 #testResultView .mur-v129-tag,#exercises .mur-v129-tag{display:inline-flex;align-items:center;gap:6px;border-radius:12px;padding:5px 9px;border:1px solid color-mix(in srgb,var(--accent) 60%,transparent);color:#f1fbff;background:#10283b;font-size:12px;font-weight:750;line-height:1.2;}
 #testResultView .mur-v129-tag .mur-v128-icon,#exercises .mur-v129-tag .mur-v128-icon{width:30px;height:30px;display:block;flex:none;}
 #testResultView .mur-v129-side{position:absolute;right:-3px;bottom:-8px;width:24px;height:24px;display:grid;place-items:center;border:1px solid var(--accent);border-radius:50%;background:#081b2d;pointer-events:none;}
 #testResultView .mur-v129-side .mur-v128-icon{width:20px;height:20px;}
 #testResultView .mur-v129-insight,#exercises .mur-v129-exercise-banner{padding:12px;margin:8px 0;border:1px solid color-mix(in srgb,var(--accent) 50%,#547286);border-left:3px solid var(--accent);border-radius:13px;background:rgba(9,28,44,.93);color:#e8f5fa;line-height:1.45;font-size:12px;}
 #testResultView .mur-v129-insight p,#exercises .mur-v129-exercise-banner p{margin:7px 0!important;}
 #testResultView .mur-v129-insight button,#exercises .mur-v129-exercise-banner button{display:block;width:100%;margin-top:9px;border:1px solid #4b9aa0;background:#1a5969;color:white;border-radius:10px;padding:10px;font-weight:700;cursor:pointer;}
 #exercises .mur-v129-exercise-banner{margin:12px auto;max-width:520px;box-sizing:border-box;}
 #exercises .mur-v129-detail-tag{margin:8px!important;}
 @media(max-width:400px){#mur-v129-gate .mur-v129-panel{padding:14px 10px}#mur-v129-gate .mur-v129-choice{min-height:153px;padding:10px 4px}#mur-v129-gate .mur-v128-icon{width:59px;height:59px}}
 @media(prefers-reduced-motion:reduce){#mur-v129-gate *{animation:none!important;transition:none!important}}
`;
document.head.appendChild(css);
function lang(){try{return String(localStorage.getItem('mur-ui-language')||localStorage.getItem('murLanguage')||document.documentElement.lang||'fr').toLowerCase().startsWith('en')}catch(_){return false}}
const txt=(fr,en)=>lang()?en:fr;
function read(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}}
function zoneKey(o){let z=o?.zone,k=String(z?.key||z?.name||z||'').toLowerCase();if(k.includes('bleu')||k.includes('blue'))return 'bleu';if(k.includes('rouge')||k.includes('red'))return 'rouge';if(k.includes('vert')||k.includes('green'))return 'vert';if(k.includes('orange'))return 'orange';return null;}
function current(){const n=read('murNow'),info=n?.nuanceV129;if(!info||!DATA[info.choice]||DATA[info.choice].zone!==zoneKey(n)||Number(info.score)!==Number(n.score))return null;return info.choice;}
  function makeSVG(symbol,color){
    // Les traits sont construits intégralement avec des points lumineux.
    // Aucun cercle de fond : ces pictogrammes ne copient pas les orbes.
    const NS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 80 80');svg.setAttribute('class','mur-v128-icon');svg.setAttribute('aria-hidden','true');
    const add=(x,y,r=1.45)=>{const dot=document.createElementNS(NS,'circle');dot.setAttribute('cx',x.toFixed(2));dot.setAttribute('cy',y.toFixed(2));dot.setAttribute('r',String(r));dot.setAttribute('fill',color);dot.setAttribute('opacity','.96');svg.appendChild(dot);};
    const line=(x1,y1,x2,y2,step=3)=>{const length=Math.hypot(x2-x1,y2-y1),n=Math.max(2,Math.ceil(length/step));for(let i=0;i<=n;i++){const q=i/n;add(x1+(x2-x1)*q,y1+(y2-y1)*q)}};
    const bezier=(a,b,c,d,n=32)=>{for(let i=0;i<=n;i++){const q=i/n,k=1-q;add(k*k*k*a[0]+3*k*k*q*b[0]+3*k*q*q*c[0]+q*q*q*d[0],k*k*k*a[1]+3*k*k*q*b[1]+3*k*q*q*c[1]+q*q*q*d[1],1.35)}};
    if(symbol==='lotus'){
      bezier([40,57],[24,43],[29,26],[40,14]);bezier([40,14],[51,26],[56,43],[40,57]);
      bezier([40,57],[18,56],[11,42],[14,30]);bezier([14,30],[30,32],[37,43],[40,57]);
      bezier([40,57],[62,56],[69,42],[66,30]);bezier([66,30],[50,32],[43,43],[40,57]);
      bezier([14,62],[26,66],[54,66],[66,62],22);
    }else if(symbol==='battery'){
      line(14,25,63,25);line(14,55,63,55);line(14,25,14,55);line(63,25,63,55);line(66,35,70,35);line(70,35,70,45);line(66,45,70,45);
      for(let y=32;y<=48;y+=3.3)for(let x=21;x<=28;x+=3.3)add(x,y,1.5);
    }else if(symbol==='chevrons'){
      line(13,44,40,17,2.6);line(40,17,67,44,2.6);line(13,63,40,36,2.6);line(40,36,67,63,2.6);
    }else if(symbol==='pause'){
      for(let y=20;y<=60;y+=3.2)for(let x of [29,33,47,51])add(x,y,1.4);
    }
    return svg;
  }
  function icon(choice){const d=DATA[choice];return makeSVG(d.symbol,d.color)}

function save(choice){const n=read('murNow');if(!n||!DATA[choice]||zoneKey(n)!==DATA[choice].zone)return;const entry={choice,zone:DATA[choice].zone,score:Number(n.score),chosenAt:new Date().toISOString()};n.nuanceV129=entry;localStorage.setItem('murNow',JSON.stringify(n));localStorage.setItem(KEY,JSON.stringify(entry));}
function label(choice){const d=DATA[choice];return txt(d.shortFr,d.shortEn)}
function makeTag(choice){const d=DATA[choice],tag=document.createElement('span');tag.className='mur-v129-tag';tag.style.setProperty('--accent',d.color);const name=document.createElement('span');name.textContent=label(choice);tag.append(icon(choice),name);return tag;}
let pending=false;
function showGate(zone,commit){
  document.getElementById('mur-v129-gate')?.remove();
  const screen=document.createElement('section');screen.id='mur-v129-gate';screen.setAttribute('role','dialog');screen.setAttribute('aria-modal','true');screen.setAttribute('aria-label',txt('Préciser votre état','Specify how you feel'));
  const pane=document.createElement('div');pane.className='mur-v129-panel';
  const over=document.createElement('div');over.className='mur-v129-overline';over.textContent=txt('Ici & Maintenant · Étape suivante','Here & Now · Next step');
  const z=document.createElement('div');z.className='mur-v129-zone';z.textContent=zone==='bleu'?txt('Votre résultat : bleu','Your result: blue'):txt('Votre résultat : rouge','Your result: red');z.style.setProperty('--mur-zone-color',zone==='bleu'?'#50b9f2':'#f36a72');
  const title=document.createElement('h2');title.textContent=zone==='bleu'?txt('Comment vous sentez-vous dans cette zone bleue ?','How do you feel in this blue zone?'):txt('Comment vivez-vous cette zone rouge ?','How do you experience this red zone?');
  const description=document.createElement('p');description.textContent=txt('Choisissez le symbole qui correspond à votre ressenti. Ce choix précise les conseils, sans modifier votre score.','Choose the symbol that best matches your experience. This refines the guidance without changing your score.');
  const options=document.createElement('div');options.className='mur-v129-choices';let selected=null;
  const confirm=document.createElement('button');confirm.type='button';confirm.className='mur-v129-confirm';confirm.disabled=true;confirm.textContent=txt('Choisissez un état pour continuer','Choose a state to continue');
  for(const choice of keysByZone[zone]){
    const d=DATA[choice];const button=document.createElement('button');button.type='button';button.className='mur-v129-choice';button.style.setProperty('--accent',d.color);button.setAttribute('aria-pressed','false');
    const name=document.createElement('strong');name.textContent=txt(d.fr,d.en);
    const hint=document.createElement('small');hint.textContent=txt(d.descriptionFr,d.descriptionEn);
    button.append(icon(choice),name,hint);
    button.addEventListener('click',()=>{selected=choice;for(const b of options.children)b.setAttribute('aria-pressed',String(b===button));confirm.disabled=false;confirm.textContent=txt('Valider et voir mon résultat','Confirm and view my result');});
    options.appendChild(button);
  }
  confirm.addEventListener('click',()=>{
    if(!selected||pending)return;
    pending=true;confirm.disabled=true;
    try{commit();if(zoneKey(read('murNow'))===zone)save(selected);screen.remove();refresh();setTimeout(refresh,400);}
    finally{pending=false;}
  });
  const note=document.createElement('div');note.className='mur-v129-note';note.textContent=txt('Cette étape est obligatoire pour préciser votre zone bleue ou rouge. Les états sont descriptifs et ne constituent pas un diagnostic.','This step is required to refine your blue or red zone. These states are descriptive, not diagnostic.');
  pane.append(over,z,title,description,options,confirm,note);screen.appendChild(pane);document.body.appendChild(screen);
  screen.querySelector('button')?.focus({preventScroll:true});
}
function scoreFromSliders(){const ids=['nowEnergy','nowBreath','nowMind','nowBody'],map=[-2,-1,0,1,2];const values=ids.map(id=>Number(document.getElementById(id)?.value));if(values.some(v=>!Number.isInteger(v)||v<0||v>4))return null;return Math.round(values.reduce((a,v)=>a+map[v],0)/8*50);}
function decideZone(score){if(score<=-22)return 'bleu';if(score>=28)return 'rouge';if(score>=10)return 'orange';return 'vert';}
function decorateResults(){
 const choice=current();
 for(const id of ['resultNowBlock','resultSynthesisBlock']){
  const block=document.getElementById(id);if(!block)continue;
  block.querySelectorAll('.mur-v129-tag,.mur-v129-side').forEach(n=>n.remove());
  if(!choice)continue;
  const top=block.querySelector('.result-step-top');if(top)top.appendChild(makeTag(choice));
  const side=block.querySelector('.result-step-side');if(side){side.style.position='relative';const sm=document.createElement('span');sm.className='mur-v129-side';sm.style.setProperty('--accent',DATA[choice].color);sm.appendChild(icon(choice));side.appendChild(sm);}
 }
 for(const id of ['resultNowDetail','resultSynthDetail']){
  const detail=document.getElementById(id);if(!detail)continue;
  detail.querySelectorAll('.mur-v129-insight').forEach(n=>n.remove());
  if(!choice || !detail.parentElement?.closest('.result-step.open'))continue;
  const d=DATA[choice];const card=document.createElement('section');card.className='mur-v129-insight';card.style.setProperty('--accent',d.color);card.appendChild(makeTag(choice));
  for(const content of [txt(d.descriptionFr,d.descriptionEn),txt(d.adviceFr,d.adviceEn),txt('Exercice suggéré : '+d.exerciseFr,'Suggested exercise: '+d.exerciseEn)]){const p=document.createElement('p');p.textContent=content;card.appendChild(p);}
  if(id==='resultSynthDetail'){const k=read('murKis')?.cardKey;if(profiles[k]){const p=document.createElement('p');p.textContent=profiles[k][lang()?1:0];card.appendChild(p);}}
  const btn=document.createElement('button');btn.type='button';btn.textContent=txt('Voir l’exercice conseillé','Open recommended exercise');btn.addEventListener('click',()=>openSuggested(choice));card.appendChild(btn);
  const note=document.createElement('p');note.style.opacity='.7';note.style.fontSize='10px';note.textContent=txt('Proposition descriptive inspirée du tableau de B. Rothschild, sans diagnostic du système nerveux.','Descriptive guidance inspired by B. Rothschild’s chart, not a nervous-system diagnosis.');card.appendChild(note);
  detail.appendChild(card);
 }
 const final=document.getElementById('resultFinalExerciseBtn');if(final&&choice){final.textContent=txt('Exercice conseillé : '+DATA[choice].exerciseFr,'Recommended: '+DATA[choice].exerciseEn);}
}
function decorateExercises(){
 const choice=current(),page=document.getElementById('exercises');if(!page)return;
 page.querySelectorAll('.mur-v129-exercise-banner,.mur-v129-detail-tag').forEach(n=>n.remove());
 if(!choice)return;
 const d=DATA[choice],banner=document.createElement('section');banner.className='mur-v129-exercise-banner';banner.style.setProperty('--accent',d.color);
 banner.appendChild(makeTag(choice));
 const advice=document.createElement('p');advice.textContent=txt(d.adviceFr,d.adviceEn);banner.appendChild(advice);
 const label=document.createElement('p');label.textContent=txt('Exercice proposé : '+d.exerciseFr,'Suggested exercise: '+d.exerciseEn);banner.appendChild(label);
 const button=document.createElement('button');button.type='button';button.textContent=txt('Ouvrir cet exercice','Open this exercise');button.addEventListener('click',()=>{if(typeof window.openExercise==='function')window.openExercise(d.exercise);});banner.appendChild(button);
 const anchor=document.getElementById('exerciseRecommendationNote')||document.getElementById('exerciseList')||page.firstElementChild;
 if(anchor)anchor.insertAdjacentElement('beforebegin',banner);else page.prepend(banner);
 const detail=document.getElementById('exerciseDetail');
 if(detail && detail.innerHTML.trim()){const tag=makeTag(choice);tag.classList.add('mur-v129-detail-tag');detail.prepend(tag);}
}
function openSuggested(choice){const d=DATA[choice];if(!d)return;if(typeof window.openRecommendedExercises==='function')window.openRecommendedExercises();if(typeof window.openExercise==='function')window.openExercise(d.exercise);decorateExercises();}
let scheduled=false;
function refresh(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorateResults();decorateExercises();});}
function init(){
  // Capture la fonction stable V126, mais ne lance pas son calcul avant le choix.
  if(typeof window.finishNow==='function'){
    const old=window.finishNow;
    window.finishNow=function(){
      if(document.getElementById('mur-v129-gate'))return;
      const score=scoreFromSliders(),zone=score===null?null:decideZone(score);
      const args=arguments,self=this;
      // Zone verte et orange : fonctionnement historique, aucune sélection.
      if(!keysByZone[zone]){const out=old.apply(self,args);refresh();return out;}
      showGate(zone,()=>{
        const out=old.apply(self,args);
        const saved=read('murNow');if(zoneKey(saved)!==zone){console.warn('M.U.R. V129: zone calculée différente, choix non conservé');return out;}
        return out;
      });
    };
  }
  if(typeof window.renderProgressiveResult==='function'){const old=window.renderProgressiveResult;window.renderProgressiveResult=function(){const r=old.apply(this,arguments);refresh();return r;};}
  if(typeof window.renderResultStepDetails==='function'){const old=window.renderResultStepDetails;window.renderResultStepDetails=function(){const r=old.apply(this,arguments);refresh();return r;};}
  if(typeof window.renderExerciseList==='function'){const old=window.renderExerciseList;window.renderExerciseList=function(){const r=old.apply(this,arguments);refresh();return r;};}
  if(typeof window.openExercise==='function'){const old=window.openExercise;window.openExercise=function(){const r=old.apply(this,arguments);refresh();return r;};}
  if(typeof window.getRecommendedExerciseZoneKey==='function'){const old=window.getRecommendedExerciseZoneKey;window.getRecommendedExerciseZoneKey=function(){const c=current();return c?DATA[c].exerciseZone:old.apply(this,arguments);};}
  // Le bouton principal du résultat ouvre directement l'exercice personnalisé.
  document.addEventListener('click',e=>{
    const target=e.target instanceof Element?e.target:null;
    if(target?.closest('#resultFinalExerciseBtn') && current()){
      e.preventDefault();e.stopImmediatePropagation();openSuggested(current());return;
    }
    if(target?.closest('#resultNowBlock,#resultSynthesisBlock'))setTimeout(refresh,50);
  },true);
  window.addEventListener('focus',refresh);
  window.addEventListener('storage',e=>{if(e.key==='murNow'||e.key===KEY)refresh();});
  window.MUR_V129_REFRESH=refresh;
  refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

/* ================================================================
   M.U.R. V152 — RESPIRATION : UN SEUL ECRAN, STYLE NATIF M.U.R.
   Remplace integralement le correctif V151 (sans couches concurrentes).
   Ne modifie pas index.html, le moteur respiratoire, Supabase ou les sons.
   ================================================================ */
(() => {
  'use strict';
  if (window.MUR_BREATH_V152) return;
  window.MUR_BREATH_V152 = {version:152, type:'single-screen-native'};

  const RECOMMEND = {bleu:'boost', vert:'365', orange:'regulate', rouge:'frein'};
  const COLORS = {bleu:'#3b82f6',vert:'#22c55e',orange:'#f59e0b',rouge:'#ef4444'};
  const ICONS = {
    clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 13V8m0 5 3 2M9 2h6"/></svg>',
    waves:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 8c3-3 5-3 8 0s5 3 8 0 3-2 4-2M2 14c3-3 5-3 8 0s5 3 8 0 3-2 4-2M2 20c3-3 5-3 8 0s5 3 8 0 3-2 4-2"/></svg>',
    rhythm:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="10" cy="7" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="17" r="2"/></svg>'
  };
  const CSS = `
    #breath.mur-b152.page.active{display:flex!important;flex-direction:column!important;gap:clamp(7px,1.1dvh,11px)!important;padding:0 0 8px!important;min-height:0!important;height:auto!important;overflow:visible!important;--mur-b152-color:#22c55e}
    /* Important : ces deux sections sont les cartes NATIVES de index.html. */
    #breath.mur-b152.page.active > section.card:first-of-type{display:none!important}
    #breath.mur-b152.page.active > .mur-b152-title{order:0;display:flex;justify-content:space-between;align-items:center;gap:8px;flex:0 0 auto;padding:0 2px}
    #breath.mur-b152 .mur-b152-title h2{font-size:clamp(20px,5vw,24px)!important;line-height:1.15!important;color:#f8fafc}
    #breath.mur-b152 .mur-b152-title small{font-size:11px;color:var(--muted,#bdcfde)}
    #breath.mur-b152.page.active > .mur-b152-recommend{order:1;flex:0 0 auto;margin:0!important;padding:12px!important;display:grid;grid-template-columns:37px minmax(0,1fr);gap:10px;align-items:center;border-left:3px solid var(--mur-b152-color)!important}
    #breath.mur-b152 .mur-b152-rec-icon{width:36px;height:36px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--mur-b152-color) 18%,rgba(255,255,255,.07));border:1px solid color-mix(in srgb,var(--mur-b152-color) 44%,rgba(255,255,255,.14));color:var(--mur-b152-color)}
    #breath.mur-b152 .mur-b152-rec-icon svg{width:22px;height:22px;stroke:currentColor;stroke-width:1.7;fill:none;stroke-linecap:round}
    #breath.mur-b152 .mur-b152-rec-top{color:var(--muted,#cbd5e1);font-size:11px;font-weight:750;line-height:1.3}
    #breath.mur-b152 .mur-b152-rec-main{margin-top:3px;font-size:clamp(16px,4.5vw,19px);line-height:1.18;color:#fff;font-weight:850}
    #breath.mur-b152 .mur-b152-rec-sub{margin-top:4px;font-size:11px;line-height:1.3;color:var(--muted,#cbd5e1)}
    /* Le panneau natif de respiration reste ici, AVANT et PENDANT la séance.
       Priorité renforcée contre l'ancien mode immersif V85. */
    #breath.mur-b152.page.active > section.card:last-of-type,
    #breath.mur-b152.page.active.breath-immersive > section.card:last-of-type{
      order:2!important;position:relative!important;inset:auto!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;z-index:auto!important;isolation:auto!important;transform:none!important;
      display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;
      width:100%!important;height:clamp(174px,30dvh,252px)!important;min-width:0!important;min-height:0!important;max-width:100%!important;max-height:none!important;
      padding:4px 8px!important;margin:0!important;gap:2px!important;box-sizing:border-box!important;overflow:visible!important;
      border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;
    }
    #breath.mur-b152.page.active section.card:last-of-type > .mini-info{display:none!important}
    #breath.mur-b152.page.active .breath-stage,
    #breath.mur-b152.page.active.breath-immersive .breath-stage{
      order:0!important;position:relative!important;display:flex!important;justify-content:center!important;align-items:center!important;
      flex:1 1 auto!important;width:100%!important;height:100%!important;min-height:0!important;max-height:none!important;overflow:visible!important;margin:0!important;padding:0!important;transform:none!important;inset:auto!important;
    }
    #breath.mur-b152.page.active #orb,
    #breath.mur-b152.page.active.breath-immersive #orb.mur-breath-particle-orb{
      position:relative!important;inset:auto!important;flex:0 0 auto!important;display:grid!important;place-items:center!important;
      width:min(47vw,21.5dvh,195px)!important;height:min(47vw,21.5dvh,195px)!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;
      margin:0!important;padding:0!important;background:transparent!important;box-shadow:none!important;border:0!important;transform-origin:center center!important;
    }
    #breath.mur-b152.page.active .breath-stage > svg.ring,
    #breath.mur-b152.page.active.breath-immersive .breath-stage > svg.ring{
      position:absolute!important;left:50%!important;top:50%!important;width:min(59vw,28dvh,232px)!important;height:min(59vw,28dvh,232px)!important;
      transform:translate(-50%,-50%) rotate(-90deg)!important;opacity:.18!important;pointer-events:none!important;
    }
    #breath.mur-b152.page.active #phaseText.mur-breath-label-v53,
    #breath.mur-b152.page.active.breath-immersive #phaseText.mur-breath-label-v53{
      position:relative!important;inset:auto!important;order:1!important;display:block!important;flex:0 0 auto!important;
      margin:2px auto!important;min-width:115px!important;width:max-content!important;max-width:96%!important;
      padding:6px 12px!important;font-size:clamp(14px,3.8vw,18px)!important;line-height:1.2!important;white-space:nowrap!important;text-align:center!important;
    }
    #breath.mur-b152.page.active #phaseHint{display:none!important}
    #breath.mur-b152.page.active .breath-action-row{display:none!important}
    #breath.mur-b152.page.active .orb-sound-btn{display:none!important}
    #breath.mur-b152.page.active > .mur-b152-status{order:3;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;flex:0 0 auto}
    #breath.mur-b152 .mur-b152-status span{display:block;min-width:0;padding:8px 3px;border:1px solid var(--line,rgba(255,255,255,.16));border-radius:999px;background:rgba(255,255,255,.075);color:#f8fafc;font-size:11px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #breath.mur-b152.page.active > .mur-b152-controls{order:4;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;flex:0 0 auto}
    #breath.mur-b152 .mur-b152-controls button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:0;min-height:65px;padding:8px 4px;border-radius:16px!important;color:#f8fafc!important;font-size:12px;font-weight:750;line-height:1.15;text-align:center;cursor:pointer}
    #breath.mur-b152 .mur-b152-controls button svg{width:23px;height:23px;stroke:var(--mur-b152-color);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;fill:none}
    #breath.mur-b152 .mur-b152-controls button:focus-visible{outline:2px solid var(--mur-b152-color);outline-offset:2px}
    #breath.mur-b152.page.active > .mur-b152-start{order:5;display:block;flex:0 0 auto;width:100%;min-height:49px;padding:9px 12px;border-radius:17px!important;font-size:15px;font-weight:900;cursor:pointer}
    #breath.mur-b152.page.active > .mur-b152-advanced{order:6;flex:0 0 auto;display:block;margin:0 auto;padding:5px 12px;border:0;background:transparent;color:var(--muted,#cddce6);font-size:12px;text-decoration:underline;cursor:pointer}
    /* Même page, même identité : le plein écran natif ne recouvre plus les choix. */
    body.breath-immersive-global:has(#breath.mur-b152.active) .tabbar{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
    #breath.mur-b152.page.active.mur-b152-settings > section.card:first-of-type{
      display:block!important;position:fixed!important;z-index:18000!important;inset:calc(52px + env(safe-area-inset-top)) 12px calc(35px + env(safe-area-inset-bottom))!important;
      width:min(410px,calc(100vw - 24px))!important;max-width:none!important;height:auto!important;margin:0 auto!important;
      overflow:auto!important;border:1px solid rgba(148,203,230,.5)!important;background:linear-gradient(180deg,#102a41,#071522)!important;
      border-radius:22px!important;padding:52px 14px 18px!important;box-shadow:0 0 0 100vmax rgba(3,10,20,.86),0 20px 55px #000b!important;
    }
    #breath.mur-b152.page.active .mur-b152-close{display:none}
    #breath.mur-b152.page.active.mur-b152-settings .mur-b152-close{
      display:block!important;position:fixed!important;top:calc(62px + env(safe-area-inset-top));right:max(22px,calc((100vw - 390px)/2));z-index:18001!important;
      padding:7px 12px;min-height:34px;border-radius:12px!important;color:white!important;font-size:12px;font-weight:750;cursor:pointer;
    }
    #breath.mur-b152.mur-b152-settings .breath-master{margin-top:5px}
    #breath.mur-b152.mur-b152-settings .breath-choice{min-height:42px}
    #breath.mur-b152.page.active .mur-b152-settings:focus-visible{outline:2px solid #fff}
    @media(max-height:670px){
      #breath.mur-b152.page.active{gap:5px!important}
      #breath.mur-b152.page.active > .mur-b152-recommend{padding:8px!important}
      #breath.mur-b152.page.active > section.card:last-of-type,#breath.mur-b152.page.active.breath-immersive > section.card:last-of-type{height:clamp(125px,24dvh,175px)!important}
      #breath.mur-b152.page.active #orb,#breath.mur-b152.page.active.breath-immersive #orb.mur-breath-particle-orb{width:min(39vw,18dvh,144px)!important;height:min(39vw,18dvh,144px)!important}
      #breath.mur-b152 .mur-b152-controls button{min-height:54px;padding:5px 3px}
      #breath.mur-b152.page.active > .mur-b152-start{min-height:43px}
    }
  `;

  const $ = id => document.getElementById(id);
  const en = () => String(document.documentElement.lang||'fr').toLowerCase().startsWith('en');
  function zoneKey(){
    let candidate=null;
    try { candidate=window.getCurrentNeuroRecommendation?.()?.zone || JSON.parse(localStorage.getItem('murLastNeuro')||'null')?.zone; } catch(_) {}
    const value=String(candidate?.key||candidate?.name||candidate||'').toLowerCase();
    if(value.includes('bleu')||value.includes('blue'))return 'bleu';
    if(value.includes('rouge')||value.includes('red'))return 'rouge';
    if(value.includes('orange'))return 'orange';
    if(value.includes('vert')||value.includes('green'))return 'vert';
    return null;
  }
  function nativeBreath(){
    try { return typeof breath !== 'undefined' && breath ? breath : null; } catch(_) { return null; }
  }
  function isActiveSession(page){return page.classList.contains('breath-immersive') || !!$('stopBreathBtn') && !$('stopBreathBtn').hidden;}
  function init(){
    const page=$('breath');
    if(!page || page.dataset.murBreathV152==='1') return;
    page.dataset.murBreathV152='1';page.classList.add('mur-b152');
    const style=document.createElement('style');style.id='mur-breath-v152-css';style.textContent=CSS;document.head.appendChild(style);
    // On réutilise la classe native .card et les boutons native .secondary/.primary.
    const heading=document.createElement('div');heading.className='mur-b152-title';heading.innerHTML='<h2>Respiration</h2><small>NeuroFlex</small>';
    const rec=document.createElement('div');rec.className='card mur-b152-recommend';
    rec.innerHTML=`<span class="mur-b152-rec-icon">${ICONS.waves}</span><div><div class="mur-b152-rec-top"></div><div class="mur-b152-rec-main"></div><div class="mur-b152-rec-sub"></div></div>`;
    const status=document.createElement('div');status.className='mur-b152-status';status.innerHTML='<span data-b152-status="rhythm"></span><span data-b152-status="duration"></span><span data-b152-status="sound"></span>';
    const controls=document.createElement('div');controls.className='mur-b152-controls';
    const buttons=['rhythm','duration','sound'].map((key,i)=>{
      const button=document.createElement('button');button.type='button';button.className='card mur-b152-control';button.dataset.b152=key;
      button.innerHTML=ICONS[["rhythm","clock","waves"][i]]+'<span></span>';
      controls.appendChild(button);return button;
    });
    const start=document.createElement('button');start.type='button';start.className='primary mur-b152-start';
    const advanced=document.createElement('button');advanced.type='button';advanced.className='mur-b152-advanced';
    const close=document.createElement('button');close.type='button';close.className='secondary mur-b152-close';
    page.append(heading,rec,status,controls,start,advanced,close);

    // V153 : le véritable interrupteur natif « Intro active » reste visible
    // sur la page principale, y compris lors de l'introduction vocale.
    // On DEPLACE le bouton existant (sans duplication de son id ou de son onclick).
    const introToggle=$('breathIntroToggle');
    const introRow=document.createElement('div');
    introRow.className='mur-b153-intro-row';
    const introCaption=document.createElement('span');
    introCaption.className='mur-b153-intro-caption';
    if(introToggle){
      introToggle.parentNode?.insertBefore(document.createComment('Intro M.U.R. déplacée sur la page Respiration'),introToggle);
      introRow.appendChild(introToggle);
      introRow.appendChild(introCaption);
      page.appendChild(introRow);
    }


    function refresh(){
      const english=en(),zone=zoneKey(),actual=nativeBreath();
      const recommendedKey=zone ? RECOMMEND[zone] : null;
      const recData=recommendedKey && typeof BREATHS!=='undefined'?BREATHS[recommendedKey]:null;
      const current=actual || (typeof BREATHS!=='undefined'?BREATHS[$('protocolSelect')?.value||'365']:null);
      const ri=recData?.i??5, re=recData?.e??5;
      const ai=current?.i??5, ae=current?.e??5;
      const active=isActiveSession(page);
      if(introToggle){
        // La fonction native updateBreathIntroToggle reste seule source de vérité.
        introCaption.textContent=active && page.classList.contains('breath-voice-only')
          ? (english?'Voice introduction in progress':'Introduction vocale en cours')
          : (english?'Voice guidance before the session':'Guidage vocal avant la séance');
        const nativeLabel=$('breathIntroLabel');
        if(nativeLabel)nativeLabel.textContent=english
          ? (introToggle.getAttribute('aria-pressed')==='true'?'Intro on':'Intro off')
          : (introToggle.getAttribute('aria-pressed')==='true'?'Intro active':'Intro inactive');
      }

      page.style.setProperty('--mur-b152-color',COLORS[zone]||'#22c55e');
      heading.querySelector('h2').textContent=english?'Breathing':'Respiration';
      rec.querySelector('.mur-b152-rec-top').textContent=english?'Recommended by NeuroFlex':'Rythme recommandé par NeuroFlex';
      rec.querySelector('.mur-b152-rec-main').textContent=zone?`${ri} s / ${re} s`:(english?'Complete both tests':'Effectuez vos deux tests');
      const name=zone?({bleu:english?'Blue':'Bleue',vert:english?'Green':'Verte',orange:'Orange',rouge:english?'Red':'Rouge'})[zone]:null;
      rec.querySelector('.mur-b152-rec-sub').textContent=name?(english?'Zone ':'Zone ')+name+(actual?.key && actual.key!==recommendedKey?(english?' · Custom rhythm selected':' · Rythme personnalisé sélectionné'):''):(english?'Start with an easy rhythm.':'En attendant, un rythme doux reste disponible.');
      status.querySelector('[data-b152-status="rhythm"]').textContent=`${ai} s / ${ae} s`;
      status.querySelector('[data-b152-status="duration"]').textContent=active?($('timeLeft')?.textContent||'--:--'):`${Math.round(Number(current?.duration||300)/60)} min`;
      const soundOn=$('soundBtn')?.getAttribute('aria-pressed')!=='false';
      status.querySelector('[data-b152-status="sound"]').textContent=english?(soundOn?'Sound on':'Muted'):(soundOn?'Son actif':'Silence');
      buttons[0].querySelector('span').textContent=english?'Choose rhythm':'Choisir un rythme';
      buttons[1].querySelector('span').textContent=english?'Duration':'Durée';
      buttons[2].querySelector('span').textContent=english?'Sound':'Ambiance sonore';
      buttons.forEach((b,i)=>{b.disabled=active&&i<2;b.setAttribute('aria-label',b.querySelector('span').textContent);});
      start.textContent=active?(english?'■ Stop session':'■ Arrêter la séance'):(english?'▶ Start my breathing':'▶ Démarrer ma respiration');
      advanced.textContent=english?'Advanced settings':'Réglages avancés';
      advanced.disabled=active;
      close.textContent=english?'✕ Close':'✕ Fermer';
      // Le texte natif reste piloté par le moteur pendant la séance.
      if(!active && $('phaseText'))$('phaseText').textContent=english?'Ready to breathe?':'Prêt à respirer ?';
    }
    function openSettings(which){
      if(isActiveSession(page))return;
      page.classList.add('mur-b152-settings');
      if(which==='rhythm')$('breathMaster')?.classList.add('open');
      if(which==='duration' && !$('manualPanel')?.classList.contains('open'))window.toggleManual?.();
      refresh();
    }
    function closeSettings(){page.classList.remove('mur-b152-settings');refresh();}
    buttons[0].addEventListener('click',()=>openSettings('rhythm'));
    buttons[1].addEventListener('click',()=>openSettings('duration'));
    buttons[2].addEventListener('click',()=>{ $('soundBtn')?.click();refresh(); });
    advanced.addEventListener('click',()=>openSettings('advanced'));
    close.addEventListener('click',closeSettings);
    start.addEventListener('click',()=>{
      closeSettings();
      // Important : passer par la vraie fonction native, jamais par une
      // fonction de démonstration. Elle garde sons, restrictions et historique.
      $('orb')?.click();
      requestAnimationFrame(refresh);
    });
    // Le clic sur une option native doit refermer les réglages, sans créer une page.
    page.addEventListener('click',event=>{
      if(event.target.closest?.('.breath-choice')){setTimeout(closeSettings,0);}
      else if(event.target.closest?.('.manual-duration-stepper,.manual-duration-buttons,#manualPanel,#breathSlider,#manualToggleBtn'))setTimeout(refresh,0);
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape' && page.classList.contains('mur-b152-settings'))closeSettings();});
    new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    new MutationObserver(refresh).observe(page,{attributes:true,attributeFilter:['class']});
    const nativeSelect=$('protocolSelect');
    if(nativeSelect)nativeSelect.addEventListener('change',refresh);
    window.addEventListener('storage',refresh);
    window.addEventListener('mur-content-loaded',refresh);
    // Les décomptes sont natifs et ne déclenchent aucun événement JS.
    let last='';
    setInterval(()=>{
      if(!page.classList.contains('active'))return;
      const b=nativeBreath();const key=JSON.stringify([b?.key,b?.duration,b?.i,b?.e,$('timeLeft')?.textContent,$('soundBtn')?.getAttribute('aria-pressed'),zoneKey(),page.classList.contains('breath-immersive')]);
      if(key!==last){last=key;refresh();}
    },500);
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* M.U.R. V153 — INTRO ACTIVE SUR LA MEME PAGE RESPIRATION.
   La commande native est déplacée dans le panneau visible ; ni seconde page,
   ni duplication de l'interrupteur, ni modification du moteur vocal. */
(() => {
  'use strict';
  window.MUR_BREATH_V153={version:153,intro:'same-page-native-toggle'};
  const css=document.createElement('style');
  css.id='mur-breath-v153-intro-css';
  css.textContent=`
    #breath.mur-b152.page.active > .mur-b153-intro-row{
      order:5!important;display:flex!important;align-items:center!important;
      justify-content:space-between!important;gap:8px!important;
      width:100%!important;min-width:0!important;padding:4px 10px!important;
      border:1px solid var(--line,rgba(255,255,255,.16))!important;
      border-radius:16px!important;background:linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.055))!important;
      box-shadow:var(--shadow,0 10px 30px rgba(0,0,0,.2))!important;
    }
    #breath.mur-b152 .mur-b153-intro-row #breathIntroToggle{
      flex:0 0 auto!important;display:inline-flex!important;visibility:visible!important;
      margin:0!important;pointer-events:auto!important;min-height:36px!important;
      background:rgba(255,255,255,.065)!important;
      border-color:rgba(255,255,255,.2)!important;
    }
    #breath.mur-b152 .mur-b153-intro-caption{
      color:var(--muted,rgba(248,250,252,.68))!important;
      font-size:11px!important;line-height:1.25!important;text-align:right!important;
    }
    #breath.mur-b152.page.active > .mur-b152-start{order:6!important}
    #breath.mur-b152.page.active > .mur-b152-advanced{order:7!important}
    @media(max-height:670px){
      #breath.mur-b152.page.active > .mur-b153-intro-row{padding:3px 7px!important}
      #breath.mur-b152 .mur-b153-intro-caption{font-size:10px!important}
    }
  `;
  document.head.appendChild(css);
})();


/* ================================================================
   M.U.R. V154 — RESPIRATION IMMERSIVE AU DEMARRAGE
   La préparation vocale et la séquence respiratoire partagent UN
   seul écran plein format. Retour à l'écran compact à l'arrêt.
   Aucun changement du moteur natif, des sons ou de Supabase.
   ================================================================ */
(() => {
  'use strict';
  if (window.MUR_BREATH_V154) return;
  window.MUR_BREATH_V154 = {version:154, mode:'fullscreen-session-with-intro'};

  const CSS = `
    /* Le plein écran prend la fenêtre, pas une seconde page. */
    #breath.mur-b152.page.active.mur-b154-fullscreen{
      position:fixed!important;inset:0!important;top:0!important;left:0!important;
      z-index:19000!important;width:100vw!important;height:100vh!important;
      height:100dvh!important;max-width:none!important;min-height:0!important;
      padding:calc(12px + env(safe-area-inset-top,0px)) 14px calc(16px + env(safe-area-inset-bottom,0px))!important;
      margin:0!important;overflow:hidden!important;
      display:flex!important;flex-direction:column!important;align-items:stretch!important;
      justify-content:stretch!important;gap:0!important;
      background:radial-gradient(ellipse at 50% 44%,#122e43 0%,#091c2f 53%,#050c18 100%)!important;
      box-sizing:border-box!important;
    }
    body:has(#breath.mur-b154-fullscreen) {overflow:hidden!important;}
    body:has(#breath.mur-b154-fullscreen) .tabbar,
    body:has(#breath.mur-b154-fullscreen) main.app > header.top,
    body:has(#breath.mur-b154-fullscreen) .mur-info-page-button,
    body:has(#breath.mur-b154-fullscreen) #murQuickModePill{
      visibility:hidden!important;opacity:0!important;pointer-events:none!important;
    }
    #breath.mur-b154-fullscreen > .mur-b152-title,
    #breath.mur-b154-fullscreen > .mur-b152-recommend,
    #breath.mur-b154-fullscreen > .mur-b152-status,
    #breath.mur-b154-fullscreen > .mur-b152-controls,
    #breath.mur-b154-fullscreen > .mur-b153-intro-row,
    #breath.mur-b154-fullscreen > .mur-b152-start,
    #breath.mur-b154-fullscreen > .mur-b152-advanced,
    #breath.mur-b154-fullscreen > .mur-b152-close{display:none!important;}
    #breath.mur-b154-fullscreen > .mur-b154-top{
      display:flex!important;align-items:center!important;justify-content:space-between!important;
      flex:0 0 auto!important;width:100%!important;min-height:49px!important;
      gap:10px!important;order:0!important;z-index:4!important;
    }
    #breath.mur-b154-fullscreen .mur-b154-heading{
      display:flex;flex-direction:column;gap:3px;min-width:0;align-items:flex-start;
      color:#f8fafc;font-weight:800;font-size:17px;line-height:1.2;
    }
    #breath.mur-b154-fullscreen .mur-b154-subtitle{
      font-size:11px;color:rgba(248,250,252,.72);font-weight:600;
    }
    #breath.mur-b154-fullscreen .mur-b154-exit{
      color:#f8fafc;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.23);
      border-radius:13px;padding:9px 12px;min-height:42px;font:700 13px system-ui,sans-serif;
      cursor:pointer;flex:0 0 auto;
    }
    /* Seul le panneau de respiration d'origine est agrandi. */
    #breath.mur-b152.page.active.mur-b154-fullscreen > section.card:last-of-type,
    #breath.mur-b152.page.active.breath-immersive.mur-b154-fullscreen > section.card:last-of-type{
      position:relative!important;inset:auto!important;top:auto!important;left:auto!important;
      right:auto!important;bottom:auto!important;order:1!important;
      flex:1 1 0!important;min-height:0!important;max-height:none!important;
      width:100%!important;height:auto!important;max-width:100%!important;
      display:flex!important;flex-direction:column!important;align-items:center!important;
      justify-content:space-between!important;gap:clamp(7px,1.5dvh,18px)!important;
      padding:10px 0 4px!important;margin:0!important;overflow:hidden!important;
      background:transparent!important;box-shadow:none!important;border:0!important;
      border-radius:0!important;z-index:auto!important;isolation:auto!important;
    }
    #breath.mur-b154-fullscreen section.card:last-of-type > .mini-info,
    #breath.mur-b152.page.active.mur-b154-fullscreen section.card:last-of-type > .mini-info{
      display:grid!important;grid-template-columns:1fr 1fr!important;gap:9px!important;
      width:min(100%,370px)!important;flex:0 0 auto!important;order:0!important;
      margin:4px auto 0!important;
    }
    #breath.mur-b154-fullscreen .mini-info .info-box{
      border:1px solid rgba(255,255,255,.16)!important;
      border-radius:16px!important;background:rgba(255,255,255,.07)!important;
      padding:9px 11px!important;
    }
    #breath.mur-b154-fullscreen .mini-info .info-box strong{font-size:21px!important;}
    #breath.mur-b152.page.active.mur-b154-fullscreen .breath-stage,
    #breath.mur-b152.page.active.breath-immersive.mur-b154-fullscreen .breath-stage{
      order:1!important;flex:1 1 0!important;min-height:0!important;height:auto!important;
      width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;
      position:relative!important;overflow:visible!important;
    }
    #breath.mur-b152.page.active.mur-b154-fullscreen #orb,
    #breath.mur-b152.page.active.breath-immersive.mur-b154-fullscreen #orb.mur-breath-particle-orb{
      width:min(56vw,35dvh,285px)!important;height:min(56vw,35dvh,285px)!important;
      max-width:none!important;max-height:none!important;
      transform-origin:center center!important;
    }
    #breath.mur-b152.page.active.mur-b154-fullscreen .breath-stage > svg.ring,
    #breath.mur-b152.page.active.breath-immersive.mur-b154-fullscreen .breath-stage > svg.ring{
      width:min(77vw,48dvh,360px)!important;height:min(77vw,48dvh,360px)!important;
    }
    #breath.mur-b152.page.active.mur-b154-fullscreen #phaseText.mur-breath-label-v53,
    #breath.mur-b152.page.active.breath-immersive.mur-b154-fullscreen #phaseText.mur-breath-label-v53{
      order:2!important;display:block!important;margin:0 auto!important;
      font-size:clamp(20px,5vw,26px)!important;padding:10px 22px!important;
      min-width:145px!important;
    }
    #breath.mur-b152.page.active.mur-b154-fullscreen #phaseHint{
      display:block!important;order:3!important;flex:0 0 auto!important;
      text-align:center!important;font-size:clamp(12px,3.4vw,15px)!important;
      color:rgba(235,248,251,.8)!important;line-height:1.4!important;
      max-width:380px!important;margin:0 auto!important;
    }
    #breath.mur-b152.page.active.mur-b154-fullscreen .breath-action-row{
      display:flex!important;order:4!important;flex:0 0 auto!important;
      width:100%!important;max-width:370px!important;justify-content:center!important;
      margin:3px auto 0!important;
    }
    #breath.mur-b152.page.active.mur-b154-fullscreen #stopBreathBtn{
      display:block!important;width:100%!important;min-height:49px!important;
      border-radius:16px!important;font-weight:800!important;
      background:rgba(255,255,255,.11)!important;color:#fff!important;
      border:1px solid rgba(255,255,255,.25)!important;
    }
    #breath.mur-b152.page.active.mur-b154-fullscreen .orb-sound-btn{
      display:flex!important;z-index:5!important;
    }
    #breath.mur-b152.page.active.mur-b154-fullscreen > .mur-b154-top .mur-b154-exit:focus-visible{
      outline:2px solid #9be8d8;outline-offset:2px;
    }
    #breath.mur-b152.page.active:not(.mur-b154-fullscreen) > .mur-b154-top{display:none!important;}
    @media(max-height:650px){
      #breath.mur-b152.page.active.mur-b154-fullscreen{padding-top:calc(4px + env(safe-area-inset-top,0px))!important;padding-bottom:calc(5px + env(safe-area-inset-bottom,0px))!important}
      #breath.mur-b152.page.active.mur-b154-fullscreen > section.card:last-of-type{padding:3px 0!important;gap:4px!important}
      #breath.mur-b152.page.active.mur-b154-fullscreen #orb,
      #breath.mur-b152.page.active.breath-immersive.mur-b154-fullscreen #orb.mur-breath-particle-orb{width:min(49vw,26dvh,215px)!important;height:min(49vw,26dvh,215px)!important}
      #breath.mur-b154-fullscreen .mini-info .info-box{padding:5px!important}
    }
  `;
  const style = document.createElement('style');
  style.id='mur-breath-v154-fullscreen-css';
  style.textContent=CSS;
  document.head.appendChild(style);

  function init(){
    const page=document.getElementById('breath');
    if(!page||page.dataset.murV154==='1')return;
    page.dataset.murV154='1';
    const header=document.createElement('div');
    header.className='mur-b154-top';
    const heading=document.createElement('div');heading.className='mur-b154-heading';
    const name=document.createElement('span');
    const subtitle=document.createElement('small');subtitle.className='mur-b154-subtitle';
    heading.append(name,subtitle);
    const exit=document.createElement('button');exit.type='button';exit.className='mur-b154-exit';
    header.append(heading,exit);
    page.appendChild(header);
    const start=page.querySelector('.mur-b152-start');
    let starting=false;
    let startedAt=0;
    const nativeActive=()=>page.classList.contains('breath-immersive') ||
      page.classList.contains('breath-voice-only') ||
      (document.getElementById('stopBreathBtn')?.hidden===false);
    const english=()=>String(document.documentElement.lang||'fr').toLowerCase().startsWith('en');
    function sync(){
      const visible=page.classList.contains('active');
      const active=visible && nativeActive();
      // Le chargement audio peut être asynchrone : conserver le plein écran
      // pendant ce court lancement, mais pas si une restriction bloque la séance.
      if(starting && (active || performance.now()-startedAt>1400))starting=false;
      const full=visible && (active || starting);
      if(page.classList.contains('mur-b154-fullscreen')!==full){
        page.classList.toggle('mur-b154-fullscreen',full);
        if(!full)document.body.classList.remove('mur-b154-starting');
      }
      if(full){
        const en=english();
        const intro=page.classList.contains('breath-voice-only') ||
          String(document.getElementById('phaseText')?.textContent||'').toLowerCase().includes('preparation');
        name.textContent=en?'Breathing':'Respiration';
        subtitle.textContent=intro?(en?'Preparation':'Préparation'):(en?'Session in progress':'Séquence en cours');
        exit.textContent=en?'← Stop and return':'← Arrêter et revenir';
      }
    }
    // Activation dans le même geste, avant le clic natif sur l'orbe.
    start?.addEventListener('click',()=>{
      if(nativeActive())return;
      starting=true;startedAt=performance.now();
      page.classList.add('mur-b154-fullscreen');
      sync();
    },true);
    exit.addEventListener('click',()=>{
      const stop=document.getElementById('stopBreathBtn');
      if(stop && !stop.hidden)stop.click();
      else if(typeof window.stopBreathing==='function')window.stopBreathing();
      starting=false;page.classList.remove('mur-b154-fullscreen');
      sync();
    });
    new MutationObserver(sync).observe(page,{attributes:true,attributeFilter:['class']});
    const stop=document.getElementById('stopBreathBtn');
    if(stop)new MutationObserver(sync).observe(stop,{attributes:true,attributeFilter:['hidden']});
    new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    // Le moteur règle running/breathVoicePlaying en asynchrone.
    setInterval(()=>{if(page.classList.contains('active') || page.classList.contains('mur-b154-fullscreen'))sync();},300);
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* ============================================================
   M.U.R. V155 — SPHERE RESPIRATION STYLE TENDANCE ki.S
   Même page Respiration, même moteur natif, mais la sphère prend
   d'abord l'apparence de la carte tendance ki.S puis ses points
   évoluent vers la couleur de la respiration choisie.
   ============================================================ */
(() => {
  'use strict';
  if (window.MUR_BREATH_KIS_STYLE_V155) return;
  window.MUR_BREATH_KIS_STYLE_V155 = true;

  const fallbackKis = {
    pose: '#538fc6',
    pose_funambule: '#4ea7b2',
    funambule: '#5baf96',
    pose_fonceur: '#7a87c9',
    funambule_fonceur: '#d0a067',
    fonceur: '#c96e72',
    equilibre: '#5baf96'
  };
  const protocolPalette = {
    boost: [59,130,246],
    '365': [34,197,94],
    coherence: [34,197,94],
    square: [34,197,94],
    regulate: [245,158,11],
    frein: [239,68,68],
    '478': [239,68,68],
    sleep: [99,102,241]
  };
  const COUNT = 280;
  const GOLD = Math.PI * (3 - Math.sqrt(5));
  const TAU = Math.PI * 2;
  const POINTS = Array.from({length: COUNT}, (_, i) => {
    const y = 1 - 2 * (i + .5) / COUNT;
    const a = i * GOLD;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    return {x: r * Math.cos(a), y, z: r * Math.sin(a), seed: (i % 17) / 17};
  });

  function parseRGB(str){
    const s = String(str || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return [1,3,5].map(i => parseInt(s.slice(i, i + 2), 16));
    if (/^#[0-9a-f]{3}$/i.test(s)) return [1,2,3].map(i => parseInt(s[i] + s[i], 16));
    if (/^rgba?\(/i.test(s)) return (s.match(/[\d.]+/g) || []).slice(0,3).map(Number);
    return null;
  }
  function clamp(v){ return Math.max(0, Math.min(255, Math.round(v))); }
  function mix(a,b,t){ return a.map((v,i) => clamp(v * (1 - t) + b[i] * t)); }
  function tint(rgb,f){ return rgb.map(v => clamp(v + (255 - v) * f)); }
  function shade(rgb,f){ return rgb.map(v => clamp(v * (1 - f))); }

  function neuroFlexRGB(){
    const palette = {bleu:[59,150,247], vert:[85,233,153], orange:[255,165,63], rouge:[255,88,100]};
    let zone = null;
    try { zone = JSON.parse(localStorage.getItem('murLastNeuro') || 'null')?.zone || null; } catch (_) {}
    if (!zone) {
      try { zone = window.getCurrentNeuroRecommendation?.()?.zone || null; } catch (_) {}
    }
    const key = String(zone?.key || zone?.name || zone || '').toLowerCase();
    const direct = parseRGB(zone?.color || '');
    if (direct && direct.every(Number.isFinite)) return direct;
    if (key.includes('bleu') || key.includes('blue')) return palette.bleu;
    if (key.includes('orange')) return palette.orange;
    if (key.includes('rouge') || key.includes('red')) return palette.rouge;
    return palette.vert;
  }
  function kisBaseRGB(){
    try {
      const kis = JSON.parse(localStorage.getItem('murKis') || 'null') || {};
      const key = kis.cardKey;
      const picked = key && fallbackKis[key] ? parseRGB(fallbackKis[key]) : null;
      if (picked && picked.every(Number.isFinite)) return picked;
    } catch (_) {}
    return neuroFlexRGB();
  }
  function currentProtocolRGB(){
    const select = document.getElementById('protocolSelect');
    const key = select?.value || '365';
    const activeCard = document.getElementById('breathCard_' + key);
    const cssColor = activeCard ? getComputedStyle(activeCard).getPropertyValue('--family-color') : '';
    const parsed = parseRGB(cssColor);
    if (parsed && parsed.every(Number.isFinite)) return parsed;
    return protocolPalette[key] || neuroFlexRGB();
  }
  function sessionActive(page){
    const stop = document.getElementById('stopBreathBtn');
    return !!(page?.classList.contains('breath-immersive') || (stop && !stop.hidden));
  }

  function install(){
    const page = document.getElementById('breath');
    const orb = document.getElementById('orb');
    if (!page || !orb || orb.querySelector('.mur-breath-points-v155')) return;

    const style = document.createElement('style');
    style.id = 'mur-breath-kis-style-v155-css';
    style.textContent = `
      #breath #orb.mur-breath-particle-orb .mur-breath-points-v53{opacity:0!important;}
      #breath #orb.mur-breath-particle-orb .mur-breath-points-v155{
        position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
        border-radius:50%!important;pointer-events:none!important;z-index:1!important;
      }
      #breath #orb.mur-breath-particle-orb::before{
        content:'';position:absolute;inset:13%;border-radius:50%;pointer-events:none;z-index:0;
        background:radial-gradient(circle at 48% 42%, rgba(255,255,255,.16), rgba(255,255,255,.03) 44%, rgba(255,255,255,0) 74%);
        filter:blur(1px);
      }
      #breath #orb.mur-breath-particle-orb::after{
        content:'';position:absolute;inset:-7%;border-radius:50%;pointer-events:none;z-index:0;
        background:radial-gradient(circle, rgba(126,232,186,.10), rgba(126,232,186,0) 67%);
        opacity:.92;
      }
    `;
    document.head.appendChild(style);

    const canvas = document.createElement('canvas');
    canvas.className = 'mur-breath-points-v155';
    canvas.setAttribute('aria-hidden','true');
    const ctx = canvas.getContext('2d', {alpha:true});
    if (!ctx) return;
    orb.insertBefore(canvas, orb.firstChild);

    let displayColor = null;
    let fromColor = null;
    let toColor = null;
    let changedAt = 0;
    let lastActive = sessionActive(page);

    function beginColorChange(target, now = performance.now()){
      const next = [...target];
      if (!displayColor) displayColor = [...next];
      if (toColor && next.every((v,i) => v === toColor[i])) return;
      fromColor = [...(displayColor || next)];
      toColor = next;
      changedAt = now;
    }

    function syncTarget(now = performance.now()){
      const active = sessionActive(page);
      if (!displayColor) {
        const base = kisBaseRGB();
        displayColor = [...base];
        fromColor = [...base];
        toColor = [...base];
      }
      if (active && !lastActive) beginColorChange(currentProtocolRGB(), now);
      if (!active && lastActive) beginColorChange(kisBaseRGB(), now);
      lastActive = active;
    }

    document.getElementById('protocolSelect')?.addEventListener('change', () => beginColorChange(currentProtocolRGB()));
    document.getElementById('breathSlider')?.addEventListener('change', () => beginColorChange(currentProtocolRGB()));
    page.addEventListener('click', event => {
      if (event.target.closest?.('.breath-choice,[data-b152="rhythm"],.mur-b152-start')) {
        queueMicrotask(() => beginColorChange(sessionActive(page) ? currentProtocolRGB() : currentProtocolRGB()));
      }
    }, true);
    window.addEventListener('storage', () => beginColorChange(kisBaseRGB()));

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    function renderFrame(ts){
      requestAnimationFrame(renderFrame);
      syncTarget(ts);
      if (document.hidden || !page.classList.contains('active')) return;
      const size = Math.max(64, orb.offsetWidth || 0);
      if (!size) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const physical = Math.round(size * dpr);
      if (canvas.width !== physical || canvas.height !== physical) {
        canvas.width = physical;
        canvas.height = physical;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const baseColor = (!displayColor || !toColor) ? kisBaseRGB() : toColor;
      if (!displayColor) {
        displayColor = [...baseColor];
        fromColor = [...baseColor];
        toColor = [...baseColor];
      }
      const p = changedAt ? Math.max(0, Math.min(1, (ts - changedAt) / 560)) : 1;
      const eased = p * p * (3 - 2 * p);
      displayColor = mix(fromColor || toColor, toColor || fromColor, eased);

      const center = size / 2;
      const radius = size * 0.40;
      const angle = reduced?.matches ? 0.34 : ts * 0.00016;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      const tilt = 0.15;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const near = tint(displayColor, 0.48);
      const far = shade(displayColor, 0.10);

      const glow = ctx.createRadialGradient(center, center, size * 0.02, center, center, size * 0.50);
      glow.addColorStop(0, `rgba(${displayColor[0]},${displayColor[1]},${displayColor[2]},0.15)`);
      glow.addColorStop(0.52, `rgba(${displayColor[0]},${displayColor[1]},${displayColor[2]},0.04)`);
      glow.addColorStop(1, `rgba(${displayColor[0]},${displayColor[1]},${displayColor[2]},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      const projected = POINTS.map(pnt => {
        const x = pnt.x * ca - pnt.z * sa;
        const z = pnt.x * sa + pnt.z * ca;
        const y2 = pnt.y * ct - z * st;
        const z2 = pnt.y * st + z * ct;
        return {x, y: y2, z: z2, seed: pnt.seed};
      }).sort((a,b) => a.z - b.z);

      ctx.globalCompositeOperation = 'lighter';
      for (const pnt of projected) {
        const perspective = 2.8 / (2.8 - pnt.z * 0.28);
        const depth = (pnt.z + 1) * 0.5;
        const sx = center + pnt.x * radius * perspective;
        const sy = center + pnt.y * radius * perspective;
        const rr = Math.round(far[0] + (near[0] - far[0]) * depth);
        const gg = Math.round(far[1] + (near[1] - far[1]) * depth);
        const bb = Math.round(far[2] + (near[2] - far[2]) * depth);
        const alpha = 0.24 + depth * 0.72;
        const dot = 0.80 + depth * 0.72 + pnt.seed * 0.18;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
        ctx.beginPath();
        ctx.arc(sx, sy, dot, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    beginColorChange(kisBaseRGB(), 0);
    requestAnimationFrame(renderFrame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();


/* M.U.R. V156 — Affichage « Préparation » pendant l'introduction active.
   Les phases Inspirez/Expirez restent pilotées par le moteur natif. */
(() => {
  'use strict';
  if (window.MUR_BREATH_PREPARATION_V156) return;
  window.MUR_BREATH_PREPARATION_V156 = true;

  function install() {
    const page = document.getElementById('breath');
    const label = document.getElementById('phaseText');
    if (!page || !label) return;
    const update = () => {
      // Le moteur ajoute cette classe exclusivement pendant l'introduction vocale,
      // avant le démarrage de la respiration proprement dite.
      if (!page.classList.contains('breath-voice-only')) return;
      const english = String(document.documentElement.lang || 'fr').toLowerCase().startsWith('en');
      const desired = english ? 'Preparation' : 'Préparation';
      if (label.textContent !== desired) label.textContent = desired;
      const hint = document.getElementById('phaseHint');
      if (hint) {
        const message = english ? 'Voice introduction in progress' : 'Introduction vocale en cours';
        if (hint.textContent !== message) hint.textContent = message;
      }
    };
    new MutationObserver(update).observe(page, {attributes: true, attributeFilter: ['class']});
    new MutationObserver(update).observe(label, {childList: true, characterData: true, subtree: true});
    new MutationObserver(update).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();


/* =============================================================
   M.U.R. V157 — Démarrer par la sphère / plein écran épuré
   La sphère conserve son gestionnaire natif : aucune simulation de clic.
   L'arrêt reste disponible via le bouton natif pendant la séance.
   ============================================================= */
(() => {
  'use strict';
  if (window.MUR_BREATH_V157) return;
  window.MUR_BREATH_V157 = true;
  const style = document.createElement('style');
  style.id = 'mur-breath-v157-css';
  style.textContent = `
    /* Supprimer le bouton de retour redondant ; garder Arrêter la séance. */
    #breath.mur-b154-fullscreen .mur-b154-exit {display:none!important;}
    #breath.mur-b154-fullscreen .mur-b154-subtitle {display:none!important;}
    /* La sphère devient la cible principale au démarrage. */
    #breath.mur-b152.page.active:not(.mur-b154-fullscreen) #orb {
      cursor:pointer!important;touch-action:manipulation!important;
      -webkit-tap-highlight-color:transparent;
    }
    #breath.mur-b152.page.active:not(.mur-b154-fullscreen) .mur-b154-top {display:none!important;}
    #breath.mur-b152.page.active .mur-b152-title > small {display:none!important;}
  `;
  document.head.appendChild(style);

  function install(){
    const page = document.getElementById('breath');
    const orb = document.getElementById('orb');
    if (!page || !orb || orb.dataset.murV157 === '1') return;
    orb.dataset.murV157 = '1';
    const stop = document.getElementById('stopBreathBtn');
    const nativeActive = () => page.classList.contains('breath-immersive') ||
      page.classList.contains('breath-voice-only') || (stop && stop.hidden === false);
    // Le moteur natif écoute déjà le clic sur #orb et sait démarrer / arrêter.
    // On active le plein écran AVANT ce gestionnaire, sans toucher à son fonctionnement.
    orb.addEventListener('click', () => {
      if (!page.classList.contains('active') || nativeActive()) return;
      // La classe est retirée automatiquement par le synchroniseur V154
      // si le moteur n'autorise pas ou ne démarre pas la séance.
      page.classList.add('mur-b154-fullscreen');
    }, true);
    // La préconisation reste lisible sans doublon de marque dans le titre.
    const recTop = page.querySelector('.mur-b152-rec-top');
    if (recTop) {
      const clean = () => {
        const value = String(recTop.textContent || '');
        if (value === 'Rythme recommandé par NeuroFlex') recTop.textContent = 'Rythme recommandé';
        else if (value === 'Recommended by NeuroFlex') recTop.textContent = 'Recommended rhythm';
      };
      new MutationObserver(clean).observe(recTop, {childList:true,characterData:true,subtree:true});
      clean();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
