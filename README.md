# Thinking Gym

A daily critical-thinking puzzle — one puzzle a day, graded on the server, that keeps your
reasoning sharp. This repo is the **free daily loop** (Features 1–2). Logins, subscriptions,
the deeper "Challenges", and the content pipeline come next.

**Stack:** Next.js (App Router, TypeScript) · Supabase (Postgres + Auth) · Tailwind CSS · Vercel.

---

## Quickstart

### 1. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run these three files, in order:
   - `supabase/01_schema.sql`
   - `supabase/02_seed.sql`  (6 playable puzzles, scheduled from today)
   - `supabase/03_interactions.sql`
3. **Authentication → Providers → enable "Anonymous sign-ins"** (so guests can play instantly).

### 2. Configure env
```bash
cp .env.local.example .env.local
```
Fill the two values from **Supabase → Settings → API**:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Run
```bash
npm install
npm run dev
```
Open http://localhost:3000 — you should get today's puzzle.

---

## Deploy to Vercel
1. Push this repo to GitHub (with Claude Code: *"create a GitHub repo and push this"*).
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Add the two `NEXT_PUBLIC_` env vars in **Vercel → Project → Settings → Environment Variables**.
4. Deploy. Every push to `main` auto-redeploys.

> The Supabase SQL is **not** run by Vercel — run it once in the Supabase dashboard (step 1 above).

---

## What's inside
```
app/                     Next.js routes
components/DailyGame.tsx  the daily-loop UI
lib/                     Supabase client, typed helpers, shared types
supabase/                the three SQL files (run in order)
docs/                    reference only (90-day content bank, original prototype)
CLAUDE.md                project context for Claude Code sessions
```

## Security model (important)
The answer never reaches the browser. The client only gets the *public* half of each puzzle;
grading, the lateral oracle, and open-type coverage all run in server-side Postgres functions.
Never commit `.env.local`, and never put the Supabase `service_role` key in this repo.

## Roadmap
1. ✅ Data foundation · 2. ✅ Daily loop · 3. Logins · 4. Stripe subscription · 5. Puzzle
pipeline · 6. Challenges + Reddit/Devvit surface.
