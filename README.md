# Valley Care Group — Website & API

A premium care home website and content management system for Valley Care Group, South Wales.

## Project Structure

```
carehomes-wales/
├── frontend/          ← Static site (HTML, CSS, JS)
├── backend/           ← Node.js/Express API (PostgreSQL + GCS)
│   ├── server.js
│   ├── db/schema.sql
│   ├── lib/kv-store.js
│   ├── Dockerfile
│   └── .env.example
├── firebase.json      ← Firebase Hosting (copy .firebaserc.example → .firebaserc)
└── README.md
```

**Production stack:** Firebase Hosting (frontend) · Cloud Run (API) · Cloud SQL (PostgreSQL) · Google Cloud Storage (CVs). Configure `DATABASE_URL`, `GCS_BUCKET_NAME`, `ALLOWED_ORIGIN`, `JWT_SECRET`, `ADMIN_PASSWORD`, and Resend keys on Cloud Run; set `PUBLIC_API_BASE` when building the frontend to your Cloud Run URL.

---

## Deploying (overview)

1. **Database:** Create a Cloud SQL Postgres instance (`europe-west2`), run `backend/db/schema.sql`, note the connection string (including Cloud SQL socket for Cloud Run).
2. **Backend:** Build and deploy the container from `backend/` to Cloud Run; attach a service account with access to Cloud SQL and the GCS bucket; set environment variables from `.env.example`.
3. **Storage:** Create a GCS bucket for CV uploads; grant the Cloud Run service account `roles/storage.objectAdmin` (or tighter custom role).
4. **Frontend:** `cd frontend && npm install && PUBLIC_API_BASE=https://YOUR-RUN-URL npm run build`, then `firebase deploy --only hosting` (Firebase CLI; use `.firebaserc` with your GCP project).

---

## Local development

```bash
cd backend && npm install && npm run dev   # API on http://localhost:3500 (in-memory KV if no DATABASE_URL)
cd frontend && npm install && npm run build && npx serve frontend
```

Set `frontend`’s `PUBLIC_API_BASE=http://localhost:3500` when running `npm run build` in `frontend/` so the site calls your local API.

---

## Legacy: Vercel (removed)

Old instructions (GitHub + Vercel) are archived below for reference only.

### Step 1 — Create a GitHub Repository

1. Go to [github.com](https://github.com) → **Sign up** (free account)
2. Click **New repository**
3. Name it `carehomes-wales` (or any name you like)
4. Set to **Private**
5. Click **Create repository**

### Step 2 — Push Code to GitHub

Open a terminal in this project folder and run:

```bash
git init
git add .
git commit -m "Initial deployment setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/carehomes-wales.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your GitHub username.

---

### Step 3 — Create a Vercel Account

1. Go to [vercel.com](https://vercel.com) → **Sign up with GitHub** (free)
2. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. Log in:
   ```bash
   vercel login
   ```

---

### Step 4 — Deploy the Backend

```bash
cd backend
npm install
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No
- **Project name?** → `vcg-backend`
- **Which directory?** → `./` (current — the `backend/` folder)
- **Want to override settings?** → No

Note the **production URL** shown at the end, e.g. `https://vcg-backend.vercel.app`

#### Add Environment Variables to the Backend

In the Vercel dashboard:
1. Open your `vcg-backend` project → **Settings** → **Environment Variables**
2. Add these variables (for **Production**, **Preview**, and **Development**):

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | A long random string (generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
| `ADMIN_PASSWORD` | Your secure admin password (min 12 chars) |
| `ALLOWED_ORIGIN` | Your frontend URL (fill in after Step 5, e.g. `https://vcg-frontend.vercel.app`) |

#### Set up Vercel KV (Free Redis Database)

In the Vercel dashboard:
1. Go to your `vcg-backend` project → **Storage** tab
2. Click **Create Database** → **KV (Redis)**
3. Name it `vcg-kv`, choose the free tier, click **Create**
4. Vercel will automatically add `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` to your project env vars

#### Redeploy the backend after adding env vars:
```bash
cd backend
vercel --prod
```

---

### Step 5 — Deploy the Frontend

Before deploying, set the backend API URL in the frontend:

1. Open `frontend/assets/js/config.js`
2. Update the fallback URL to point to your backend:
   ```js
   // Change this line:
   window.API_BASE = (meta && meta.content) || window.__API_BASE__ || '';
   // To:
   window.API_BASE = (meta && meta.content) || window.__API_BASE__ || 'https://vcg-backend.vercel.app';
   ```

Then deploy:

```bash
cd frontend
vercel
```

Follow the prompts:
- **Project name?** → `vcg-frontend`
- **Which directory?** → `./` (current — the `frontend/` folder)

Note the **frontend production URL**, e.g. `https://vcg-frontend.vercel.app`

---

### Step 6 — Link Frontend URL to Backend CORS

1. Go to Vercel dashboard → `vcg-backend` → **Settings** → **Environment Variables**
2. Update `ALLOWED_ORIGIN` to your frontend URL:
   ```
   https://vcg-frontend.vercel.app
   ```
3. Redeploy the backend:
   ```bash
   cd backend
   vercel --prod
   ```

---

## ✅ Final Checklist

- [ ] Frontend loads at your Vercel URL
- [ ] `PUBLIC_API_BASE` is set on the **frontend** Vercel project (see below) so `npm run build` injects the live API URL
- [ ] Job listings load on `/jobs.html` and applications submit with CV (Vercel Blob token on backend)
- [ ] Care enquiry forms return success and rows appear under **Admin → Enquiries**
- [ ] Admin panel works at `/admin.html`
- [ ] Admin changes (jobs, content) persist after page refresh

### Frontend build (`PUBLIC_API_BASE`)

The static site runs `npm install && npm run build` before deploy ([`frontend/vercel.json`](frontend/vercel.json)). Set in the **frontend** Vercel project:

| Variable | Example |
|----------|---------|
| `PUBLIC_API_BASE` | `https://your-backend.vercel.app` |

Optional: `PUBLIC_GA_ID` (Google Analytics measurement ID — only loads after cookie consent), `PUBLIC_SENTRY_DSN` (browser errors; wire a loader if you use Sentry).

---

## 🧪 Staging vs production

Use a **separate** Vercel backend project (or preview environment) with its **own Vercel KV** database so testing does not overwrite live jobs, content, enquiries, or applications. Point staging `ALLOWED_ORIGIN` at your preview frontend URL.

---

## 📡 Monitoring & uptime

- Ping `GET /` on the API (expect JSON `status: ok`) and optionally `GET /api/content` from an external uptime monitor.
- Set `SENTRY_DSN` on the backend to capture uncaught errors (optional).

---

## ✉️ Email & file storage (production)

- **Resend**: set `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified domain), `ENQUIRY_NOTIFY_TO`, and `APPLICATION_NOTIFY_TO` on the backend.
- **CV uploads**: create **Vercel Blob** storage and set `BLOB_READ_WRITE_TOKEN` on the backend. Without it, local/dev may still accept applications without a file; production with Blob configured requires a CV except for **speculative** applications.

---

## 🔒 Security Checklist Before Going Live

- [ ] Change `ADMIN_PASSWORD` to something strong (12+ chars)
- [ ] Set `JWT_SECRET` to a long random string (64+ chars)
- [ ] Set `NODE_ENV=production` in Vercel env vars
- [ ] Set `ALLOWED_ORIGIN` to your exact frontend domain (comma-separated if you use `www` and apex)
- [ ] If `NODE_ENV=production`, the API **refuses all requests** with `503` until `JWT_SECRET` (32+ chars), `ADMIN_PASSWORD` (12+ chars), and at least one `ALLOWED_ORIGIN` are set — this is intentional
- [ ] Enable **2-Factor Authentication** on your Vercel and GitHub accounts

---

## 🛠 Local Development

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your local values
npm install
npm run dev   # Starts on http://localhost:3500

# Frontend
# Open frontend/index.html directly in a browser, OR
# Use a simple static server:
npx serve frontend
```

> Without `DATABASE_URL`, the backend uses an **in-memory store** (data resets on restart). Fine for quick local UI tests; use local Postgres for persistence.

---

## 🏡 About

Valley Care Group provides compassionate nursing and residential care across South Wales.
- **Glan-yr-Afon Nursing Home** — Blackwood, Caerphilly — **01443 835196**
- **Llys Gwyn Residential Home** — Pyle, Bridgend (CF33 4PN) — **01633 680217**
- **Ty Pentwyn Nursing Home** — Treorchy, RCT (CF42 6HD) — **managertypentwyn@outlook.com** · telephone on [carehome.co.uk listing](https://www.carehome.co.uk/carehome.cfm/searchazref/20005017TYPA) (operator: Quality Care (Surrey) Ltd)

✉️ **care@valleycare.wales** — see **contact.html** for all numbers.
