// "Deals of the week" ticker -- pulls the same price-drop data the
// shop.tvserviceschicago.com chatbot site shows, via the CORS-enabled
// GET /api/price-drops endpoint on that (separate) Next.js app. Renders
// nothing if there are no current deals. Self-contained (injects its own
// <style> + markup) so it only needs one <script> tag per page.
(function () {
  var API_URL = 'https://shop.tvserviceschicago.com/api/price-drops';
  var CHECKOUT_BASE = 'https://shop.tvserviceschicago.com/checkout/';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent =
      '.deals-ticker{border-bottom:1px solid rgba(var(--gold-rgb, 200,169,74),.4);background:var(--surface-3, #000)}' +
      '.deals-ticker-head{display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid rgba(var(--gold-rgb, 200,169,74),.2);background:rgba(var(--gold-rgb, 200,169,74),.05)}' +
      // CSS wins over the stroke="" presentation attribute below, which lets the
      // arrow track the theme without relying on var() inside an SVG attribute.
      '.deals-ticker-head svg{flex-shrink:0;stroke:var(--gold-text, #C8A94A)}' +
      '.deals-ticker-label{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--gold-text,#C8A94A)}' +
      '.deals-ticker-viewport{display:flex;overflow:hidden;white-space:nowrap;padding:10px 0}' +
      '.deals-ticker-track{display:flex;align-items:center;flex-shrink:0;min-width:100%;animation:deals-marquee linear infinite}' +
      '@keyframes deals-marquee{from{transform:translateX(0)}to{transform:translateX(-100%)}}' +
      '.deals-ticker-item{display:flex;flex-shrink:0;align-items:center;gap:8px;padding:0 24px;font-size:12px;white-space:nowrap;text-decoration:none;transition:background-color .15s}' +
      '.deals-ticker-item:hover{background:rgba(var(--gold-rgb, 200,169,74),.1)}' +
      '.deals-ticker-arrow{color:rgba(var(--gold-rgb, 200,169,74),.5)}' +
      '.deals-ticker-name{color:var(--gold-text,#C8A94A);font-weight:700;text-decoration:underline;text-decoration-color:rgba(var(--gold-rgb, 200,169,74),.3);text-underline-offset:2px}' +
      '.deals-ticker-old{color:rgba(var(--gold-rgb, 200,169,74),.4);text-decoration:line-through}' +
      '.deals-ticker-new{color:var(--paper, #F5F0E8);font-weight:700}' +
      '.deals-ticker-save{color:rgba(var(--gold-rgb, 200,169,74),.7)}';
    document.head.appendChild(style);
  }

  function buildTrack(drops, hidden) {
    var track = document.createElement('div');
    track.className = 'deals-ticker-track';
    if (hidden) track.setAttribute('aria-hidden', 'true');
    drops.forEach(function (d) {
      var savings = Math.max(0, d.previousPrice - d.price);
      var a = document.createElement('a');
      a.className = 'deals-ticker-item';
      a.href = CHECKOUT_BASE + encodeURIComponent(d.model);
      a.target = '_blank';
      a.rel = 'noopener';
      if (hidden) a.tabIndex = -1;
      a.title = 'Buy this ' + d.brand + ' ' + d.model + ' now';
      a.innerHTML =
        '<span class="deals-ticker-arrow">▸</span>' +
        '<span class="deals-ticker-name">' + escapeHtml(d.brand) + ' ' + escapeHtml(d.model) + ' (' + escapeHtml(d.sizeInches) + '&quot;)</span>' +
        '<span class="deals-ticker-old">$' + Math.round(d.previousPrice) + '</span>' +
        '<span class="deals-ticker-new">$' + Math.round(d.price) + '</span>' +
        '<span class="deals-ticker-save">−$' + Math.round(savings) + '</span>';
      track.appendChild(a);
    });
    return track;
  }

  function render(drops) {
    if (!drops || !drops.length) return;

    injectStyles();

    var wrap = document.createElement('div');
    wrap.className = 'deals-ticker';

    var head = document.createElement('div');
    head.className = 'deals-ticker-head';
    head.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8A94A" stroke-width="2"><path d="M22 12l-4.5-4.5M22 12l-4.5 4.5M22 12H2"/></svg>' +
      '<span class="deals-ticker-label">Deals of the week</span>';
    wrap.appendChild(head);

    var viewport = document.createElement('div');
    viewport.className = 'deals-ticker-viewport';
    var trackA = buildTrack(drops, false);
    var trackB = buildTrack(drops, true);
    var duration = Math.max(18, drops.length * 8) + 's';
    trackA.style.animationDuration = duration;
    trackB.style.animationDuration = duration;
    viewport.appendChild(trackA);
    viewport.appendChild(trackB);
    wrap.appendChild(viewport);

    document.body.insertBefore(wrap, document.body.firstChild);
  }

  fetch(API_URL)
    .then(function (res) {
      return res.ok ? res.json() : [];
    })
    .then(render)
    .catch(function () {
      // Silently do nothing -- a missing ticker isn't worth surfacing an error for.
    });
})();
