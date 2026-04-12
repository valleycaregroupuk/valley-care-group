/**
 * Welsh / English toggle for key UI labels (extend over time).
 */
(function () {
  'use strict';

  var DICT = {
    en: {
      nav_home: 'Home',
      nav_about: 'About Us',
      nav_homes: 'Our Homes',
      nav_services: 'Services',
      nav_careers: 'Careers',
      nav_contact: 'Contact',
      nav_enquiry: 'Care Enquiry',
    },
    cy: {
      nav_home: 'Hafan',
      nav_about: 'Amdanom ni',
      nav_homes: 'Ein cartrefi',
      nav_services: 'Gwasanaethau',
      nav_careers: 'Gyrfaoedd',
      nav_contact: 'Cysylltu',
      nav_enquiry: 'Ymholiad gofal',
    },
  };

  function apply(lang) {
    var t = DICT[lang] || DICT.en;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (k && t[k]) el.textContent = t[k];
    });
    document.documentElement.lang = lang === 'cy' ? 'cy' : 'en';
    try {
      localStorage.setItem('vcg_lang', lang);
    } catch (_) {}
    var enBtn = document.getElementById('vcg-lang-en');
    var cyBtn = document.getElementById('vcg-lang-cy');
    if (enBtn) enBtn.classList.toggle('active', lang !== 'cy');
    if (cyBtn) cyBtn.classList.toggle('active', lang === 'cy');
  }

  function init() {
    var saved = 'en';
    try {
      saved = localStorage.getItem('vcg_lang') === 'cy' ? 'cy' : 'en';
    } catch (_) {}
    apply(saved);
    var enBtn = document.getElementById('vcg-lang-en');
    var cyBtn = document.getElementById('vcg-lang-cy');
    if (enBtn) enBtn.addEventListener('click', function () { apply('en'); });
    if (cyBtn) cyBtn.addEventListener('click', function () { apply('cy'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
