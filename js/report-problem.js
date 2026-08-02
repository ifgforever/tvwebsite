(function () {
  if (document.getElementById('reportProblemButton')) return;
  var button = document.createElement('a');
  button.id = 'reportProblemButton';
  button.textContent = '⚑ Report a problem';
  button.href = 'https://tv-ops-public-api.tvinstallchicago.workers.dev/report-problem?source=' + encodeURIComponent(window.location.href);
  button.setAttribute('aria-label', 'Report a problem with this page');
  button.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9999;padding:10px 13px;border:1px solid #c8a94a;border-radius:999px;background:#111;color:#f5f1e8;font:700 12px Arial,sans-serif;text-decoration:none;box-shadow:0 6px 24px rgba(0,0,0,.55)';
  document.body.appendChild(button);
})();
