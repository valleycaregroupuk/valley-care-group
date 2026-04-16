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
(function () {
  var meta = document.head && document.head.querySelector('meta[name="api-base"]');
  var fromMeta = meta && meta.content;
  var fromRuntime = typeof window.__API_BASE__ === 'string' ? window.__API_BASE__ : '';

  var isLocal =
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  if (fromMeta) window.API_BASE = fromMeta;
  else if (fromRuntime) window.API_BASE = fromRuntime.replace(/\/$/, '');
  else if (isLocal) window.API_BASE = 'http://127.0.0.1:3500';
  else window.API_BASE = '';
})();
