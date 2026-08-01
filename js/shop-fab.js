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

  function inject() {
    var style = document.createElement('style');
    style.textContent = [
      '.shop-tvs-fab { position: fixed; top: 16px; right: 20px; z-index: 9999; text-align: center; }',
      '.shop-tvs-caption { display: inline-block; margin-bottom: 8px; background: #111; color: #fff;',
      '  font-size: 11.5px; line-height: 1.5; padding: 8px 12px; border-radius: 8px;',
      '  box-shadow: 0 6px 18px rgba(0,0,0,0.25); max-width: 190px; }',
      '.shop-tvs-balloon-link { display: block; text-decoration: none; }',
      '.shop-tvs-balloon { width: 72px; height: 80px; margin: 0 auto;',
      '  background: repeating-linear-gradient(100deg, #3B82F6 0 9px, #2563EB 9px 18px);',
      '  border-radius: 50% 50% 46% 46% / 60% 60% 40% 40%;',
      '  box-shadow: 0 8px 20px rgba(59,130,246,0.55);',
      '  display: flex; align-items: center; justify-content: center; padding: 4px; }',
      '.shop-tvs-balloon-label { color: #fff; font-weight: 800; font-size: 11px; line-height: 1.15;',
      '  text-align: center; letter-spacing: 0.02em; font-family: sans-serif; }',
      '.shop-tvs-balloon-cords { width: 2px; height: 12px; background: rgba(0,0,0,0.3); margin: 0 auto; }',
      '.shop-tvs-balloon-basket { width: 30px; height: 18px; margin: 0 auto; background: #8B5E34;',
      '  border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2); }',
    ].join('\n');
    document.head.appendChild(style);

    var fab = document.createElement('div');
    fab.className = 'shop-tvs-fab';
    fab.id = 'shopTvsFab';
    fab.innerHTML =
      '<div class="shop-tvs-caption">' + copy.caption + '</div>' +
      '<a href="' + SHOP_URL + '" target="_blank" rel="noopener" class="shop-tvs-balloon-link">' +
        '<div class="shop-tvs-balloon"><span class="shop-tvs-balloon-label">' + copy.label + '</span></div>' +
        '<div class="shop-tvs-balloon-cords"></div>' +
        '<div class="shop-tvs-balloon-basket"></div>' +
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
