-- DEFERRED: member-level cup purchase attribution is not approved for deployment.
-- Do not apply this migration. The standalone school leaderboard is migration 0021.
begin;

alter table public.ascend_referrals
  add column if not exists cup_purchases bigint not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ascend_referrals_cup_purchases_nonnegative'
      and conrelid = 'public.ascend_referrals'::regclass
  ) then
    alter table public.ascend_referrals
      add constraint ascend_referrals_cup_purchases_nonnegative
      check (cup_purchases >= 0);
  end if;
end;
$$;

alter table public.ascend_referral_events
  drop constraint if exists ascend_referral_events_metric_check;

alter table public.ascend_referral_events
  add constraint ascend_referral_events_metric_check
  check (metric in ('visits', 'completed_tests', 'shares', 'cup_purchases'));

create table if not exists public.ascend_referral_directory (
  referral_id uuid primary key references public.ascend_referrals(id) on delete restrict,
  member_name text,
  display_name text,
  username text,
  phone_normalized text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (member_name is null or char_length(btrim(member_name)) between 1 and 120),
  check (display_name is null or char_length(btrim(display_name)) between 1 and 80),
  check (username is null or char_length(btrim(username)) between 1 and 50),
  check (phone_normalized is null or char_length(btrim(phone_normalized)) between 6 and 24)
);

create index if not exists ascend_referral_directory_display_name_idx
  on public.ascend_referral_directory (lower(display_name));

create index if not exists ascend_referral_directory_username_idx
  on public.ascend_referral_directory (lower(username));

create index if not exists ascend_referral_directory_phone_idx
  on public.ascend_referral_directory (phone_normalized);

alter table public.ascend_referral_directory enable row level security;
alter table public.ascend_referral_directory force row level security;
revoke all on table public.ascend_referral_directory from public, anon, authenticated;
grant select, insert, update on table public.ascend_referral_directory to service_role;

create table if not exists public.ascend_purchase_logs (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.ascend_referrals(id) on delete restrict,
  referral_event_id uuid not null unique references public.ascend_referral_events(id) on delete restrict,
  quantity bigint not null check (quantity > 0 and quantity <= 1000),
  transaction_reference text not null check (
    char_length(btrim(transaction_reference)) between 3 and 120
  ),
  actor_staff_user_id uuid not null references public.staff_users(id) on delete restrict,
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  member_name text,
  notes text check (notes is null or char_length(notes) <= 1000),
  device_type text check (device_type is null or device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  ip_address inet,
  created_at timestamptz not null default now()
);

create unique index if not exists ascend_purchase_logs_reference_uidx
  on public.ascend_purchase_logs (lower(btrim(transaction_reference)));

create index if not exists ascend_purchase_logs_referral_idx
  on public.ascend_purchase_logs (referral_id, created_at desc);

create index if not exists ascend_purchase_logs_actor_idx
  on public.ascend_purchase_logs (actor_staff_user_id, created_at desc);

create index if not exists ascend_referrals_cup_rank_idx
  on public.ascend_referrals (cup_purchases desc, completed_tests desc, shares desc, created_at asc, id asc);

alter table public.ascend_purchase_logs enable row level security;
alter table public.ascend_purchase_logs force row level security;
revoke all on table public.ascend_purchase_logs from public, anon, authenticated;
grant select, insert on table public.ascend_purchase_logs to service_role;

drop function if exists public.increment_ascend_referral_idempotent(text, text, text);

create function public.increment_ascend_referral_idempotent(
  p_referral_code text,
  p_metric text,
  p_idempotency_key text
)
returns table (recorded boolean, completed_tests bigint, cup_purchases bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referral_id uuid;
  v_completed bigint;
  v_cups bigint;
  v_inserted uuid;
begin
  if p_referral_code is null or p_referral_code !~ '^[a-f0-9]{16}$' then
    raise exception 'Invalid referral code';
  end if;
  if p_metric not in ('visits', 'completed_tests', 'shares', 'cup_purchases') then
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
    select ar.completed_tests, ar.cup_purchases into v_completed, v_cups
    from public.ascend_referrals ar
    where ar.id = v_referral_id;
    return query select false, v_completed, v_cups;
    return;
  end if;

  update public.ascend_referrals ar
  set visits = ar.visits + case when p_metric = 'visits' then 1 else 0 end,
      completed_tests = ar.completed_tests + case when p_metric = 'completed_tests' then 1 else 0 end,
      shares = ar.shares + case when p_metric = 'shares' then 1 else 0 end,
      cup_purchases = ar.cup_purchases + case when p_metric = 'cup_purchases' then 1 else 0 end,
      last_activity_at = now()
  where ar.id = v_referral_id
  returning ar.completed_tests, ar.cup_purchases into v_completed, v_cups;

  return query select true, v_completed, v_cups;
end;
$$;

revoke all on function public.increment_ascend_referral_idempotent(text, text, text) from public, anon, authenticated;
grant execute on function public.increment_ascend_referral_idempotent(text, text, text) to service_role;

create or replace function public.record_ascend_cup_purchase(
  p_actor_auth_user_id uuid,
  p_referral_code text,
  p_quantity bigint,
  p_transaction_reference text,
  p_idempotency_key text,
  p_notes text default null,
  p_device_type text default null,
  p_ip_address inet default null
)
returns table (recorded boolean, cup_purchases bigint, purchase_log_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff_user_id uuid;
  v_referral_id uuid;
  v_referral_event_id uuid;
  v_purchase_log_id uuid;
  v_existing_referral_id uuid;
  v_existing_purchase_id uuid;
  v_cup_total bigint;
  v_reference text := btrim(p_transaction_reference);
  v_member_name text;
  v_notes text := nullif(btrim(p_notes), '');
begin
  if p_actor_auth_user_id is null then
    raise exception 'Authenticated administrator is required' using errcode = '42501';
  end if;
  if p_referral_code is null or p_referral_code !~ '^[a-f0-9]{16}$' then
    raise exception 'Invalid referral code';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 1000 then
    raise exception 'Purchase quantity must be between 1 and 1000';
  end if;
  if v_reference is null or char_length(v_reference) < 3 or char_length(v_reference) > 120 then
    raise exception 'Transaction reference must contain 3 to 120 characters';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid idempotency key';
  end if;
  if v_notes is not null and char_length(v_notes) > 1000 then
    raise exception 'Purchase notes may not exceed 1000 characters';
  end if;
  if p_device_type is not null and p_device_type not in ('mobile', 'tablet', 'desktop', 'unknown') then
    raise exception 'Invalid device type';
  end if;

  select su.id into v_staff_user_id
  from public.staff_users su
  where su.auth_user_id = p_actor_auth_user_id
    and su.status = 'active'
    and su.deleted_at is null
    and exists (
      select 1
      from public.staff_role_assignments sra
      join public.roles r on r.id = sra.role_id
      where sra.staff_user_id = su.id
        and sra.status = 'active'
        and sra.deleted_at is null
        and r.status = 'active'
        and r.deleted_at is null
        and r.role_code in ('staff', 'manager', 'super_admin')
    );

  if v_staff_user_id is null then
    raise exception 'Administrator is not authorized to record purchases' using errcode = '42501';
  end if;

  select ar.id into v_referral_id
  from public.ascend_referrals ar
  where ar.referral_code = p_referral_code
  for update;

  if v_referral_id is null then
    raise exception 'Referral code was not found';
  end if;

  select acpe.id, acpe.referral_id
    into v_existing_purchase_id, v_existing_referral_id
  from public.ascend_purchase_logs acpe
  where lower(btrim(acpe.transaction_reference)) = lower(v_reference);

  if v_existing_purchase_id is not null then
    if v_existing_referral_id <> v_referral_id then
      raise exception 'Transaction reference has already been used';
    end if;
    select ar.cup_purchases into v_cup_total
    from public.ascend_referrals ar
    where ar.id = v_referral_id;
    return query select false, v_cup_total, v_existing_purchase_id;
    return;
  end if;

  insert into public.ascend_referral_events (referral_id, metric, idempotency_key)
  values (v_referral_id, 'cup_purchases', p_idempotency_key)
  returning id into v_referral_event_id;

  select coalesce(ard.member_name, ard.display_name, ard.username)
    into v_member_name
  from public.ascend_referral_directory ard
  where ard.referral_id = v_referral_id;

  insert into public.ascend_purchase_logs (
    referral_id,
    referral_event_id,
    quantity,
    transaction_reference,
    actor_staff_user_id,
    actor_auth_user_id,
    member_name,
    notes,
    device_type,
    ip_address
  ) values (
    v_referral_id,
    v_referral_event_id,
    p_quantity,
    v_reference,
    v_staff_user_id,
    p_actor_auth_user_id,
    v_member_name,
    v_notes,
    p_device_type,
    p_ip_address
  ) returning id into v_purchase_log_id;

  update public.ascend_referrals ar
  set cup_purchases = ar.cup_purchases + p_quantity,
      last_activity_at = now()
  where ar.id = v_referral_id
  returning ar.cup_purchases into v_cup_total;

  insert into public.audit_logs (
    actor_staff_user_id,
    action,
    entity_type,
    entity_id,
    idempotency_key,
    metadata,
    created_by,
    updated_by
  ) values (
    v_staff_user_id,
    'ascend.cup_purchase.recorded',
    'ascend_purchase_log',
    v_purchase_log_id,
    p_idempotency_key,
    jsonb_build_object(
      'referral_code', p_referral_code,
      'quantity', p_quantity,
      'transaction_reference', v_reference,
      'member_name', v_member_name,
      'device_type', p_device_type,
      'updated_cup_total', v_cup_total
    ),
    p_actor_auth_user_id,
    p_actor_auth_user_id
  );

  return query select true, v_cup_total, v_purchase_log_id;
end;
$$;

revoke all on function public.record_ascend_cup_purchase(uuid, text, bigint, text, text, text, text, inet) from public, anon, authenticated;
grant execute on function public.record_ascend_cup_purchase(uuid, text, bigint, text, text, text, text, inet) to service_role;

create or replace function public.get_ascend_public_leaderboard(
  p_metric text,
  p_limit integer default 10
)
returns table (
  rank_position bigint,
  display_identity text,
  successful_referrals bigint,
  total_profile_completions bigint,
  total_cup_purchases bigint,
  total_shares bigint,
  metric_code text,
  metric_value bigint,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with selected as (
    select case
      when p_metric in ('successful_referrals', 'cup_purchases', 'shares') then p_metric
      else 'successful_referrals'
    end as metric_code
  ), ranked as (
    select
      row_number() over (
        order by
          case s.metric_code
            when 'cup_purchases' then ar.cup_purchases
            when 'shares' then ar.shares
            else ar.completed_tests
          end desc,
          ar.completed_tests desc,
          ar.cup_purchases desc,
          ar.shares desc,
          ar.created_at asc,
          ar.id asc
      ) as rank_position,
      'ASCENDER - ****' || upper(right(ar.referral_code, 4)) as display_identity,
      ar.completed_tests as successful_referrals,
      ar.completed_tests as total_profile_completions,
      ar.cup_purchases as total_cup_purchases,
      ar.shares as total_shares,
      s.metric_code,
      case s.metric_code
        when 'cup_purchases' then ar.cup_purchases
        when 'shares' then ar.shares
        else ar.completed_tests
      end as metric_value,
      ar.last_activity_at as updated_at
    from public.ascend_referrals ar
    cross join selected s
  )
  select r.rank_position, r.display_identity, r.successful_referrals,
         r.total_profile_completions, r.total_cup_purchases, r.total_shares,
         r.metric_code, r.metric_value, r.updated_at
  from ranked r
  where r.metric_value > 0
  order by r.rank_position
  limit least(greatest(coalesce(p_limit, 10), 1), 10);
$$;

create or replace function public.get_ascend_personal_rank(
  p_referral_code text,
  p_metric text
)
returns table (
  rank_position bigint,
  successful_referrals bigint,
  total_profile_completions bigint,
  total_cup_purchases bigint,
  total_shares bigint,
  metric_code text,
  metric_value bigint,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with selected as (
    select case
      when p_metric in ('successful_referrals', 'cup_purchases', 'shares') then p_metric
      else 'successful_referrals'
    end as metric_code
  ), ranked as (
    select
      ar.referral_code,
      row_number() over (
        order by
          case s.metric_code
            when 'cup_purchases' then ar.cup_purchases
            when 'shares' then ar.shares
            else ar.completed_tests
          end desc,
          ar.completed_tests desc,
          ar.cup_purchases desc,
          ar.shares desc,
          ar.created_at asc,
          ar.id asc
      ) as rank_position,
      ar.completed_tests,
      ar.cup_purchases,
      ar.shares,
      s.metric_code,
      case s.metric_code
        when 'cup_purchases' then ar.cup_purchases
        when 'shares' then ar.shares
        else ar.completed_tests
      end as metric_value,
      ar.last_activity_at
    from public.ascend_referrals ar
    cross join selected s
  )
  select r.rank_position, r.completed_tests, r.completed_tests,
         r.cup_purchases, r.shares, r.metric_code, r.metric_value, r.last_activity_at
  from ranked r
  where p_referral_code ~ '^[a-f0-9]{16}$'
    and r.referral_code = p_referral_code;
$$;

revoke all on function public.get_ascend_public_leaderboard(text, integer) from public;
revoke all on function public.get_ascend_personal_rank(text, text) from public;
grant execute on function public.get_ascend_public_leaderboard(text, integer) to anon, authenticated, service_role;
grant execute on function public.get_ascend_personal_rank(text, text) to anon, authenticated, service_role;

commit;
