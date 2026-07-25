-- ============================================================
--  THINKING GYM · Feature 3.5: archive RPCs (the Pro hook)
--  Run AFTER 01_schema → 02_seed → 03_interactions.
--  Same core principle: answer + solution never reach the client,
--  and full past puzzles are Pro-only (enforced HERE, server-side).
-- ============================================================

-- Locked-list metadata: safe for everyone (title/type/date only — no prompt,
-- no payload, no answer). Powers the "Vault" teaser under the daily puzzle.
create or replace function list_archive()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.obj), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', id, 'date', publish_date, 'type', type, 'muscle', muscle,
      'difficulty', difficulty, 'title', title
    ) as obj
    from puzzles
    where status in ('live','retired')
      and publish_date < (now() at time zone 'UTC')::date
    order by publish_date desc
    limit 60
  ) x;
$$;

-- Full past puzzle (public payload only) — Pro subscribers only.
-- Until Feature 4 ships Stripe, nobody has is_pro, so this stays locked.
create or replace function get_archive_puzzle(p_puzzle_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  pro boolean;
begin
  if uid is null then raise exception 'sign in required'; end if;
  select is_pro into pro from profiles where id = uid;
  if not coalesce(pro, false) then raise exception 'pro required'; end if;
  return (
    select jsonb_build_object(
      'id', id, 'date', publish_date, 'type', type, 'muscle', muscle,
      'difficulty', difficulty, 'title', title, 'prompt', prompt,
      'hints', hints, 'payload', payload_public, 'shareLine', share_line
    )
    from puzzles
    where id = p_puzzle_id
      and status in ('live','retired')
      and publish_date < (now() at time zone 'UTC')::date
  );
end $$;

grant execute on function list_archive()              to anon, authenticated;
grant execute on function get_archive_puzzle(uuid)    to authenticated;
