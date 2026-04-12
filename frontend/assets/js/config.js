/**
 * Valley Care Group — API Configuration
 *
 * window.API_BASE is set here and used by all pages for fetch() calls.
 *
 * - In development (same-origin, served by Express): leave as ''
 * - In production (separate Vercel deployments): set to your backend URL
 *   e.g. 'https://vcg-backend.vercel.app'
 *
 * This file is replaced at build/deploy time — the frontend Vercel project
 * must have the environment variable VITE_API_BASE (or similar) baked in,
 * OR this file is updated with the correct URL before pushing to GitHub.
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
