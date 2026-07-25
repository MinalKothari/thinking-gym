# PROJECT BRIEF — Thinking Gym

_Full context for anyone (human or Claude Code) continuing this project. Read alongside
`README.md` (quickstart) and `CLAUDE.md` (repo rules)._

---

## 1. Vision & who it's for
Build a product that **develops people's critical thinking**. The insight: in the AI era, the
people most capable of deep thinking are the ones most tempted to outsource it to AI, and
monotonous work quietly atrophies the muscle ("cognitive offloading / cognitive surrender").

**Primary user:** the *self-aware sharpener* — a knowledge worker who can feel their reasoning
edge dulling and wants to keep it sharp. They have money, self-awareness, and mild anxiety about
it. NOT students (that market is crowded and low-ARPU), and NOT people in full "passenger mode"
(they won't do voluntary hard thinking yet).

Positioning: **a gym for the mind.** Fun, fast, and genuinely effortful.

---

## 2. The product — two parts

**Part 1 · Daily Puzzles (the free hook).** One puzzle a day, Wordle-style — same puzzle for
everyone, shareable result, streak-driven. This is the free funnel and the viral/marketing
engine. It is NOT the revenue.

**Part 2 · Challenges (the paid depth).** Longer (~5–10 min, one sitting) structured deep-dives
that push the user to **dig into WHY a real problem exists** — descending through layers of "why"
past symptoms to the root cause. This is the differentiated value and the paid layer.

Both parts feed **one shared "thinking profile"** (scores across reasoning muscles) and one
streak. The product is one habit loop, not a menu of modes.

---

## 3. Core design principles (hard-won — do not violate)
- **One shell, not a menu.** A single daily habit loop that serves varied puzzle *types*, not
  separate mode-pickers. Variety lives inside the loop.
- **Frictionless input, effortful thought.** Strip administrative friction (no essays, no blank
  text boxes) but keep the cognitive effort. Prefer taps, sliders, multiple-choice, number pads,
  short jots, and voice. The app does the drudgery (arithmetic, articulation); the user supplies
  the judgment.
- **Grade convergent types; never grade divergent prose.** Spot-the-flaw / Deduction / Fermi
  have right answers → grade them. Second-order / Reframe (and Challenges) have no single answer →
  **reveal-and-compare** to an expert breakdown and community stats, never a score on the user's
  words (that invites sycophancy and feels unfair).
- **Closeness = discovery, not correctness.** To avoid the "did I get it? do I keep going?"
  anxiety on open tasks, show *coverage* meters ("angles uncovered 2/3", "key facts uncovered
  2/3") — how much of the picture you've surfaced — never a correctness grade on open answers.
- **The answer never reaches the browser** (see §5).
- **Anti-fatigue is a constraint, not a nicety.** ~2–4 min per puzzle; never a wall of text to
  read or write.

---

## 4. The puzzle system
Seven types, each mapped to a **reasoning muscle**, rotating weekly, difficulty ramping 1→5:
- Mon **Lateral** (yes/no situation cracking) → questioning assumptions
- Tue **Spot the flaw** → evaluating arguments / fallacies
- Wed **Fermi estimate** → decomposition & estimation
- Thu **Deduction** → deductive logic
- Fri **Second-order** → consequence thinking
- Sat **Reframe** → problem framing (bridge to Challenges)
- Sun **Boss** → harder mixed capstone

Per-type input models (already prototyped and built):
- Lateral → a server-side yes/no **oracle** + a "key facts uncovered" meter.
- Spot-the-flaw → multiple choice (graded).
- Fermi → a **scratchpad**: rows of assumptions chained with ×/÷/+/−, live running estimate;
  grade = within one order of magnitude; reveal shows the decomposition.
- Deduction → short answer.
- Second-order / Reframe → a **scaffolded workspace**: tappable "lens" chips + short jots +
  voice, an "angles uncovered" coverage meter, then reveal-and-compare.

**Content status:** a **90-day content bank** exists (`docs/puzzle-bank-90-day.xlsx`) with
prompt / 3 hints / answer / share line per day — but it does NOT yet contain the interactive
payloads (MCQ options, Fermi seeds, oracle keywords, lens/angle keywords). Enriching the bank
into the full split-payload shape is **Feature 5** (the pipeline). The 6 seeded puzzles in
`supabase/02_seed.sql` are the fully-built examples of the target shape.

---

## 5. Architecture & security
**Stack:** Next.js (App Router, TS) + Supabase (Postgres + Auth) + Tailwind + Stripe (later) →
deploy on Vercel. Web-first (see §6 for why).

**The security principle that shapes everything:** the puzzle **answer** and **solution** never
reach the client. Each puzzle is split into `payload_public` (client-safe render data) and
`solution` (server-only: correct index, Fermi target, oracle keywords, angle keywords) + `answer`.
All grading and interaction happens in Postgres `security definer` RPCs:
`get_today_puzzle`, `check_daily`, `ask_oracle`, `match_angles`, `reveal_puzzle`.
The browser never sees anything that reveals the answer. Do not add client-side answer checking.

**Auth model:** guest-first. Visitors play immediately via Supabase anonymous sign-in; they're
later prompted to upgrade to a real account to save their streak (Feature 3).

---

## 6. Monetization
- **Free:** the daily puzzle + streak (kept free forever, like Wordle — it's the funnel).
- **Pro (subscription):** the deep Challenges, the archive of past puzzles/challenges, and streak
  freezes.
- **Payments: Stripe, web-first.** Deliberately avoid launching in native app stores first,
  because Apple/Google force in-app purchase and take 15–30%. Stripe on the web keeps ~97%.
  If/when native apps ship for discovery, use **RevenueCat** to manage store entitlements.
- Gating is a `profiles.is_pro` flag unlocking Challenges/archive/freezes.

---

## 7. Marketing from day 0 — Reddit
The daily-shared-puzzle + comment-debate loop is native to Reddit. Plan: build a lean
**Reddit-native daily puzzle** using **Reddit's Developer Platform (Devvit / Devvit Web)** as an
*interactive post* in our own subreddit — a marketing + validation engine that runs the same
puzzle bank. Reddit's **Developer Funds** even pays milestone bounties (install- and
engagement-based). Reddit CANNOT run our subscription (payments there are Reddit-gold micro-goods
only), so it's a **two-surface play**: the free daily lives on Reddit (community, virality, funds)
and funnels the most engaged players to our app for the paid Challenges. Handle the funnel-out
tastefully (Reddit has rules about driving traffic off-platform). This is **Feature 6b**.

---

## 8. What's built + roadmap
- ✅ **Feature 1 — data foundation.** `supabase/01_schema.sql`: puzzles (split payload), profiles,
  subscriptions, plays, puzzle_stats, RLS, and the secure RPCs. Seed of 6 playable puzzles
  (`02_seed.sql`).
- ✅ **Feature 2 — daily loop.** `components/DailyGame.tsx` + `lib/` wired to the RPCs;
  `03_interactions.sql` adds the server-side oracle + angle matching. Guest sign-in, streak,
  share, all per-type inputs, server-graded.
- ⏭ **Feature 3 — real logins.** Upgrade the anonymous guest into a permanent account
  (Google + email magic-link) so streaks/history persist across devices. Add the
  "log in to save your streak" prompt at the moment it matters (not a signup wall).
- ⏭ **Feature 4 — subscriptions.** Stripe Checkout + Customer Portal + webhook that sets
  `is_pro` / fills the `subscriptions` table; gate the archive/Challenges.
- ⏭ **Feature 5 — puzzle pipeline.** LLM generates candidates into the split-payload schema from
  per-type templates; automated QC validator (unique answer, MCQ has exactly one correct, Fermi
  seed multiplies to target, answer not leaked in prompt, dedupe, no political landmines) + a fast
  human approve gate; enrich the 90-day bank; schedule by `publish_date`.
- ⏭ **Feature 6 — Challenges (Part 2)** (the layered "dig into why" experience; a v0 exists in
  `docs/standalone-prototype.jsx`) **+ the Reddit/Devvit surface** (§7).

---

## 9. Deploy (do this now)
1. **Local check:** `npm install`; create `.env.local` from `.env.local.example` with the
   Supabase URL + anon key; `npm run dev` and confirm today's puzzle loads.
2. **Supabase (once):** in the SQL editor run `supabase/01_schema.sql` → `02_seed.sql` →
   `03_interactions.sql`; then Auth → Providers → enable **Anonymous sign-ins**.
3. **GitHub:** create a repo and push. **Before pushing, `git status` and confirm `.env.local`
   is NOT staged** (the `.gitignore` should handle it).
4. **Vercel:** import the repo; add the two `NEXT_PUBLIC_` env vars in Vercel's dashboard; deploy.
   Every push to `main` auto-redeploys.
5. Reminder: deploying the front-end does **not** set up the database — step 2 is separate.

---

## 10. Guardrails
- Never commit `.env.local` or any secret. The Supabase **anon** key is public-safe; the
  **service_role** key must never be in the repo or the client.
- Never send a puzzle answer/solution to the browser; all grading is server-side.
- Keep content safe and neutral: verifiable single answers for convergent puzzles; for
  real-world Challenges, stay multi-perspective and avoid political landmines.
- Preserve the anti-fatigue design (§3) as features are added.
