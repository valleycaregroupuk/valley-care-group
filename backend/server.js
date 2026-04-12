// ═══════════════════════════════════════════════════════════════
// VALLEY CARE GROUP — API Server (Vercel KV Edition)
// Node.js / Express · JWT Auth · Vercel KV (Redis) data store
// UK GDPR compliant structure · Helmet security headers
// ═══════════════════════════════════════════════════════════════

'use strict';

// ---------------------------------------------------------------------------
// Load .env if present in local development
// ---------------------------------------------------------------------------
try {
  require('fs').existsSync('.env') && require('fs')
    .readFileSync('.env', 'utf8')
    .split('\n')
    .forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && !k.startsWith('#') && !process.env[k.trim()])
        process.env[k.trim()] = v.join('=').trim();
    });
} catch (_) {}

const crypto    = require('crypto');
const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const multer    = require('multer');

// ---------------------------------------------------------------------------
// Vercel KV client — falls back to in-memory store for local dev
// ---------------------------------------------------------------------------
let kv;
const skipKV = !process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN;

if (skipKV) {
  console.warn('⚠️  Vercel KV environment variables missing — using in-memory store');
  const store = new Map();
  kv = {
    get: async (key) => store.get(key) ?? null,
    set: async (key, val, _opts) => { store.set(key, val); return 'OK'; },
    del: async (key) => { store.delete(key); return 1; },
  };
} else {
  try {
    kv = require('@vercel/kv').kv;
  } catch (_) {
    console.warn('⚠️  @vercel/kv module not found — using in-memory store');
    const store = new Map();
    kv = {
      get: async (key) => store.get(key) ?? null,
      set: async (key, val, _opts) => { store.set(key, val); return 'OK'; },
      del: async (key) => { store.delete(key); return 1; },
    };
  }
}

// ---------------------------------------------------------------------------
// Config & production safety
// ---------------------------------------------------------------------------
const IS_PROD = process.env.NODE_ENV === 'production';

function validateProductionConfig() {
  if (!IS_PROD) return { ok: true, errors: [] };
  const errors = [];
  const jwt = (process.env.JWT_SECRET || '').trim();
  if (jwt.length < 32) errors.push('JWT_SECRET must be at least 32 characters.');
  if (jwt === 'dev-secret-change-before-production') errors.push('JWT_SECRET must not use the default development value.');
  const admin = (process.env.ADMIN_PASSWORD || '').trim();
  if (admin.length < 12) errors.push('ADMIN_PASSWORD must be at least 12 characters.');
  const origins = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  if (origins.length === 0) errors.push('ALLOWED_ORIGIN must list at least one frontend origin (comma-separated).');
  return { ok: errors.length === 0, errors };
}

const prodConfig = validateProductionConfig();
const PRODUCTION_MISCONFIGURED = IS_PROD && !prodConfig.ok;

const PORT = parseInt(process.env.PORT || '3500', 10);
const JWT_SECRET = PRODUCTION_MISCONFIGURED
  ? crypto.randomBytes(48).toString('hex')
  : (process.env.JWT_SECRET || 'dev-secret-change-before-production');
const ADMIN_PW = IS_PROD && !PRODUCTION_MISCONFIGURED
  ? (process.env.ADMIN_PASSWORD || '').trim()
  : (process.env.ADMIN_PASSWORD || 'vcg2025');

const ALLOWED_ORIGINS = IS_PROD && !PRODUCTION_MISCONFIGURED
  ? (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean)
  : true;

// ---------------------------------------------------------------------------
// KV key helpers
// ---------------------------------------------------------------------------
const KEY_JOBS        = 'vcg:jobs';
const KEY_CONTENT     = 'vcg:content';
const KEY_ADMINHASH   = 'vcg:admin_hash';
const KEY_ENQUIRIES   = 'vcg:enquiries';
const KEY_APPLICATIONS = 'vcg:applications';
const KEY_HOME_REVIEWS = 'vcg:home_reviews';

// ---------------------------------------------------------------------------
// Shared KV rate limit (works across serverless instances)
// ---------------------------------------------------------------------------
async function checkKvRateLimit(req, bucket, maxRequests, windowSec) {
  const rawIp = req.ip || req.socket?.remoteAddress || 'unknown';
  const ip = String(rawIp).replace(/[^\w.-]/g, '').slice(0, 80) || 'unknown';
  const key = `vcg:rl:${bucket}:${ip}`;
  const now = Date.now();
  try {
    const raw = await kv.get(key);
    let count = 1;
    let resetAt = now + windowSec * 1000;
    if (raw && typeof raw === 'object' && raw.resetAt > now) {
      count = (raw.count || 0) + 1;
      resetAt = raw.resetAt;
    }
    if (count > maxRequests) return false;
    const ttl = Math.max(1, Math.ceil((resetAt - now) / 1000));
    await kv.set(key, { count, resetAt }, { ex: ttl });
    return true;
  } catch (e) {
    console.warn('KV rate limit error:', e.message);
    return true;
  }
}

function csvEscapeCell(val) {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

async function sendResendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return false;
  const recipients = (Array.isArray(to) ? to : String(to).split(','))
    .map((x) => x.trim())
    .filter(Boolean);
  if (!recipients.length) return false;
  try {
    const { Resend } = require('resend');
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    await resend.emails.send({
      from,
      to: recipients,
      subject,
      html: html || undefined,
      text: text || undefined,
    });
    return true;
  } catch (e) {
    console.error('Resend error:', e.message);
    return false;
  }
}

function eid(prefix) {
  return prefix + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}

async function readEnquiries() {
  const list = await kv.get(KEY_ENQUIRIES);
  return Array.isArray(list) ? list : [];
}

async function writeEnquiries(list) {
  await kv.set(KEY_ENQUIRIES, list);
}

async function readApplications() {
  const list = await kv.get(KEY_APPLICATIONS);
  return Array.isArray(list) ? list : [];
}

async function writeApplications(list) {
  await kv.set(KEY_APPLICATIONS, list);
}

async function readHomeReviews() {
  const list = await kv.get(KEY_HOME_REVIEWS);
  return Array.isArray(list) ? list : [];
}

async function writeHomeReviews(list) {
  await kv.set(KEY_HOME_REVIEWS, list);
}

function sanitiseLongText(val, maxLen) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/<[^>]*>/g, '').trim().slice(0, maxLen || 4000);
}

/** Two-letter initials for testimonial avatars (from public review name). */
function initialsFromDisplayName(name) {
  const s = String(name || '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TESTIMONIAL_HOME_BY_SLUG = {
  glan: 'Glan-yr-Afon Nursing Home',
  llys: 'Llys Gwyn Residential Home',
  pentwyn: 'Ty Pentwyn Nursing Home',
  group: 'Valley Care Group',
};

function sanitiseMapEmbed(html) {
  if (!html || typeof html !== 'string') return '';
  const trimmed = html.trim().slice(0, 8000);
  if (!/^<iframe[\s\S]*<\/iframe>\s*$/i.test(trimmed)) return '';
  const srcMatch = trimmed.match(/\ssrc\s*=\s*["']([^"']+)["']/i);
  if (!srcMatch) return '';
  const src = srcMatch[1];
  if (!/^https:\/\//i.test(src)) return '';
  if (!/(google\.com\/maps|maps\.google\.|openstreetmap\.org)/i.test(src)) return '';
  return trimmed.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
}

function sanitiseHomePageExtras(hp) {
  if (!hp || typeof hp !== 'object') return hp;
  const out = { ...hp };
  if (out.mapEmbedHtml !== undefined) out.mapEmbedHtml = sanitiseMapEmbed(out.mapEmbedHtml);
  if (Array.isArray(out.gallery)) {
    out.gallery = out.gallery.slice(0, 40).map((g) => ({
      url: sanitise(g.url).slice(0, 500),
      alt: sanitise(g.alt).slice(0, 200),
    })).filter((g) => g.url);
  }
  if (Array.isArray(out.team)) {
    out.team = out.team.slice(0, 30).map((m) => ({
      name: sanitise(m.name).slice(0, 120),
      role: sanitise(m.role).slice(0, 120),
      bio: sanitise(m.bio).slice(0, 1500),
      photoUrl: sanitise(m.photoUrl).slice(0, 500),
    })).filter((m) => m.name);
  }
  if (Array.isArray(out.faqs)) {
    out.faqs = out.faqs.slice(0, 30).map((f) => ({
      q: sanitise(f.q).slice(0, 300),
      a: sanitise(f.a).slice(0, 2000),
    })).filter((f) => f.q && f.a);
  }
  ['availabilityLine', 'lastInspectionDate', 'awardsNote', 'ciwPdfUrl'].forEach((k) => {
    if (out[k] !== undefined) out[k] = sanitise(out[k]).slice(0, 500);
  });
  if (out.structuredAddress !== undefined) out.structuredAddress = sanitise(out.structuredAddress).slice(0, 300);
  if (out.structuredLat !== undefined) out.structuredLat = sanitise(out.structuredLat).slice(0, 24);
  if (out.structuredLng !== undefined) out.structuredLng = sanitise(out.structuredLng).slice(0, 24);
  return out;
}

const uploadCv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okMime = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.mimetype);
    const ext = (file.originalname || '').toLowerCase();
    const okExt = /\.(pdf|doc|docx)$/i.test(ext);
    if (okMime && okExt) cb(null, true);
    else cb(new Error('CV must be a PDF or Word document (.pdf, .doc, .docx).'));
  },
});

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '50kb' }));

// Trust Vercel's proxy so rate-limiter uses real IP
app.set('trust proxy', 1);

if (PRODUCTION_MISCONFIGURED) {
  console.error('[VCG API] Production misconfiguration — all requests will return 503 until fixed:\n', prodConfig.errors.join('\n'));
}

app.use((req, res, next) => {
  if (PRODUCTION_MISCONFIGURED) {
    return res.status(503).json({
      error: 'Service unavailable — production configuration is incomplete.',
      details: prodConfig.errors,
    });
  }
  next();
});

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this IP. Please try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// ---------------------------------------------------------------------------
// Data helpers — KV-backed
// ---------------------------------------------------------------------------

// ── JOBS ──────────────────────────────────────────────────────────────────
function uid() {
  return 'j_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function seedJobs() {
  return [
    {
      id: uid(), title: 'Registered General Nurse (RGN)',
      home: 'glan', homeLabel: 'Glan-yr-Afon Nursing Home, Blackwood',
      location: 'Off Ford Road, Fleur-de-Lys, Blackwood NP12 3WA',
      type: 'Full-Time', category: 'nursing', status: 'active',
      desc: 'We are seeking a compassionate and experienced RGN to join our nursing team. You will lead a care team, manage complex nursing needs, and uphold the highest standards of clinical care. Day and night shifts available.',
      reqs: 'NMC Registered,Patient-Centred,Team Leadership,Medication Management',
      posted: '2025-03', btnLabel: 'Apply Now',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(), title: 'Senior Care Assistant',
      home: 'glan', homeLabel: 'Glan-yr-Afon Nursing Home, Blackwood',
      location: 'Off Ford Road, Fleur-de-Lys, Blackwood NP12 3WA',
      type: 'Full-Time', category: 'care', status: 'active',
      desc: "An excellent opportunity for an experienced care professional to step into a senior role. You'll support nurse-led care teams, supervise junior staff, and be a key point of contact for residents and their families.",
      reqs: 'NVQ Level 2/3,Previous Senior Experience,Person-Centred Care',
      posted: '2025-03', btnLabel: 'Apply Now',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(), title: 'Care Assistant',
      home: 'glan', homeLabel: 'Glan-yr-Afon Nursing Home, Blackwood',
      location: 'Off Ford Road, Fleur-de-Lys, Blackwood NP12 3WA',
      type: 'Part-Time', category: 'care', status: 'active',
      desc: "Join our warm and dedicated care team at Glan-yr-Afon. Whether you're new to care or experienced, we welcome your passion. Full training provided. Various shifts available, including nights and weekends.",
      reqs: 'Compassionate,Reliable,Training Provided',
      posted: '2025-03', btnLabel: 'Apply Now',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(), title: 'Care Assistant',
      home: 'llys', homeLabel: 'Llys Gwyn Residential Home',
      location: 'Heol Broom, Maudlum, Pyle, Bridgend CF33 4PN', type: 'Full-Time', category: 'care', status: 'active',
      desc: 'Llys Gwyn is looking for a warm, dependable care assistant to join our residential team. You will provide personal care, support daily activities, and build meaningful bonds with our residents.',
      reqs: 'Caring Nature,Good Communication,NVQ Preferred',
      posted: '2025-02', btnLabel: 'Apply Now',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(), title: 'Activities Coordinator',
      home: 'llys', homeLabel: 'Llys Gwyn Residential Home',
      location: 'Heol Broom, Maudlum, Pyle, Bridgend CF33 4PN', type: 'Part-Time', category: 'support', status: 'active',
      desc: "Bring joy and engagement to our residents' daily lives! Plan and deliver a variety of activities ranging from fitness and music to community outings and seasonal events. Creativity and enthusiasm essential.",
      reqs: 'Creative,Organised,Experience with Elderly',
      posted: '2025-02', btnLabel: 'Apply Now',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(), title: 'Care Assistant — Ty Pentwyn',
      home: 'pentwyn', homeLabel: 'Ty Pentwyn Nursing Home, Treorchy',
      location: 'Pentwyn Road, Treorchy CF42 6HD', type: 'Full-Time', category: 'care', status: 'active',
      desc: 'Join our nurse-led team at Ty Pentwyn in the Rhondda Valley. We provide nursing and residential care for up to 35 residents, including specialist dementia and disability support. Training and development available.',
      reqs: 'Compassionate,Reliable,Rhondda Valleys or Commutable',
      posted: '2025-04', btnLabel: 'Apply Now',
      createdAt: new Date().toISOString(),
    },
  ];
}

async function readJobs() {
  const jobs = await kv.get(KEY_JOBS);
  if (!jobs) {
    const seeded = seedJobs();
    await kv.set(KEY_JOBS, seeded);
    console.log('ℹ️  Seeded default jobs into KV store');
    return seeded;
  }
  return Array.isArray(jobs) ? jobs : seedJobs();
}

async function writeJobs(jobs) {
  await kv.set(KEY_JOBS, jobs);
}

// ── CONTENT ───────────────────────────────────────────────────────────────
function defaultContent() {
  return {
    site: {
      announcementEnabled: true,
      announcementText: '🏡 Explore Ty Pentwyn Nursing Home in the Rhondda — specialist nursing & residential care →',
      announcementLink: 'homes/pentwyn.html',
      phone: '01633 680217',
      email: 'care@valleycare.wales',
      address: 'Off Ford Road, Fleur-de-Lys, Blackwood NP12 3WA',
      canonicalBase: 'https://www.valleycare.wales',
      publicAnalyticsId: '',
    },
    homepage: {
      heroBadge: 'CIW Registered · Three homes · South Wales · Listed on carehome.co.uk',
      heroLine1: 'Where Every',
      heroLine2: 'Day Feels',
      heroLine3: 'Home.',
      heroSubtitle: 'Nursing and residential care across South Wales — Glan-yr-Afon, Llys Gwyn, and Ty Pentwyn. Person-centred support, regulated by Care Inspectorate Wales (CIW).',
      stat1Value: 20, stat1Suffix: '+', stat1Label: 'Years of Care',
      stat2Value: 3,  stat2Suffix: '',  stat2Label: 'Care Homes',
      stat3Value: 105, stat3Suffix: '', stat3Label: 'Registered places (max.)',
      stat4Value: 64, stat4Suffix: '', stat4Label: 'Directory reviews (Glan & Llys)',
      carehomeGlanScore: '9.9',
      carehomeGlanReviews: 41,
      carehomeLlysScore: '9.7',
      carehomeLlysReviews: 23,
    },
    testimonials: [
      { id: 'tt1', name: 'Sarah M.', relation: 'Daughter of resident', home: 'Glan-yr-Afon Nursing Home', initials: 'S', avatarColor: '#1B4F72', text: "The care Mum receives at Glan-yr-Afon is truly exceptional. The staff know her personally — her likes, her quirks, her stories. She's not just a resident, she's family to them. We could not have found a better place." },
      { id: 'tt2', name: 'Robert T.', relation: 'Son of resident', home: 'Llys Gwyn Residential Home', initials: 'R', avatarColor: '#117A65', text: "Dad is genuinely happy at Llys Gwyn. He has friends, joins activities he loves, and talks about the staff with real warmth. Seeing him flourish has been the most enormous relief for our whole family. We are so grateful." },
      { id: 'tt3', name: 'Anita P.', relation: 'Wife of resident', home: 'Glan-yr-Afon Nursing Home', initials: 'A', avatarColor: '#6C3483', text: "The nursing team at Glan-yr-Afon go above and beyond every single day. The clinical care is outstanding, and the home is always spotless and cheerful. When I visit my husband I leave feeling at peace, not worried. That's priceless." },
    ],
    /** Per-home blocks (e.g. news/events). Update via PUT /api/admin/content/homePages */
    homePages: {
      glan: {
        phoneDisplay: '01443 835196',
        phoneTel: '01443835196',
        ciwServiceUrl: 'https://digital.careinspectorate.wales/directory/service/SIN-00009997-VPXP',
        availabilityLine: 'Please contact us for the latest vacancies.',
        mapEmbedHtml: '',
        gallery: [],
        team: [],
        faqs: [],
        ciwPdfUrl: '',
        lastInspectionDate: '',
        awardsNote: '',
        structuredAddress: 'Off Ford Road, Fleur-de-Lys, Blackwood NP12 3WA, UK',
        structuredLat: '51.665',
        structuredLng: '-3.208',
        news: [
          { id: 'glan-n1', date: '2025-03-01', title: 'Top 20 Wales — carehome.co.uk 2025', excerpt: 'We are proud to be named among the Top 20 Care Homes in Wales, based on verified reviews from residents and families.', imageUrl: 'assets/images/hero_bg.png', showOnHomepage: true },
          { id: 'glan-n2', date: '2025-02-10', title: 'Spring activities programme launched', excerpt: 'Our activities team has published a fresh programme of music, outings, and wellbeing sessions for the season ahead.', imageUrl: 'assets/images/interior.png', showOnHomepage: false },
          { id: 'glan-n3', date: '2025-01-20', title: 'Families welcome — visiting times', excerpt: 'We continue to welcome families at any time. Please ring ahead if you would like to join us for lunch or a garden walk.', imageUrl: '', showOnHomepage: false },
        ],
        events: [
          { id: 'glan-e1', date: '2025-04-18', title: 'Easter celebration afternoon', excerpt: 'Residents and guests are invited to an afternoon of music, tea, and seasonal treats in our main lounge.', imageUrl: 'assets/images/caregiver.png', showOnHomepage: true },
          { id: 'glan-e2', date: '2025-05-12', title: 'Open afternoon for prospective families', excerpt: 'Meet the team, tour the home, and ask questions in an informal setting. Please call to reserve a place.', imageUrl: '', showOnHomepage: false },
        ],
      },
      llys: {
        phoneDisplay: '01633 680217',
        phoneTel: '01633680217',
        ciwServiceUrl: 'https://digital.careinspectorate.wales/',
        operator: 'Grayson Enterprises Ltd',
        manager: 'Sharanjit Kaur',
        availabilityLine: 'Please contact us for the latest vacancies.',
        mapEmbedHtml: '',
        gallery: [],
        team: [],
        faqs: [],
        ciwPdfUrl: '',
        lastInspectionDate: '',
        awardsNote: '',
        structuredAddress: 'Heol Broom, Maudlum, Pyle, Bridgend CF33 4PN, UK',
        structuredLat: '51.53',
        structuredLng: '-3.69',
        news: [
          { id: 'llys-n1', date: '2025-03-05', title: 'Top 20 Care Homes Wales 2024', excerpt: 'Llys Gwyn is honoured to appear among Wales’s most recommended homes on carehome.co.uk.', imageUrl: 'assets/images/interior.png', showOnHomepage: true },
          { id: 'llys-n2', date: '2025-02-14', title: 'Philosophy: care with passion', excerpt: 'Personalised support, freshly cooked meals, and a full activities programme in a homely environment.', imageUrl: 'assets/images/caregiver.png', showOnHomepage: false },
        ],
        events: [
          { id: 'llys-e1', date: '2025-04-22', title: 'Spring coffee morning for families', excerpt: 'Join us for tea, cake, and a relaxed chat with our team — RSVP appreciated.', imageUrl: '', showOnHomepage: true },
        ],
      },
      pentwyn: {
        phoneDisplay: '',
        phoneTel: '',
        managerEmail: 'managertypentwyn@outlook.com',
        carehomeListingUrl: 'https://www.carehome.co.uk/carehome.cfm/searchazref/20005017TYPA',
        ciwServiceUrl: 'https://digital.careinspectorate.wales/',
        operator: 'Quality Care (Surrey) Ltd',
        manager: 'Susan Rosser (Registered Manager)',
        availabilityLine: 'Please contact us for the latest vacancies.',
        mapEmbedHtml: '',
        gallery: [],
        team: [],
        faqs: [],
        ciwPdfUrl: '',
        lastInspectionDate: '',
        awardsNote: '',
        structuredAddress: 'Pentwyn Road, Treorchy CF42 6HD, UK',
        structuredLat: '51.66',
        structuredLng: '-3.50',
        news: [
          { id: 'pent-n1', date: '2025-04-01', title: 'Welcome to our updated Ty Pentwyn page', excerpt: 'Accurate service details from our verified directory listing — contact us for vacancies and visits.', imageUrl: 'assets/images/caregiver.png', showOnHomepage: true },
        ],
        events: [
          { id: 'pent-e1', date: '2025-05-08', title: 'Open door for families', excerpt: 'We welcome enquiries and visits — please email the home or use our carehome.co.uk profile to get in touch.', imageUrl: '', showOnHomepage: false },
        ],
      },
    },
    live: {},
  };
}

async function readContent() {
  const c = await kv.get(KEY_CONTENT);
  if (!c) {
    const d = defaultContent();
    await kv.set(KEY_CONTENT, d);
    return d;
  }
  return c;
}

async function writeContent(c) {
  await kv.set(KEY_CONTENT, c);
}

// ── ADMIN HASH ────────────────────────────────────────────────────────────
async function getAdminHash() {
  let hash = await kv.get(KEY_ADMINHASH);
  if (!hash) {
    hash = bcrypt.hashSync(ADMIN_PW, 12);
    await kv.set(KEY_ADMINHASH, hash);
    console.log('🔐 Admin password hash generated and stored in KV');
  }
  return hash;
}

/** Local dev: set RESET_ADMIN_HASH=1 in .env, restart — clears old hash so ADMIN_PASSWORD applies. */
async function maybeResetAdminHashForDev() {
  if (IS_PROD) return;
  const on = process.env.RESET_ADMIN_HASH === '1' || process.env.RESET_ADMIN_HASH === 'true';
  if (!on) return;
  try {
    await kv.del(KEY_ADMINHASH);
    console.log('🔐 RESET_ADMIN_HASH: cleared stored admin hash — next sign-in will use ADMIN_PASSWORD from .env');
  } catch (e) {
    console.warn('⚠️  RESET_ADMIN_HASH: could not delete admin hash:', e.message);
  }
}

// ---------------------------------------------------------------------------
// Auth Middleware
// ---------------------------------------------------------------------------
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorisation required. Please sign in to the admin console.' });
  }
  try {
    req.admin = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expired ? 'Session expired. Please sign in again.' : 'Invalid token.',
    });
  }
}

// ---------------------------------------------------------------------------
// String sanitiser
// ---------------------------------------------------------------------------
function sanitise(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/<[^>]*>/g, '').trim().slice(0, 2000);
}

// ---------------------------------------------------------------------------
// ── AUTH ROUTES
// ---------------------------------------------------------------------------

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required.' });
  }
  try {
    const hash  = await getAdminHash();
    const valid = await bcrypt.compare(password, hash);
    if (!valid) {
      await new Promise(r => setTimeout(r, 600));
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }
    const expiresIn = 8 * 60 * 60;
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn });
    res.json({ token, expiresIn });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/auth/verify', requireAuth, (req, res) => {
  res.json({ valid: true, role: req.admin.role });
});

// ---------------------------------------------------------------------------
// ── PUBLIC ROUTES
// ---------------------------------------------------------------------------

app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = (await readJobs()).filter(j => j.status === 'active');
    res.json(jobs);
  } catch (err) {
    console.error('GET /api/jobs error:', err.message);
    res.status(500).json({ error: 'Unable to load job listings.' });
  }
});

function mergePublicContent(stored) {
  const def = defaultContent();
  const c = stored && typeof stored === 'object' ? { ...stored } : { ...def };
  const hpStored = (stored && stored.homepage) || {};
  c.homepage = {
    ...def.homepage,
    ...hpStored,
  };
  if (!String(c.homepage.carehomeGlanScore || '').trim()) {
    c.homepage.carehomeGlanScore = def.homepage.carehomeGlanScore;
  }
  if (!String(c.homepage.carehomeLlysScore || '').trim()) {
    c.homepage.carehomeLlysScore = def.homepage.carehomeLlysScore;
  }
  const gRev = c.homepage.carehomeGlanReviews;
  if (gRev === '' || gRev == null || Number.isNaN(parseInt(String(gRev), 10))) {
    c.homepage.carehomeGlanReviews = def.homepage.carehomeGlanReviews;
  }
  const lRev = c.homepage.carehomeLlysReviews;
  if (lRev === '' || lRev == null || Number.isNaN(parseInt(String(lRev), 10))) {
    c.homepage.carehomeLlysReviews = def.homepage.carehomeLlysReviews;
  }
  const hp = (stored && stored.homePages) || {};
  c.homePages = {
    ...def.homePages,
    ...hp,
    glan: {
      ...def.homePages.glan,
      ...(hp.glan || {}),
    },
    llys: {
      ...def.homePages.llys,
      ...(hp.llys || {}),
    },
    pentwyn: {
      ...def.homePages.pentwyn,
      ...(hp.pentwyn || {}),
    },
  };
  c.testimonials = Array.isArray(c.testimonials) ? c.testimonials : (def.testimonials || []);
  return c;
}

app.get('/api/content', async (req, res) => {
  try { res.json(mergePublicContent(await readContent())); }
  catch { res.status(500).json({ error: 'Unable to load content.' }); }
});

// ---------------------------------------------------------------------------
// ── PUBLIC: enquiries & job applications
// ---------------------------------------------------------------------------

app.post('/api/enquiries', async (req, res) => {
  try {
    if (!(await checkKvRateLimit(req, 'enquiry', 10, 3600))) {
      return res.status(429).json({ error: 'Too many enquiries. Please try again later.' });
    }
    const body = req.body || {};
    if (sanitise(body.website)) {
      return res.status(201).json({ ok: true, received: true });
    }
    if (!body.gdprConsent) {
      return res.status(400).json({ error: 'Please confirm you agree to our privacy policy before submitting.' });
    }
    const record = {
      id: eid('enq_'),
      createdAt: new Date().toISOString(),
      status: 'new',
      source: sanitise(body.source).slice(0, 120),
      homeSlug: sanitise(body.homeSlug).slice(0, 40),
      name: sanitise(body.name).slice(0, 120),
      email: sanitise(body.email).slice(0, 200),
      phone: sanitise(body.phone).slice(0, 40),
      message: sanitise(body.message).slice(0, 4000),
      careType: sanitise(body.careType).slice(0, 120),
      reasonForContact: sanitise(body.reasonForContact).slice(0, 120),
      preferredHome: sanitise(body.preferredHome).slice(0, 200),
      postedPackRequested: !!body.postedPackRequested,
      gdprConsent: true,
    };
    if (!record.name || !record.email || !record.phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const list = await readEnquiries();
    list.unshift(record);
    await writeEnquiries(list);

    const notify = process.env.ENQUIRY_NOTIFY_TO || process.env.APPLICATION_NOTIFY_TO;
    const lines = [
      `<p><strong>New care enquiry</strong> (${record.id})</p>`,
      `<p>Name: ${record.name}<br>Email: ${record.email}<br>Phone: ${record.phone}</p>`,
      `<p>Home: ${record.homeSlug || '—'}<br>Source: ${record.source || '—'}<br>Care type: ${record.careType || '—'}</p>`,
      record.message ? `<p>Message:<br>${record.message.replace(/\n/g, '<br>')}</p>` : '',
      record.postedPackRequested ? '<p><strong>Requested posted information pack</strong></p>' : '',
    ].join('');
    await sendResendEmail({
      to: notify,
      subject: `Care enquiry — ${record.name}`,
      html: lines,
      text: `New enquiry ${record.id}\n${record.name}\n${record.email}\n${record.phone}\n${record.message}`,
    });

    res.status(201).json({ ok: true, id: record.id });
  } catch (err) {
    console.error('POST /api/enquiries:', err.message);
    res.status(500).json({ error: 'Unable to submit enquiry. Please try again or call us.' });
  }
});

app.post('/api/home-reviews', async (req, res) => {
  try {
    if (!(await checkKvRateLimit(req, 'home_reviews', 5, 3600))) {
      return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    }
    const body = req.body || {};
    if (sanitise(body.website)) {
      return res.status(201).json({ ok: true, received: true });
    }
    if (!body.gdprConsent) {
      return res.status(400).json({ error: 'Please confirm you agree to our privacy policy before submitting.' });
    }
    if (!body.publishConsent) {
      return res.status(400).json({ error: 'Please confirm you understand how we may use your feedback.' });
    }
    const name = sanitise(body.name).slice(0, 120);
    const email = sanitise(body.email).slice(0, 200);
    const phone = sanitise(body.phone).slice(0, 40);
    const relationship = sanitise(body.relationship).slice(0, 120);
    const review = sanitiseLongText(body.review || body.story, 3500);
    let homeSlug = sanitise(body.homeSlug).slice(0, 40).toLowerCase();
    const allowedHomes = ['glan', 'llys', 'pentwyn', 'group'];
    if (!allowedHomes.includes(homeSlug)) {
      return res.status(400).json({ error: 'Please select which home your review relates to.' });
    }

    let rating = body.rating;
    if (rating !== undefined && rating !== null && rating !== '') {
      rating = parseInt(String(rating), 10);
      if (Number.isNaN(rating) || rating < 1 || rating > 5) rating = null;
    } else {
      rating = null;
    }

    if (!name || !email || !review || review.length < 20) {
      return res.status(400).json({ error: 'Please enter your name, email, and at least 20 characters about the home or care.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const record = {
      id: eid('hr_'),
      createdAt: new Date().toISOString(),
      name,
      email,
      phone,
      homeSlug,
      relationship,
      review,
      rating,
      publishConsent: true,
      gdprConsent: true,
    };
    const list = await readHomeReviews();
    list.unshift(record);
    await writeHomeReviews(list);

    const notify = process.env.HOME_REVIEW_NOTIFY_TO || process.env.ENQUIRY_NOTIFY_TO || process.env.APPLICATION_NOTIFY_TO;
    const homeLabel = { glan: 'Glan-yr-Afon', llys: 'Llys Gwyn', pentwyn: 'Ty Pentwyn', group: 'Any / not sure' }[homeSlug] || homeSlug;
    const stars = rating ? `${rating} / 5` : '—';
    const html = [
      `<p><strong>New home review</strong> (${record.id})</p>`,
      `<p>Name: ${name}<br>Email: ${email}<br>Phone: ${phone || '—'}<br>Home: ${homeLabel}<br>Relationship: ${relationship || '—'}<br>Rating: ${stars}</p>`,
      `<p style="white-space:pre-wrap">${review.replace(/</g, '').replace(/\n/g, '<br>')}</p>`,
      '<p><em>Admin → Content Manager → Testimonials (inbox + homepage quotes).</em></p>',
    ].join('');
    await sendResendEmail({
      to: notify,
      subject: `Home review — ${name} · ${homeLabel}`,
      html,
      text: `Home review ${record.id}\n${name}\n${email}\n${review}`,
    });

    res.status(201).json({ ok: true, id: record.id });
  } catch (err) {
    console.error('POST /api/home-reviews:', err.message);
    res.status(500).json({ error: 'Unable to send your review. Please try again or call us.' });
  }
});

app.post('/api/applications', (req, res, next) => {
  uploadCv.single('cv')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Invalid upload.' });
    next();
  });
}, async (req, res) => {
  try {
    if (!(await checkKvRateLimit(req, 'apply', 6, 3600))) {
      return res.status(429).json({ error: 'Too many applications. Please try again later.' });
    }
    const body = req.body || {};
    if (sanitise(body.website)) {
      return res.status(201).json({ ok: true, received: true });
    }
    if (!body.gdprConsent) {
      return res.status(400).json({ error: 'Please confirm you agree to our privacy policy before submitting.' });
    }
    const jobId = sanitise(body.jobId).slice(0, 80);
    const speculative = jobId === 'speculative';
    const jobTitle = sanitise(body.jobTitle).slice(0, 200);
    const firstName = sanitise(body.firstName).slice(0, 80);
    const lastName = sanitise(body.lastName).slice(0, 80);
    const email = sanitise(body.email).slice(0, 200);
    const phone = sanitise(body.phone).slice(0, 40);
    if (!firstName || !lastName || !email || !phone || !jobId) {
      return res.status(400).json({ error: 'Please complete all required fields.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
    let cvUrl = null;
    let cvFilename = null;
    if (req.file && req.file.buffer && req.file.buffer.length) {
      if (!hasBlob) {
        return res.status(503).json({ error: 'File storage is not configured.' });
      }
      const { put } = require('@vercel/blob');
      const safeName = (req.file.originalname || 'cv.pdf').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
      const path = `vcg-cv/${eid('cv')}_${safeName}`;
      const blob = await put(path, req.file.buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: req.file.mimetype || 'application/octet-stream',
      });
      cvUrl = blob.url;
      cvFilename = safeName;
    } else if (hasBlob && !speculative) {
      return res.status(400).json({ error: 'Please attach your CV (PDF or Word, max 2MB).' });
    }

    const record = {
      id: eid('app_'),
      createdAt: new Date().toISOString(),
      status: 'new',
      jobId,
      jobTitle: jobTitle || jobId,
      firstName,
      lastName,
      email,
      phone,
      currentRole: sanitise(body.currentRole).slice(0, 200),
      yearsExperience: sanitise(body.yearsExperience).slice(0, 80),
      qualifications: sanitise(body.qualifications).slice(0, 500),
      whyJoin: sanitise(body.whyJoin).slice(0, 4000),
      cvUrl,
      cvFilename,
      gdprConsent: true,
    };

    const apps = await readApplications();
    apps.unshift(record);
    await writeApplications(apps);

    const notify = process.env.APPLICATION_NOTIFY_TO || process.env.ENQUIRY_NOTIFY_TO;
    const cvLine = cvUrl ? `<p>CV: <a href="${cvUrl}">${cvFilename || 'download'}</a></p>` : '<p>CV: not uploaded (dev / no storage)</p>';
    await sendResendEmail({
      to: notify,
      subject: `Job application — ${firstName} ${lastName} — ${record.jobTitle}`,
      html: [
        `<p><strong>Application</strong> (${record.id})</p>`,
        `<p>Role: ${record.jobTitle} (${record.jobId})</p>`,
        `<p>Name: ${firstName} ${lastName}<br>Email: ${email}<br>Phone: ${phone}</p>`,
        `<p>Experience: ${record.yearsExperience || '—'}<br>Current role: ${record.currentRole || '—'}</p>`,
        record.qualifications ? `<p>Qualifications: ${record.qualifications}</p>` : '',
        record.whyJoin ? `<p>Why join:<br>${record.whyJoin.replace(/\n/g, '<br>')}</p>` : '',
        cvLine,
      ].join(''),
      text: `Application ${record.id}\n${record.jobTitle}\n${firstName} ${lastName}\n${email}\n${cvUrl || 'no cv'}`,
    });

    res.status(201).json({ ok: true, id: record.id });
  } catch (err) {
    console.error('POST /api/applications:', err.message);
    res.status(500).json({ error: 'Unable to submit application. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// ── ADMIN ROUTES (protected)
// ---------------------------------------------------------------------------

app.get('/api/admin/jobs', requireAuth, async (req, res) => {
  try { res.json(await readJobs()); }
  catch (err) { res.status(500).json({ error: 'Unable to read jobs data.' }); }
});

app.post('/api/admin/jobs', requireAuth, async (req, res) => {
  try {
    const jobs = await readJobs();
    const job = {
      id:        uid(),
      title:     sanitise(req.body.title),
      home:      sanitise(req.body.home),
      homeLabel: sanitise(req.body.homeLabel),
      location:  sanitise(req.body.location),
      type:      sanitise(req.body.type),
      category:  sanitise(req.body.category),
      desc:      sanitise(req.body.desc),
      reqs:      sanitise(req.body.reqs),
      posted:    sanitise(req.body.posted),
      status:    ['active','hidden'].includes(req.body.status) ? req.body.status : 'active',
      btnLabel:  sanitise(req.body.btnLabel) || 'Apply Now',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!job.title || !job.home || !job.type || !job.category || !job.desc) {
      return res.status(400).json({ error: 'Missing required fields: title, home, type, category, desc.' });
    }
    jobs.push(job);
    await writeJobs(jobs);
    console.log(`✅ Job created: "${job.title}" (${job.id})`);
    res.status(201).json(job);
  } catch (err) {
    console.error('POST /api/admin/jobs error:', err.message);
    res.status(500).json({ error: 'Failed to save job.' });
  }
});

app.put('/api/admin/jobs/:id', requireAuth, async (req, res) => {
  try {
    const jobs = await readJobs();
    const idx  = jobs.findIndex(j => j.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Job not found.' });
    const updated = {
      ...jobs[idx],
      title:     sanitise(req.body.title)     || jobs[idx].title,
      home:      sanitise(req.body.home)      || jobs[idx].home,
      homeLabel: sanitise(req.body.homeLabel) || jobs[idx].homeLabel,
      location:  sanitise(req.body.location),
      type:      sanitise(req.body.type)      || jobs[idx].type,
      category:  sanitise(req.body.category)  || jobs[idx].category,
      desc:      sanitise(req.body.desc)      || jobs[idx].desc,
      reqs:      sanitise(req.body.reqs),
      posted:    sanitise(req.body.posted),
      status:    ['active','hidden'].includes(req.body.status) ? req.body.status : jobs[idx].status,
      btnLabel:  sanitise(req.body.btnLabel)  || 'Apply Now',
      updatedAt: new Date().toISOString(),
    };
    jobs[idx] = updated;
    await writeJobs(jobs);
    console.log(`✏️  Job updated: "${updated.title}" (${updated.id})`);
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/admin/jobs error:', err.message);
    res.status(500).json({ error: 'Failed to update job.' });
  }
});

app.delete('/api/admin/jobs/:id', requireAuth, async (req, res) => {
  try {
    const jobs = await readJobs();
    const idx  = jobs.findIndex(j => j.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Job not found.' });
    const [deleted] = jobs.splice(idx, 1);
    await writeJobs(jobs);
    console.log(`🗑️  Job deleted: "${deleted.title}" (${deleted.id})`);
    res.json({ deleted: true, id: deleted.id });
  } catch (err) {
    console.error('DELETE /api/admin/jobs error:', err.message);
    res.status(500).json({ error: 'Failed to delete job.' });
  }
});

app.patch('/api/admin/jobs/:id/status', requireAuth, async (req, res) => {
  try {
    const jobs = await readJobs();
    const job  = jobs.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    const { status } = req.body;
    if (!['active','hidden'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "active" or "hidden".' });
    }
    job.status    = status;
    job.updatedAt = new Date().toISOString();
    await writeJobs(jobs);
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// ── Content routes ─────────────────────────────────────────────────────────

app.put('/api/admin/content/:section', requireAuth, async (req, res) => {
  try {
    const c = await readContent();
    const sec = req.params.section;
    if (!['site','homepage','live','homePages'].includes(sec)) return res.status(400).json({ error: 'Unknown section.' });
    if (sec === 'homePages' && req.body && typeof req.body === 'object') {
      const prev = { ...(c.homePages || {}) };
      c.homePages = { ...prev, ...req.body };
      if (req.body.glan && typeof req.body.glan === 'object') {
        c.homePages.glan = { ...(prev.glan || {}), ...req.body.glan };
      }
      if (req.body.llys && typeof req.body.llys === 'object') {
        c.homePages.llys = { ...(prev.llys || {}), ...req.body.llys };
      }
      if (req.body.pentwyn && typeof req.body.pentwyn === 'object') {
        c.homePages.pentwyn = { ...(prev.pentwyn || {}), ...req.body.pentwyn };
      }
      ['glan', 'llys', 'pentwyn'].forEach((k) => {
        if (c.homePages[k]) c.homePages[k] = sanitiseHomePageExtras(c.homePages[k]);
      });
    } else {
      c[sec] = { ...c[sec], ...req.body };
    }
    await writeContent(c);
    console.log(`✏️  Content updated: ${sec}`);
    res.json(c[sec]);
  } catch (err) { res.status(500).json({ error: 'Failed to save content.' }); }
});

app.get('/api/admin/content/testimonials', requireAuth, async (req, res) => {
  try { res.json((await readContent()).testimonials || []); }
  catch { res.status(500).json({ error: 'Failed to read testimonials.' }); }
});

app.post('/api/admin/content/testimonials', requireAuth, async (req, res) => {
  try {
    const c = await readContent();
    if (!Array.isArray(c.testimonials)) c.testimonials = [];
    const t = {
      id:          'tt_' + Date.now(),
      name:        sanitise(req.body.name),
      relation:    sanitise(req.body.relation),
      home:        sanitise(req.body.home),
      initials:    sanitise(req.body.initials).slice(0, 2),
      avatarColor: /^#[0-9a-fA-F]{3,6}$/.test(req.body.avatarColor) ? req.body.avatarColor : '#1B4F72',
      text:        sanitise(req.body.text),
    };
    if (!t.name || !t.text) return res.status(400).json({ error: 'name and text are required.' });
    c.testimonials.push(t);
    await writeContent(c);
    res.status(201).json(t);
  } catch { res.status(500).json({ error: 'Failed to add testimonial.' }); }
});

app.put('/api/admin/content/testimonials/:id', requireAuth, async (req, res) => {
  try {
    const c = await readContent();
    if (!Array.isArray(c.testimonials)) c.testimonials = [];
    const i = c.testimonials.findIndex(t => t.id === req.params.id);
    if (i === -1) return res.status(404).json({ error: 'Testimonial not found.' });
    c.testimonials[i] = {
      ...c.testimonials[i],
      name:        sanitise(req.body.name)     || c.testimonials[i].name,
      relation:    sanitise(req.body.relation),
      home:        sanitise(req.body.home),
      initials:    sanitise(req.body.initials).slice(0, 2),
      avatarColor: /^#[0-9a-fA-F]{3,6}$/.test(req.body.avatarColor) ? req.body.avatarColor : c.testimonials[i].avatarColor,
      text:        sanitise(req.body.text)     || c.testimonials[i].text,
    };
    await writeContent(c);
    res.json(c.testimonials[i]);
  } catch { res.status(500).json({ error: 'Failed to update testimonial.' }); }
});

app.delete('/api/admin/content/testimonials/:id', requireAuth, async (req, res) => {
  try {
    const c = await readContent();
    if (!Array.isArray(c.testimonials)) c.testimonials = [];
    const before = c.testimonials.length;
    c.testimonials = c.testimonials.filter(t => t.id !== req.params.id);
    if (c.testimonials.length === before) return res.status(404).json({ error: 'Testimonial not found.' });
    await writeContent(c);
    res.json({ deleted: true });
  } catch { res.status(500).json({ error: 'Failed to delete testimonial.' }); }
});

// ── Enquiries & applications (admin) ───────────────────────────────────────

app.get('/api/admin/enquiries', requireAuth, async (req, res) => {
  try { res.json(await readEnquiries()); }
  catch { res.status(500).json({ error: 'Failed to read enquiries.' }); }
});

app.patch('/api/admin/enquiries/:id', requireAuth, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['new', 'contacted', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be new, contacted, or closed.' });
    }
    const list = await readEnquiries();
    const item = list.find((e) => e.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Enquiry not found.' });
    item.status = status;
    item.updatedAt = new Date().toISOString();
    await writeEnquiries(list);
    res.json(item);
  } catch { res.status(500).json({ error: 'Failed to update enquiry.' }); }
});

app.get('/api/admin/enquiries/export.csv', requireAuth, async (req, res) => {
  try {
    const list = await readEnquiries();
    const headers = ['id', 'createdAt', 'status', 'name', 'email', 'phone', 'homeSlug', 'source', 'careType', 'reasonForContact', 'preferredHome', 'postedPackRequested', 'message'];
    const lines = [headers.join(',')];
    list.forEach((e) => {
      lines.push(headers.map((h) => csvEscapeCell(e[h])).join(','));
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vcg-enquiries.csv"');
    res.send('\ufeff' + lines.join('\n'));
  } catch {
    res.status(500).json({ error: 'Export failed.' });
  }
});

app.get('/api/admin/home-reviews', requireAuth, async (req, res) => {
  try { res.json(await readHomeReviews()); }
  catch { res.status(500).json({ error: 'Failed to read home reviews.' }); }
});

app.delete('/api/admin/home-reviews/:id', requireAuth, async (req, res) => {
  try {
    const list = await readHomeReviews();
    const next = list.filter((r) => r.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: 'Not found.' });
    await writeHomeReviews(next);
    res.json({ deleted: true });
  } catch { res.status(500).json({ error: 'Failed to delete.' }); }
});

app.patch('/api/admin/home-reviews/:id', requireAuth, async (req, res) => {
  try {
    const list = await readHomeReviews();
    const r = list.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Review not found.' });
    const body = req.body || {};
    if (body.name !== undefined) r.name = sanitise(body.name).slice(0, 120);
    if (body.email !== undefined) {
      const em = sanitise(body.email).slice(0, 200);
      if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }
      r.email = em;
    }
    if (body.phone !== undefined) r.phone = sanitise(body.phone).slice(0, 40);
    if (body.relationship !== undefined) r.relationship = sanitise(body.relationship).slice(0, 120);
    if (body.review !== undefined) {
      const rev = sanitiseLongText(body.review, 3500);
      if (rev.length < 20) return res.status(400).json({ error: 'Review must be at least 20 characters.' });
      r.review = rev;
    }
    if (body.homeSlug !== undefined) {
      const slug = sanitise(body.homeSlug).slice(0, 40).toLowerCase();
      const allowed = ['glan', 'llys', 'pentwyn', 'group'];
      if (!allowed.includes(slug)) return res.status(400).json({ error: 'Invalid home selection.' });
      r.homeSlug = slug;
    }
    if (body.rating !== undefined && body.rating !== null && body.rating !== '') {
      const n = parseInt(String(body.rating), 10);
      r.rating = Number.isNaN(n) || n < 1 || n > 5 ? null : n;
    }
    r.updatedAt = new Date().toISOString();
    await writeHomeReviews(list);
    res.json(r);
  } catch (err) {
    console.error('PATCH home-reviews:', err.message);
    res.status(500).json({ error: 'Failed to update review.' });
  }
});

/** Copy a submitted home review into curated homepage testimonials (admin approval). */
app.post('/api/admin/home-reviews/:id/promote-to-testimonial', requireAuth, async (req, res) => {
  try {
    const list = await readHomeReviews();
    const r = list.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Review not found.' });
    if (r.promotedTestimonialId) {
      return res.status(400).json({ error: 'This review is already on the homepage testimonials list.' });
    }
    const text = sanitiseLongText(r.review || r.story, 3500);
    if (!text || text.length < 20) {
      return res.status(400).json({ error: 'Review text is too short to publish.' });
    }
    const c = await readContent();
    if (!Array.isArray(c.testimonials)) c.testimonials = [];
    const tid = 'tt_' + Date.now();
    const home = TESTIMONIAL_HOME_BY_SLUG[r.homeSlug] || 'Valley Care Group';
    const relation = sanitise(r.relationship).slice(0, 120) || 'Family member';
    const t = {
      id: tid,
      name: sanitise(r.name).slice(0, 120) || 'Guest',
      relation,
      home,
      initials: initialsFromDisplayName(r.name).slice(0, 2),
      avatarColor: '#1B4F72',
      text,
    };
    c.testimonials.unshift(t);
    await writeContent(c);
    r.promotedTestimonialId = tid;
    r.promotedAt = new Date().toISOString();
    await writeHomeReviews(list);
    res.status(201).json({ testimonial: t });
  } catch (err) {
    console.error('promote-to-testimonial:', err.message);
    res.status(500).json({ error: 'Failed to add review to testimonials.' });
  }
});

app.get('/api/admin/home-reviews/export.csv', requireAuth, async (req, res) => {
  try {
    const list = await readHomeReviews();
    const headers = ['id', 'createdAt', 'name', 'email', 'phone', 'homeSlug', 'relationship', 'rating', 'review'];
    const lines = [headers.join(',')];
    list.forEach((r) => {
      lines.push(headers.map((h) => csvEscapeCell(h === 'review' ? (r.review || r.story) : r[h])).join(','));
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vcg-home-reviews.csv"');
    res.send('\ufeff' + lines.join('\n'));
  } catch {
    res.status(500).json({ error: 'Export failed.' });
  }
});

app.get('/api/admin/applications', requireAuth, async (req, res) => {
  try { res.json(await readApplications()); }
  catch { res.status(500).json({ error: 'Failed to read applications.' }); }
});

app.patch('/api/admin/applications/:id', requireAuth, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['new', 'reviewing', 'contacted', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    const list = await readApplications();
    const item = list.find((a) => a.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Application not found.' });
    item.status = status;
    item.updatedAt = new Date().toISOString();
    await writeApplications(list);
    res.json(item);
  } catch { res.status(500).json({ error: 'Failed to update application.' }); }
});

app.get('/api/admin/applications/:id/cv', requireAuth, async (req, res) => {
  try {
    const list = await readApplications();
    const item = list.find((a) => a.id === req.params.id);
    if (!item || !item.cvUrl) return res.status(404).json({ error: 'No CV on file.' });
    res.redirect(302, item.cvUrl);
  } catch { res.status(500).json({ error: 'Failed to open CV.' }); }
});

app.get('/api/admin/applications/export.csv', requireAuth, async (req, res) => {
  try {
    const list = await readApplications();
    const headers = ['id', 'createdAt', 'status', 'jobId', 'jobTitle', 'firstName', 'lastName', 'email', 'phone', 'yearsExperience', 'currentRole', 'qualifications', 'cvUrl'];
    const lines = [headers.join(',')];
    list.forEach((a) => {
      lines.push(headers.map((h) => csvEscapeCell(a[h])).join(','));
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vcg-applications.csv"');
    res.send('\ufeff' + lines.join('\n'));
  } catch {
    res.status(500).json({ error: 'Export failed.' });
  }
});

// ---------------------------------------------------------------------------
// 404 handler for unknown API routes
// ---------------------------------------------------------------------------
app.use('/api/', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// ---------------------------------------------------------------------------
// Root health check (Vercel expects a response at /)
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Valley Care Group API', version: '2.0.0' });
});

// Catch-all for non-API routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found. This is the API server — visit the frontend URL for the website.' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, _next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (maximum 2MB).' });
  }
  if (process.env.SENTRY_DSN) {
    try { require('@sentry/node').captureException(err); } catch (_) { /* optional dep */ }
  }
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ---------------------------------------------------------------------------
// Start server (for local development — Vercel uses api/index.js instead)
// ---------------------------------------------------------------------------
if (require.main === module) {
  (async () => {
    await maybeResetAdminHashForDev();
    app.listen(PORT, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════╗');
      console.log('║   Valley Care Group — API Server Started      ║');
      console.log(`║   http://localhost:${PORT}                        ║`);
      console.log('║   Environment: ' + (IS_PROD ? 'production' : 'development') + '                    ║');
      console.log('╚═══════════════════════════════════════════════╝');
      console.log('');
    });
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = app;
