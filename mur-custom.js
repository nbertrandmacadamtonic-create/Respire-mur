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

/* En-tête de rubrique : logo officiel sur l'accueil, orbe contextuelle ailleurs. */
(() => {
  const SECTIONS = {
    tests:     { color: '#60a5fa', fr: 'Mesurer',   en: 'Measure' },
    breath:    { color: '#34d399', fr: 'Respirer',  en: 'Breathe' },
    exercises: { color: '#a78bfa', fr: 'Exercices', en: 'Exercises' },
    stats:     { color: '#22d3c5', fr: 'Stats',      en: 'Stats' }
  };

  function initSectionBrand() {
    const brand = document.querySelector('.app > .top .brand');
    const title = brand?.querySelector('h1');
    if (!brand || !title || brand.dataset.murSectionBrandReady === '1') return;
    brand.dataset.murSectionBrandReady = '1';

    const originalTitle = title.innerHTML;
    const orb = document.createElement('span');
    orb.className = 'mur-section-brand-orb';
    orb.setAttribute('role', 'button');
    orb.tabIndex = 0;
    orb.addEventListener('pointerdown', event => event.stopPropagation());
    orb.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      window.showPage?.('home');
    });
    orb.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      window.showPage?.('home');
    });

    function language() {
      const stored = localStorage.getItem('murLanguage') || localStorage.getItem('murLang');
      const value = String(stored || document.documentElement.lang || 'fr').toLowerCase();
      return value.startsWith('en') ? 'en' : 'fr';
    }

    function refresh() {
      const active = document.querySelector('.app > .page.active');
      const section = active && SECTIONS[active.id];
      if (!section) {
        brand.classList.remove('mur-section-brand');
        orb.remove();
        title.innerHTML = originalTitle;
        return;
      }

      orb.style.setProperty('--mur-section-color', section.color);
      orb.setAttribute('aria-label', language() === 'en' ? 'Back to home' : "Retour à l'accueil");
      if (!orb.isConnected) brand.insertBefore(orb, brand.firstChild);
      brand.classList.add('mur-section-brand');
      title.textContent = section[language()];
    }

    document.querySelectorAll('.app > .page').forEach(page => {
      new MutationObserver(refresh).observe(page, {
        attributes: true,
        attributeFilter: ['class']
      });
    });
    new MutationObserver(refresh).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-language]')) setTimeout(refresh, 0);
    });
    window.addEventListener('storage', refresh);
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSectionBrand, { once: true });
  } else {
    initSectionBrand();
  }
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
      if(!circle.isConnected || !document.getElementById('home')?.classList.contains('active')){previous=t;return;}
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
   M.U.R. V50 — SPHERES FIXES, LABELS LISIBLES, ARCS ORBITAUX
   La sphère de 2400 points se dissout ; 5 sphères denses naissent du nuage.
   Les clics sont transmis aux commandes natives existantes.
   Aucun changement index.html / tests / respiration / historique.
   ============================================================= */
(() => {
  'use strict';
  if(window.MUR_HOME_FIVE_V50)return;
  const N=2400, PER=350, CENTER_PER=650, OPEN_MS=2350, CLOSE_MS=1550;
  const TAU=Math.PI*2, GOLD=Math.PI*(3-Math.sqrt(5));
  const GROUPS=[
    {key:'quick',fr:'Urgence',en:'Urgent',icon:'ϟ',rgb:[255,45,67]},
    {key:'tests',fr:'Mesurer',en:'Measure',icon:'⌁',rgb:[24,135,255]},
    {key:'breath',fr:'Respirer',en:'Breathe',icon:'◌',rgb:[0,235,137]},
    {key:'exercises',fr:'Exercices',en:'Exercises',icon:'✦',rgb:[255,127,20]},
    {key:'stats',fr:'Stats',en:'Stats',icon:'▥',rgb:[255,46,138]}
  ];
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  // Deux populations distinctes : 2400 points de la sphère source et
  // 650 points au centre, 350 par sphère périphérique (sans scission).
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
    if(!circle||!home||!nativeMenu||circle.dataset.murFiveV50)return;
    circle.dataset.murFiveV50='1';
    const style=document.createElement('style');
    style.id='mur-five-spheres-v50-css';
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
      b.dataset.key=g.key;b.innerHTML='<span class="mur-five-icon"></span><span class="mur-five-label"></span>';
      const pictogram=b.querySelector('.mur-five-icon');
      if(g.key==='breath'){
        pictogram.innerHTML='<svg viewBox="0 0 32 32" width="31" height="31" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 5v17"/><path d="M16 11c-3-4-5-5-7-4-4 2-6 9-4 14 1.5 4 6 5 9 2l2-3"/><path d="M16 11c3-4 5-5 7-4 4 2 6 9 4 14-1.5 4-6 5-9 2l-2-3"/><path d="M12 14c-2 1-3 3-3 6M20 14c2 1 3 3 3 6"/></svg>';
        pictogram.style.color='#00ff9c';
      }else{
        pictogram.textContent=g.icon;
      }

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
      // Halo vivant de micro-particules autour de la sphère centrale.
      if(progress>.18){
        ctx.save();ctx.globalCompositeOperation='lighter';
        const haloVis=Math.min(1,(progress-.18)/.45);
        const haloCount=140;
        for(let i=0;i<haloCount;i++){
          const a=time*.0007 + i*TAU/haloCount;
          const rr=centerRadius + 10 + 8*Math.sin(time*.0012 + i*.37);
          const x=coords[0][0] + Math.cos(a)*rr;
          const y=coords[0][1] + Math.sin(a)*rr*0.88;
          const alpha=(.12 + .22*((i%7)/6))*haloVis;
          ctx.fillStyle=`rgba(255,92,108,${alpha.toFixed(3)})`;
          ctx.beginPath();ctx.arc(x,y,.9 + (i%5)*.16,0,TAU);ctx.fill();
        }
        ctx.restore();
      }
      // V46 : cercle de petits points parfaitement régulier, sans onde ni vagues.
      // Les points restent à distance fixe du centre et accompagnent uniquement
      // la rotation naturelle des quatre sphères périphériques.
      if(progress>.035){
        ctx.save();
        ctx.globalCompositeOperation='lighter';
        const visible=ease(Math.min(1,Math.max(0,(progress-.035)/.55)));
        const count=360;
        const angleOffset=0;
        for(let j=0;j<count;j++){
          const angle=angleOffset+TAU*j/count;
          const x=cx+orbitR*Math.cos(angle);
          const y=cy+orbitR*Math.sin(angle);
          // Anneau interrompu aux quatre sphères : marge de 8 px autour
          // de leur silhouette, même lorsqu'elles tournent.
          const clearRadius=radius+8;
          if(coords.slice(1).some(([bx,by])=>Math.hypot(x-bx,y-by)<clearRadius))continue;
          // Quatre quartiers aux couleurs franches ; transition très courte seulement.
          const sector=(angle-angleOffset+TAU)%TAU/(TAU/4);
          const index=Math.floor(sector);
          const fraction=sector-index;
          // Ordre des sphères sur l'anneau : droite, bas, gauche, haut.
          const order=[3,4,2,1];
          const aColor=GROUPS[order[index%4]].rgb;
          const bColor=GROUPS[order[(index+1)%4]].rgb;
          // Couleur pure pour 94 % de chaque quartier : aucun dégradé pastel.
          // Petit raccord adouci uniquement sur les 6 % finaux.
          const blend=ease(Math.max(0,Math.min(1,(fraction-.94)/.06)));
          const rgb=aColor.map((v,k)=>Math.round(v+(bColor[k]-v)*blend));
          ctx.fillStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(.98*visible).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x,y,1.30,0,TAU);
          ctx.fill();
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
      // Condensation indépendante : centre à 650 points, satellites à 350 points,
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
          ctx.globalAlpha=appear*(.88+.12*depth);
          ctx.fillStyle=`rgb(${g.rgb.join(',')})`;
          ctx.beginPath();ctx.arc(x,y,1.0+depth*1.3,0,TAU);ctx.fill();
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
    function idle(t){if(!open)return;draw(t);raf=requestAnimationFrame(idle)}
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
    window.MUR_HOME_FIVE_V50={sourceParticles:N,particlesPerSphere:PER,centralSphereParticles:CENTER_PER,smallSpheres:5,openMs:OPEN_MS,closeMs:CLOSE_MS,layout:'static-four-spheres-readable-labels-rotating-small-arcs'};
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
   M.U.R. V52 — BOULE RESPIRATION ALLEGEE ET TEXTE HORS BOULE
   2400 particules, 3D en rotation lente, dilatation pilotee par
   les phases de respiration existantes (sans modifier les cycles,
   l'audio, les pauses, les commandes ou index.html).
   ============================================================ */
(() => {
  'use strict';
  if (window.MUR_BREATH_PARTICLE_ORB_V52) return;
  const COUNT = 1200;
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
    if (!orb || !page || orb.querySelector('.mur-breath-points-v52')) return;
    const css = document.createElement('style');
    css.id = 'mur-breath-particle-v52-css';
    css.textContent = `
      #breath #orb.mur-breath-particle-orb {
        position:relative!important;
        isolation:isolate!important;
        background:transparent!important;
        box-shadow:none!important;
        overflow:visible!important;
        border:0!important;
      }
      #breath #orb.mur-breath-particle-orb .mur-breath-points-v52 {
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        z-index:0!important;
        pointer-events:none!important;
        border-radius:50%!important;
      }
      #breath #orb.mur-breath-particle-orb #phaseText {
        position:absolute!important;
        left:50%!important;
        top:calc(100% + 14px)!important;
        transform:translateX(-50%)!important;
        z-index:3!important;
        display:block!important;
        min-width:120px!important;
        max-width:220px!important;
        color:#f4fffb!important;
        font-size:clamp(14px,3.9vw,19px)!important;
        font-weight:900!important;
        line-height:1.1!important;
        letter-spacing:.01em!important;
        padding:7px 12px!important;
        border-radius:999px!important;
        background:rgba(4,25,30,.78)!important;
        border:1px solid rgba(123,255,214,.28)!important;
        text-shadow:0 1px 8px #061d1b!important;
        text-align:center!important;
        overflow-wrap:normal!important;
        word-break:normal!important;
        white-space:nowrap!important;
        box-shadow:0 6px 18px rgba(0,0,0,.16)!important;
      }
      #breath.breath-immersive #orb.mur-breath-particle-orb {box-shadow:none!important;}
      #breath.breath-immersive #orb.mur-breath-particle-orb #phaseText {top:calc(100% + 18px)!important;font-size:19px!important;}
    `;
    document.head.appendChild(css);
    const canvas = document.createElement('canvas');
    canvas.className = 'mur-breath-points-v52';
    canvas.setAttribute('aria-hidden','true');
    const ctx = canvas.getContext('2d', {alpha:true});
    if (!ctx) return;
    orb.insertBefore(canvas,orb.firstChild);
    orb.classList.add('mur-breath-particle-orb');
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
      const base = parseRGB(getComputedStyle(orb).getPropertyValue('--mur-section-color'))
        || parseRGB(getComputedStyle(page).getPropertyValue('--mur-section-color'))
        || [55,226,166];
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
    window.MUR_BREATH_PARTICLE_ORB_V52={points:COUNT, breathingAnimation:'native-orb-transform', rotation:'slow', phaseText:'below-orb', color:'trend'};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
