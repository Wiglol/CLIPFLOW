# CLIPFLOW

A production-ready “YouTube Shorts style” single-page web app:

- **Frontend:** Vite + React + TypeScript + Tailwind (dark UI)
- **Backend:** Supabase (Auth + Postgres + Realtime)
- **Content:** YouTube Shorts links only (no uploads)
- **Social:** profiles, follows, likes, comments, realtime comments
- **Safety:** block users, “not interested”, report posts (stored)

## Quick start (local)

### 1) Create `.env`
Copy `.env.example` to `.env` and fill in:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 2) Install + run
```bash
npm install
npm run dev
```

Open: `http://localhost:5173`

## Supabase setup (step-by-step)

### A) Create a project
1. Go to Supabase → **New project**
2. Pick a password + region
3. Wait for the database to be ready

### B) Enable email magic link
1. Supabase → **Authentication** → **Providers**
2. Enable **Email**
3. Email confirmations: either on or off is fine for dev; for production you usually want it on.

### C) Redirect URLs (magic link)

CLIPFLOW uses email magic links and then returns to `/auth`.

In Supabase → **Authentication** → **URL Configuration** set:

- **Site URL (production / GitHub Pages):** `https://<YOUR_GH_USERNAME>.github.io/<YOUR_REPO>/`
- **Additional Redirect URLs:**
  - `https://<YOUR_GH_USERNAME>.github.io/<YOUR_REPO>/auth`
  - `http://localhost:5173/`
  - `http://localhost:5173/auth`

If you later rename your repo, update these URLs.


### D) Run the SQL migration
1. Supabase → **SQL Editor**
2. Open `supabase/migrations/0001_clipflow.sql` and run it.

This creates:
- `profiles, posts, likes, follows, comments, reports, blocks, hashtags, post_hashtags, not_interested`
- public views `v_posts_public` and `v_comments_public`
- **RLS ON** + policies
- triggers: `updated_at` and minimal per-user rate limits
- adds `comments` to `supabase_realtime` publication

### E) Enable Realtime for comments
Supabase generally uses the `supabase_realtime` publication already. Still verify:

1. Supabase → **Database** → **Replication**
2. Ensure **comments** is enabled for Realtime.

### F) Get the project keys
Supabase → **Project Settings** → **API**
- Copy **Project URL** → `VITE_SUPABASE_URL`
- Copy **anon public** key → `VITE_SUPABASE_ANON_KEY`

## GitHub Pages deploy (step-by-step)

This repo includes a GitHub Actions workflow: `.github/workflows/deploy.yml`.

### 1) Add Actions secrets
GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(These are “public” in the sense that they ship to the browser, but keeping them in Secrets avoids accidental copy/paste mistakes.)

### 2) Enable Pages
GitHub repo → **Settings** → **Pages**
- Source: **GitHub Actions**

### 3) Deploy
Push to `main`. The workflow will:
- build with correct base path (`/<repo>/`)
- publish `dist` to GitHub Pages

### 4) Verify deep links
This project includes a SPA fallback:
- `public/404.html` stores the deep link in `sessionStorage`
- `index.html` restores it on load

Try opening a deep link directly (after deploy), for example:
`https://<user>.github.io/<repo>/u/<someone>`

## Notes

### YouTube parsing
The app robustly extracts video IDs from:
- `https://www.youtube.com/shorts/VIDEOID`
- `https://youtube.com/shorts/VIDEOID`
- `https://www.youtube.com/watch?v=VIDEOID`
- `https://youtu.be/VIDEOID`

### “For You” feed later
Feed logic is structured so adding a `forYou` query is easy:
- `Newest` = `created_at desc`
- `Following` = posts from followed users
- `For You` can be a new endpoint/view or a client-side strategy later

### Rate limits (DB-side)
Basic triggers block spammy inserts (per user):
- posts: 6/min
- comments: 20/min
- reports: 10/min

You can tune these in `0001_clipflow.sql`.

## License
MIT (add your own if you want).
