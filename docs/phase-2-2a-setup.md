# Phase 2.2A Database Setup

No remote database changes have been applied by Codex.

Apply this migration to the Supabase development project before using the admin promotion and leaderboard tools:

1. Open the Supabase Dashboard.
2. Go to SQL Editor.
3. Create a new query.
4. Paste the contents of `supabase/migrations/0006_promotions_and_leaderboard.sql`.
5. Run the query once.
6. Stop if Supabase reports an error and record the exact message.

The migration creates:

- `public.promotions`
- `public.community_leaderboard_entries`
- RLS policies for public read and staff-admin management
- Published-rank uniqueness protection
- A trigger preventing more than ten published leaderboard entries per campaign
- A draft-only `STUDENT MONTH` promotion

No discounts, campaign dates, school names, prizes or leaderboard rankings are inserted.
