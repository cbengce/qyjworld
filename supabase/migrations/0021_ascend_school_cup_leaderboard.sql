begin;

create table public.ascend_schools (
  id uuid primary key default gen_random_uuid(),
  school_name text not null check (char_length(btrim(school_name)) between 2 and 160),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index ascend_schools_name_unique_idx
  on public.ascend_schools (lower(btrim(school_name)));
create index ascend_schools_active_name_idx
  on public.ascend_schools (is_active, school_name);

create table public.ascend_school_cup_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.ascend_schools(id) on delete restrict,
  cups integer not null check (cups > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null
);

create index ascend_school_cup_events_school_created_idx
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

create or replace function public.get_ascend_school_cup_leaderboard(p_limit integer default 10)
returns table (
  rank_position bigint,
  school_id uuid,
  school_name text,
  total_cups bigint,
  last_updated timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select
      s.id,
      s.school_name,
      sum(e.cups)::bigint as total_cups,
      max(e.created_at) as last_updated
    from public.ascend_schools s
    join public.ascend_school_cup_events e on e.school_id = s.id
    where s.is_active = true
    group by s.id, s.school_name
    having sum(e.cups) >= 10
  ), ranked as (
    select
      row_number() over (order by t.total_cups desc, t.school_name asc, t.id asc) as rank_position,
      t.id,
      t.school_name,
      t.total_cups,
      t.last_updated
    from totals t
  )
  select r.rank_position, r.id, r.school_name, r.total_cups, r.last_updated
  from ranked r
  order by r.rank_position
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
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

create trigger ascend_school_cup_events_append_only
before update or delete on public.ascend_school_cup_events
for each row execute function public.prevent_ascend_school_cup_event_changes();

revoke all on function public.is_ascend_school_admin(uuid) from public, anon, authenticated;
revoke all on function public.record_ascend_school_cups(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.prevent_ascend_school_cup_event_changes() from public, anon, authenticated;
revoke all on function public.get_ascend_school_cup_leaderboard(integer) from public;

grant execute on function public.is_ascend_school_admin(uuid) to service_role;
grant execute on function public.record_ascend_school_cups(uuid, uuid, integer) to service_role;
grant execute on function public.get_ascend_school_cup_leaderboard(integer) to anon, authenticated, service_role;

commit;
