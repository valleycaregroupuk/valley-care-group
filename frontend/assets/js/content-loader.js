/**
 * Valley Care Group — Content Loader
 * 
 * Fetches dynamic content from the database and applies it to elements with [data-edit-key].
 * This replaces the previous "Live Edit" functionality which is now disabled for security.
 */
'use strict';

(async function() {
  function setSafeContent(el, val) {
    if (val === '') {
      el.textContent = '';
      return;
    }
    el.textContent = String(val);
  }

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
  const homepage = cData.homepage || {};
  const site     = cData.site || {};

  // Apply mapped content to DOM
  document.querySelectorAll('[data-edit-key]').forEach(el => {
    const key = el.getAttribute('data-edit-key');
    
    // Check in liveData, then homepage, then site
    let val = liveData[key];
    if (val === undefined) val = homepage[key];
    if (val === undefined) val = site[key];

    if (val !== undefined) {
      // If the value is empty, the user explicitly wants to clear it
      if (val === '') {
        setSafeContent(el, '');
        // Special case: hide parent if it's a badge or similar decorative element
        if (el.closest('.hero-sig-badge') || el.closest('.announce-bar')) {
          const parent = el.parentElement;
          if (parent) parent.style.display = 'none';
        }
      } else {
        setSafeContent(el, val);
        // Ensure parent is visible if we have content
        if (el.closest('.hero-sig-badge') || el.closest('.announce-bar')) {
          const parent = el.parentElement;
          if (parent) parent.style.display = '';
        }
      }
      
      // If it's a counter, update the target too
      if (el.hasAttribute('data-target') && !isNaN(parseFloat(val)) && val !== '') {
        el.setAttribute('data-target', val);
      }
    }
  });
})();
