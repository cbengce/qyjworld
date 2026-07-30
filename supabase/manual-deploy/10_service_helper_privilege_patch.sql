-- Qing Yun Jian Phase 1 service helper privilege patch.
-- Purpose:
--   Server-side Supabase service-role writes can touch generated columns that
--   evaluate helper functions such as public.normalize_email(text).
--   06_privilege_patch.sql correctly removed browser-role access, but the
--   service_role also needs EXECUTE so trusted server-only actions can insert
--   or upsert rows with normalized generated columns.
--
-- This patch does not change RLS policies, table write privileges, seed data,
-- or business rules. It is safe to rerun.

grant usage on schema public to service_role;

grant execute on function public.normalize_email(text) to service_role;
grant execute on function public.normalize_mobile(text) to service_role;

select
  'service_role_helper_execute' as check_name,
  has_function_privilege('service_role', 'public.normalize_email(text)', 'EXECUTE') as normalize_email_execute,
  has_function_privilege('service_role', 'public.normalize_mobile(text)', 'EXECUTE') as normalize_mobile_execute,
  'both values must be true' as expectation;
