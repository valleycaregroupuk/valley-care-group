/**
 * Valley Care Group — API Configuration
 *
 * window.API_BASE is set here and used by all pages for fetch() calls.
 *
 * - In development: typically 'http://127.0.0.1:3500'
 * - In production: the URL of your live API (e.g. Cloud Run)
 *
 * This file may be updated or replaced during the build/deploy process.
 */
window.MAINTENANCE_MODE = false; // Set to true to activate maintenance page

(function () {
  var PROD_API_BASE = 'https://vcg-backend-778094361124.europe-west2.run.app';
  var KNOWN_BAD_API_BASES = [
    'https://carehomes-wales-api-2h7v4pzu2a-nw.a.run.app',
  ];

  function normalise(url) {
    return String(url || '').trim().replace(/\/$/, '');
  }

  function isKnownBad(url) {
    var u = normalise(url);
    return KNOWN_BAD_API_BASES.indexOf(u) !== -1;
  }

  var meta = document.head && document.head.querySelector('meta[name="api-base"]');
  var fromMeta = normalise(meta && meta.content);
  var fromRuntime = normalise(typeof window.__API_BASE__ === 'string' ? window.__API_BASE__ : '');

  var isLocal =
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || 
     location.hostname === '127.0.0.1' || 
     location.hostname === '0.0.0.0' ||
     location.hostname.startsWith('192.168.') ||
     location.hostname.startsWith('10.') ||
     location.hostname.endsWith('.local'));

  if (isLocal) {
    window.API_BASE = fromMeta || fromRuntime || 'http://127.0.0.1:3500';
    return;
  }

  if (fromMeta && !isKnownBad(fromMeta)) {
    window.API_BASE = fromMeta;
    return;
  }

  if (fromRuntime && !isKnownBad(fromRuntime)) {
    window.API_BASE = fromRuntime;
    return;
  }

  window.API_BASE = PROD_API_BASE;
})();
