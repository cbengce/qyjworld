-- Qing Yun Jian Phase 1 RLS tests.
-- Development-only. Runs inside a transaction and rolls back all test data.
--
-- Supabase SQL Editor usually runs with elevated database privileges.
-- This script creates temporary auth users, switches to the authenticated role
-- with request.jwt.claim.sub set, and verifies RLS-visible rows.

begin;

create temporary table qyj_rls_test_ids (
  key text primary key,
  id_value uuid not null
) on commit drop;
grant select on qyj_rls_test_ids to authenticated;

do $$
declare
  company_id_value uuid := gen_random_uuid();
  brand_id_value uuid := gen_random_uuid();
  other_brand_id_value uuid := gen_random_uuid();
  store_id_value uuid := gen_random_uuid();
  other_store_id_value uuid := gen_random_uuid();
  plan_id_value uuid := gen_random_uuid();
  customer_auth_1 uuid := gen_random_uuid();
  customer_auth_2 uuid := gen_random_uuid();
  staff_auth uuid := gen_random_uuid();
  manager_auth uuid := gen_random_uuid();
  super_auth uuid := gen_random_uuid();
  customer_1 uuid := gen_random_uuid();
  customer_2 uuid := gen_random_uuid();
  staff_user_id_value uuid := gen_random_uuid();
  manager_user_id_value uuid := gen_random_uuid();
  super_user_id_value uuid := gen_random_uuid();
begin
  insert into qyj_rls_test_ids (key, id_value)
  values
    ('company_id', company_id_value),
    ('brand_id', brand_id_value),
    ('other_brand_id', other_brand_id_value),
    ('store_id', store_id_value),
    ('other_store_id', other_store_id_value),
    ('plan_id', plan_id_value),
    ('customer_auth_1', customer_auth_1),
    ('customer_auth_2', customer_auth_2),
    ('staff_auth', staff_auth),
    ('manager_auth', manager_auth),
    ('super_auth', super_auth),
    ('customer_1', customer_1),
    ('customer_2', customer_2),
    ('staff_user_id', staff_user_id_value),
    ('manager_user_id', manager_user_id_value),
    ('super_user_id', super_user_id_value);

  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (customer_auth_1, 'authenticated', 'authenticated', 'rls-customer-1@example.test', 'test', now(), '{}', '{}', now(), now()),
    (customer_auth_2, 'authenticated', 'authenticated', 'rls-customer-2@example.test', 'test', now(), '{}', '{}', now(), now()),
    (staff_auth, 'authenticated', 'authenticated', 'rls-staff@example.test', 'test', now(), '{}', '{}', now(), now()),
    (manager_auth, 'authenticated', 'authenticated', 'rls-manager@example.test', 'test', now(), '{}', '{}', now(), now()),
    (super_auth, 'authenticated', 'authenticated', 'rls-super@example.test', 'test', now(), '{}', '{}', now(), now());

  insert into public.companies (id, legal_name, country_code)
  values (company_id_value, 'QYJ RLS TEST COMPANY', 'SG');

  insert into public.brands (id, company_id, brand_code, name_en)
  values
    (brand_id_value, company_id_value, 'RLSA', 'RLS Brand A'),
    (other_brand_id_value, company_id_value, 'RLSB', 'RLS Brand B');

  insert into public.stores (id, brand_id, store_code, name, address_line_1)
  values
    (store_id_value, brand_id_value, 'RLSSTOREA', 'RLS Store A', 'RLS Address A'),
    (other_store_id_value, other_brand_id_value, 'RLSSTOREB', 'RLS Store B', 'RLS Address B');

  insert into public.membership_plans (id, brand_id, plan_code, name, price, duration_days)
  values (plan_id_value, brand_id_value, 'RLS60', 'RLS 60 Day Plan', 39.90, 60);

  insert into public.customers (id, auth_user_id, customer_no, primary_mobile_raw, primary_email_raw)
  values
    (customer_1, customer_auth_1, 'RLS-CUST-1', '+6592000001', 'rls-customer-1@example.test'),
    (customer_2, customer_auth_2, 'RLS-CUST-2', '+6592000002', 'rls-customer-2@example.test');

  insert into public.customer_profiles (customer_id, full_name)
  values (customer_1, 'RLS Customer One'), (customer_2, 'RLS Customer Two');

  insert into public.customer_memberships (customer_id, brand_id, membership_plan_id, membership_no, status)
  values
    (customer_1, brand_id_value, plan_id_value, 'RLS-MEMBER-1', 'pending'),
    (customer_2, brand_id_value, plan_id_value, 'RLS-MEMBER-2', 'pending');

  insert into public.points_accounts (customer_id, brand_id, points_currency_code, account_no)
  values
    (customer_1, brand_id_value, 'QYJ_POINTS', 'RLS-POINTS-1'),
    (customer_2, brand_id_value, 'QYJ_POINTS', 'RLS-POINTS-2');

  insert into public.referral_codes (customer_id, brand_id, code, referral_url, qr_payload)
  values
    (customer_1, brand_id_value, 'RLSREF1', 'https://example.test/ref/RLSREF1', 'https://example.test/ref/RLSREF1'),
    (customer_2, brand_id_value, 'RLSREF2', 'https://example.test/ref/RLSREF2', 'https://example.test/ref/RLSREF2');

  insert into public.staff_users (id, auth_user_id, staff_no, full_name, email_raw)
  values
    (staff_user_id_value, staff_auth, 'RLS-STAFF', 'RLS Staff', 'rls-staff@example.test'),
    (manager_user_id_value, manager_auth, 'RLS-MANAGER', 'RLS Manager', 'rls-manager@example.test'),
    (super_user_id_value, super_auth, 'RLS-SUPER', 'RLS Super', 'rls-super@example.test');

  insert into public.staff_role_assignments (staff_user_id, role_id, scope_type, store_id)
  select staff_user_id_value, r.id, 'store', store_id_value from public.roles r where r.role_code = 'staff';

  insert into public.staff_role_assignments (staff_user_id, role_id, scope_type, brand_id)
  select manager_user_id_value, r.id, 'brand', brand_id_value from public.roles r where r.role_code = 'manager';

  insert into public.staff_role_assignments (staff_user_id, role_id, scope_type, company_id)
  select super_user_id_value, r.id, 'company', company_id_value from public.roles r where r.role_code = 'super_admin';
end;
$$;

select set_config('request.jwt.claim.sub', (select id_value::text from qyj_rls_test_ids where key = 'customer_auth_1'), true);
set local role authenticated;

do $$
begin
  if (select count(*) from public.customers where id in (
    (select id_value from qyj_rls_test_ids where key = 'customer_1'),
    (select id_value from qyj_rls_test_ids where key = 'customer_2')
  )) <> 1 then
    raise exception 'Customer RLS failed: customer should see only own customer row';
  end if;
  raise notice 'OK: customer sees only own customer row';

  if (select count(*) from public.customer_memberships) <> 1 then
    raise exception 'Customer RLS failed: customer should see only own membership';
  end if;
  raise notice 'OK: customer sees only own membership';

  if (select count(*) from public.points_accounts) <> 1 then
    raise exception 'Customer RLS failed: customer should see only own points account';
  end if;
  raise notice 'OK: customer sees only own points account';

  if (select count(*) from public.referral_codes) <> 1 then
    raise exception 'Customer RLS failed: customer should see only own referral code';
  end if;
  raise notice 'OK: customer sees only own referral code';
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', (select id_value::text from qyj_rls_test_ids where key = 'staff_auth'), true);
set local role authenticated;

do $$
begin
  if not public.staff_has_permission('points.adjust', null, (select id_value from qyj_rls_test_ids where key = 'store_id'), null) then
    raise exception 'Staff RLS failed: scoped staff should have permitted store points permission';
  end if;
  raise notice 'OK: staff has store-scoped points.adjust permission';

  if public.staff_has_permission('membership.activate', (select id_value from qyj_rls_test_ids where key = 'brand_id'), null, null) then
    raise exception 'Staff RLS failed: staff should not have manager-only activation permission';
  end if;
  raise notice 'OK: staff is rejected for manager-only membership activation';
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', (select id_value::text from qyj_rls_test_ids where key = 'manager_auth'), true);
set local role authenticated;

do $$
begin
  if not public.staff_has_permission('membership.activate', (select id_value from qyj_rls_test_ids where key = 'brand_id'), null, null) then
    raise exception 'Manager RLS failed: manager should activate within scoped brand';
  end if;
  raise notice 'OK: manager can activate membership within scoped brand';

  if public.staff_has_permission('membership.activate', (select id_value from qyj_rls_test_ids where key = 'other_brand_id'), null, null) then
    raise exception 'Manager RLS failed: manager should not activate outside scoped brand';
  end if;
  raise notice 'OK: manager is rejected outside scoped brand';
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', (select id_value::text from qyj_rls_test_ids where key = 'super_auth'), true);
set local role authenticated;

do $$
begin
  if not public.staff_has_permission('staff.manage', null, null, (select id_value from qyj_rls_test_ids where key = 'company_id')) then
    raise exception 'Super Admin RLS failed: super admin should manage company-scoped staff roles';
  end if;
  raise notice 'OK: super admin company scope behaves as expected';
end;
$$;

reset role;
rollback;
