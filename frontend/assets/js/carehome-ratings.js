/**
 * Apply carehome.co.uk display scores from Content Manager (homepage section).
 * Call with homepage slice from GET /api/content, or rely on autoInit() from non-index pages.
 */
(function () {
  'use strict';

  function setText(id, val) {
    if (val == null || val === '') return;
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function applyCarehomeRatings(h) {
    if (!h || typeof h !== 'object') return;

    var gS = h.carehomeGlanScore != null && String(h.carehomeGlanScore).trim() !== ''
      ? String(h.carehomeGlanScore).trim() : null;
    var lS = h.carehomeLlysScore != null && String(h.carehomeLlysScore).trim() !== ''
      ? String(h.carehomeLlysScore).trim() : null;

    var gR = h.carehomeGlanReviews;
    if (gR !== undefined && gR !== null && gR !== '') {
      gR = parseInt(String(gR), 10);
      if (Number.isNaN(gR)) gR = null;
    } else gR = null;

    var lR = h.carehomeLlysReviews;
    if (lR !== undefined && lR !== null && lR !== '') {
      lR = parseInt(String(lR), 10);
      if (Number.isNaN(lR)) lR = null;
    } else lR = null;

    setText('ch-float-rating-num', gS);
    if (gS && lS) {
      setText('ch-float-rating-sub', 'Llys Gwyn ' + lS + ' · Ty Pentwyn listed');
      setText('ch-accred-carehome', gS + ' & ' + lS + ' / 10');
    }

    setText('bento-glan-rating-num', gS);
    if (gR != null) setText('bento-glan-rating-label', String(gR) + ' Reviews');

    setText('bento-llys-rating-num', lS);
    if (lR != null) setText('bento-llys-rating-label', String(lR) + ' Reviews');

    setText('story-award-rating-num', gS);

    setText('testi-glan-score', gS);
    if (gR != null) setText('testi-glan-meta', String(gR) + ' reviews · carehome.co.uk →');
    setText('testi-llys-score', lS);
    if (lR != null) setText('testi-llys-meta', String(lR) + ' reviews · carehome.co.uk →');

    setText('homes-glan-badge-num', gS);
    if (gR != null) setText('homes-glan-badge-meta', String(gR) + ' Reviews on carehome.co.uk');
    setText('homes-llys-badge-num', lS);
    if (lR != null) setText('homes-llys-badge-meta', String(lR) + ' Reviews on carehome.co.uk');

    setText('homes-compare-glan-score', gS);
    setText('homes-compare-llys-score', lS);

    setText('homes-inline-glan-score', gS);
    if (gR != null) setText('homes-inline-glan-reviews', String(gR));

    setText('glan-rating-num', gS);
    if (gS) setText('glan-fact-score', gS + ' / 10 ⭐');
    if (gR != null) {
      setText('glan-rating-sub', 'carehome.co.uk · ' + String(gR) + ' Reviews');
      setText('glan-fact-reviews', String(gR) + ' Reviews');
    }

    setText('llys-rating-num', lS);
    if (lR != null && lS) {
      setText('llys-rating-sub', 'carehome.co.uk · ' + String(lR) + ' Reviews');
      setText('llys-fact-carehome', lS + ' / 10 ⭐ · ' + String(lR) + ' reviews');
    }

    var meta = document.querySelector('meta[name="description"]');
    if (meta && meta.content) {
      var page = (location.pathname || '').split('/').pop() || '';
      if (page === 'glan-yr-afon.html' && gS) {
        meta.content = meta.content.replace(/\d+(?:\.\d+)?(?= rating)/, gS);
      }
      if (page === 'llys-gwyn.html' && lS) {
        meta.content = meta.content.replace(/\d+(?:\.\d+)?(?= on carehome)/, lS);
      }
    }
  }

  window.applyCarehomeRatings = applyCarehomeRatings;

  function apiBase() {
    var b = (window.API_BASE || '').replace(/\/$/, '');
    if (!b && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      b = 'http://127.0.0.1:3500';
    }
    return b;
  }

  function autoInit() {
    var base = apiBase();
    if (!base) return;
    fetch(base + '/api/content')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) {
        if (c && c.homepage) applyCarehomeRatings(c.homepage);
      })
      .catch(function () {});
  }

  if (!window.__vcgCarehomeFromIndex) {
    autoInit();
  }
})();
