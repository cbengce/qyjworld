-- Qing Yun Jian Phase 1 privilege patch.
-- Offline/manual deployment patch. Rerunnable.
--
-- Why this exists:
-- PostgreSQL table privileges are checked before RLS policies. A role must have
-- base SELECT/EXECUTE permission first; RLS then limits which rows are visible.
-- This patch keeps RLS enabled and grants only the Phase 1 privileges needed by
-- the application and approved SECURITY DEFINER RPC functions.

begin;

-- Keep the public schema callable through Supabase roles, but remove unsafe
-- default object privileges from PUBLIC.
revoke all on schema public from public;
grant usage on schema public to anon, authenticated, service_role;

revoke all on all tables in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Public read-only surfaces for the website.
grant select on table
  public.companies,
  public.brands,
  public.stores,
  public.membership_plans,
  public.product_categories,
  public.products,
  public.product_images,
  public.menus,
  public.menu_items,
  public.site_settings
to anon;

-- Authenticated members and staff can SELECT these tables. RLS policies decide
-- whether each row is visible. No direct INSERT/UPDATE/DELETE is granted here.
grant select on table
  public.companies,
  public.brands,
  public.stores,
  public.customers,
  public.customer_profiles,
  public.customer_consents,
  public.membership_plans,
  public.customer_memberships,
  public.membership_events,
  public.points_accounts,
  public.points_transactions,
  public.referral_codes,
  public.referrals,
  public.referral_rewards,
  public.staff_users,
  public.roles,
  public.permissions,
  public.role_permissions,
  public.staff_role_assignments,
  public.product_categories,
  public.products,
  public.product_images,
  public.menus,
  public.menu_items,
  public.site_settings
to authenticated;

-- Do not expose audit rows through direct client table access. Audit writes are
-- performed only inside approved SECURITY DEFINER functions.
revoke all on table public.audit_logs from anon, authenticated;

-- The service role is server-only. Give it full table privileges so server-side
-- maintenance and approved service operations continue to work.
grant select, insert, update, delete on all tables in schema public to service_role;

-- There are no serial identity columns in the approved Phase 1 schema today,
-- but keep this rerunnable and future-safe for any sequence-backed objects.
grant usage, select on all sequences in schema public to service_role;
revoke all on all sequences in schema public from public, anon, authenticated;

-- Helper functions used by RLS policies and auth-aware application reads.
grant execute on function public.current_customer_id() to anon, authenticated, service_role;
grant execute on function public.current_staff_user_id() to anon, authenticated, service_role;
grant execute on function public.staff_has_permission(text, uuid, uuid, uuid) to anon, authenticated, service_role;

-- Registration is intentionally server-only in the current application because
-- it is called after service-role auth.admin.createUser().
grant execute on function public.register_member_profile(
  uuid,
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  boolean,
  text
) to service_role;

-- Approved staff/manager/super-admin RPCs. These remain SECURITY DEFINER and
-- enforce business permissions internally with staff_has_permission().
grant execute on function public.activate_membership(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.renew_membership(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.suspend_membership(uuid, text, text) to authenticated, service_role;
grant execute on function public.extend_membership(uuid, integer, text, text) to authenticated, service_role;
grant execute on function public.record_points_transaction(uuid, public.points_transaction_type, integer, text, text, text) to authenticated, service_role;
grant execute on function public.reverse_points_transaction(uuid, text, text) to authenticated, service_role;
grant execute on function public.confirm_referral_reward(uuid, text, integer, text) to authenticated, service_role;
grant execute on function public.assign_staff_role(uuid, text, public.role_scope_type, uuid, uuid, uuid, text) to authenticated, service_role;

-- Explicitly keep internal helper/trigger/audit functions non-callable by
-- browser roles unless granted above.
revoke execute on function public.write_audit(text, text, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.normalize_email(text) from public, anon, authenticated;
revoke execute on function public.normalize_mobile(text) from public, anon, authenticated;
revoke execute on function public.validate_referral_brand() from public, anon, authenticated;
revoke execute on function public.validate_staff_role_scope_hierarchy() from public, anon, authenticated;
revoke execute on function public.validate_menu_brand_integrity() from public, anon, authenticated;
revoke execute on function public.validate_menu_store_brand() from public, anon, authenticated;
revoke execute on function public.validate_product_category_brand() from public, anon, authenticated;
revoke execute on function public.make_customer_no() from public, anon, authenticated;
revoke execute on function public.make_membership_no() from public, anon, authenticated;
revoke execute on function public.make_points_account_no() from public, anon, authenticated;
revoke execute on function public.make_referral_code() from public, anon, authenticated;

-- Verify RLS remains enabled on protected tables.
do $$
declare
  disabled_tables text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into disabled_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array[
      'customers',
      'customer_profiles',
      'customer_consents',
      'customer_memberships',
      'membership_events',
      'points_accounts',
      'points_transactions',
      'referral_codes',
      'referrals',
      'referral_rewards',
      'staff_users',
      'roles',
      'permissions',
      'role_permissions',
      'staff_role_assignments',
      'audit_logs',
      'product_categories',
      'products',
      'product_images',
      'menus',
      'menu_items',
      'site_settings'
    ])
    and not c.relrowsecurity;

  if disabled_tables is not null then
    raise exception 'RLS is disabled on protected tables: %', disabled_tables;
  end if;
end;
$$;

commit;
