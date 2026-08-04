begin;

alter table public.ascend_referrals
  add column if not exists last_activity_at timestamptz;

update public.ascend_referrals
set last_activity_at = created_at
where last_activity_at is null;

alter table public.ascend_referrals
  alter column last_activity_at set default now(),
  alter column last_activity_at set not null;

create index if not exists ascend_referrals_public_rank_idx
  on public.ascend_referrals (completed_tests desc, shares desc, created_at asc, id asc);

create table if not exists public.ascend_referral_events (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.ascend_referrals(id) on delete restrict,
  metric text not null check (metric in ('visits', 'completed_tests', 'shares')),
  idempotency_key text not null check (idempotency_key ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (referral_id, metric, idempotency_key)
);

create index if not exists ascend_referral_events_recent_idx
  on public.ascend_referral_events (created_at desc, referral_id);

alter table public.ascend_referral_events enable row level security;
alter table public.ascend_referral_events force row level security;
revoke all on table public.ascend_referral_events from public, anon, authenticated;
grant select, insert on table public.ascend_referral_events to service_role;

create or replace function public.increment_ascend_referral_idempotent(
  p_referral_code text,
  p_metric text,
  p_idempotency_key text
)
returns table (recorded boolean, completed_tests bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referral_id uuid;
  v_completed bigint;
  v_inserted uuid;
begin
  if p_referral_code is null or p_referral_code !~ '^[a-f0-9]{16}$' then
    raise exception 'Invalid referral code';
  end if;
  if p_metric not in ('visits', 'completed_tests', 'shares') then
    raise exception 'Invalid referral metric';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid idempotency key';
  end if;

  select ar.id into v_referral_id
  from public.ascend_referrals ar
  where ar.referral_code = p_referral_code
  for update;

  if v_referral_id is null then
    return;
  end if;

  insert into public.ascend_referral_events (referral_id, metric, idempotency_key)
  values (v_referral_id, p_metric, p_idempotency_key)
  on conflict (referral_id, metric, idempotency_key) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    select ar.completed_tests into v_completed
    from public.ascend_referrals ar
    where ar.id = v_referral_id;
    return query select false, v_completed;
    return;
  end if;

  update public.ascend_referrals ar
  set visits = ar.visits + case when p_metric = 'visits' then 1 else 0 end,
      completed_tests = ar.completed_tests + case when p_metric = 'completed_tests' then 1 else 0 end,
      shares = ar.shares + case when p_metric = 'shares' then 1 else 0 end,
      last_activity_at = now()
  where ar.id = v_referral_id
  returning ar.completed_tests into v_completed;

  return query select true, v_completed;
end;
$$;

revoke all on function public.increment_ascend_referral_idempotent(text, text, text) from public, anon, authenticated;
grant execute on function public.increment_ascend_referral_idempotent(text, text, text) to service_role;

create or replace function public.get_ascend_public_leaderboard(p_limit integer default 10)
returns table (
  rank_position bigint,
  display_identity text,
  successful_referrals bigint,
  total_profile_completions bigint,
  total_shares bigint,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      row_number() over (
        order by ar.completed_tests desc, ar.completed_tests desc, ar.shares desc, ar.created_at asc, ar.id asc
      ) as rank_position,
      'ASCENDER - ****' || upper(right(ar.referral_code, 4)) as display_identity,
      ar.completed_tests as successful_referrals,
      ar.completed_tests as total_profile_completions,
      ar.shares as total_shares,
      ar.last_activity_at as updated_at
    from public.ascend_referrals ar
  )
  select r.rank_position, r.display_identity, r.successful_referrals,
         r.total_profile_completions, r.total_shares, r.updated_at
  from ranked r
  where r.successful_referrals > 0
  order by r.rank_position
  limit least(greatest(coalesce(p_limit, 10), 1), 10);
$$;

create or replace function public.get_ascend_personal_rank(p_referral_code text)
returns table (
  rank_position bigint,
  successful_referrals bigint,
  total_profile_completions bigint,
  total_shares bigint,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      ar.referral_code,
      row_number() over (
        order by ar.completed_tests desc, ar.completed_tests desc, ar.shares desc, ar.created_at asc, ar.id asc
      ) as rank_position,
      ar.completed_tests,
      ar.shares,
      ar.last_activity_at
    from public.ascend_referrals ar
  )
  select r.rank_position, r.completed_tests, r.completed_tests, r.shares, r.last_activity_at
  from ranked r
  where p_referral_code ~ '^[a-f0-9]{16}$'
    and r.referral_code = p_referral_code;
$$;

revoke all on function public.get_ascend_public_leaderboard(integer) from public;
revoke all on function public.get_ascend_personal_rank(text) from public;
grant execute on function public.get_ascend_public_leaderboard(integer) to anon, authenticated, service_role;
grant execute on function public.get_ascend_personal_rank(text) to anon, authenticated, service_role;

commit;
