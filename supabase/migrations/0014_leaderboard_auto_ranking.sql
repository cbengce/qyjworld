alter table public.community_leaderboard_entries
  drop constraint if exists community_leaderboard_publish_ready_check;

alter table public.community_leaderboard_entries
  add constraint community_leaderboard_publish_ready_check check (
    status <> 'published'
    or (
      is_published = true
      and is_qualified = true
      and internal_participant_count >= 10
      and length(btrim(school_name)) >= 2
    )
  );

with ranked_entries as (
  select
    id,
    row_number() over (
      partition by campaign_slug
      order by display_order asc, published_at asc nulls last, created_at asc, id asc
    ) as computed_position
  from public.community_leaderboard_entries
  where is_qualified = true
    and is_published = true
    and status = 'published'
)
update public.community_leaderboard_entries as entry
set
  display_order = ranked_entries.computed_position * 100,
  rank = null
from ranked_entries
where entry.id = ranked_entries.id;

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
  new.rank := null;

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

create or replace function public.normalize_community_leaderboard_order(target_campaign_slug text)
returns void
language plpgsql
set search_path = public
as $$
begin
  with ranked_entries as (
    select
      id,
      row_number() over (
        order by display_order asc, published_at asc nulls last, created_at asc, id asc
      ) as computed_position
    from public.community_leaderboard_entries
    where campaign_slug = target_campaign_slug
      and is_qualified = true
      and is_published = true
      and status = 'published'
  )
  update public.community_leaderboard_entries as entry
  set
    display_order = ranked_entries.computed_position * 100,
    rank = null
  from ranked_entries
  where entry.id = ranked_entries.id;
end;
$$;

create or replace function public.reorder_community_leaderboard_entry(target_entry_id uuid, move_direction text)
returns void
language plpgsql
set search_path = public
as $$
declare
  target_campaign_slug text;
  target_position integer;
  neighbor_entry_id uuid;
  neighbor_position integer;
begin
  if move_direction not in ('up', 'down') then
    raise exception 'Invalid move direction.';
  end if;

  select campaign_slug into target_campaign_slug
  from public.community_leaderboard_entries
  where id = target_entry_id
    and is_qualified = true
    and is_published = true
    and status = 'published'
  for update;

  if target_campaign_slug is null then
    raise exception 'Only published qualified entries can be reordered.';
  end if;

  drop table if exists leaderboard_reorder_positions;

  create temp table leaderboard_reorder_positions on commit drop as
  select
    id,
    row_number() over (
      order by display_order asc, published_at asc nulls last, created_at asc, id asc
    )::integer as position
  from public.community_leaderboard_entries
  where campaign_slug = target_campaign_slug
    and is_qualified = true
    and is_published = true
    and status = 'published';

  select position into target_position
  from leaderboard_reorder_positions
  where id = target_entry_id;

  neighbor_position := case
    when move_direction = 'up' then target_position - 1
    else target_position + 1
  end;

  select id into neighbor_entry_id
  from leaderboard_reorder_positions
  where position = neighbor_position;

  if neighbor_entry_id is null then
    perform public.normalize_community_leaderboard_order(target_campaign_slug);
    return;
  end if;

  with final_order as (
    select
      id,
      case
        when id = target_entry_id then neighbor_position
        when id = neighbor_entry_id then target_position
        else position
      end as final_position
    from leaderboard_reorder_positions
  )
  update public.community_leaderboard_entries as entry
  set
    display_order = final_order.final_position * 100,
    rank = null
  from final_order
  where entry.id = final_order.id;
end;
$$;

create or replace view public.public_community_leaderboard_entries as
select
  id,
  campaign_slug,
  school_name,
  computed_rank as rank,
  display_order,
  short_note,
  published_at,
  created_at,
  updated_at
from (
  select
    id,
    campaign_slug,
    school_name,
    row_number() over (
      partition by campaign_slug
      order by display_order asc, published_at asc nulls last, created_at asc, id asc
    )::integer as computed_rank,
    display_order,
    short_note,
    published_at,
    created_at,
    updated_at
  from public.community_leaderboard_entries
  where is_qualified = true
    and is_published = true
    and status = 'published'
) ranked_entries
where computed_rank <= 10;

revoke all on public.public_community_leaderboard_entries from public, anon, authenticated;
grant select on public.public_community_leaderboard_entries to anon, authenticated;

revoke all on function public.normalize_community_leaderboard_order(text) from public;
revoke all on function public.reorder_community_leaderboard_entry(uuid, text) from public;
grant execute on function public.normalize_community_leaderboard_order(text) to service_role;
grant execute on function public.reorder_community_leaderboard_entry(uuid, text) to service_role;
