// ================================
// VALLEY CARE GROUP — Main JS
// ================================

document.addEventListener('DOMContentLoaded', function () {

  // ---- Navbar scroll behaviour ----
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
        navbar.classList.remove('transparent');
      } else {
        navbar.classList.remove('scrolled');
        navbar.classList.add('transparent');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // ---- Hero bg pan effect ----
  const heroBg = document.getElementById('hero-bg');
  if (heroBg) {
    setTimeout(() => heroBg.classList.add('loaded'), 100);
  }

  // ---- Particles ----
  const particleContainer = document.getElementById('particles');
  if (particleContainer) {
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'hero-particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.width = p.style.height = (Math.random() * 4 + 2) + 'px';
      p.style.animationDuration = (Math.random() * 12 + 8) + 's';
      p.style.animationDelay = (Math.random() * 10) + 's';
      p.style.opacity = Math.random() * 0.6;
      particleContainer.appendChild(p);
    }
  }

  // ---- Counter animation ----
  function animateCounters() {
    document.querySelectorAll('.count-num').forEach(el => {
      const target = parseFloat(el.dataset.target);
      const duration = 2000;
      const isDecimal = String(target).includes('.');
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = ease * target;
        el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // ---- Intersection Observer for scroll animations ----
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));

  // ---- Counter observer ----
  let countersTriggered = false;
  const counterSection = document.querySelector('.hero-stats');
  if (counterSection) {
    const counterObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersTriggered) {
          countersTriggered = true;
          animateCounters();
          counterObs.unobserve(counterSection);
        }
      });
    }, { threshold: 0.3 });
    counterObs.observe(counterSection);
    // Trigger on load if already visible
    setTimeout(() => { if (!countersTriggered) animateCounters(); }, 1200);
  }

  // ---- Mobile nav ----
  window.toggleMobileNav = function () {
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');
    if (!hamburger || !mobileNav) return;
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
    document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
  };

  function showFormToast(title, msg, isError) {
    const toast = document.getElementById('toast');
    if (!toast) {
      window.alert((title ? title + '\n' : '') + (msg || ''));
      return;
    }
    const t = toast.querySelector('.toast-title');
    const m = toast.querySelector('.toast-msg');
    if (t) t.textContent = title || '';
    if (m) m.textContent = msg || '';
    toast.classList.toggle('toast--error', !!isError);
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, isError ? 8000 : 6000);
  }

  function readEnquiryPayload(form) {
    const fd = new FormData(form);
    var first = String(fd.get('firstName') || '').trim();
    var last = String(fd.get('lastName') || '').trim();
    var name = String(fd.get('name') || '').trim() || (first + ' ' + last).trim();
    var preferred = String(fd.get('preferredHome') || fd.get('homeSlug') || '').trim();
    return {
      name: name,
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      message: String(fd.get('message') || '').trim(),
      homeSlug: String(fd.get('homeSlug') || preferred || '').trim(),
      source: String(fd.get('source') || '').trim(),
      careType: String(fd.get('careType') || '').trim(),
      reasonForContact: String(fd.get('reasonForContact') || '').trim(),
      preferredHome: String(fd.get('preferredHomeLabel') || preferred || '').trim(),
      postedPackRequested: fd.get('postedPackRequested') === 'on' || fd.get('postedPack') === 'on',
      gdprConsent: fd.get('gdprConsent') === 'on' || fd.get('gdprConsent') === 'yes',
      website: String(fd.get('website') || '').trim(),
    };
  }

  // ---- Enquiry form submission ----
  window.submitEnquiry = async function (e) {
    e.preventDefault();
    var form = e.target;
    var base = String(window.API_BASE || '').replace(/\/$/, '');
    var isLocal = typeof location !== 'undefined' &&
      (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    if (!base && !isLocal) {
      showFormToast('Cannot send', 'This site is not configured to reach our server. Please call or email us instead.', true);
      return;
    }
    if (!base && isLocal) base = 'http://127.0.0.1:3500';

    var payload = readEnquiryPayload(form);
    if (!payload.gdprConsent) {
      showFormToast('Privacy consent', 'Please tick the box to confirm you agree to our privacy policy.', true);
      return;
    }
    if (!payload.name || !payload.email || !payload.phone) {
      showFormToast('Missing details', 'Please enter your name, email, and phone number.', true);
      return;
    }

    var btn = form.querySelector('[type="submit"]');
    var prevLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    try {
      var res = await fetch(base + '/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          message: payload.message,
          homeSlug: payload.homeSlug,
          source: payload.source,
          careType: payload.careType,
          reasonForContact: payload.reasonForContact,
          preferredHome: payload.preferredHome,
          postedPackRequested: payload.postedPackRequested,
          gdprConsent: true,
          website: payload.website,
        }),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Request failed');
      form.reset();
      showFormToast('Enquiry sent', 'Thank you — our team will be in touch as soon as possible.', false);
    } catch (err) {
      showFormToast('Could not send', err.message || 'Please try again or contact us by phone.', true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = prevLabel; }
    }
  };

  // ---- Home review (homes & care) — reviews.html → KV + admin ----
  window.submitHomeReview = async function (e) {
    e.preventDefault();
    // Submit event: e.target is often the submit button, not the form — FormData(button) omits fields.
    var form =
      (e.currentTarget && e.currentTarget.tagName === 'FORM' && e.currentTarget) ||
      (e.target && e.target.form) ||
      (e.target && e.target.tagName === 'FORM' && e.target) ||
      document.getElementById('home-review-form');
    if (!form || form.tagName !== 'FORM') {
      showFormToast('Error', 'Could not read the review form. Please refresh the page and try again.', true);
      return;
    }

    var base = String(window.API_BASE || '').replace(/\/$/, '');
    var isLocal = typeof location !== 'undefined' &&
      (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    if (!base && !isLocal) {
      showFormToast('Cannot send', 'This site cannot reach our server from here. Please email us or call instead.', true);
      return;
    }
    if (!base && isLocal) base = 'http://127.0.0.1:3500';

    function field(name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? String(el.value || '').trim() : '';
    }
    var ratingRaw = field('hr_rating');
    var gdprEl = form.querySelector('#hr_gdpr');
    var pubEl = form.querySelector('#hr_publish');
    var payload = {
      name: field('hr_name'),
      email: field('hr_email'),
      phone: field('hr_phone'),
      homeSlug: field('hr_home') || 'group',
      relationship: field('hr_relation'),
      review: field('hr_review'),
      rating: ratingRaw === '' ? null : ratingRaw,
      gdprConsent: !!(gdprEl && gdprEl.checked),
      publishConsent: !!(pubEl && pubEl.checked),
      website: field('hr_website'),
    };

    if (!payload.gdprConsent) {
      showFormToast('Privacy', 'Please tick the box to confirm you agree to our privacy policy.', true);
      return;
    }
    if (!payload.publishConsent) {
      showFormToast('Permission', 'Please confirm you understand how we may use your feedback about our homes and care.', true);
      return;
    }
    if (!payload.name || !payload.email || payload.review.length < 20) {
      showFormToast('Missing details', 'Please add your name, email, and at least 20 characters about the home or services.', true);
      return;
    }

    var btn = form.querySelector('[type="submit"]');
    var prevLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    try {
      var res = await fetch(base + '/api/home-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Request failed');
      form.reset();
      showFormToast('Thank you', 'Your review has been received. It is not shown on the site automatically. For a verified public score, you can also leave a review on carehome.co.uk.', false);
    } catch (err) {
      showFormToast('Could not send', err.message || 'Please try again or contact us by phone.', true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = prevLabel; }
    }
  };

  // ---- Tab system ----
  window.switchTab = function (tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    const activeBtn = document.querySelector('[data-tab="' + tabId + '"]');
    const activePanel = document.getElementById('tab-' + tabId);
    if (activeBtn) activeBtn.classList.add('active');
    if (activePanel) activePanel.classList.add('active');
  };

  // ---- Active nav link highlighting ----
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPage || href.endsWith(currentPage))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // ---- Smooth reveal on load ----
  document.body.style.opacity = '0';
  requestAnimationFrame(() => {
    document.body.style.transition = 'opacity 0.4s ease';
    document.body.style.opacity = '1';
  });

  // ---- Job application form (careers page modal) ----
  window.submitJobApplication = async function (e) {
    e.preventDefault();
    var form = e.target;
    var base = String(window.API_BASE || '').replace(/\/$/, '');
    var isLocal = typeof location !== 'undefined' &&
      (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    if (!base && !isLocal) {
      showFormToast('Cannot send', 'This site is not configured to reach our server. Please email your CV instead.', true);
      return;
    }
    if (!base && isLocal) base = 'http://127.0.0.1:3500';

    var fd = new FormData(form);
    if (fd.get('gdprConsent') !== 'on' && fd.get('gdprConsent') !== 'yes') {
      showFormToast('Privacy consent', 'Please confirm you agree to our privacy policy.', true);
      return;
    }

    var btn = form.querySelector('[type="submit"]');
    var prev = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

    try {
      var res = await fetch(base + '/api/applications', { method: 'POST', body: fd });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Request failed');
      form.reset();
      var modal = document.getElementById('job-modal');
      if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
      showFormToast('Application received', 'Thank you — our HR team will review and be in touch.', false);
    } catch (err) {
      showFormToast('Could not submit', err.message || 'Please try again.', true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = prev || 'Submit Application →'; }
    }
  };

});
