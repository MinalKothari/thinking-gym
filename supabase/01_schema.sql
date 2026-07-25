-- ============================================================
--  THINKING GYM · Feature 1: data foundation
--  Target: Supabase (Postgres). Run in the SQL editor.
--  Core principle: the ANSWER and SOLUTION never reach the client.
-- ============================================================

-- ---------- enums ----------
create type puzzle_type as enum
  ('lateral','spot_flaw','fermi','deduction','second_order','reframe','boss');
create type puzzle_status as enum ('draft','approved','live','retired');

-- ---------- puzzles ----------
-- payload_public : safe to send to the browser (options text, lens labels, seed rows…)
-- solution       : SERVER ONLY (correct index, fermi target/steps, oracle keywords…)
-- answer         : SERVER ONLY (revealed only after solve / give-up)
create table puzzles (
  id             uuid primary key default gen_random_uuid(),
  publish_date   date unique,                 -- the daily slot (one puzzle per day); null = bank/unscheduled
  type           puzzle_type not null,
  muscle         text not null,
  difficulty     int not null check (difficulty between 1 and 5),
  title          text not null,
  prompt         text not null,
  hints          jsonb not null default '[]'::jsonb,   -- ["h1","h2","h3"]
  payload_public jsonb not null default '{}'::jsonb,   -- client-safe render data
  solution       jsonb not null default '{}'::jsonb,   -- server-only grading data
  answer         text  not null,                       -- server-only
  share_line     text,
  status         puzzle_status not null default 'draft',
  created_at     timestamptz not null default now()
);
create index on puzzles (status, publish_date);

-- ---------- profiles (1:1 with auth.users) ----------
create table profiles (
  id             uuid primary key references auth.users on delete cascade,
  username       text unique,
  is_pro         boolean not null default false,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_played_on date,
  streak_freezes int not null default 0,
  created_at     timestamptz not null default now()
);

-- ---------- subscriptions (mirror of Stripe; filled by webhook in Feature 4) ----------
create table subscriptions (
  user_id                uuid primary key references profiles(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text,                 -- active | trialing | past_due | canceled ...
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

-- ---------- plays (one row per user per puzzle) ----------
create table plays (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  puzzle_id  uuid not null references puzzles(id) on delete cascade,
  played_on  date not null default (now() at time zone 'UTC')::date,
  solved     boolean not null default false,
  used_hints int not null default 0,
  coverage   int,                              -- clues/angles uncovered (lateral + open types)
  attempts   int not null default 0,
  time_ms    int,
  rating     int check (rating in (-1,0,1)) default 0,
  detail     jsonb not null default '{}'::jsonb,  -- angles found, oracle log, guess…
  created_at timestamptz not null default now(),
  unique (user_id, puzzle_id)
);
create index on plays (puzzle_id);

-- ---------- community stats (powers the "62% found this angle" reveal) ----------
create table puzzle_stats (
  puzzle_id    uuid primary key references puzzles(id) on delete cascade,
  plays        int not null default 0,
  solves       int not null default 0,
  angle_counts jsonb not null default '{}'::jsonb,   -- {"0":431,"1":588,...}
  updated_at   timestamptz not null default now()
);

-- ============================================================
--  ROW-LEVEL SECURITY
-- ============================================================
alter table profiles      enable row level security;
alter table plays         enable row level security;
alter table subscriptions enable row level security;
alter table puzzles       enable row level security;   -- no direct client policy => no direct reads
alter table puzzle_stats  enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own plays" on plays
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read own subscription" on subscriptions
  for select using (auth.uid() = user_id);
-- puzzles + puzzle_stats are reached ONLY through the SECURITY DEFINER functions below,
-- so the browser can never select `answer` or `solution` directly.

-- ============================================================
--  ARCHIVE VIEW (past puzzles, no answer/solution) — for the Pro archive later
-- ============================================================
create or replace view puzzles_public as
  select id, publish_date, type, muscle, difficulty, title, prompt,
         hints, payload_public, share_line, status
  from puzzles
  where status in ('live','retired');
-- Pro-gating for the archive is enforced in the app / an RPC in Feature 4.

-- ============================================================
--  SECURE RPCs
-- ============================================================

-- Today's puzzle, stripped of answer + solution. Callable by anyone (incl. guests).
create or replace function get_today_puzzle()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', id, 'date', publish_date, 'type', type, 'muscle', muscle,
    'difficulty', difficulty, 'title', title, 'prompt', prompt,
    'hints', hints, 'payload', payload_public, 'shareLine', share_line
  )
  from puzzles
  where status = 'live'
    and publish_date = (now() at time zone 'UTC')::date
  limit 1;
$$;

-- Advance / reset the streak. Counts once per calendar day; simple freeze support.
create or replace function advance_streak(p_uid uuid, p_today date)
returns void
language plpgsql security definer set search_path = public as $$
declare pr profiles;
begin
  select * into pr from profiles where id = p_uid for update;
  if pr.last_played_on = p_today then
    return;                                    -- already counted today
  elsif pr.last_played_on = p_today - 1 then
    update profiles set current_streak = current_streak + 1,
      longest_streak = greatest(longest_streak, current_streak + 1),
      last_played_on = p_today where id = p_uid;
  elsif pr.streak_freezes > 0 and pr.last_played_on = p_today - 2 then
    update profiles set streak_freezes = streak_freezes - 1,  -- freeze covers one missed day
      current_streak = current_streak + 1,
      longest_streak = greatest(longest_streak, current_streak + 1),
      last_played_on = p_today where id = p_uid;
  else
    update profiles set current_streak = 1,
      longest_streak = greatest(longest_streak, 1),
      last_played_on = p_today where id = p_uid;
  end if;
end $$;

-- Submit an attempt. Grades against the SERVER-ONLY solution, records the play,
-- advances streak on first solve, and updates community stats.
-- p_guess examples:
--   spot_flaw : {"choice":0,"hints":1}
--   deduction : {"text":"seven"}
--   fermi     : {"value":900000}
--   lateral   : {"solved":true,"coverage":3}
--   open      : {"solved":true,"coverage":2,"angles":[0,2]}
create or replace function check_daily(p_puzzle_id uuid, p_guess jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pz puzzles;
  uid uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
  ok boolean := false;
begin
  if uid is null then raise exception 'sign in required'; end if;
  select * into pz from puzzles where id = p_puzzle_id and status = 'live';
  if not found then raise exception 'puzzle not available'; end if;

  if pz.type = 'spot_flaw' then
    ok := (p_guess->>'choice')::int = (pz.solution->>'correct')::int;
  elsif pz.type = 'deduction' then
    ok := lower(trim(p_guess->>'text')) in
          (select lower(x) from jsonb_array_elements_text(pz.solution->'accept') as x);
  elsif pz.type = 'fermi' then
    ok := abs( ln(greatest((p_guess->>'value')::numeric, 1))
             - ln((pz.solution->>'target')::numeric) ) <= ln(10);   -- within one order of magnitude
  else
    ok := coalesce((p_guess->>'solved')::boolean, false);           -- lateral/open: user-declared
  end if;

  insert into plays (user_id, puzzle_id, solved, used_hints, coverage, attempts, detail)
  values (uid, p_puzzle_id, ok, coalesce((p_guess->>'hints')::int,0),
          (p_guess->>'coverage')::int, 1, p_guess)
  on conflict (user_id, puzzle_id) do update set
    solved     = plays.solved or excluded.solved,
    attempts   = plays.attempts + 1,
    used_hints = greatest(plays.used_hints, excluded.used_hints),
    coverage   = greatest(coalesce(plays.coverage,0), coalesce(excluded.coverage,0)),
    detail     = excluded.detail;

  if ok then perform advance_streak(uid, today); end if;

  insert into puzzle_stats (puzzle_id, plays, solves)
  values (p_puzzle_id, 1, case when ok then 1 else 0 end)
  on conflict (puzzle_id) do update set
    plays  = puzzle_stats.plays + 1,
    solves = puzzle_stats.solves + case when ok then 1 else 0 end,
    updated_at = now();

  return jsonb_build_object('correct', ok);
end $$;

-- Reveal answer + solution + community stats. Only after the user has a play row
-- (i.e. they attempted or gave up) — prevents peeking.
create or replace function reveal_puzzle(p_puzzle_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare pz puzzles; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in required'; end if;
  if not exists (select 1 from plays where user_id = uid and puzzle_id = p_puzzle_id) then
    raise exception 'attempt the puzzle before revealing';
  end if;
  select * into pz from puzzles where id = p_puzzle_id;
  return jsonb_build_object(
    'answer',   pz.answer,
    'solution', pz.solution,                    -- steps / key-angle labels are safe now
    'stats',    (select jsonb_build_object('plays', plays, 'solves', solves, 'angles', angle_counts)
                 from puzzle_stats where puzzle_id = p_puzzle_id)
  );
end $$;

grant execute on function get_today_puzzle()            to anon, authenticated;
grant execute on function check_daily(uuid, jsonb)      to authenticated;
grant execute on function reveal_puzzle(uuid)           to authenticated;
grant select   on puzzles_public                        to authenticated;

-- ============================================================
--  Auto-create a profile row when an auth user (incl. guest) is created.
--  Enable "Anonymous sign-ins" in Supabase Auth so guests get a uid and can play.
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username) values (new.id, null)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
