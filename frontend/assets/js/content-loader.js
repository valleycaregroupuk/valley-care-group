/**
 * Valley Care Group — Content Loader
 * 
 * Fetches dynamic content from the database and applies it to elements with [data-edit-key].
 * This replaces the previous "Live Edit" functionality which is now disabled for security.
 */
'use strict';

(async function() {
  let cData = {};
  try {
    // Attempt to load live content from API
    const res = await fetch((window.__API_BASE__ || window.API_BASE || '') + '/api/content');
    if (res.ok) {
      cData = await res.json();
    }
  } catch(e) { 
    // Fail silently, site will use static HTML fallback
  }

  const liveData = cData.live || {};

  // Apply mapped content to DOM
  document.querySelectorAll('[data-edit-key]').forEach(el => {
    const key = el.getAttribute('data-edit-key');
    if (liveData[key] !== undefined && liveData[key] !== '') {
      el.innerHTML = liveData[key];
    }
  });
})();
