/**
 * Cookie consent + optional Google Analytics (set PUBLIC_GA_ID at build).
 */
(function () {
  'use strict';

  function loadGa(id) {
    if (!id || window.__vcgGaLoaded) return;
    window.__vcgGaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id);
  }

  function init() {
    var ga = typeof window.__PUBLIC_GA_ID__ === 'string' ? window.__PUBLIC_GA_ID__.trim() : '';
    if (!ga) return;

    var ok = false;
    try {
      ok = localStorage.getItem('vcg_cookie_ok') === '1';
    } catch (_) {}

    if (ok) {
      loadGa(ga);
      return;
    }

    var b = document.getElementById('vcg-cookie-banner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'vcg-cookie-banner';
      b.setAttribute('role', 'dialog');
      b.setAttribute('aria-label', 'Cookies');
      b.innerHTML =
        '<span>We use optional analytics cookies to understand how the site is used. Read our <a href="cookies.html">Cookies policy</a>.</span>' +
        '<button type="button" class="btn btn-gold btn-sm" id="vcg-cookie-accept" style="padding:0.4rem 1rem;border:none;border-radius:6px;cursor:pointer;font-weight:600">Accept analytics</button>' +
        '<button type="button" id="vcg-cookie-decline" style="padding:0.4rem 1rem;background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;border-radius:6px;cursor:pointer">Decline</button>';
      document.body.appendChild(b);
      document.getElementById('vcg-cookie-accept').addEventListener('click', function () {
        try { localStorage.setItem('vcg_cookie_ok', '1'); } catch (_) {}
        b.classList.remove('vcg-show');
        loadGa(ga);
      });
      document.getElementById('vcg-cookie-decline').addEventListener('click', function () {
        try { localStorage.setItem('vcg_cookie_ok', '0'); } catch (_) {}
        b.classList.remove('vcg-show');
      });
    }
    b.classList.add('vcg-show');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
