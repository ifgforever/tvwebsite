/**
 * shop-fab.js
 *
 * Self-injecting "Shop TVs" hot air balloon button, shared across every
 * page of the site (loaded via a single <script> tag rather than
 * duplicating this markup in ~340 HTML files). Descends toward the
 * middle of the viewport while scrolling, then floats back up to rest
 * near the top once scrolling stops, with a slow side-to-side drift.
 */
(function () {
  var LANG = (location.pathname.indexOf('/es/') === 0 || location.pathname === '/es') ? 'es'
    : (location.pathname.indexOf('/pl/') === 0 || location.pathname === '/pl') ? 'pl'
    : 'en';

  var COPY = {
    en: {
      label: 'Shop TVs',
      caption: 'Elevate your TV — buy today. Free delivery, with same-day installation available. Opens in a new tab.',
    },
    es: {
      label: 'Comprar TVs',
      caption: 'Eleva tu TV — compra hoy. Entrega gratis, instalación el mismo día disponible. Se abre en una pestaña nueva.',
    },
    pl: {
      label: 'Kup TV',
      caption: 'Unieś swój telewizor — kup dziś. Darmowa dostawa, montaż tego samego dnia dostępny. Otwiera się w nowej karcie.',
    },
  };
  var copy = COPY[LANG];
  var SHOP_URL = 'https://shop.tvserviceschicago.com';

  // A classic red/orange/yellow hot air balloon, sticker-style with a
  // white outline so it reads as an illustration, not a UI button --
  // both the blue icon-in-pill and the blue CSS-shape versions still
  // just looked like a plain blue button from a distance.
  var BALLOON_SVG =
    '<svg width="76" height="100" viewBox="0 0 80 104" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<linearGradient id="stvsBalloonGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#E0332B"/>' +
          '<stop offset="45%" stop-color="#F0592B"/>' +
          '<stop offset="70%" stop-color="#F7941D"/>' +
          '<stop offset="100%" stop-color="#FBB522"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<path d="M40,2 C65,2 74,26 74,38 C74,54 60,66 44,68 L36,68 C20,66 6,54 6,38 C6,26 15,2 40,2 Z" ' +
        'fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>' +
      '<path d="M40,2 C65,2 74,26 74,38 C74,54 60,66 44,68 L36,68 C20,66 6,54 6,38 C6,26 15,2 40,2 Z" ' +
        'fill="url(#stvsBalloonGrad)" stroke="#B8241E" stroke-width="1.5"/>' +
      '<path d="M40,3 C40,22 40,50 40,67" stroke="#B8241E" stroke-width="1.5" fill="none" opacity="0.6"/>' +
      '<path d="M25,5 C18,24 22,54 34,67" stroke="#B8241E" stroke-width="1.5" fill="none" opacity="0.6"/>' +
      '<path d="M55,5 C62,24 58,54 46,67" stroke="#B8241E" stroke-width="1.5" fill="none" opacity="0.6"/>' +
      '<path d="M36,68 L31,82 M44,68 L49,82" stroke="#3A2A1E" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<rect x="24" y="80" width="32" height="4" rx="1" fill="#3B82F6" stroke="#fff" stroke-width="2"/>' +
      '<rect x="26" y="83" width="28" height="16" rx="2.5" fill="#8B5E34" stroke="#5C3A1E" stroke-width="1"/>' +
    '</svg>';

  function inject() {
    var style = document.createElement('style');
    style.textContent = [
      '.shop-tvs-fab { position: fixed; top: 16px; right: 16px; z-index: 9999; text-align: center; }',
      '.shop-tvs-caption { display: inline-block; margin-bottom: 8px; background: #111; color: #fff;',
      '  font-size: 11.5px; line-height: 1.5; padding: 8px 12px; border-radius: 8px;',
      '  box-shadow: 0 6px 18px rgba(0,0,0,0.25); max-width: 190px; }',
      '.shop-tvs-balloon-link { display: block; filter: drop-shadow(0 8px 14px rgba(0,0,0,0.35)); }',
    ].join('\n');
    document.head.appendChild(style);

    var fab = document.createElement('div');
    fab.className = 'shop-tvs-fab';
    fab.id = 'shopTvsFab';
    fab.innerHTML =
      '<div class="shop-tvs-caption">' + copy.caption + '</div>' +
      '<a href="' + SHOP_URL + '" target="_blank" rel="noopener" class="shop-tvs-balloon-link" aria-label="' + copy.label + '">' +
        BALLOON_SVG +
      '</a>';
    document.body.appendChild(fab);

    var TOP_START = 16;
    var IDLE_DELAY_MS = 500;
    var currentTop = TOP_START;
    var targetTop = TOP_START;
    var idleTimer = null;
    var isScrolling = false;

    function computeTarget() {
      if (!isScrolling) {
        targetTop = TOP_START;
        return;
      }
      var halfwayTop = window.innerHeight / 2 - fab.offsetHeight / 2;
      var scrollRange = document.documentElement.scrollHeight - window.innerHeight;
      var scrollFraction = scrollRange > 0 ? Math.min(window.scrollY / scrollRange, 1) : 1;
      targetTop = TOP_START + (halfwayTop - TOP_START) * scrollFraction;
    }

    function onScroll() {
      isScrolling = true;
      computeTarget();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        isScrolling = false;
        computeTarget();
      }, IDLE_DELAY_MS);
    }

    function tick() {
      var speed = targetTop < currentTop ? 0.035 : 0.08;
      currentTop += (targetTop - currentTop) * speed;
      var sway = Math.sin(Date.now() / 1100) * 6;
      fab.style.top = currentTop + 'px';
      fab.style.transform = 'translateX(' + sway + 'px)';
      requestAnimationFrame(tick);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', computeTarget, { passive: true });
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
