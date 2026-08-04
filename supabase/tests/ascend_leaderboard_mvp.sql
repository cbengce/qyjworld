begin;

do $$
declare
  v_first uuid := gen_random_uuid();
  v_second uuid := gen_random_uuid();
  v_third uuid := gen_random_uuid();
  v_row record;
  v_count integer;
begin
  insert into public.ascend_referrals (id, profile_id, referral_code, created_at, visits, completed_tests, shares, last_activity_at)
  values
    (v_first, 'luna-tide', 'aaaabbbbcccc0001', '2026-01-01T00:00:00Z', 8, 5, 2, now()),
    (v_second, 'clearsky', 'aaaabbbbcccc0002', '2026-01-02T00:00:00Z', 9, 5, 4, now()),
    (v_third, 'cloudlift', 'aaaabbbbcccc0003', '2026-01-03T00:00:00Z', 2, 3, 1, now());

  select * into strict v_row from public.get_ascend_public_leaderboard(10) where display_identity = 'ASCENDER - ****0002';
  if v_row.rank_position <> 1 then raise exception 'Tie-breaker failed: shares must rank second record first'; end if;
  if v_row.successful_referrals <> 5 or v_row.total_profile_completions <> 5 then raise exception 'Public completion totals are inconsistent'; end if;

  select * into strict v_row from public.get_ascend_public_leaderboard(10) where display_identity = 'ASCENDER - ****0001';
  if v_row.rank_position <> 2 then raise exception 'Stable tie-breaker failed'; end if;

  select * into strict v_row from public.get_ascend_personal_rank('aaaabbbbcccc0003');
  if v_row.rank_position <> 3 then raise exception 'Personal rank is inconsistent with public ordering'; end if;

  perform * from public.increment_ascend_referral_idempotent('aaaabbbbcccc0003', 'completed_tests', repeat('a', 64));
  perform * from public.increment_ascend_referral_idempotent('aaaabbbbcccc0003', 'completed_tests', repeat('a', 64));
  select completed_tests into v_count from public.ascend_referrals where id = v_third;
  if v_count <> 4 then raise exception 'Duplicate event changed the counter more than once'; end if;

  begin
    perform * from public.increment_ascend_referral_idempotent('malformed', 'completed_tests', repeat('b', 64));
    raise exception 'Malformed referral code was accepted';
  exception when others then
    if sqlerrm = 'Malformed referral code was accepted' then raise; end if;
  end;

  if exists (
    select 1 from information_schema.routine_columns
    where specific_schema = 'public'
      and routine_name in ('get_ascend_public_leaderboard', 'get_ascend_personal_rank')
      and column_name in ('referral_code', 'profile_id', 'email', 'phone', 'id')
  ) then raise exception 'A leaderboard RPC exposes a sensitive field'; end if;

  raise notice 'PASS: ranking, tie-breakers, personal rank, privacy projection and idempotency';
end;
$$;

set local role anon;
do $$
begin
  begin
    perform count(*) from public.ascend_referrals;
    raise exception 'Anon direct base-table read unexpectedly succeeded';
  exception when insufficient_privilege then
    raise notice 'PASS: anon cannot read ASCEND referral base data';
  end;
end;
$$;
reset role;

rollback;
