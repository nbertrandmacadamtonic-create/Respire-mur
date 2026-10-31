/*
 * M.U.R. — French / English, application + back-office
 * Keeps Ki.S scoring, exercise IDs, colours, media links and breath timings.
 * English text is stored in mur-content.json > translations.en.
 */
(() => {
  'use strict';
  // M.U.R. — Mise en page adaptative téléphone (app + back-office).
  // Aucune modification de la vidéo, de la langue ou des scores.
  const mobileStyle = document.createElement('style');
  mobileStyle.id = 'mur-bilingual-mobile-layout';
  mobileStyle.textContent = `
@media (max-width: 720px) {
  /* Deux drapeaux compacts, sans répétition FR/EN. */

  html, body { max-width: 100%; overflow-x: clip; }

  /* Barre supérieure de l'application. */
  .app { width: 100%; max-width: 430px; min-width: 0; }
  .app .top {
    display: flex; flex-wrap: nowrap; align-items: center;
    justify-content: space-between; gap: 6px; min-width: 0;
  }
  .app .top .brand {
    display: flex; flex: 1 1 auto; align-items: center;
    gap: 6px; min-width: 0;
  }
  .app .top .brand .logo {
    width: 36px; height: 36px; flex-shrink: 0;
  }
  .app .top .brand h1 {
    font-size: clamp(15px, 4vw, 19px);
    white-space: nowrap;
  }
  .app .top > .mur-language-picker {
    flex: 0 0 auto; margin-left: auto !important;
    padding: 3px !important; gap: 3px !important;
    max-width: max-content; align-self: center;
  }
  .app .top > .mur-language-picker button {
    min-width: 35px !important; min-height: 40px !important;
    padding: 0 4px !important; font-size: 23px !important;
    touch-action: manipulation;
  }

  /* Sélecteur sur la vidéo d'accueil : à gauche,
     pour ne pas recouvrir « Activer le son » à droite. */
  #presentation > .mur-language-picker {
    position: absolute !important;
    left: calc(10px + env(safe-area-inset-left)) !important;
    right: auto !important;
    top: calc(12px + env(safe-area-inset-top)) !important;
    margin: 0 !important; padding: 3px !important;
    gap: 3px !important; z-index: 100006 !important;
  }
  #presentation > .mur-language-picker button {
    min-width: 38px !important; min-height: 42px !important;
    padding: 0 4px !important; font-size: 23px !important;
  }
  #presentation #murWelcomeVideo2026 {
    max-width: none !important; max-height: none !important;
    object-fit: contain !important;
  }

  /* Les textes anglais peuvent être plus longs. */
  .app .page, .app .card, .app .page-title,
  .app .test-menu-card, .app .test-menu-content {
    min-width: 0; overflow-wrap: anywhere;
  }
  .app button, .app .nav-ico { overflow-wrap: anywhere; }
  .app .tabbar { max-width: calc(100vw - 18px); }
  .app .tabbar .nav-ico { min-width: 0; }
  .app .tabbar .nav-ico span { font-size: 10px; }

  /* Back-office : sélecteur en haut à droite. */
  .aside { position: relative; width: 100%; min-width: 0; }
  .aside > .logo { padding-right: 110px; }
  .aside > .mur-language-picker {
    position: absolute !important;
    top: 10px !important; right: 10px !important;
    margin: 0 !important; padding: 3px !important;
    gap: 3px !important;
  }
  .aside > .mur-language-picker button {
    min-width: 35px !important; min-height: 40px !important;
    padding: 0 4px !important; font-size: 23px !important;
  }
  .aside .menu {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
  }
  .aside .nav {
    min-width: 0; width: 100%; min-height: 50px;
    padding: 8px 3px; white-space: normal;
    font-size: 11px; line-height: 1.25; text-align: center;
    overflow-wrap: anywhere;
  }
  .main { max-width: 100%; min-width: 0; }
  .main .fields, .main .media {
    grid-template-columns: minmax(0, 1fr);
  }
  .main .field, .main .media-side { min-width: 0; }
  .main input, .main textarea, .main select {
    max-width: 100%; font-size: 16px;
  }
  .main .card, .main h2, .main p { overflow-wrap: anywhere; }
}
@media (max-width: 355px) {
  .app .top .brand .logo { width: 32px; height: 32px; }
  .app .top .brand h1 { font-size: 15px; }
  .aside .nav { font-size: 10px; }
}
`;
  document.head.appendChild(mobileStyle);

  const STORAGE_KEY = 'mur-ui-language';
  const DRAFT_KEY = 'mur-admin-draft-v1';
  const uiDefaults = {"Commencer":"Start","Activer le son":"Enable sound","🔊 Activer le son":"🔊 Enable sound","▶ Lire la vidéo":"▶ Play video","Passer":"Skip","Retour à l’application":"Back to the app","← Retour à l’application":"← Back to the app","Tableau de bord":"Dashboard","Laissez-vous guider.":"Let us guide you.","Commencez par faire les tests NeuroFlex":"Start with the NeuroFlex tests","Respiration en cours - toucher pour revenir":"Breathing in progress — tap to return","Mesurer":"Measure","Utiliser":"Use","Reguler":"Regulate","Réguler":"Regulate","Decouvrez votre tendance":"Discover your tendency","Touchez pour commencer":"Tap to begin","Tendance actuelle":"Current trend","Commencez vos tests pour déterminer votre profil.":"Take the tests to discover your profile.","Votre profil NeuroFlex":"Your NeuroFlex profile","Comprendre votre tendance de fond, puis votre état du moment.":"Understand your baseline tendency, then your current state.","Votre tendance de fond":"Your baseline tendency","Votre état actuel":"Your current state","Votre réponse du moment":"Your current response","Tests NeuroFlex":"NeuroFlex tests","Tests":"Tests","Découvrez la personnalité et les performances de votre système neurovégétatif.":"Discover how your autonomic nervous system responds and adapts.","Ki.S":"Ki.S","A faire en premier":"Do this first","Verrouillé":"Locked","Étape 1":"Step 1","Étape 2":"Step 2","Étape 3":"Step 3","Resultat":"Result","Résultat":"Result","Test Ki.S":"Ki.S test","Votre tendance de fond.":"Your baseline tendency.","Precedent":"Previous","Précédent":"Previous","Suivant":"Next","Valider Ki.S":"Submit Ki.S","Energie":"Energy","Énergie":"Energy","Mental":"Mind","Corps":"Body","Valider Ici & Maintenant":"Submit Here & Now","Ici & Maintenant":"Here & Now","Résultat NeuroFlex":"NeuroFlex result","Profil Ki.S":"Ki.S profile","À faire":"To do","Commencez par Ki.S pour connaître votre profil de fond.":"Start with Ki.S to identify your baseline profile.","Posé":"Steady","Funambule":"Balancer","Fonceur":"Go-getter","Mesurez votre état actuel pour compléter cette partie.":"Measure your current state to complete this section.","Après les deux tests":"After both tests","Synthèse non disponible":"Summary unavailable","La synthèse sera disponible après les deux tests.":"The summary will appear after both tests.","Commencer Ki.S":"Start Ki.S","Il est temps de prendre l'air.":"Time to take a breath.","Choisir une respiration":"Choose a breathing exercise","Respirations guidees":"Guided breathing","Toutes les respirations classees par couleur":"All breathing exercises, grouped by colour","Relance douce":"Gentle boost","Respiration 365":"365 breathing","Coherence":"Coherence","Cohérence":"Coherence","Respiration carree":"Box breathing","Regulation douce":"Gentle regulation","Régulation douce":"Gentle regulation","Frein":"Brake","Sommeil":"Sleep","Nuit - Sommeil":"Night — Sleep","dynamiser":"energise","equilibrer":"balance","freiner":"slow down","Chaque respiration guidee a sa position propre sur la ligne.":"Each guided breathing exercise has its own position on the line.","Intro active":"Intro on","Mode manuel":"Manual mode","inspire":"inhale","expire":"exhale","Duree":"Duration","Durée":"Duration","Temps restant":"Time remaining","Cycle":"Cycle","Etes-vous pret ?":"Are you ready?","Êtes-vous prêt ?":"Are you ready?","Inspirez":"Inhale","Expirez":"Exhale","Pause":"Hold","Exercices":"Exercises","Exercices rouges - Freiner":"Red exercises — Slow down","Exercices orange - Reguler":"Orange exercises — Regulate","Exercices verts - Equilibrer":"Green exercises — Balance","Exercices bleus - Activer":"Blue exercises — Activate","Respirations":"Breathing","Respiration":"Breathing","Rouge":"Red","Orange":"Orange","Vert":"Green","Bleu":"Blue","Bleu nuit":"Night blue","Continuer les tests":"Continue the tests","Menu Tests":"Test menu","Synthèse NeuroFlex":"NeuroFlex summary","Respiration conseillée":"Recommended breathing","Voir les exercices conseillés":"See recommended exercises","Voir les exercices":"See exercises","Ouvrir":"Open","Fermer":"Close","En attente":"Pending","Aujourd'hui":"Today","Evolution NeuroFlex":"NeuroFlex trend","Historique":"History","Mon historique":"My history","Statistiques":"Statistics","Mon profil":"My profile","Profil":"Profile","Paramètres":"Settings","Réglages":"Settings","Réinitialiser":"Reset","Enregistrer":"Save","Continuer":"Continue","Retour":"Back","Compris":"Got it","Bienvenue dans M.U.R.":"Welcome to M.U.R.","Comprendre les tests NeuroFlex":"Understanding the NeuroFlex tests","La synthese":"The summary","La synthèse":"The summary","NeuroFlex":"NeuroFlex","Administration des contenus · images & audio":"Content management · images & audio","Vue générale":"Overview","Questions ki.S":"Ki.S questions","Exercices : images et audios":"Exercises: images and audio","Inscriptions":"Registrations","Publication":"Publishing","Tableau de bord M.U.R.":"M.U.R. dashboard","Gérez les fiches, visualisez les images et écoutez les audios associés à chaque exercice.":"Edit content, preview images and listen to the audio for each exercise.","Protocoles respiratoires":"Breathing protocols","Modifier les contenus":"Edit content","Voir images et audios":"View images and audio","Conservez le lien A / F / P pour le calcul des profils.":"Keep the A / F / P mapping for profile scoring.","Chaque fiche affiche son illustration, l'audio associé, les fichiers réellement chargés et les champs éditables. Vous pouvez écouter chaque correspondance.":"Each exercise shows its image, linked audio, loaded files and editable fields.","Toutes les familles":"All groups","Respiration guidée":"Guided breathing","Durées en secondes et message associé à chaque protocole.":"Phase durations in seconds and the message for each protocol.","Inscriptions et utilisateurs":"Registrations and users","Pas de base centralisée d'utilisateurs.":"No central user database.","Confidentialité":"Privacy","Publier les modifications":"Publish changes","Exporter mur-content.json":"Export mur-content.json","Importer un JSON":"Import JSON","Restaurer le contenu publié":"Restore published content","Image correspondante":"Linked image","Audio correspondant":"Linked audio","Recherche du fichier…":"Finding file…","Recherche du fichier audio…":"Finding audio file…","Autres noms de fichiers référencés":"Other referenced filenames","Images :":"Images:","Audios :":"Audio:","Image indisponible":"Image unavailable","Fichier image introuvable":"Image file not found","Audio introuvable dans le dépôt":"Audio not found in repository","✓ Audio disponible":"✓ Audio available","Brouillon enregistré localement":"Draft saved locally","Contenu importé":"Content imported","Fichier prêt à publier":"File ready to publish","Version publiée restaurée":"Published version restored","Question":"Question","Réponse A (Fonceur)":"Answer A (Go-getter)","Réponse F (Funambule)":"Answer F (Balancer)","Réponse P (Posé)":"Answer P (Steady)","Titre":"Title","Légende":"Caption","Image principale":"Main image","Audio principal":"Main audio","Explication":"Explanation","Inspiration":"Inhale","Pause après inspiration":"Hold after inhaling","Expiration":"Exhale","Pause après expiration":"Hold after exhaling","Durée totale (secondes)":"Total duration (seconds)","Description":"Description","Publication sur GitHub":"Publish on GitHub","Français":"French","Anglais":"English","Traductions":"Translations","Interface":"Interface","Fichiers images et audio partagés":"Shared image and audio files","M.U.R. vous propose une nouvelle experience : decouvrir votre profil neurovegetatif et apprendre a le reequilibrer.":"M.U.R. offers a new experience: discover your autonomic nervous system profile and learn how to restore balance.","Votre systeme neurovegetatif influence votre energie, votre respiration, votre recuperation, votre concentration et votre capacite a faire face au stress.":"Your autonomic nervous system influences your energy, breathing, recovery, focus and response to stress.","Ensuite, l'application vous oriente vers une respiration et des exercices adaptes a votre etat.":"The app then suggests breathing techniques and exercises suited to how you feel.","La vraie force ne vient pas du fait d'encaisser, mais de la capacite que nous avons a rester flexibles.":"Real strength is not about enduring everything, but about staying flexible.","M.U.R. vous aide a retrouver cette souplesse.":"M.U.R. helps you regain that flexibility.","Les tests NeuroFlex servent a mieux lire la maniere dont votre systeme neurovegetatif s'organise et s'adapte.":"NeuroFlex tests help you understand how your autonomic nervous system is organised and adapts.","observe votre tendance de fond. Il indique si votre systeme fonctionne plutot en mode pose, fonceur ou funambule.":"assesses your baseline tendency: whether you lean towards steady, go-getter or balancer.","mesure votre etat du moment : energie, souffle, mental et ressenti corporel. C'est une photographie instantanee.":"measures how you feel right now: energy, breathing, mind and body. It is a snapshot.","croise ces deux informations pour proposer une orientation simple : activer, entretenir, reguler ou freiner.":"combines these findings to suggest a simple direction: activate, maintain, regulate or slow down.","Ces tests ne remplacent pas un diagnostic medical. Ils servent de boussole pratique pour choisir une respiration ou un exercice adapte a l'instant.":"These tests do not replace a medical diagnosis. They are a practical guide to choosing a breathing exercise or activity suited to the moment.","Touchez le cercle pour commencer.":"Tap the circle to begin.","Le M.U.R d'exercices":"The M.U.R. exercise wall","Apprenez à briser le mur.":"Learn to break through the wall.","Collection":"Collection","Briser le mur":"Break through the wall","Reguler la montee":"Regulate rising tension","Exercices verts - Entretenir":"Green exercises — Maintain balance","Stabiliser":"Stabilise","Remettre de l'elan":"Restore momentum","Suivre":"Follow","Faites le point sur vos points.":"Review your points and progress.","Les seances et exercices sont enregistres sur ce telephone.":"Sessions and exercises are stored on this device.","Semaine":"Week","0 pratique":"No practices yet","Commencez par une respiration ou un exercice.":"Start with a breathing session or exercise.","Minutes":"Minutes","Chaque test NeuroFlex est enregistre comme un point. Vous pouvez en faire plusieurs par jour pour suivre l'evolution.":"Each NeuroFlex test is recorded as a point. Take several each day to track your progress.","Aucun point pour le moment. Realisez un test NeuroFlex complet pour commencer la courbe.":"No points yet. Complete a NeuroFlex test to start the graph.","Aucun test complet enregistre.":"No completed tests recorded.","Historique recent":"Recent history","Sauvegarde":"Backup","Copiez vos donnees ou restaurez une ancienne sauvegarde.":"Copy your data or restore an earlier backup.","Sauvegarder":"Back up","Importer":"Import","Personnalisez votre expérience.":"Personalise your experience.","Prenom ou pseudo":"First name or nickname","Enregistrer le profil":"Save profile","Comment fonctionne M.U.R ?":"How does M.U.R. work?","Comment fonctionne M.U.R ?":"How does M.U.R. work?","pour comprendre.":"to understand.","pour agir.":"to act.","pour retrouver de la marge.":"to regain flexibility.","Le but n'est pas d'etre toujours calme. Le but est de retrouver de la souplesse : pouvoir ralentir, s'activer ou recuperer au bon moment.":"The goal is not to stay calm all the time, but to become more flexible: to slow down, activate or recover when needed.","Reinitialiser les tests":"Reset the tests","Revenir au debut du parcours NeuroFlex.":"Return to the start of the NeuroFlex journey.","Reset - refaire Ki.S":"Reset — retake Ki.S","Accueil":"Home","Respirer":"Breathe","Paniflex":"Paniflex","Carte d'exercice":"Exercise card","Touchez la carte pour voir le verso.":"Tap the card to see the back.","Recto - touchez pour retourner":"Front — tap to flip","Point = detail du test.":"Point = test details.","Selectionnez un point sur la courbe.":"Select a point on the curve.","Touchez un point pour afficher ses statistiques.":"Tap a point to see its statistics.","Tres bas":"Very low","Bas":"Low","Stable":"Stable","Eleve":"High","Tres eleve":"Very high","Besoin d'activation douce":"Gentle activation needed","Relance progressive":"Gradual boost","Zone d'equilibre":"Balanced zone","Activation presente":"Active","Trop d'activation possible":"Possible overactivation","Tres lente":"Very slow","Lente":"Slow","Ralentissement marque":"Marked slowing","Respiration basse":"Slow breathing","Rythme disponible":"Flexible rhythm","Courte":"Short","Tension qui monte":"Tension rising","Tres courte":"Very short","Alerte respiratoire":"Breathing alert","Eteint":"Flat","Peu d'elan mental":"Low mental drive","Ralenti":"Slowed down","Attention basse":"Low focus","Clair":"Clear","Mental stable":"Steady mind","Charge":"Overloaded","Pensees rapides":"Racing thoughts","Sature":"Saturated","Trop de bruit interieur":"Mental overload","Lourd":"Heavy","Tonus bas":"Low muscle tone","Relache":"Relaxed","Corps calme":"Calm body","Disponible":"Ready","Bon appui corporel":"Good physical grounding","Tendu":"Tense","Tension presente":"Tension present","Crispe":"Tight","Alerte corporelle":"Physical alert","Nuit - Sommeil 3 / 0 / 7 / 0 - 7 min":"Night — Sleep 3 / 0 / 7 / 0 — 7 min","Bleu - Relance douce 5 / 0 / 3 / 0 - 2 min":"Blue — Gentle boost 5 / 0 / 3 / 0 — 2 min","Vert - Respiration 365 5 / 0 / 5 / 0 - 5 min":"Green — 365 breathing 5 / 0 / 5 / 0 — 5 min","Vert - Coherence 5 / 0 / 5 / 0 - 5 min":"Green — Coherence 5 / 0 / 5 / 0 — 5 min","Vert - Respiration carree 4 / 4 / 4 / 4 - 3 min":"Green — Box breathing 4 / 4 / 4 / 4 — 3 min","Orange - Regulation douce 4 / 0 / 6 / 0 - 3 min":"Orange — Gentle regulation 4 / 0 / 6 / 0 — 3 min","Rouge - Frein 3 / 0 / 8 / 0 - 2 min":"Red — Brake 3 / 0 / 8 / 0 — 2 min","Rouge - 4 / 7 / 8 / 0 - 2 min":"Red — 4 / 7 / 8 / 0 — 2 min","Vert - Equilibrer":"Green — Balance","Réguler la montée":"Regulate rising tension","Les changements sont sauvegardés localement dans ce navigateur, puis exportés. Ils ne sont pas envoyés automatiquement à GitHub.":"Changes are saved in this browser until you export them. Nothing is uploaded to GitHub automatically.","Le fichier enregistré contient les deux langues.":"The exported file contains both languages.","Traductions de l’interface / Interface translations":"Interface translations","Modifiez les textes anglais. Les textes français restent inchangés. Les traductions sont incluses lors de l’export du fichier mur-content.json.":"Edit the English text. French text is unchanged. Your translations will be included in the exported mur-content.json file.","Rechercher un libellé / Search for a label":"Search interface labels"};
  const enDefaults = {"questions":[{"text":"When things get complicated, your first instinct is to...","a":"act quickly and look for an immediate solution","f":"pause to observe, then adjust","p":"step back before taking action"},{"text":"On a busy day, you tend to...","a":"speed up to get everything done","f":"alternate effort with short breaks","p":"slow down to leave yourself some margin"},{"text":"When something unexpected happens, you are usually...","a":"reactive, sometimes too quick","f":"adaptable, depending on the situation","p":"cautious; you need some time"},{"text":"When your body signals fatigue, you tend to...","a":"keep going anyway","f":"hesitate between pushing on and easing off","p":"listen to the signal and take a break"},{"text":"Your natural pace is more like...","a":"an engine that starts quickly","f":"a balance that changes from day to day","p":"a slower but steady rhythm"},{"text":"In a group, you are often the person who...","a":"gets things moving","f":"adapts to everyone else's pace","p":"slows things down and keeps them steady"},{"text":"When pressure rises, you tend to...","a":"tense up and speed up","f":"alternate between tension and control","p":"try to calm down or withdraw"},{"text":"To recover, you mainly need to...","a":"move or do something","f":"switch activities","p":"quiet, silence or rest"},{"text":"Your attention tends to be...","a":"quick and action-oriented","f":"variable, depending on how you feel","p":"steady and observation-oriented"},{"text":"Once you get going, you may...","a":"push too far without noticing","f":"adjust if you remember to","p":"stop relatively easily"},{"text":"Under stress, your breathing becomes...","a":"short or shallow","f":"irregular","p":"slower or more restrained"},{"text":"Your decision-making style tends to be...","a":"quick and instinctive","f":"somewhere in between, depending on the stakes","p":"thoughtful and gradual"},{"text":"In the morning, your energy is often...","a":"available quickly","f":"variable","p":"slow to build"},{"text":"When someone asks more of you, you tend to...","a":"say yes and carry on","f":"negotiate depending on how you feel","p":"set a boundary more easily"},{"text":"Overall, your system works more like...","a":"a powerful accelerator","f":"a tightrope walker seeking balance","p":"a natural brake that keeps things safe"}],"exercises":{"pause":{"title":"Vagal pause","caption":"Slow down — release tension — return to calm","why":["A vagal pause uses a simple principle: breathing out longer than you breathe in signals the body to slow down.","The autonomic nervous system responds to rhythm. A gentle, slow and extended exhale can act like a natural brake.","Relaxing the jaw, shoulders and abdomen reduces the signals of tension sent to the brain."]},"double":{"title":"Double inhale","caption":"Refresh your breath — release — exhale","why":["A double inhale can help restart a breathing pattern that feels stuck, short or high in the chest.","Inhale once, then add a small second inhale without straining.","Follow with a long exhale to help the system settle."]},"merle":{"title":"Blackbird song","caption":"Listen — breathe — reconnect","why":["Birdsong may be perceived as a cue of safety.","Natural sound gently shifts attention away from tension and offers an external point of focus.","The aim is not to force calm, but to let your system attend to something other than alarm."]},"ancrage":{"title":"Grounding","caption":"Feel your support — steady yourself — return to the present","why":["Grounding brings your attention back to your points of support, body weight and contact with the ground.","When your thoughts race, your body can become a simple, stable point of reference.","Your system receives concrete information: I am here, and I am supported."]},"vagues":{"title":"Gentle waves","caption":"Listen — slow down — go with the flow","why":["The steady sound of waves provides a predictable auditory cue.","This repetition can ease attention, reduce the sense of alertness and support autonomic regulation.","The external rhythm offers a way to slow down without effort."]},"fil":{"title":"Thread of breath","caption":"Follow — breathe — soothe","why":["Imagining a thread gives your attention a simple direction.","Breathing may become more regular without forcing control.","It is a gentle way to regain steadiness as tension rises."]},"regard":{"title":"Horizon gaze","caption":"Open — widen — release","why":["Widening your gaze can reduce the narrow focus associated with alertness.","A broader visual field can help the brain register contextual cues of safety.","The body may then release some of the tension linked to vigilance."]},"mains":{"title":"Soothing hands","caption":"Touch — calm — reassure","why":["Hand contact provides direct sensory information.","Gentle, steady pressure may help create a sense of safety.","Attention returns to the body rather than remaining caught up in thoughts."]},"foret":{"title":"Walk through the forest","caption":"Walk in your mind — listen — breathe","why":["Even while seated, the sounds of a forest can evoke a sense of gentle movement.","Natural sounds offer a stable, lively and non-threatening environment.","Attention wanders and breathing finds a more flexible rhythm."]},"lac":{"title":"Still lake","caption":"Steady — settle — allow balance to return","why":["Imagining a still lake can support sustained, steady attention.","The body receives an invitation to settle rather than react.","The consistency of the imagined landscape supports a return to balance."]},"balancier":{"title":"Body sway","caption":"Sway — release — find your centre","why":["A very gentle swaying movement gives the body a simple rhythm.","Oscillation can help release a fixed posture.","The system gradually finds a more flexible central alignment."]},"presence":{"title":"Body awareness","caption":"Feel — inhabit — come back to now","why":["Body awareness brings attention back to simple sensations.","It reduces mental distraction by offering concrete reference points.","The body becomes a source of support rather than tension."]},"bell":{"title":"Bell Bell Bell","caption":"Wake up — clear your mind — restore energy","why":["Bell sounds draw attention clearly and briefly.","They may provide a small, useful boost when energy is low.","The goal is to awaken without overwhelming: restore clarity and a little momentum."]},"lumiere":{"title":"Morning light","caption":"Brighten — activate — begin","why":["Morning light symbolises a gradual start.","It helps orient attention towards wakefulness and readiness.","The system receives a cue for gentle activation, without rushing."]},"etincelle":{"title":"Spark","caption":"Restart — awaken — ignite","why":["A spark represents a short, precise activation.","It can help you move out of a low-energy or heavy state.","The aim is not to push hard but to rekindle just enough energy."]},"elan":{"title":"Stand tall","caption":"Straighten up — activate — move forward","why":["Standing taller immediately changes how the body is positioned.","An upright posture can support a feeling of momentum and readiness.","The system receives a simple cue: I can get moving again."]}},"breaths":{"365":{"msg":"Green: steady, regular breathing that is easy to sustain."},"478":{"msg":"4 / 7 / 8: inhale, hold, then release slowly."},"boost":{"msg":"Blue: a longer inhale to gently restore momentum."},"coherence":{"msg":"Coherence 5/5: inhale and exhale in equal measure."},"square":{"msg":"Box breathing: four equal phases to find your centre."},"regulate":{"msg":"Orange: the exhale becomes longer to help regulate rising tension."},"frein":{"msg":"Red: a long exhale to slow activation more strongly."},"sleep":{"msg":"Sleep: a short inhale and long exhale to ease into calm."}}};
  const $ = id => document.getElementById(id);
  const admin = !!$('questionList') && !!$('exerciseList') && !!$('exportBtn');
  const clone = x => JSON.parse(JSON.stringify(x));
  let language = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'fr';
  let content = null;
  let dictionary = new Map();
  let observer = null;
  let updating = false;
  const textCache = new WeakMap();
  let adminScheduled = false;

  function ensureTranslations(model) {
    if (!model || !Array.isArray(model.questions)) return;
    model.translations ||= {};
    const en = model.translations.en ||= {};
    en.questions ||= [];
    en.exercises ||= {};
    en.breaths ||= {};
    en.ui ||= {};
    enDefaults.questions.forEach((q, i) => {
      en.questions[i] ||= {};
      for (const key of ['text','a','f','p']) {
        if (typeof en.questions[i][key] !== 'string') {
          en.questions[i][key] = q[key];
        }
      }
    });
    for (const [key, item] of Object.entries(enDefaults.exercises)) {
      en.exercises[key] ||= {};
      for (const field of ['title', 'caption', 'why']) {
        if (en.exercises[key][field] == null) {
          en.exercises[key][field] = clone(item[field]);
        }
      }
    }
    for (const [key, item] of Object.entries(enDefaults.breaths)) {
      en.breaths[key] ||= {};
      if (typeof en.breaths[key].msg !== 'string') {
        en.breaths[key].msg = item.msg;
      }
    }
  }

  function buildDictionary() {
    const d = Object.assign({}, uiDefaults, content?.translations?.en?.ui || {});
    if (content?.questions && content?.translations?.en?.questions) {
      content.questions.forEach((q, i) => {
        const en = content.translations.en.questions[i];
        if (!en) return;
        for (const k of ['text','a','f','p']) {
          if (q[k] && en[k]) d[q[k]] = en[k];
        }
      });
    }
    if (content?.exercises && content?.translations?.en?.exercises) {
      for (const [key, fr] of Object.entries(content.exercises)) {
        const en = content.translations.en.exercises[key];
        if (!en) continue;
        for (const k of ['title','caption']) {
          if (fr[k] && en[k]) d[fr[k]] = en[k];
        }
        (fr.why || []).forEach((v, i) => {
          if (v && en.why?.[i]) d[v] = en.why[i];
        });
      }
    }
    if (content?.breaths && content?.translations?.en?.breaths) {
      for (const [key, fr] of Object.entries(content.breaths)) {
        const en = content.translations.en.breaths[key];
        if (fr?.msg && en?.msg) d[fr.msg] = en.msg;
      }
    }
    dictionary = new Map(Object.entries(d).map(([key, value]) => [key.replace(/\s+/g,' ').trim(), value]));
  }

  function translateText(value) {
    const norm = value.replace(/\s+/g,' ').trim();
    if (!norm) return null;
    if (dictionary.has(norm)) return dictionary.get(norm);
    let m = norm.match(/^Question (\d+)$/);
    if (m) return 'Question ' + m[1];
    m = norm.match(/^Explication (\d+)$/);
    if (m) return 'Explanation ' + m[1];
    m = norm.match(/^Etape (\d+)$/);
    if (m) return 'Step ' + m[1];
    return null;
  }

  function shouldSkip(node) {
    const p = node.parentElement;
    return !p || !!p.closest('script,style,textarea,code,pre,[data-mur-no-translate],.mur-language-picker');
  }

  function translateNode(node) {
    if (node.nodeType !== Node.TEXT_NODE || shouldSkip(node)) return;
    const value = node.nodeValue;
    if (!value || !value.trim()) return;
    let old = textCache.get(node);
    if (!old || (value !== old.source && value !== old.lastValue)) {
      old = { source: value, lastValue: value };
      textCache.set(node, old);
    }
    const replacement = language === 'en' ? translateText(old.source) : null;
    const next = replacement == null ? old.source :
      (old.source.match(/^\s*/)?.[0] || '') + replacement +
      (old.source.match(/\s*$/)?.[0] || '');
    if (value !== next) {
      old.lastValue = next;
      node.nodeValue = next;
    }
  }

  function translateElement(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) return translateNode(root);
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches('script,style,textarea,[data-mur-no-translate]')) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) translateNode(n);
  }

  function refreshText() {
    buildDictionary();
    document.documentElement.lang = language;
    translateElement(document.body);
    document.querySelectorAll('.mur-language-picker button').forEach(button => {
      const active = button.dataset.language === language;
      button.setAttribute('aria-pressed', String(active));
      button.style.background = active ? '#dff8ff' : 'rgba(13,28,47,.75)';
      button.style.color = active ? '#07111f' : '#ffffff';
    });
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') translateNode(record.target);
        else for (const node of record.addedNodes) translateElement(node);
      }
      if (admin && language === 'en') scheduleAdminPatch();
    });
    observer.observe(document.body, {childList:true,characterData:true,subtree:true});
  }

  function picker() {
    const box = document.createElement('div');
    box.className = 'mur-language-picker';
    box.setAttribute('role','group');
    box.setAttribute('aria-label','Langue / Language');
    box.style.cssText = 'display:flex;gap:5px;align-items:center;z-index:100006;padding:5px;border:1px solid #ffffff38;border-radius:999px;background:#071525cc;backdrop-filter:blur(7px);';
    for (const l of ['fr','en']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.language = l;
      // Un drapeau par langue, sans répétition du nom ou du code.
      b.textContent = l === 'fr' ? '🇫🇷' : '🇬🇧';
      b.title = l === 'fr' ? 'Français' : 'English';
      b.setAttribute('aria-label', l === 'fr' ? 'Passer en français' : 'Switch to English');
      b.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:4px;border:0;border-radius:22px;font:normal 23px system-ui;line-height:1;cursor:pointer;touch-action:manipulation;';
      b.addEventListener('click',() => selectLanguage(l));
      box.appendChild(b);
    }
    return box;
  }

  // Un seul sélecteur de langue, déplacé entre l'introduction et l'app.
  let languagePicker = null;
  let pickerObserver = null;

  function installPickers() {
    // Supprimer les anciens sélecteurs en double, le cas échéant.
    const existing = [...document.querySelectorAll('.mur-language-picker')];
    if (!languagePicker || !languagePicker.isConnected) {
      languagePicker = existing[0] || picker();
    }
    for (const el of existing) {
      if (el !== languagePicker) el.remove();
    }

    if (admin) {
      const aside = document.querySelector('.aside');
      if (!aside) return;
      const menu = aside.querySelector('.menu');
      if (languagePicker.parentElement !== aside) {
        aside.insertBefore(languagePicker, menu || null);
      }
      languagePicker.style.position = 'relative';
      languagePicker.style.left = '';
      languagePicker.style.top = '';
      languagePicker.style.right = '';
      languagePicker.style.margin = '12px 0';
      return;
    }

    const header = document.querySelector('.app .top');
    const panel = document.getElementById('presentation');
    const introVisible = panel && !panel.classList.contains('hide');
    const target = introVisible ? panel : header;
    if (!target) return;

    if (languagePicker.parentElement !== target) {
      target.appendChild(languagePicker);
    }
    if (introVisible) {
      languagePicker.style.position = 'absolute';
      languagePicker.style.top = 'calc(16px + env(safe-area-inset-top))';
      languagePicker.style.left = 'calc(16px + env(safe-area-inset-left))';
      languagePicker.style.right = 'auto';
      languagePicker.style.margin = '0';
    } else {
      languagePicker.style.position = 'relative';
      languagePicker.style.top = '';
      languagePicker.style.left = '';
      languagePicker.style.right = '';
      languagePicker.style.margin = '0 0 0 auto';
    }

    // Lors du clic sur « Commencer », le bouton change de place,
    // il n'est jamais affiché deux fois.
    if (panel && !pickerObserver) {
      pickerObserver = new MutationObserver(() => installPickers());
      pickerObserver.observe(panel, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  function adminData() {
    try { return typeof data !== 'undefined' ? data : null; }
    catch(e) { return null; }
  }

  function getNested(object, path) {
    return path.split('.').reduce((o,k) => o == null ? undefined : o[k], object);
  }

  function patchAdminFields() {
    const model=adminData();
    if (!model) return;
    ensureTranslations(model);
    content=model;
    if (language !== 'en') return;
    for (const el of document.querySelectorAll('#questionList [data-path],#exerciseList [data-path],#breathList [data-path]')) {
      const original=el.dataset.murOriginalPath || el.dataset.path;
      el.dataset.murOriginalPath=original;
      let target=null;
      if (/^questions\.\d+\.(text|a|f|p)$/.test(original)) {
        target='translations.en.'+original;
      } else if (/^exercises\.[^.]+\.(title|caption|why\.\d+)$/.test(original)) {
        target='translations.en.'+original;
      } else if (/^breaths\.[^.]+\.msg$/.test(original)) {
        target='translations.en.'+original;
      }
      if (!target) continue; // Images, MP3 and numerical timings are shared.
      el.dataset.path=target;
      const english=getNested(model,target);
      if (english != null && el.value !== String(english)) el.value=String(english);
    }
    // Audio files remain shared by default; optional English voice track.
    for (const card of document.querySelectorAll('#exerciseList article.card')) {
      const titleInput = card.querySelector('input[data-mur-original-path$=".title"]');
      if(!titleInput || card.querySelector('[data-mur-en-audio]'))continue;
      const original = titleInput.dataset.murOriginalPath;
      const key = original.split('.')[1];
      const entry = model.exercises[key];
      if(!entry)continue;
      const wrap=document.createElement('div');
      wrap.className='field';
      wrap.dataset.murEnAudio='1';
      const label=document.createElement('label');
      label.textContent='English audio (MP3, optional)';
      const input=document.createElement('input');
      input.type='text';
      input.placeholder='e.g. '+key+'-en.mp3';
      input.value=entry.soundsEn?.[0] || '';
      input.dataset.path='exercises.'+key+'.soundsEn.0';
      wrap.append(label,input);
      card.querySelector('.fields')?.appendChild(wrap);
      if(entry.soundsEn?.[0]){
        const p=document.createElement('audio');
        p.controls=true;
        p.preload='none';
        p.src=entry.soundsEn[0].split('/').map(encodeURIComponent).join('/');
        const media=card.querySelector('.media-side');
        if(media){
          const name=document.createElement('div');
          name.className='media-label';
          name.textContent='English recording';
          media.append(name,p);
        }
      }
    }
    // Match card headings with the edited language.
    for (const card of document.querySelectorAll('#exerciseList article.card')) {
      const field=card.querySelector('input[data-mur-original-path$=".title"]');
      const heading=card.querySelector('.itemtop h2');
      if (field && heading && heading.textContent !== field.value) heading.textContent=field.value;
    }
  }

  function scheduleAdminPatch() {
    if (adminScheduled) return;
    adminScheduled=true;
    requestAnimationFrame(() => {
      adminScheduled=false;
      patchAdminFields();
      refreshText();
    });
  }

  function renderEditor() {
    if (!admin) return;
    const model=adminData();
    if (!model) return;
    ensureTranslations(model);
    content=model;
    if (typeof render === 'function') render();
    patchAdminFields();
    refreshText();
  }

  function uiEditSection() {
    const menu=document.querySelector('.menu');
    const main=document.querySelector('.main');
    if (!menu || !main || $('murTranslationsSection')) return;
    const nav=document.createElement('button');
    nav.type='button'; nav.className='nav';
    nav.dataset.tab='murTranslationsSection';
    nav.textContent='FR / EN';
    menu.appendChild(nav);
    const section=document.createElement('section');
    section.id='murTranslationsSection';
    section.className='section';
    section.innerHTML='<h1>Traductions de l’interface / Interface translations</h1><p class="hint">Modifiez les textes anglais. Les textes français restent inchangés. Les traductions sont incluses lors de l’export du fichier mur-content.json.</p><input id="murTranslationSearch" placeholder="Rechercher un libellé / Search for a label" aria-label="Rechercher une traduction"><div id="murTranslationList"></div>';
    main.insertBefore(section,$('status'));
    const results=$('murTranslationList');
    const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function populate() {
      const model=adminData(); if(!model)return;
      ensureTranslations(model);
      const search=$('murTranslationSearch').value.toLowerCase();
      results.replaceChildren();
      for (const [fr,defaultEN] of Object.entries(uiDefaults)) {
        if (search && !(fr+' '+defaultEN).toLowerCase().includes(search))continue;
        const row=document.createElement('div');
        row.className='card';
        row.dataset.murNoTranslate='1';
        const label=document.createElement('div');
        label.className='hint';label.textContent='FR : '+fr;
        const field=document.createElement('input');
        field.setAttribute('aria-label','English translation for '+fr);
        field.dataset.uiKey=fr;
        field.value=model.translations.en.ui[fr] ?? defaultEN;
        row.append(label,field);
        results.appendChild(row);
      }
    }
    nav.addEventListener('click',populate);
    $('murTranslationSearch').addEventListener('input',populate);
    results.addEventListener('input',e=>{
      if(!e.target.matches('[data-ui-key]'))return;
      const model=adminData();if(!model)return;
      ensureTranslations(model);
      model.translations.en.ui[e.target.dataset.uiKey]=e.target.value;
      localStorage.setItem(DRAFT_KEY,JSON.stringify(model));
      content=model;buildDictionary();
    });
  }

  function syncAudio() {
    if(admin || !content?.exercises) return;
    try {
      if(typeof EXERCISES === 'undefined') return;
      for (const [key,item] of Object.entries(content.exercises)) {
        if(!EXERCISES[key])continue;
        if(language === 'en' && Array.isArray(item.soundsEn) && item.soundsEn.some(Boolean)) {
          EXERCISES[key].sounds=item.soundsEn.filter(Boolean);
        } else if (Array.isArray(item.sounds)) {
          EXERCISES[key].sounds=item.sounds.slice();
        }
      }
    } catch(e) { console.warn('M.U.R.: audio sync',e); }
  }

  function selectLanguage(next) {
    language=next === 'en' ? 'en' : 'fr';
    localStorage.setItem(STORAGE_KEY,language);
    if (admin) renderEditor();
    else {syncAudio();refreshText();}
    installPickers();
    refreshText();
  }

  async function initialize() {
    try {
      const r=await fetch('mur-content.json',{cache:'no-store'});
      if(r.ok){ content=await r.json();ensureTranslations(content); }
    } catch(e) { console.warn('M.U.R. i18n: content unavailable',e); }
    installPickers();
    if (admin) {
      uiEditSection();
      let attempts=0;
      const waitForAdmin=()=>{
        const model=adminData();
        if(model){ content=model;ensureTranslations(content);renderEditor(); }
        else if(attempts++ < 300) requestAnimationFrame(waitForAdmin);
      };
      waitForAdmin();
    }
    syncAudio();
    refreshText();
    startObserver();
    window.addEventListener('mur-content-loaded',()=>{
      // The app's own content loader may complete after us.
      if(!admin){
        fetch('mur-content.json',{cache:'no-store'}).then(r=>r.json()).then(d=>{
          content=d;ensureTranslations(content);syncAudio();refreshText();
        }).catch(()=>{});
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
