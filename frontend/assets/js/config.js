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
  // Reads a <meta name="api-base" content="..."> tag if present (set by build pipeline)
  // Falls back to the environment-injected global, then to empty string (same-origin).
  var meta = document.head && document.head.querySelector('meta[name="api-base"]');
  window.API_BASE = (meta && meta.content) || window.__API_BASE__ || 'https://vcg-backend-kzakkmfhi-anwinws-2615s-projects.vercel.app';
})();
