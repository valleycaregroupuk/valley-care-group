/**
 * Valley Care Group — Content Loader
 * 
 * Fetches dynamic content from the database and applies it to elements with [data-edit-key].
 * This replaces the previous "Live Edit" functionality which is now disabled for security.
 */
'use strict';

(async function() {
  function sanitiseTrustedHtml(rawHtml) {
    var html = String(rawHtml || '');
    var tpl = document.createElement('template');
    tpl.innerHTML = html;

    tpl.content.querySelectorAll('script, iframe, object, embed, form, link, meta').forEach(function (el) {
      el.remove();
    });

    tpl.content.querySelectorAll('*').forEach(function (el) {
      Array.from(el.attributes).forEach(function (attr) {
        var n = String(attr.name || '').toLowerCase();
        var v = String(attr.value || '').trim().toLowerCase();
        if (n.indexOf('on') === 0 || v.indexOf('javascript:') === 0 || v.indexOf('data:text/html') === 0 || v.indexOf('vbscript:') === 0) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return tpl.innerHTML;
  }

  function decodeLikelyEncodedHtml(raw) {
    var text = String(raw || '');
    if (text.indexOf('&lt;') === -1 && text.indexOf('&gt;') === -1) return text;
    // Only decode when it looks like encoded tags (e.g. &lt;em&gt;...&lt;/em&gt;).
    if (!/&lt;\s*\/?\s*[a-z][^&]*&gt;/i.test(text)) return text;
    var textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  function setSafeContent(el, val) {
    if (val === '') {
      el.textContent = '';
      return;
    }
    var normalised = decodeLikelyEncodedHtml(val);
    // If setHtmlSafely is available from main.js, use it to allow basic tags like <em> and <br>
    if (typeof window.setHtmlSafely === 'function') {
      window.setHtmlSafely(el, normalised);
    } else {
      // Fallback for rare load-order/runtime issues where main.js did not expose setHtmlSafely.
      // Keep rich text rendering and sanitisation behaviour consistent across pages.
      el.innerHTML = sanitiseTrustedHtml(normalised);
    }
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
