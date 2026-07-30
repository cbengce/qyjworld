-- Qing Yun Jian Phase 1 privilege verification.
-- Read-only. Reports effective grants for anon/authenticated/service_role.

with phase1_tables(table_name) as (
  values
    ('companies'),
    ('brands'),
    ('stores'),
    ('customers'),
    ('customer_profiles'),
    ('customer_consents'),
    ('membership_plans'),
    ('customer_memberships'),
    ('membership_events'),
    ('points_accounts'),
    ('points_transactions'),
    ('referral_codes'),
    ('referrals'),
    ('referral_rewards'),
    ('staff_users'),
    ('roles'),
    ('permissions'),
    ('role_permissions'),
    ('staff_role_assignments'),
    ('audit_logs'),
    ('product_categories'),
    ('products'),
    ('product_images'),
    ('menus'),
    ('menu_items'),
    ('site_settings')
),
checked_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
),
privileges(privilege_type) as (
  values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')
)
select
  r.role_name,
  t.table_name,
  p.privilege_type,
  has_table_privilege(r.role_name, format('public.%I', t.table_name), p.privilege_type) as has_privilege
from checked_roles r
cross join phase1_tables t
cross join privileges p
order by r.role_name, t.table_name, p.privilege_type;

with phase1_tables(table_name) as (
  values
    ('companies'),
    ('brands'),
    ('stores'),
    ('customers'),
    ('customer_profiles'),
    ('customer_consents'),
    ('membership_plans'),
    ('customer_memberships'),
    ('membership_events'),
    ('points_accounts'),
    ('points_transactions'),
    ('referral_codes'),
    ('referrals'),
    ('referral_rewards'),
    ('staff_users'),
    ('roles'),
    ('permissions'),
    ('role_permissions'),
    ('staff_role_assignments'),
    ('audit_logs'),
    ('product_categories'),
    ('products'),
    ('product_images'),
    ('menus'),
    ('menu_items'),
    ('site_settings')
)
select
  t.table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from phase1_tables t
join pg_class c on c.relname = t.table_name
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
order by t.table_name;

with approved_functions(function_identity) as (
  values
    ('public.current_customer_id()'),
    ('public.current_staff_user_id()'),
    ('public.staff_has_permission(text,uuid,uuid,uuid)'),
    ('public.register_member_profile(uuid,text,text,text,text,date,text,text,text,boolean,text)'),
    ('public.activate_membership(uuid,uuid,text,text)'),
    ('public.renew_membership(uuid,uuid,text,text)'),
    ('public.suspend_membership(uuid,text,text)'),
    ('public.extend_membership(uuid,integer,text,text)'),
    ('public.record_points_transaction(uuid,public.points_transaction_type,integer,text,text,text)'),
    ('public.reverse_points_transaction(uuid,text,text)'),
    ('public.confirm_referral_reward(uuid,text,integer,text)'),
    ('public.assign_staff_role(uuid,text,public.role_scope_type,uuid,uuid,uuid,text)')
),
checked_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
)
select
  r.role_name,
  f.function_identity,
  has_function_privilege(r.role_name, f.function_identity, 'EXECUTE') as has_execute
from checked_roles r
cross join approved_functions f
order by r.role_name, f.function_identity;

select
  'audit_logs_authenticated_select' as check_name,
  has_table_privilege('authenticated', 'public.audit_logs', 'SELECT') as has_privilege,
  'expected false; audit access must not be direct browser-table access' as expectation;
