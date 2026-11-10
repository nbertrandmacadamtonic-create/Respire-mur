/* M.U.R. — Accueil sphère lumineuse 2026.
   Module visuel additif : conserve la rotation tactile, le menu radial,
   les quatre accès, le mode rapide, les tests et les données NeuroFlex. */
(() => {
  'use strict';
  const STYLE_ID = 'mur-accueil-lumineux-2026';
  function install() {
    const circle = document.getElementById('homeCircle');
    const home = document.getElementById('home');
    if (!circle || !home || document.getElementById(STYLE_ID)) return;
    home.classList.add('mur-home-lumineux');
    circle.classList.add('mur-home-image-orb');
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Nouveau visuel, même élément #homeCircle et mêmes gestionnaires de clic/glissement */
      #home.mur-home-lumineux #homeCircle.mur-home-image-orb,
      #home.mur-home-lumineux #homeCircle.mur-home-image-orb.ready {
        isolation:isolate!important;
        overflow:visible!important;
        border:0!important;
        border-radius:50%!important;
        background:none!important;
        box-shadow:none!important;
        -webkit-tap-highlight-color:transparent;
        cursor:pointer;
        touch-action:none!important;
        user-select:none!important;
      }
      #home.mur-home-lumineux #homeCircle.mur-home-image-orb::before {
        content:''!important;
        position:absolute!important;
        inset:-19%!important;
        border:0!important;
        border-radius:0!important;
        background:url('mur-accueil-sphere.webp') center center / contain no-repeat!important;
        box-shadow:none!important;
        animation:murSphereFloat2026 7.5s ease-in-out infinite!important;
        pointer-events:none!important;
        z-index:0!important;
        transform-origin:50% 50%;
      }
      #home.mur-home-lumineux #homeCircle.mur-home-image-orb::after {
        content:''!important;
        position:absolute!important;
        inset:4%!important;
        border-radius:50%!important;
        background:radial-gradient(circle,transparent 44%,rgba(28,255,131,.08) 69%,transparent 75%)!important;
        filter:blur(9px);
        pointer-events:none!important;
        z-index:0!important;
        animation:murSphereLight2026 6s ease-in-out infinite alternate!important;
      }
      /* La photographie porte déjà l'anneau et ses mots : éviter les anciennes inscriptions par-dessus. */
      #home.mur-home-lumineux #homeCircle .home-circle-text,
      #home.mur-home-lumineux #homeCircle .home-cursor {display:none!important;}
      #home.mur-home-lumineux #homeCircle .mur-orb-start-trigger {
        position:absolute!important;
        z-index:8!important;
        left:50%!important;
        top:50%!important;
        transform:translate(-50%,-50%)!important;
        max-width:70%!important;
        text-align:center!important;
      }
      #home.mur-home-lumineux #homeCircle.mur-menu-open::before {
        animation-play-state:paused!important;
        filter:brightness(.8)!important;
      }
      #home.mur-home-lumineux #homeCircle.rotating::before {filter:brightness(1.12)!important;}
      #home.mur-home-lumineux .home-wheel-card {overflow:visible!important;}
      #home.mur-home-lumineux #homeHint {position:relative!important;z-index:2!important;}
      @keyframes murSphereFloat2026 {
        0%,100% {transform:translateY(2px) scale(.985);filter:brightness(.97) saturate(1.03)}
        50% {transform:translateY(-3px) scale(1.027);filter:brightness(1.10) saturate(1.11)}
      }
      @keyframes murSphereLight2026 {from{opacity:.35}to{opacity:.88}}
      @media(prefers-reduced-motion:reduce){
        #home.mur-home-lumineux #homeCircle::before,
        #home.mur-home-lumineux #homeCircle::after{animation:none!important}
      }
    `;
    document.head.appendChild(style);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
