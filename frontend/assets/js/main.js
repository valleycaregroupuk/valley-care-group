// ================================
// VALLEY CARE GROUP — Main JS
// ================================

document.addEventListener('DOMContentLoaded', function () {

  // ---- Force scroll to top on refresh ----
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  // ---- Scroll to Top Button ----
  const scrollTopBtn = document.createElement('button');
  /* Added .back-to-top class which handles styling */
  scrollTopBtn.innerHTML = '↑';
  scrollTopBtn.className = 'back-to-top';
  scrollTopBtn.setAttribute('aria-label', 'Scroll to top');
  document.body.appendChild(scrollTopBtn);

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---- Section Progress Bar ----
  const progressBarContainer = document.createElement('div');
  progressBarContainer.className = 'scroll-progress-container';
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress-bar';
  progressBarContainer.appendChild(progressBar);
  document.body.appendChild(progressBarContainer);

  window.addEventListener('scroll', () => {
    // Back to top visibility
    if (window.scrollY > 400) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }

    // Scroll progress bar
    const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollTotal > 0) {
      const progress = (window.scrollY / scrollTotal) * 100;
      progressBar.style.width = progress + '%';
    }
  }, { passive: true });

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

  // ---- FAQ Accordion (Event Delegation) ----
  document.addEventListener('click', function(e) {
    const questionBtn = e.target.closest('.faq-question');
    if (!questionBtn) return;
    
    const faqItem = questionBtn.closest('.faq-item');
    const answerDiv = faqItem.querySelector('.faq-answer');
    const isExpanded = questionBtn.getAttribute('aria-expanded') === 'true';
    
    // Close other FAQs in the same container (accordian behaviour)
    const container = faqItem.closest('.home-section') || document;
    container.querySelectorAll('.faq-item.is-active').forEach(item => {
      if (item !== faqItem) {
        item.classList.remove('is-active');
        item.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        item.querySelector('.faq-answer').style.maxHeight = null;
      }
    });

    if (isExpanded) {
      questionBtn.setAttribute('aria-expanded', 'false');
      faqItem.classList.remove('is-active');
      answerDiv.style.maxHeight = null;
    } else {
      questionBtn.setAttribute('aria-expanded', 'true');
      faqItem.classList.add('is-active');
      answerDiv.style.maxHeight = answerDiv.scrollHeight + 'px';
    }
  });

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

  // ---- Lightbox Logic ----
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.id = 'lightbox';
  lightbox.innerHTML = `
    <button class="lightbox-close" id="lightbox-close" aria-label="Close lightbox">&times;</button>
    <div class="lightbox-content">
      <img src="" alt="" class="lightbox-img" id="lightbox-img">
      <div class="lightbox-controls">
        <button class="lightbox-btn" id="lightbox-prev" aria-label="Previous image">❮</button>
        <button class="lightbox-btn" id="lightbox-next" aria-label="Next image">❯</button>
      </div>
    </div>
    <div class="lightbox-caption" id="lightbox-caption"></div>
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  let currentGallery = [];
  let currentIndex = 0;

  function openLightbox(index, gallery) {
    currentGallery = gallery;
    currentIndex = index;
    updateLightbox();
    lightbox.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function updateLightbox() {
    const item = currentGallery[currentIndex];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || '';
    lightboxCaption.textContent = item.alt || '';
  }

  function closeLightbox() {
    lightbox.classList.remove('show');
    document.body.style.overflow = '';
  }

  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
    updateLightbox();
  });
  document.getElementById('lightbox-next').addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % currentGallery.length;
    updateLightbox();
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
      closeLightbox();
    }
  });

  // ---- Lightbox Keyboard Navigation ----
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('show')) return;
    
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      document.getElementById('lightbox-prev').click();
    } else if (e.key === 'ArrowRight') {
      document.getElementById('lightbox-next').click();
    }
  });

  window.initGalleryLightbox = function(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    grid.addEventListener('click', e => {
      const item = e.target.closest('.gallery-item');
      if (!item) return;

      const imgs = Array.from(grid.querySelectorAll('img')).map(img => ({
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt')
      }));
      const index = Array.from(grid.querySelectorAll('.gallery-item')).indexOf(item);
      openLightbox(index, imgs);
    });
  };

  // ---- Scroll Spy Logic ----
  function initScrollSpy() {
    const stickyNav = document.querySelector('.sticky-nav');
    if (!stickyNav) return;

    const sections = document.querySelectorAll('.home-section');
    const navLinks = stickyNav.querySelectorAll('a');

    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px -55% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
          
          // Smoothly scroll the sticky nav to keep active link in view
          const activeLink = stickyNav.querySelector('a.active');
          if (activeLink) {
            stickyNav.scrollTo({
              left: activeLink.offsetLeft - (stickyNav.offsetWidth / 2) + (activeLink.offsetWidth / 2),
              behavior: 'smooth'
            });
          }
        }
      });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
  }

  // Check for sticky nav on load
  setTimeout(initScrollSpy, 100);

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

  // ---- Smooth scroll to top for Logo and Home link on homepage ----
  document.querySelectorAll('.nav-logo, [data-i18n="nav_home"]').forEach(link => {
    link.addEventListener('click', function(e) {
      if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        
        // Close mobile nav if it's open
        const mobileNav = document.getElementById('mobile-nav');
        if (mobileNav && mobileNav.classList.contains('open')) {
          toggleMobileNav();
        }
      }
    });
  });

});

// ---- Newsletter Subscription ----
window.submitNewsletter = async function(e) {
  if (e) e.preventDefault();
  const form = e.target;
  const emailInput = form.querySelector('input[type="email"]');
  const btn = form.querySelector('button');
  const email = emailInput ? emailInput.value : '';
  if (!email) return;
  
  if (btn) { btn.disabled = true; btn.textContent = 'Subscribing...'; }
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  let base = (window.API_BASE || '').replace(/\/$/, '');
  if (!base && isLocal) base = 'http://127.0.0.1:3500';

  try {
    const res = await fetch(base + '/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    if (!res.ok) throw new Error('Failed to subscribe');
    
    // Provide feedback
    const okMsg = document.createElement('div');
    okMsg.textContent = 'Thanks for subscribing!';
    okMsg.style.color = '#117A65';
    okMsg.style.fontSize = '0.9rem';
    okMsg.style.marginTop = '0.5rem';
    form.appendChild(okMsg);
    form.reset();
    setTimeout(() => okMsg.remove(), 4000);
  } catch (err) {
    alert('Subscription failed. Please try again later.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = 'Subscribe &rarr;'; }
  }
};

// ---- Distance Tracker ----
window.initDistanceTracker = function(targetLat, targetLng, btnId, readOutId) {
  const btn = document.getElementById(btnId);
  const readOut = document.getElementById(readOutId);
  if (!btn || !readOut) return;

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Radius of the earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    let d = R * c; // Distance in miles
    return d.toFixed(1);
  }

  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.classList.add('scanning');
    
    // Animate scanning radar text
    let dots = 0;
    const scanInt = setInterval(() => {
      dots = (dots + 1) % 4;
      btn.querySelector('span').textContent = 'Scanning' + '.'.repeat(dots);
    }, 300);
    
    if (!navigator.geolocation) {
      clearInterval(scanInt);
      readOut.style.display = 'block';
      readOut.className = 'premium-loc-readout';
      readOut.innerHTML = '<span style="color:#fff">Geolocation is not supported by your browser</span>';
      btn.disabled = false;
      btn.classList.remove('scanning');
      btn.querySelector('span').textContent = '📍 Try again';
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      clearInterval(scanInt);
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const dist = calculateDistance(userLat, userLng, targetLat, targetLng);
      
      readOut.style.display = 'block';
      readOut.className = 'premium-loc-readout';
      readOut.innerHTML = `
        <div class="premium-loc-readout-val">${dist}</div>
        <div class="premium-loc-readout-label">Miles Away</div>
        <div style="margin-top:1.25rem;">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}" target="_blank" class="btn btn-primary" style="width:100%;font-size:0.95rem;padding:0.75rem">🗺️ Navigate in Google Maps &rarr;</a>
        </div>
      `;
      
      btn.style.display = 'none';
      
    }, (err) => {
      clearInterval(scanInt);
      readOut.style.display = 'block';
      readOut.className = 'premium-loc-readout';
      
      let msg = 'Unable to retrieve your location. Please check browser permissions.';
      if (err.code === 1) msg = 'Location access denied. Please enable it in browser settings.';
      if (err.code === 2) msg = 'Location unavailable. Your device cannot determine its position.';
      if (err.code === 3) msg = 'Location request timed out. Please try again.';
      
      readOut.innerHTML = '<span style="color:var(--clr-gold-light)">' + msg + '</span>';
      
      btn.disabled = false;
      btn.classList.remove('scanning');
      btn.querySelector('span').textContent = '📍 Try again';
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 });
  });
};

// ---- Newsletter Archive Viewer ----
(function initNlArchive() {
  const containerIds = ['glan-nl-issues', 'llys-nl-issues', 'pentwyn-nl-issues'];

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  let base = (window.API_BASE || '').replace(/\/$/, '');
  if (!base && isLocal) base = 'http://127.0.0.1:3500';

  function ensureModal() {
    if (document.getElementById('nl-viewer-overlay')) return;
    const el = document.createElement('div');
    el.id = 'nl-viewer-overlay';
    el.className = 'nl-viewer-overlay';
    el.innerHTML = `
      <div class="nl-viewer-panel" id="nl-viewer-panel">
        <div class="nl-viewer-header">
          <div class="nl-viewer-header-title" id="nl-viewer-title">Newsletter</div>
          <div class="nl-viewer-header-actions">
            <button class="nl-viewer-dl-btn" onclick="window.downloadCurrentNl()">&#x2b07; Download PDF</button>
            <button class="nl-viewer-close" aria-label="Close" onclick="window.closeNlViewer()">&#x2715;</button>
          </div>
        </div>
        <div class="nl-viewer-body" id="nl-viewer-body"></div>
      </div>`;
    el.addEventListener('click', function(e) { if (e.target === el) window.closeNlViewer(); });
    document.body.appendChild(el);
  }

  window.closeNlViewer = function() {
    const ov = document.getElementById('nl-viewer-overlay');
    if (ov) ov.classList.remove('open');
    document.body.style.overflow = '';
  };

  window._currentNlHtml = '';
  window._currentNlSubject = '';

  window.openNlIssue = async function(id) {
    ensureModal();
    if (!base) return;
    const ov = document.getElementById('nl-viewer-overlay');
    const body = document.getElementById('nl-viewer-body');
    const title = document.getElementById('nl-viewer-title');
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div style="padding:3rem;text-align:center;color:#888">Loading\u2026</div>';
    try {
      const res = await fetch(base + '/api/newsletter/archive/' + id);
      if (!res.ok) throw new Error('Not found');
      const issue = await res.json();
      title.textContent = issue.subject;
      body.innerHTML = issue.htmlContent;
      window._currentNlHtml = issue.htmlContent;
      window._currentNlSubject = issue.subject;
    } catch (e) {
      body.innerHTML = '<div style="padding:3rem;text-align:center;color:#c00">Failed to load newsletter.</div>';
    }
  };

  window.downloadCurrentNl = function() {
    if (!window._currentNlHtml) return;
    const subject = window._currentNlSubject || 'Newsletter';
    const printWin = window.open('', '_blank', 'width=800,height=700');
    printWin.document.write('<!DOCTYPE html><html><head><title>' + subject + '</title>'
      + '<style>body{margin:0;font-family:Arial,sans-serif}@media print{.no-print{display:none}}</style>'
      + '</head><body>'
      + '<div class="no-print" style="padding:1rem;background:#1C2E40;color:#DFC071;display:flex;justify-content:space-between;align-items:center;">'
      + '<strong>' + subject + '</strong>'
      + '<button onclick="window.print()" style="background:#DFC071;color:#1C2E40;border:none;padding:0.5rem 1rem;border-radius:4px;cursor:pointer;font-weight:700">\uD83D\uDDA8\uFE0F Print / Save as PDF</button>'
      + '</div>' + window._currentNlHtml + '</body></html>');
    printWin.document.close();
    printWin.focus();
  };

  function renderIssues(containerId, issues) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!issues || issues.length === 0) {
      el.innerHTML = '<span class="nl-issue-empty">No newsletters published yet \u2014 subscribe to be first to know!</span>';
      return;
    }
    el.innerHTML = issues.slice(0, 3).map(function(issue) {
      const d = new Date(issue.sentAt);
      const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return '<div class="nl-issue-card">'
        + '<span class="nl-issue-card-icon">\uD83D\uDCC4</span>'
        + '<div class="nl-issue-card-info">'
        + '<div class="nl-issue-card-subject" title="' + issue.subject + '">' + issue.subject + '</div>'
        + '<div class="nl-issue-card-date">' + dateStr + '</div>'
        + '</div>'
        + '<div class="nl-issue-card-actions">'
        + '<button class="nl-issue-btn nl-issue-btn-view" onclick="window.openNlIssue(\'' + issue.id + '\')">Read</button>'
        + '<button class="nl-issue-btn nl-issue-btn-dl" onclick="window.openNlIssue(\'' + issue.id + '\').then(function(){window.downloadCurrentNl();})">&#x2B07; PDF</button>'
        + '</div></div>';
    }).join('');
  }

  function load() {
    const hasAny = containerIds.some(function(id) { return !!document.getElementById(id); });
    if (!hasAny || !base) {
      containerIds.forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span class="nl-issue-empty">Subscribe to receive our newsletter.</span>';
      });
      return;
    }
    fetch(base + '/api/newsletter/archive')
      .then(function(r) { return r.ok ? r.json() : []; })
      .then(function(issues) { containerIds.forEach(function(id) { renderIssues(id, issues); }); })
      .catch(function() {
        containerIds.forEach(function(id) {
          const el = document.getElementById(id);
          if (el) el.innerHTML = '<span class="nl-issue-empty">Subscribe to receive our newsletter.</span>';
        });
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    setTimeout(load, 100);
  }
})();
