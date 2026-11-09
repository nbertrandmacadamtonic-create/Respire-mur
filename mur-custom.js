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
      closeTimer = window.setTimeout(closeMenu, 4500);
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
  const FILE = 'mur-souffle-vivant.js?v=21.15';
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
