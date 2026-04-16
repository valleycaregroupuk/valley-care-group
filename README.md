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

---

## Monitoring & uptime

- Ping `GET /` on the API (expect JSON `status: ok`).
- Set `SENTRY_DSN` on the backend to capture uncaught errors (optional).

---

## Email & file storage (production)

- **Resend**: set `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified domain), `ENQUIRY_NOTIFY_TO`, and `APPLICATION_NOTIFY_TO` on the backend.
- **CV uploads**: Uses Google Cloud Storage (GCS) in production. Ensure the bucket name and service account credentials are correctly configured in Cloud Run.

---

## 🔒 Security Checklist Before Going Live

- [ ] Change `ADMIN_PASSWORD` to something strong (12+ chars)
- [ ] Set `JWT_SECRET` to a long random string (64+ chars)
- [ ] Set `NODE_ENV=production`
- [ ] Set `ALLOWED_ORIGIN` to your exact frontend domain (comma-separated if you use `www` and apex)
- [ ] If `NODE_ENV=production`, the API **refuses all requests** with `503` until `JWT_SECRET` (32+ chars), `ADMIN_PASSWORD` (12+ chars), and at least one `ALLOWED_ORIGIN` are set — this is intentional
- [ ] Enable **2-Factor Authentication** on your GCP and GitHub accounts

---


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
