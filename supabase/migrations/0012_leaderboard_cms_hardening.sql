alter table public.community_leaderboard_entries
  add column if not exists internal_participant_count integer not null default 0,
  add column if not exists status text not null default 'draft',
  add column if not exists short_note text,
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz;

update public.community_leaderboard_entries
set
  internal_participant_count = greatest(coalesce(score, 0)::integer, internal_participant_count),
  status = case
    when is_published then 'published'
    when status is null then 'draft'
    else status
  end,
  is_qualified = greatest(coalesce(score, 0)::integer, internal_participant_count) >= 10
where true;

alter table public.community_leaderboard_entries
  drop constraint if exists community_leaderboard_internal_participant_count_check,
  drop constraint if exists community_leaderboard_status_check,
  drop constraint if exists community_leaderboard_publish_ready_check;

alter table public.community_leaderboard_entries
  add constraint community_leaderboard_internal_participant_count_check check (internal_participant_count >= 0),
  add constraint community_leaderboard_status_check check (status in ('draft', 'ready', 'published', 'archived')),
  add constraint community_leaderboard_publish_ready_check check (
    status <> 'published'
    or (
      is_published = true
      and is_qualified = true
      and internal_participant_count >= 10
      and rank between 1 and 10
      and length(btrim(school_name)) >= 2
    )
  );

drop index if exists community_leaderboard_published_school_unique;
create unique index community_leaderboard_published_school_unique
  on public.community_leaderboard_entries (campaign_slug, lower(btrim(school_name)))
  where is_published = true and status = 'published';

create or replace function public.validate_community_leaderboard_publish()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  published_count integer;
begin
  new.internal_participant_count := greatest(coalesce(new.internal_participant_count, 0), 0);
  new.is_qualified := new.internal_participant_count >= 10;

  if new.status = 'archived' then
    new.is_published := false;
    new.archived_at := coalesce(new.archived_at, now());
  elsif new.status = 'published' or new.is_published then
    new.status := 'published';
    new.is_published := true;
    new.published_at := coalesce(new.published_at, now());
  else
    new.is_published := false;
  end if;

  if new.status = 'published' then
    if not new.is_qualified then
      raise exception 'Cannot publish until the internal participant count reaches 10.';
    end if;

    if new.rank is null or new.rank < 1 or new.rank > 10 then
      raise exception 'Choose a public rank from 1 to 10 before publishing.';
    end if;

    select count(*) into published_count
    from public.community_leaderboard_entries
    where campaign_slug = new.campaign_slug
      and is_published = true
      and status = 'published'
      and id <> new.id;

    if published_count >= 10 then
      raise exception 'Only 10 entries can be published for a campaign.';
    end if;
  end if;

  return new;
end;
$$;

drop policy if exists community_leaderboard_public_read on public.community_leaderboard_entries;
create policy community_leaderboard_public_read on public.community_leaderboard_entries
  for select using (is_qualified = true and is_published = true and status = 'published');

revoke all on public.community_leaderboard_entries from anon, authenticated;
grant select (id, campaign_slug, school_name, rank, display_order, short_note, published_at, created_at, updated_at)
  on public.community_leaderboard_entries to anon, authenticated;
