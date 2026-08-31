begin;

-- Canonical current descendant of the archived 0019 and 0021 migrations.
-- Historical public leaderboard RPCs and deferred member cup purchases are
-- intentionally excluded.

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

revoke all on function public.get_ascend_personal_rank(text) from public;
grant execute on function public.get_ascend_personal_rank(text) to anon, authenticated, service_role;

create table if not exists public.ascend_schools (
  id uuid primary key default gen_random_uuid(),
  school_name text not null check (char_length(btrim(school_name)) between 2 and 160),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists ascend_schools_name_unique_idx
  on public.ascend_schools (lower(btrim(school_name)));
create index if not exists ascend_schools_active_name_idx
  on public.ascend_schools (is_active, school_name);

create table if not exists public.ascend_school_cup_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.ascend_schools(id) on delete restrict,
  cups integer not null check (cups > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null
);

create index if not exists ascend_school_cup_events_school_created_idx
  on public.ascend_school_cup_events (school_id, created_at desc);

alter table public.ascend_schools enable row level security;
alter table public.ascend_schools force row level security;
alter table public.ascend_school_cup_events enable row level security;
alter table public.ascend_school_cup_events force row level security;

revoke all on table public.ascend_schools from public, anon, authenticated;
revoke all on table public.ascend_school_cup_events from public, anon, authenticated;
grant select on table public.ascend_schools to service_role;
grant select on table public.ascend_school_cup_events to service_role;

create or replace function public.is_ascend_school_admin(p_auth_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_users su
    join public.staff_role_assignments sra on sra.staff_user_id = su.id
    join public.roles r on r.id = sra.role_id
    where su.auth_user_id = p_auth_user_id
      and su.status = 'active'
      and su.deleted_at is null
      and sra.status = 'active'
      and sra.deleted_at is null
      and r.status = 'active'
      and r.deleted_at is null
      and r.role_code in ('staff', 'manager', 'super_admin')
  );
$$;

create or replace function public.record_ascend_school_cups(
  p_actor_auth_user_id uuid,
  p_school_id uuid,
  p_cups integer
)
returns table (event_id uuid, school_name text, cups_added integer, total_cups bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_name text;
  v_event_id uuid;
  v_total bigint;
begin
  if not public.is_ascend_school_admin(p_actor_auth_user_id) then
    raise exception 'Admin authorization is required' using errcode = '42501';
  end if;
  if p_cups is null or p_cups <= 0 or p_cups > 10000 then
    raise exception 'Cups must be a positive integer no greater than 10000';
  end if;

  select s.school_name into v_school_name
  from public.ascend_schools s
  where s.id = p_school_id and s.is_active = true
  for update;
  if v_school_name is null then raise exception 'Active school not found'; end if;

  insert into public.ascend_school_cup_events (school_id, cups, created_by)
  values (p_school_id, p_cups, p_actor_auth_user_id)
  returning id into v_event_id;

  select sum(e.cups) into v_total
  from public.ascend_school_cup_events e where e.school_id = p_school_id;
  return query select v_event_id, v_school_name, p_cups, v_total;
end;
$$;

create or replace function public.prevent_ascend_school_cup_event_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'ASCEND school cup events are append-only' using errcode = '55000';
end;
$$;

drop trigger if exists ascend_school_cup_events_append_only on public.ascend_school_cup_events;
create trigger ascend_school_cup_events_append_only
before update or delete on public.ascend_school_cup_events
for each row execute function public.prevent_ascend_school_cup_event_changes();

revoke all on function public.is_ascend_school_admin(uuid) from public, anon, authenticated;
revoke all on function public.record_ascend_school_cups(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.prevent_ascend_school_cup_event_changes() from public, anon, authenticated;

grant execute on function public.is_ascend_school_admin(uuid) to service_role;
grant execute on function public.record_ascend_school_cups(uuid, uuid, integer) to service_role;

commit;
