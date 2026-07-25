-- ============================================================
--  THINKING GYM · Feature 3.6: scoring, ranks & graded lateral answers
--  Run AFTER 01 → 02 → 03 → 04.
--  Score is computed SERVER-SIDE (client-reported inputs are advisory,
--  grading data never leaves the server). Rank = percentile against a
--  per-puzzle score histogram, seeded with a synthetic distribution
--  that real plays blend into as traffic arrives.
-- ============================================================

alter table plays add column if not exists score int;
alter table puzzle_stats add column if not exists score_hist jsonb not null default '{}'::jsonb;

-- ---------- score formula (keep client display copy in DailyGame in sync) ----------
-- 100 base · −10/hint · −15/wrong attempt · −3/question beyond 5 (lateral)
-- · −2/minute beyond 3 (capped at −20) · floor 5
create or replace function compute_score(
  p_hints int, p_wrong int, p_questions int, p_time_ms bigint
) returns int
language sql immutable as $$
  select greatest(5, least(100,
    100
    - 10 * coalesce(p_hints, 0)
    - 15 * coalesce(p_wrong, 0)
    -  3 * greatest(coalesce(p_questions, 0) - 5, 0)
    - least(20, 2 * greatest((coalesce(p_time_ms, 0) / 60000)::int - 3, 0))
  ));
$$;

-- "Top X%" from the histogram (buckets keyed by score/10).
create or replace function top_pct_for(p_hist jsonb, p_score int)
returns int
language sql stable as $$
  with c as (
    select coalesce(sum(value::int), 0) as total,
           coalesce(sum(value::int) filter (where key::int > p_score / 10), 0) as above
    from jsonb_each_text(p_hist)
  )
  select case when total = 0 then null
              else greatest(1, least(99, (100 * above + total / 2) / total)) end
  from c;
$$;

-- ---------- check_daily v2: grades + scores + ranks ----------
create or replace function check_daily(p_puzzle_id uuid, p_guess jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pz puzzles;
  uid uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
  ok boolean := false;
  prior plays;
  sc int := null;
  hist jsonb; s_solves int; top_pct int := null;
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
             - ln((pz.solution->>'target')::numeric) ) <= ln(10);
  elsif pz.type = 'lateral' then
    -- graded typed answer: must name it (any solve word). "" = give up.
    ok := coalesce(p_guess->>'text', '') <> '' and exists (
      select 1 from jsonb_array_elements_text(pz.solution->'solveWords') w
      where lower(p_guess->>'text') like '%' || lower(w) || '%');
  else
    ok := coalesce((p_guess->>'solved')::boolean, false);   -- open: reveal-and-compare
  end if;

  select * into prior from plays where user_id = uid and puzzle_id = p_puzzle_id;

  insert into plays (user_id, puzzle_id, solved, used_hints, coverage, attempts, time_ms, detail)
  values (uid, p_puzzle_id, ok, coalesce((p_guess->>'hints')::int,0),
          (p_guess->>'coverage')::int, 1, (p_guess->>'timeMs')::int, p_guess)
  on conflict (user_id, puzzle_id) do update set
    solved     = plays.solved or excluded.solved,
    attempts   = plays.attempts + 1,
    used_hints = greatest(plays.used_hints, excluded.used_hints),
    coverage   = greatest(coalesce(plays.coverage,0), coalesce(excluded.coverage,0)),
    time_ms    = coalesce(excluded.time_ms, plays.time_ms),
    detail     = excluded.detail;

  -- first solve of a convergent type → compute + store the score
  if ok and (prior is null or not prior.solved)
     and pz.type in ('lateral','spot_flaw','fermi','deduction','boss') then
    sc := compute_score(
      coalesce((p_guess->>'hints')::int, coalesce(prior.used_hints, 0)),
      coalesce(prior.attempts, 0),                      -- every earlier attempt was wrong
      coalesce((p_guess->>'questions')::int, 0),
      coalesce((p_guess->>'timeMs')::bigint, 0));
    update plays set score = sc where user_id = uid and puzzle_id = p_puzzle_id;
  end if;

  if ok then perform advance_streak(uid, today); end if;

  insert into puzzle_stats (puzzle_id, plays, solves)
  values (p_puzzle_id, 1, case when ok then 1 else 0 end)
  on conflict (puzzle_id) do update set
    plays  = puzzle_stats.plays + 1,
    solves = puzzle_stats.solves + case when ok then 1 else 0 end,
    updated_at = now();

  if sc is not null then
    update puzzle_stats
      set score_hist = jsonb_set(score_hist, array[(sc/10)::text],
            to_jsonb(coalesce((score_hist->>(sc/10)::text)::int, 0) + 1))
      where puzzle_id = p_puzzle_id;
  end if;

  select score_hist, solves into hist, s_solves from puzzle_stats where puzzle_id = p_puzzle_id;
  if sc is not null then top_pct := top_pct_for(hist, sc); end if;

  return jsonb_build_object('correct', ok, 'score', sc, 'topPct', top_pct, 'solves', s_solves);
end $$;

-- ---------- reveal v2: include my score + rank so a refresh keeps the payoff ----------
create or replace function reveal_puzzle(p_puzzle_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare pz puzzles; uid uuid := auth.uid(); my plays; st puzzle_stats;
begin
  if uid is null then raise exception 'sign in required'; end if;
  select * into my from plays where user_id = uid and puzzle_id = p_puzzle_id;
  if my is null then raise exception 'attempt the puzzle before revealing'; end if;
  select * into pz from puzzles where id = p_puzzle_id;
  select * into st from puzzle_stats where puzzle_id = p_puzzle_id;
  return jsonb_build_object(
    'answer',   pz.answer,
    'solution', pz.solution,
    'stats',    jsonb_build_object('plays', st.plays, 'solves', st.solves, 'angles', st.angle_counts),
    'myScore',  my.score,
    'myTopPct', case when my.score is null then null else top_pct_for(st.score_hist, my.score) end
  );
end $$;

-- ---------- synthetic community (until real traffic fills in) ----------
-- Plausible per-puzzle baseline: a few hundred plays, ~55-70% solves, and a
-- bell-ish score distribution. Real plays increment on top of these numbers.
insert into puzzle_stats (puzzle_id, plays, solves, angle_counts, score_hist)
select id,
  260 + ('x' || substr(md5(id::text), 1, 3))::bit(12)::int % 320,          -- 260..579 plays
  (260 + ('x' || substr(md5(id::text), 1, 3))::bit(12)::int % 320) * 6/10, -- ~60% solve
  '{}'::jsonb,
  '{"2":9,"3":22,"4":39,"5":58,"6":63,"7":48,"8":29,"9":13,"10":4}'::jsonb
from puzzles where status = 'live'
on conflict (puzzle_id) do update set
  plays      = greatest(puzzle_stats.plays,  excluded.plays),
  solves     = greatest(puzzle_stats.solves, excluded.solves),
  score_hist = case when puzzle_stats.score_hist = '{}'::jsonb
                    then excluded.score_hist else puzzle_stats.score_hist end;

-- ---------- adaptive probe chips for the seeded lateral puzzle ----------
-- Per-clue follow-up questions (safe to expose: they suggest directions, not answers).
update puzzles set payload_public = payload_public || $tg${"probes":[
  ["What does he do for a living?","Does his job happen at night?"],
  ["Does anyone depend on the light?","Is the light meant for other people?"],
  ["Did switching it off change anything?","Was the light protecting someone?"]
]}$tg$::jsonb
where type = 'lateral' and title = $tg$The keeper's guilt$tg$;
