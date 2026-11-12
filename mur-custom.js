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
   M.U.R. V54 — SPHERES FIXES, RESPIRER BLANC, SANS LIAISONS
   La sphère de 2400 points se dissout ; 5 sphères denses naissent du nuage.
   Les clics sont transmis aux commandes natives existantes.
   Aucun changement index.html / tests / respiration / historique.
   ============================================================= */
(() => {
  'use strict';
  if(window.MUR_HOME_FIVE_V54)return;
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
    if(!circle||!home||!nativeMenu||circle.dataset.murFiveV54)return;
    circle.dataset.murFiveV54='1';
    const style=document.createElement('style');
    style.id='mur-five-spheres-v54-css';
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
    window.MUR_HOME_FIVE_V54={sourceParticles:N,particlesPerSphere:PER,centralSphereParticles:CENTER_PER,smallSpheres:5,openMs:OPEN_MS,closeMs:CLOSE_MS,layout:'static-four-spheres-no-links-white-breath-no-red-halo'};
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
   M.U.R. V76 — RESPIRATION COULEUR NEUROFLEX EXACTE
   950 particules, 3D en rotation lente, dilatation pilotee par
   les phases de respiration existantes (sans modifier les cycles,
   l'audio, les pauses, les commandes ou index.html).
   ============================================================ */
(() => {
  'use strict';
  if (window.MUR_BREATH_PARTICLE_ORB_V76) return;
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
      const base = neuroFlexColor();
      orb.dataset.murNeuroflexColor=base.join(',');
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
    window.MUR_BREATH_PARTICLE_ORB_V76={points:COUNT, breathingAnimation:'native-orb-transform-enhanced', rotation:'slow', phaseText:'separate-below-orb', color:'neuroflex-score'};
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
   M.U.R. V77 — RESPIRATION IMMERSIVE PLEIN ECRAN
   Ne s'active QUE pendant une séance native (#breath.breath-immersive).
   L'orbe multipoints NeuroFlex conserve son mouvement, son son et ses
   commandes : pas de changement des durées ou de la navigation JS.
   ================================================================ */
(() => {
  'use strict';
  if (window.MUR_BREATH_FULLSCREEN_V77) return;
  window.MUR_BREATH_FULLSCREEN_V77 = {version:77,mode:'immersive-full-viewport',color:'NeuroFlex'};
  if (document.getElementById('mur-breath-fullscreen-v77-css')) return;
  const style = document.createElement('style');
  style.id = 'mur-breath-fullscreen-v77-css';
  style.textContent = `
    /* Aucun impact sur les pages tant que Respiration n'est pas en cours. */
    #breath.page.active.breath-immersive{
      position:fixed!important;
      inset:0!important;
      width:100vw!important;
      height:100dvh!important;
      min-height:0!important;
      max-height:100dvh!important;
      margin:0!important;
      padding:calc(11px + env(safe-area-inset-top, 0px)) 12px
              calc(11px + env(safe-area-inset-bottom, 0px))!important;
      z-index:11020!important;
      overflow:hidden!important;
      box-sizing:border-box!important;
      background:radial-gradient(ellipse at 50% 43%,#142e45 0%,#071525 65%,#050c18 100%)!important;
      overscroll-behavior:contain!important;
    }
    /* Le paramétrage se replie uniquement durant la séance. */
    #breath.page.active.breath-immersive > section.card:first-child{
      display:none!important;
    }
    #breath.page.active.breath-immersive > section.card:last-child{
      position:relative!important;
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:space-between!important;
      width:100%!important;
      max-width:760px!important;
      height:100%!important;
      min-height:0!important;
      max-height:100%!important;
      margin:0 auto!important;
      padding:clamp(10px,2.3dvh,22px) 8px clamp(8px,1.5dvh,16px)!important;
      gap:clamp(4px,1.1dvh,11px)!important;
      overflow:hidden!important;
      border-radius:24px!important;
      box-sizing:border-box!important;
      background:radial-gradient(ellipse at center,rgba(255,255,255,.055),rgba(255,255,255,.012) 65%)!important;
    }
    #breath.page.active.breath-immersive .mini-info{
      order:0!important;
      flex:0 0 auto!important;
      width:min(100%,360px)!important;
      max-width:360px!important;
      margin:0 auto!important;
      gap:10px!important;
    }
    #breath.page.active.breath-immersive .mini-info .info-box{
      padding:9px 12px!important;
    }
    #breath.page.active.breath-immersive .breath-stage{
      order:1!important;
      display:grid!important;
      place-items:center!important;
      position:relative!important;
      flex:1 1 0!important;
      width:100%!important;
      height:auto!important;
      min-height:190px!important;
      max-height:none!important;
      padding:0!important;
      margin:0!important;
      overflow:visible!important;
    }
    /* Plus aucune petite taille forcée par les anciens styles d'immersion. */
    #breath.page.active.breath-immersive #orb.mur-breath-particle-orb{
      width:min(59vw,38dvh,340px)!important;
      height:min(59vw,38dvh,340px)!important;
      min-width:0!important;
      min-height:0!important;
      max-width:none!important;
      max-height:none!important;
      flex:0 0 auto!important;
      margin:0!important;
      padding:0!important;
      background:transparent!important;
      box-shadow:none!important;
      border:0!important;
      touch-action:manipulation!important;
    }
    /* Le suivi circulaire existant est discret : place à la sphère. */
    #breath.page.active.breath-immersive .breath-stage > svg.ring{
      opacity:.14!important;
      width:min(83vw,56dvh,500px)!important;
      height:min(83vw,56dvh,500px)!important;
      pointer-events:none!important;
    }
    #breath.page.active.breath-immersive #phaseText.mur-breath-label-v53{
      order:2!important;
      flex:0 0 auto!important;
      margin:0 auto!important;
      padding:9px 18px!important;
      font-size:clamp(18px,4.5vw,23px)!important;
      max-width:90%!important;
      text-align:center!important;
    }
    #breath.page.active.breath-immersive #phaseHint{
      order:3!important;
      flex:0 0 auto!important;
      margin:0 auto!important;
      width:min(100%,410px)!important;
      max-width:410px!important;
      padding:0 4px!important;
      font-size:clamp(12px,3.2vw,15px)!important;
      line-height:1.4!important;
      text-align:center!important;
    }
    #breath.page.active.breath-immersive .breath-action-row{
      order:4!important;
      flex:0 0 auto!important;
      width:min(100%,360px)!important;
      max-width:360px!important;
      margin:0 auto!important;
      padding:0!important;
      min-height:42px!important;
      display:flex!important;
      justify-content:center!important;
      align-items:center!important;
    }
    #breath.page.active.breath-immersive #stopBreathBtn:not([hidden]){
      display:block!important;
      min-height:44px!important;
      min-width:140px!important;
      padding:10px 18px!important;
      border-radius:999px!important;
      font-weight:800!important;
    }
    /* Les autres sections ne sont pas modifiées ; la barre s'efface
       pendant la seule séance plein écran et revient à la fermeture. */
    body.breath-immersive-global:has(#breath.page.active.breath-immersive) .tabbar{
      opacity:0!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
    /* Le son demeure accessible, au-dessus des particules. */
    #breath.page.active.breath-immersive .orb-sound-btn{
      z-index:15!important;
      top:8px!important;
      right:10px!important;
    }
    @media (max-height:680px){
      #breath.page.active.breath-immersive > section.card:last-child{
        padding:8px 6px!important;
        gap:3px!important;
      }
      #breath.page.active.breath-immersive #orb.mur-breath-particle-orb{
        width:min(58vw,35dvh,300px)!important;
        height:min(58vw,35dvh,300px)!important;
      }
      #breath.page.active.breath-immersive .mini-info .info-box{
        padding:5px 9px!important;
      }
      #breath.page.active.breath-immersive #phaseHint{
        font-size:12px!important;
      }
    }
    @media (prefers-reduced-motion:reduce){
      #breath.page.active.breath-immersive .breath-stage > svg.ring{
        transition:none!important;
      }
    }
  `;
  document.head.appendChild(style);
})();

/* ================================================================
   M.U.R. V79 — CENTRAGE IMMERSIF RESPIRATION
   Ne cible que le mode plein écran actif. La sphère est ancrée
   au centre optique, les informations restent en haut et les
   commandes en bas. Aucun changement de cycles ni de scores.
   ================================================================ */
(() => {
  'use strict';
  if (document.getElementById('mur-breath-center-v79-css')) return;
  const css = document.createElement('style');
  css.id='mur-breath-center-v79-css';
  css.textContent=`
    #breath.page.active.breath-immersive{
      --mur-breath-v79-size:min(64vw,38dvh,350px);
      --mur-breath-v79-middle:44%;
    }
    #breath.page.active.breath-immersive > section.card:last-child{
      position:relative!important;
      display:block!important;
      padding:0!important;
      width:100%!important;
      height:100%!important;
      overflow:hidden!important;
    }
    #breath.page.active.breath-immersive .mini-info{
      position:absolute!important;
      top:clamp(10px,2.5dvh,25px)!important;
      left:50%!important;
      transform:translateX(-50%)!important;
      margin:0!important;
      z-index:4!important;
    }
    #breath.page.active.breath-immersive .breath-stage{
      position:absolute!important;
      top:var(--mur-breath-v79-middle)!important;
      left:50%!important;
      transform:translate(-50%,-50%)!important;
      display:grid!important;
      place-items:center!important;
      width:100%!important;
      height:var(--mur-breath-v79-size)!important;
      min-height:0!important;
      max-height:none!important;
      margin:0!important;
      padding:0!important;
      overflow:visible!important;
      z-index:2!important;
    }
    #breath.page.active.breath-immersive #orb.mur-breath-particle-orb{
      width:var(--mur-breath-v79-size)!important;
      height:var(--mur-breath-v79-size)!important;
      max-width:none!important;
      max-height:none!important;
      min-width:0!important;
      min-height:0!important;
    }
    #breath.page.active.breath-immersive .breath-stage > svg.ring{
      width:calc(var(--mur-breath-v79-size) * 1.40)!important;
      height:calc(var(--mur-breath-v79-size) * 1.40)!important;
    }
    #breath.page.active.breath-immersive #phaseText.mur-breath-label-v53{
      position:absolute!important;
      top:calc(var(--mur-breath-v79-middle) + var(--mur-breath-v79-size) * .74 + 10px)!important;
      left:50%!important;
      transform:translateX(-50%)!important;
      margin:0!important;
      z-index:5!important;
    }
    #breath.page.active.breath-immersive #phaseHint{
      position:absolute!important;
      top:calc(var(--mur-breath-v79-middle) + var(--mur-breath-v79-size) * .74 + 65px)!important;
      left:50%!important;
      transform:translateX(-50%)!important;
      margin:0!important;
      width:min(92%,410px)!important;
      z-index:4!important;
    }
    #breath.page.active.breath-immersive .breath-action-row{
      position:absolute!important;
      left:50%!important;
      bottom:clamp(8px,2dvh,22px)!important;
      transform:translateX(-50%)!important;
      margin:0!important;
      z-index:6!important;
    }
    @media(max-height:700px){
      #breath.page.active.breath-immersive{
        --mur-breath-v79-size:min(63vw,34dvh,300px);
        --mur-breath-v79-middle:43%;
      }
      #breath.page.active.breath-immersive #phaseHint{
        top:calc(var(--mur-breath-v79-middle) + var(--mur-breath-v79-size) * .74 + 58px)!important;
      }
    }
  `;
  document.head.appendChild(css);
})();


/* ================================================================
   M.U.R. V81 — CORRECTION DU DEBORDEMENT PLEIN ECRAN SUR ORDINATEUR
   Base : V79, sans les changements de couleur V80.
   L'inspiration peut agrandir l'orbe jusqu'a scale(1.44) :
   la taille au repos et son anneau tiennent compte de cette amplitude.
   Aucune modification sur les telephones ni sur les autres pages.
   ================================================================ */
(() => {
  'use strict';
  if (document.getElementById('mur-breath-desktop-fit-v81')) return;
  const css = document.createElement('style');
  css.id = 'mur-breath-desktop-fit-v81';
  css.textContent = `
    @media (min-width: 768px) and (min-height: 430px) {
      #breath.page.active.breath-immersive {
        /* 1.44 x la taille au repos doit tenir dans la zone centrale. */
        --mur-breath-v79-size: min(34vw, 28dvh, 255px, calc((100dvh - 240px) / 1.44)) !important;
        --mur-breath-v79-middle: 44%;
      }
      #breath.page.active.breath-immersive .breath-stage {
        width: 100% !important;
        max-width: 100% !important;
        height: var(--mur-breath-v79-size) !important;
        max-height: var(--mur-breath-v79-size) !important;
        overflow: visible !important;
      }
      #breath.page.active.breath-immersive #orb.mur-breath-particle-orb {
        width: var(--mur-breath-v79-size) !important;
        height: var(--mur-breath-v79-size) !important;
        flex: 0 0 auto !important;
        transform-origin: center center !important;
      }
      #breath.page.active.breath-immersive .breath-stage > svg.ring {
        width: calc(var(--mur-breath-v79-size) * 1.40) !important;
        height: calc(var(--mur-breath-v79-size) * 1.40) !important;
        max-width: calc(100vw - 40px) !important;
        max-height: calc(100dvh - 180px) !important;
      }
      #breath.page.active.breath-immersive #phaseText.mur-breath-label-v53 {
        top: calc(44% + var(--mur-breath-v79-size) * .78 + 10px) !important;
      }
      #breath.page.active.breath-immersive #phaseHint {
        top: calc(44% + var(--mur-breath-v79-size) * .78 + 61px) !important;
      }
    }
    @media (min-width: 768px) and (max-height: 600px) {
      #breath.page.active.breath-immersive {
        --mur-breath-v79-size: min(30vw, 23dvh, 190px) !important;
        --mur-breath-v79-middle: 42%;
      }
      #breath.page.active.breath-immersive #phaseText.mur-breath-label-v53 {
        top: calc(42% + var(--mur-breath-v79-size) * .78 + 9px) !important;
      }
      #breath.page.active.breath-immersive #phaseHint {
        top: calc(42% + var(--mur-breath-v79-size) * .78 + 50px) !important;
      }
    }
  `;
  document.head.appendChild(css);
  window.MUR_BREATH_DESKTOP_FIT_V81={version:81,base:79,maxInhaleScale:1.44};
})();


/* ================================================================
   M.U.R. V82 — CORRECTION DE POSITIONNEMENT PLEIN ECRAN DESKTOP
   La séance est provisoirement placée directement sous <body>.
   Cela évite les repères de positionnement et les décrochages du
   conteneur .app après défilement. Retour à sa place en sortie.
   Aucun changement d'index.html, des cycles ni de la couleur.
   ================================================================ */
(() => {
  'use strict';
  if (window.MUR_BREATH_VIEWPORT_V82) return;
  const state={version:82,active:false};
  window.MUR_BREATH_VIEWPORT_V82=state;
  function init(){
    const page=document.getElementById('breath');
    if(!page)return;
    const anchor=document.createComment('M.U.R. V82 : emplacement Respiration');
    page.parentNode.insertBefore(anchor,page);
    let moving=false;
    let origBodyOverflow='';
    let origHtmlOverflow='';
    let origBodyOverflowX='';
    const active=()=>page.classList.contains('active') && page.classList.contains('breath-immersive');
    function sync(){
      if(moving)return;
      moving=true;
      try{
        if(active()){
          if(!state.active){
            origBodyOverflow=document.body.style.overflow;
            origHtmlOverflow=document.documentElement.style.overflow;
            origBodyOverflowX=document.body.style.overflowX;
          }
          if(page.parentElement!==document.body)document.body.appendChild(page);
          document.body.classList.add('mur-breath-viewport-v82');
          document.body.style.setProperty('overflow','hidden');
          document.documentElement.style.setProperty('overflow','hidden');
          document.body.style.setProperty('overflow-x','hidden');
          state.active=true;
        }else{
          if(page.parentNode!==anchor.parentNode && anchor.parentNode){anchor.parentNode.insertBefore(page,anchor.nextSibling);}
          document.body.classList.remove('mur-breath-viewport-v82');
          if(state.active){
            document.body.style.overflow=origBodyOverflow;
            document.documentElement.style.overflow=origHtmlOverflow;
            document.body.style.overflowX=origBodyOverflowX;
          }
          state.active=false;
        }
      }finally{moving=false;}
    }
    const observer=new MutationObserver(sync);
    observer.observe(page,{attributes:true,attributeFilter:['class']});
    // Lorsque la navigation change d'onglet, l'original doit rester
    // dans le DOM de l'application après disparition de l'immersion.
    sync();
    window.addEventListener('pagehide',()=>{
      observer.disconnect();
      page.classList.remove('breath-immersive');
      sync();
    },{once:true});
  }
  const css=document.createElement('style');
  css.id='mur-breath-viewport-v82-css';
  css.textContent=`
    body > #breath.page.active.breath-immersive {
      position:fixed!important;inset:0!important;top:0!important;left:0!important;
      right:0!important;bottom:0!important;
      width:100vw!important;height:100vh!important;height:100dvh!important;
      margin:0!important;transform:none!important;translate:none!important;
      overflow:hidden!important;z-index:2147482000!important;
      padding:clamp(12px,2.4dvh,26px)!important;
      background:radial-gradient(ellipse at 50% 43%,#142e45 0%,#071525 65%,#050c18 100%)!important;
      box-sizing:border-box!important;
    }
    body > #breath.page.active.breath-immersive > section.card:last-child {
      position:relative!important;left:auto!important;top:auto!important;
      width:min(100%,760px)!important;height:100%!important;
      margin:0 auto!important;transform:none!important;
      overflow:hidden!important;
    }
    body > #breath.page.active.breath-immersive .breath-stage {
      left:50%!important;top:44%!important;
      transform:translate(-50%,-50%)!important;
      height:var(--mur-breath-v79-size)!important;
    }
    /* Force la taille du conteneur en restant sous la marge d'expansion x1,44. */
    @media(min-width:768px){
      body > #breath.page.active.breath-immersive {
        --mur-breath-v79-size:min(32vw,27dvh,260px,calc((100dvh - 235px) / 1.44))!important;
      }
    }
    @media(max-width:767px){
      body > #breath.page.active.breath-immersive {
        --mur-breath-v79-size:min(58vw,35dvh,280px)!important;
      }
    }
  `;
  document.head.appendChild(css);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
