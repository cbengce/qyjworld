create or replace view public.public_community_leaderboard_entries as
select
  id,
  campaign_slug,
  school_name,
  rank,
  display_order,
  short_note,
  published_at,
  created_at,
  updated_at
from public.community_leaderboard_entries
where is_qualified = true
  and is_published = true
  and status = 'published';

revoke all on public.public_community_leaderboard_entries from public, anon, authenticated;
grant select on public.public_community_leaderboard_entries to anon, authenticated;
