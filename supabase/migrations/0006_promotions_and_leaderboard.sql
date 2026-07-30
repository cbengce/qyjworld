create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  image_url text,
  cta_label text,
  cta_url text,
  start_date timestamptz,
  end_date timestamptz,
  display_order integer not null default 0,
  show_on_homepage boolean not null default false,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_status_check check (status in ('draft', 'scheduled', 'active', 'ended')),
  constraint promotions_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint promotions_date_range_check check (start_date is null or end_date is null or end_date >= start_date),
  constraint promotions_cta_url_check check (
    cta_url is null
    or cta_url = ''
    or cta_url ~ '^/[A-Za-z0-9._~:/?#@!$&''()*+,;=%-]*$'
    or cta_url ~ '^https?://[A-Za-z0-9._~:/?#@!$&''()*+,;=%-]+$'
  )
);

create table if not exists public.community_leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_slug text not null,
  school_name text not null,
  rank integer,
  score numeric,
  display_order integer not null default 0,
  is_qualified boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_leaderboard_campaign_slug_check check (campaign_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint community_leaderboard_school_name_check check (length(btrim(school_name)) >= 2),
  constraint community_leaderboard_rank_check check (rank is null or (rank >= 1 and rank <= 10)),
  constraint community_leaderboard_publish_ready_check check (
    is_published = false
    or (is_qualified = true and length(btrim(school_name)) >= 2)
  )
);

create index if not exists promotions_public_idx on public.promotions (show_on_homepage, status, display_order, created_at desc);
create index if not exists promotions_status_idx on public.promotions (status, start_date, end_date);
create index if not exists community_leaderboard_public_idx on public.community_leaderboard_entries (campaign_slug, is_qualified, is_published, rank, display_order);
create unique index if not exists community_leaderboard_published_rank_unique
  on public.community_leaderboard_entries (campaign_slug, rank)
  where is_published = true and rank is not null;

drop trigger if exists promotions_updated_at on public.promotions;
create trigger promotions_updated_at before update on public.promotions
for each row execute function public.set_updated_at();

drop trigger if exists community_leaderboard_entries_updated_at on public.community_leaderboard_entries;
create trigger community_leaderboard_entries_updated_at before update on public.community_leaderboard_entries
for each row execute function public.set_updated_at();

create or replace function public.validate_community_leaderboard_publish()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  published_count integer;
begin
  if new.is_published and not new.is_qualified then
    raise exception 'Only qualified leaderboard entries may be published.';
  end if;

  if new.is_published then
    select count(*) into published_count
    from public.community_leaderboard_entries
    where campaign_slug = new.campaign_slug
      and is_published = true
      and id <> new.id;

    if published_count >= 10 then
      raise exception 'A campaign may publish no more than ten leaderboard entries.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists community_leaderboard_publish_validate on public.community_leaderboard_entries;
create trigger community_leaderboard_publish_validate
before insert or update on public.community_leaderboard_entries
for each row execute function public.validate_community_leaderboard_publish();

alter table public.promotions enable row level security;
alter table public.community_leaderboard_entries enable row level security;

drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read on public.promotions
  for select using (status in ('scheduled', 'active', 'ended'));

drop policy if exists promotions_staff_manage on public.promotions;
create policy promotions_staff_manage on public.promotions
  for all using (public.current_staff_user_id() is not null)
  with check (public.current_staff_user_id() is not null);

drop policy if exists community_leaderboard_public_read on public.community_leaderboard_entries;
create policy community_leaderboard_public_read on public.community_leaderboard_entries
  for select using (is_qualified = true and is_published = true);

drop policy if exists community_leaderboard_staff_manage on public.community_leaderboard_entries;
create policy community_leaderboard_staff_manage on public.community_leaderboard_entries
  for all using (public.current_staff_user_id() is not null)
  with check (public.current_staff_user_id() is not null);

revoke all on public.promotions from public;
revoke all on public.community_leaderboard_entries from public;
grant select on public.promotions to anon, authenticated;
grant select on public.community_leaderboard_entries to anon, authenticated;
grant insert, update, delete on public.promotions to authenticated;
grant insert, update, delete on public.community_leaderboard_entries to authenticated;

insert into public.promotions (slug, title, status, display_order, show_on_homepage)
values ('student-month', 'STUDENT MONTH', 'draft', 0, false)
on conflict (slug) do nothing;
