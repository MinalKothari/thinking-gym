-- ============================================================
--  THINKING GYM · Feature 2 additions: interactive RPCs
--  Keep the oracle + angle-matching on the server so keywords never leak.
--  Run after 01_schema.sql.
-- ============================================================

-- Lateral oracle: answer a yes/no question, flag if solved, and report which
-- clues this question uncovered. The client accumulates clue coverage itself.
create or replace function ask_oracle(p_puzzle_id uuid, p_question text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  sol jsonb;
  q text := lower(trim(p_question));
  ans text := 'Doesn''t matter';
  solved boolean := false;
  clue_hits int[] := '{}';
  arr jsonb;
  i int;
begin
  select solution into sol from puzzles
   where id = p_puzzle_id and status = 'live' and type = 'lateral';
  if sol is null then raise exception 'not a live lateral puzzle'; end if;

  if exists (select 1 from jsonb_array_elements_text(sol->'no') w
             where q like '%' || lower(w) || '%') then
    ans := 'No';
  elsif exists (select 1 from jsonb_array_elements_text(sol->'yes') w
                where q like '%' || lower(w) || '%') then
    ans := 'Yes';
  end if;

  if exists (select 1 from jsonb_array_elements_text(sol->'solveWords') w
             where q like '%' || lower(w) || '%') then
    solved := true;
  end if;

  if ans <> 'No' then
    arr := sol->'clueKw';
    for i in 0 .. jsonb_array_length(arr) - 1 loop
      if exists (select 1 from jsonb_array_elements_text(arr->i) w
                 where q like '%' || lower(w) || '%') then
        clue_hits := array_append(clue_hits, i);
      end if;
    end loop;
  end if;

  return jsonb_build_object('answer', ans, 'solved', solved, 'clueHits', to_jsonb(clue_hits));
end $$;

-- Open types: given the player's current jots, return which key-angle indices are
-- covered. Matches by lens label or hidden keywords; returns only indices.
create or replace function match_angles(p_puzzle_id uuid, p_texts jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  sol jsonb; angles jsonb; covered int[] := '{}';
  i int;
begin
  select solution into sol from puzzles where id = p_puzzle_id and status = 'live';
  angles := sol->'keyAngles';
  if angles is null then return '[]'::jsonb; end if;

  for i in 0 .. jsonb_array_length(angles) - 1 loop
    if exists (
      select 1 from jsonb_array_elements_text(p_texts) t
      where lower(t) = lower(angles->i->>'lens')
         or exists (select 1 from jsonb_array_elements_text(angles->i->'kw') k
                    where lower(t) like '%' || lower(k) || '%')
    ) then
      covered := array_append(covered, i);
    end if;
  end loop;

  return to_jsonb(covered);
end $$;

grant execute on function ask_oracle(uuid, text)      to anon, authenticated;
grant execute on function match_angles(uuid, jsonb)   to anon, authenticated;
