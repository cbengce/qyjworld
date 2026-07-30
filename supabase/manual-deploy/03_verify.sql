-- Qing Yun Jian Phase 1 manual verification.
-- Read-only: this file must not modify data.

select 'expected_tables' as check_name, count(*) as found_count
from information_schema.tables
where table_schema = 'public'
  and table_name = any(array[
    'companies','brands','stores','customers','customer_profiles','customer_consents',
    'membership_plans','customer_memberships','membership_events','points_accounts',
    'points_transactions','referral_codes','referrals','referral_rewards','staff_users',
    'roles','permissions','role_permissions','staff_role_assignments','audit_logs',
    'product_categories','products','product_images','menus','menu_items','site_settings'
  ]);

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = any(array[
    'companies','brands','stores','customers','customer_profiles','customer_consents',
    'membership_plans','customer_memberships','membership_events','points_accounts',
    'points_transactions','referral_codes','referrals','referral_rewards','staff_users',
    'roles','permissions','role_permissions','staff_role_assignments','audit_logs',
    'product_categories','products','product_images','menus','menu_items','site_settings'
  ])
order by table_name;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = any(array[
    'activate_membership','assign_staff_role','confirm_referral_reward','current_customer_id',
    'current_staff_user_id','extend_membership','record_points_transaction',
    'register_member_profile','renew_membership','reverse_points_transaction',
    'staff_has_permission','suspend_membership','write_audit'
  ])
order by routine_name;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = any(array[
    'customers','customer_profiles','customer_consents','customer_memberships',
    'membership_events','points_accounts','points_transactions','referral_codes',
    'referrals','referral_rewards','staff_users','staff_role_assignments','audit_logs'
  ])
order by tablename;

select legal_name, country_code, status
from public.companies
where legal_name = 'TCM AND HEALTHCARE COLLEGE PTE LTD';

select b.brand_code, b.name_en, b.name_zh, b.tagline, b.core_line
from public.brands b
where b.brand_code = 'QYJ';

select s.store_code, s.name, s.address_line_1, s.address_line_2, s.postal_code
from public.stores s
join public.brands b on b.id = s.brand_id
where b.brand_code = 'QYJ';

select mp.plan_code, mp.name, mp.price, mp.currency_code, mp.duration_days
from public.membership_plans mp
join public.brands b on b.id = mp.brand_id
where b.brand_code = 'QYJ';

select role_code, name
from public.roles
order by role_code;

select permission_code
from public.permissions
order by permission_code;

select r.role_code, count(rp.permission_id) as permission_count
from public.roles r
left join public.role_permissions rp on rp.role_id = r.id
group by r.role_code
order by r.role_code;
