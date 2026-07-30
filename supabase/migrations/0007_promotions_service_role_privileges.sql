grant usage on schema public to anon, authenticated, service_role;

grant select on public.promotions to anon, authenticated;
grant select on public.community_leaderboard_entries to anon, authenticated;

grant insert, update, delete on public.promotions to authenticated;
grant insert, update, delete on public.community_leaderboard_entries to authenticated;

grant select, insert, update, delete on public.promotions to service_role;
grant select, insert, update, delete on public.community_leaderboard_entries to service_role;
