begin;

create table if not exists public.ascend_referrals (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null check (profile_id in (
    'luna-tide', 'night-nectar', 'evenfall', 'clearsky',
    'monsoon', 'drift', 'stillearth', 'cloudlift'
  )),
  referral_code text not null unique check (referral_code ~ '^[a-f0-9]{16}$'),
  created_at timestamptz not null default now(),
  visits bigint not null default 0 check (visits >= 0),
  completed_tests bigint not null default 0 check (completed_tests >= 0),
  shares bigint not null default 0 check (shares >= 0)
);

create index if not exists ascend_referrals_completed_tests_idx
  on public.ascend_referrals (completed_tests desc, created_at asc);
create index if not exists ascend_referrals_visits_idx
  on public.ascend_referrals (visits desc, created_at asc);

create table if not exists public.ascend_reward_rules (
  id uuid primary key default gen_random_uuid(),
  reward_code text not null unique,
  reward_name text not null,
  completed_referrals_required integer not null unique check (completed_referrals_required > 0),
  created_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'inactive'))
);

insert into public.ascend_reward_rules (reward_code, reward_name, completed_referrals_required)
values
  ('free_topping', 'Free topping', 5),
  ('free_drink', 'Free Drink', 10),
  ('ascend_gold', 'Ascend Gold', 30),
  ('founder_circle', 'Founder Circle', 100)
on conflict (reward_code) do update
set reward_name = excluded.reward_name,
    completed_referrals_required = excluded.completed_referrals_required;

create or replace view public.ascend_referral_rewards
with (security_invoker = true)
as
select
  ar.id as referral_id,
  ar.referral_code,
  ar.profile_id,
  rr.reward_code,
  rr.reward_name,
  rr.completed_referrals_required,
  ar.completed_tests >= rr.completed_referrals_required as unlocked
from public.ascend_referrals ar
cross join public.ascend_reward_rules rr
where rr.status = 'active';

create or replace view public.ascend_leaderboard
with (security_invoker = true)
as
select
  id as referral_id,
  referral_code,
  profile_id,
  visits,
  completed_tests,
  shares,
  dense_rank() over (order by completed_tests desc, visits desc, created_at asc) as completed_rank,
  dense_rank() over (order by visits desc, completed_tests desc, created_at asc) as referral_rank
from public.ascend_referrals;

alter table public.ascend_referrals enable row level security;
alter table public.ascend_referrals force row level security;
alter table public.ascend_reward_rules enable row level security;
alter table public.ascend_reward_rules force row level security;

revoke all on table public.ascend_referrals from public, anon, authenticated;
revoke all on table public.ascend_reward_rules from public, anon, authenticated;
revoke all on table public.ascend_referral_rewards from public, anon, authenticated;
revoke all on table public.ascend_leaderboard from public, anon, authenticated;

grant all on table public.ascend_referrals to service_role;
grant select on table public.ascend_reward_rules to service_role;
grant select on table public.ascend_referral_rewards to service_role;
grant select on table public.ascend_leaderboard to service_role;

create or replace function public.increment_ascend_referral(p_referral_code text, p_metric text)
returns table (completed_tests bigint, unlocked_reward text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_completed bigint;
begin
  if p_metric not in ('visits', 'completed_tests', 'shares') then
    raise exception 'Invalid referral metric';
  end if;

  if p_metric = 'visits' then
    update public.ascend_referrals ar set visits = ar.visits + 1 where ar.referral_code = p_referral_code returning ar.completed_tests into v_completed;
  elsif p_metric = 'completed_tests' then
    update public.ascend_referrals ar set completed_tests = ar.completed_tests + 1 where ar.referral_code = p_referral_code returning ar.completed_tests into v_completed;
  else
    update public.ascend_referrals ar set shares = ar.shares + 1 where ar.referral_code = p_referral_code returning ar.completed_tests into v_completed;
  end if;

  if not found then return; end if;
  return query select v_completed, case when p_metric = 'completed_tests' then
    case v_completed when 5 then 'Free topping' when 10 then 'Free Drink' when 30 then 'Ascend Gold' when 100 then 'Founder Circle' end
  end;
end;
$$;

revoke all on function public.increment_ascend_referral(text, text) from public, anon, authenticated;
grant execute on function public.increment_ascend_referral(text, text) to service_role;

commit;
