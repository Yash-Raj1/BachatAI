# BachatAI — Deployment Guide

Free deployment using **Vercel** (frontend) + **Render.com** (backend + ML API) + **Supabase** (database, already deployed).

---

## Architecture Overview

```
User Browser
     │
     ▼
[Vercel] React/Vite Frontend
     │  HTTPS → bachatai.vercel.app
     │
     ▼
[Render] Flask Backend           ← SUPABASE_URL, GEMINI_API_KEY
     │  HTTPS → bachatai-backend.onrender.com
     │
     ▼
[Render] ML API (Flask)          ← loads .pkl models from git repo
         HTTPS → bachatai-ml-api.onrender.com

[Supabase] PostgreSQL Database   ← already free, no action needed
```

---

## Pre-Deployment Checklist

Before deploying, make sure all code changes are committed and pushed to GitHub:

```bash
cd bachat-ai/
git add .
git commit -m "feat: production deployment preparation"
git push origin main
```

> **Important:** The `ml/models/` directory with all `.pkl` files **must** be committed to git.
> Render reads model files directly from the cloned repository.
> Model file sizes are tiny (~8 MB total) — no Git LFS needed.

---

## STEP 1 — Deploy ML API on Render (do this FIRST)

The backend depends on the ML API URL, so deploy ML first.

1. Go to **[render.com](https://render.com)** → Sign up free (use GitHub login)

2. Click **"New +"** → **"Web Service"**

3. Connect your GitHub repository

4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `bachatai-ml-api` |
   | **Root Directory** | `ml` |
   | **Runtime** | Python 3 |
   | **Build Command** | `bash build.sh` |
   | **Start Command** | `gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 300 app:app` |
   | **Plan** | Free |

5. **No environment variables** needed for ML API — models are loaded from files in the repo

6. Click **"Create Web Service"**

7. Wait **5–10 minutes** for the first deploy (models must be loaded and prophet/pystan compiled)

8. Verify by visiting:
   ```
   https://bachatai-ml-api.onrender.com/health
   ```
   Expected response:
   ```json
   {"status": "ok", "models": ["categorizer", "forecaster", "anomaly_detector"], "version": "1.0.0"}
   ```

9. **Copy this URL** — you'll need it in Step 2

> **Tip:** Check Render logs to confirm all model files loaded. Look for lines like:
> `OK   models/categorizer/classifier.pkl (2.29 MB)`

---

## STEP 2 — Deploy Backend on Render

1. Click **"New +"** → **"Web Service"** again (same account)

2. Same GitHub repo, different root directory

3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Name** | `bachatai-backend` |
   | **Root Directory** | `backend` |
   | **Runtime** | Python 3 |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 run:app` |
   | **Plan** | Free |

4. Add **Environment Variables** (click the "Environment" tab):

   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | your Supabase project URL |
   | `SUPABASE_KEY` | your Supabase anon key |
   | `SUPABASE_SERVICE_KEY` | your Supabase service role key |
   | `GEMINI_API_KEY` | your Gemini API key |
   | `ML_API_URL` | `https://bachatai-ml-api.onrender.com` |
   | `ALLOWED_ORIGINS` | `https://bachatai.vercel.app` |
   | `FLASK_ENV` | `production` |

   > The `ALLOWED_ORIGINS` value must match your actual Vercel URL exactly.
   > Update it again after Step 3 if the URL differs.

5. Click **"Create Web Service"**

6. Wait **3–5 minutes** for deploy

7. Verify:
   ```
   https://bachatai-backend.onrender.com/health
   ```
   Expected: `{"status": "ok", "service": "bachatai-backend"}`

8. **Copy this URL** — needed for Step 3

---

## STEP 3 — Deploy Frontend on Vercel

1. Go to **[vercel.com](https://vercel.com)** → Sign up free (use GitHub login)

2. Click **"Add New"** → **"Project"**

3. Import your GitHub repository

4. Configure:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Vite |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

5. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://bachatai-backend.onrender.com` |
   | `VITE_SUPABASE_URL` | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |

6. Click **"Deploy"**

7. Wait ~2 minutes for build

8. Visit your Vercel URL (e.g. `https://bachatai-xxxx.vercel.app`)

> **Note:** The `frontend/vercel.json` file already handles SPA routing — page
> refreshes on `/dashboard`, `/forecast`, etc. will work correctly.

---

## STEP 4 — Update Backend CORS (Critical)

After you have the Vercel URL:

1. Go to Render → `bachatai-backend` service → **Environment**
2. Update `ALLOWED_ORIGINS` to your actual Vercel URL:
   ```
   https://bachatai-xxxx.vercel.app
   ```
3. Render will automatically redeploy

---

## STEP 5 — Update Supabase Auth Settings

> Many people skip this step and wonder why login fails!

1. Go to your **Supabase dashboard**
2. Navigate to **Authentication → URL Configuration**
3. Set **Site URL**:
   ```
   https://bachatai-xxxx.vercel.app
   ```
4. Add to **Redirect URLs**:
   ```
   https://bachatai-xxxx.vercel.app/auth
   https://bachatai-xxxx.vercel.app/auth?mode=update
   https://bachatai-xxxx.vercel.app/**
   ```

Without this, signup/login email links will redirect to `localhost` instead of production.

---

## STEP 6 — End-to-End Verification

Test in this exact order:

- [ ] Visit frontend Vercel URL → landing page loads
- [ ] Click **Sign Up** → create a test account → verify email arrives
- [ ] Login → dashboard loads (you'll see the ML wake-up banner briefly)
- [ ] Click **Upload Statement** → upload a bank statement CSV or PDF
- [ ] Verify transactions appear with categories
- [ ] Visit `/forecast` → chart loads
- [ ] Open **F12 → Network** tab → confirm API calls go to `onrender.com` URLs, **not** `localhost`
- [ ] Check for CORS errors in browser console (there should be none)

---

## Free Tier Limits & Constraints

| Platform | Free Limit | Notes |
|----------|-----------|-------|
| **Vercel** | Unlimited deploys, 100GB bandwidth/mo | No sleep — CDN served |
| **Render Backend** | 750 hrs/month | Sleeps after 15 min idle |
| **Render ML API** | 750 hrs/month | Sleeps after 15 min idle |
| **Supabase** | 500MB DB, 2GB bandwidth | No sleep |

### Render Sleep Handling

The backend includes a **keep-alive pinger** (`backend/keep_alive.py`) that fires every 10 minutes in production, preventing sleep during active usage.

The frontend shows a `MLStatusBanner` while the ML API warms up (~30 seconds on cold start). It disappears automatically once the service is ready.

---

## Auto-Deploy on Git Push

Once connected, both Vercel and Render automatically redeploy when you push to the `main` branch. No manual steps needed for updates.

---

## Custom Domain (Optional)

- **Vercel**: Add a custom domain in Project → Settings → Domains (free SSL included)
- **Render**: Add a custom domain in service → Settings → Custom Domains (free SSL included)
- A `.in` domain costs ~₹800/year from [Namecheap](https://namecheap.com) or GoDaddy

---

## Deployed URLs (fill in after deploying)

| Service | URL |
|---------|-----|
| ML API | `https://_____.onrender.com` |
| Backend | `https://_____.onrender.com` |
| Frontend | `https://_____.vercel.app` |
