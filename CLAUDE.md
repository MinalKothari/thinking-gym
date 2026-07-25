# CLAUDE.md — project context

**Product.** Thinking Gym — a daily critical-thinking puzzle app ("a Wordle for reasoning").
A free daily puzzle (this repo) builds the audience and funnels to paid deep "Challenges" (built later).

**Stack.** Next.js (App Router, TypeScript) + Supabase (Postgres + Auth) + Tailwind CSS.
Stripe subscriptions come in a later feature. Deploy target: Vercel.

## Non-negotiable principle
The puzzle **answer** and **solution** must never reach the browser. The client only ever
receives the *public* payload from `get_today_puzzle`. All grading happens server-side inside
Postgres `security definer` functions:
- `get_today_puzzle()` — today's puzzle, stripped of answer/solution
- `check_daily(puzzle_id, guess)` — grades, records the play, advances the streak, updates stats
- `ask_oracle(puzzle_id, question)` — lateral yes/no oracle (keywords stay server-side)
- `match_angles(puzzle_id, texts)` — open-type coverage (keywords stay server-side)
- `reveal_puzzle(puzzle_id)` — answer + solution, only after the user has attempted

Do not add client-side answer checking, and do not expose `solution` or `answer` columns in any
view or query reachable by the browser.

## File layout
```
app/                 Next.js routes (page.tsx renders <DailyGame/>)
components/DailyGame.tsx   the daily-loop UI (client component)
lib/supabase.ts      Supabase client + typed RPC helpers
lib/types.ts         shared contract (public vs solution payloads)
supabase/            SQL to run in the Supabase SQL editor, IN ORDER:
                       01_schema.sql → 02_seed.sql → 03_interactions.sql → 04_auth_archive.sql
                       → 05_scoring.sql
docs/                reference only — NOT part of the build, do not import:
                       puzzle-bank-90-day.xlsx  (90 days of puzzle content)
                       standalone-prototype.jsx (the original clickable prototype)
```

## Setup (required before the app works)
1. Create a Supabase project.
2. SQL editor → run `supabase/01_schema.sql`, then `02_seed.sql`, then `03_interactions.sql`.
3. Supabase → Authentication → Providers → enable **Anonymous sign-ins** (lets guests play).
4. Copy `.env.local.example` → `.env.local`; fill the two `NEXT_PUBLIC_` values from
   Supabase → Settings → API.
5. `npm install && npm run dev` → http://localhost:3000

## Guardrails
- Never commit `.env.local` or any secret. Only `NEXT_PUBLIC_` values may be exposed.
- The Supabase **anon** key is public by design and is fine in the client. The **service_role**
  key must never be in this repo or the browser.
- Daily rollover is UTC midnight (see `get_today_puzzle`); change the timezone there if desired.

## Build status
- ✅ Feature 1 — data foundation (schema, RLS, secure RPCs)
- ✅ Feature 2 — daily loop wired to Supabase, server-graded
- ✅ Feature 3 — real logins. Guest → permanent via email magic-link (`updateUser`, same uid so
  streak carries) or Google (`linkIdentity`; needs the Google provider + "manual linking" enabled
  in Supabase — optional until configured). Post-solve "save your streak" nudge + header account
  sheet. Sign-out drops back to a fresh guest.
- ✅ Feature 3.5 — the Vault (Pro hook): `list_archive` (safe metadata for everyone) +
  `get_archive_puzzle` (rejects unless `profiles.is_pro`) in `04_auth_archive.sql`; locked list
  + Pro upsell sheet in `components/Vault.tsx`. Stripe (Feature 4) flips `is_pro` — no rework.
- ✅ Feature 3.6 — scoring & ranks (`05_scoring.sql`). Server-side `compute_score`: 100 base,
  −10/hint, −15/wrong attempt, −3/question past 5 (lateral), −2/min past 3 (cap −20), floor 5.
  Rank = "Top X%" vs a per-puzzle `score_hist` seeded with a synthetic community that real plays
  blend into. Lateral got a graded "Name it" answer (typed, checked vs solveWords server-side)
  + adaptive probe chips (`payload_public.probes`), replacing the honor-system reveal.
  Open types stay unscored (reveal-and-compare) by design. ScoreCard in DailyGame mirrors the
  formula for display — keep in sync with `compute_score`.
- ⏭ Feature 4 — Stripe subscription + Pro gating
- ⏭ Feature 5 — puzzle-generation pipeline (enrich the 90-day bank into full payloads)
- ⏭ Feature 6 — Challenges (Part 2) + the Reddit/Devvit marketing surface

## Deploy (Vercel)
Push to GitHub → import the repo in Vercel → add the `NEXT_PUBLIC_` env vars in Vercel's
dashboard (not in the repo) → deploy. Every push to `main` auto-redeploys. The Supabase SQL
must still be run separately in the Supabase dashboard.
