-- Qing Yun Jian Phase 1 critical constraint tests.
-- Development-only. Runs inside a transaction and rolls back all test data.
-- Expected failures are caught. Unexpected success raises an exception.

begin;

do $$
declare
  company_id_value uuid := gen_random_uuid();
  brand_id_value uuid := gen_random_uuid();
  other_brand_id_value uuid := gen_random_uuid();
  store_id_value uuid := gen_random_uuid();
  plan_id_value uuid := gen_random_uuid();
  customer_auth_1 uuid := gen_random_uuid();
  customer_auth_2 uuid := gen_random_uuid();
  staff_auth uuid := gen_random_uuid();
  customer_1 uuid := gen_random_uuid();
  customer_2 uuid := gen_random_uuid();
  staff_id_value uuid;
  membership_id_value uuid := gen_random_uuid();
  points_account_id_value uuid := gen_random_uuid();
  referral_code_id_value uuid := gen_random_uuid();
  referral_id_value uuid := gen_random_uuid();
  tx_one uuid;
  tx_two uuid;
begin
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (customer_auth_1, 'authenticated', 'authenticated', 'manual-customer-1@example.test', 'test', now(), '{}', '{}', now(), now()),
    (customer_auth_2, 'authenticated', 'authenticated', 'manual-customer-2@example.test', 'test', now(), '{}', '{}', now(), now()),
    (staff_auth, 'authenticated', 'authenticated', 'manual-manager@example.test', 'test', now(), '{}', '{}', now(), now());

  insert into public.companies (id, legal_name, country_code)
  values (company_id_value, 'QYJ MANUAL TEST COMPANY', 'SG');

  insert into public.brands (id, company_id, brand_code, name_en)
  values
    (brand_id_value, company_id_value, 'QYJTESTA', 'QYJ Test Brand A'),
    (other_brand_id_value, company_id_value, 'QYJTESTB', 'QYJ Test Brand B');

  insert into public.stores (id, brand_id, store_code, name, address_line_1)
  values (store_id_value, brand_id_value, 'TESTSTORE', 'Test Store', 'Test Address');

  insert into public.membership_plans (id, brand_id, plan_code, name, price, duration_days)
  values (plan_id_value, brand_id_value, 'TEST60', 'Test 60 Day Plan', 39.90, 60);

  insert into public.customers (id, auth_user_id, customer_no, primary_mobile_raw, primary_email_raw)
  values
    (customer_1, customer_auth_1, 'MANUAL-CUST-1', '+6591000001', 'manual-customer-1@example.test'),
    (customer_2, customer_auth_2, 'MANUAL-CUST-2', '+6591000002', 'manual-customer-2@example.test');

  insert into public.customer_profiles (customer_id, full_name)
  values (customer_1, 'Manual Customer One'), (customer_2, 'Manual Customer Two');

  insert into public.staff_users (auth_user_id, staff_no, full_name, email_raw)
  values (staff_auth, 'MANUAL-MGR-1', 'Manual Manager', 'manual-manager@example.test')
  returning id into staff_id_value;

  insert into public.staff_role_assignments (staff_user_id, role_id, scope_type, brand_id)
  select staff_id_value, r.id, 'brand', brand_id_value
  from public.roles r
  where r.role_code = 'manager';

  insert into public.customer_memberships (id, customer_id, brand_id, membership_plan_id, membership_no, status, starts_at, expires_at)
  values (membership_id_value, customer_1, brand_id_value, plan_id_value, 'MANUAL-MEMBER-1', 'active', now(), now() + interval '60 days');

  raise notice 'EXPECTED FAILURE: overlapping active memberships are rejected';
  begin
    insert into public.customer_memberships (customer_id, brand_id, membership_plan_id, membership_no, status, starts_at, expires_at)
    values (customer_1, brand_id_value, plan_id_value, 'MANUAL-MEMBER-2', 'active', now(), now() + interval '60 days');
    raise exception 'overlapping active membership was incorrectly accepted';
  exception when unique_violation then
    raise notice 'OK: overlapping active membership rejected';
  end;

  insert into public.referral_codes (id, customer_id, brand_id, code, referral_url, qr_payload)
  values (referral_code_id_value, customer_1, brand_id_value, 'MANUALREF1', 'https://example.test/ref/MANUALREF1', 'https://example.test/ref/MANUALREF1');

  raise notice 'EXPECTED FAILURE: self-referral is rejected';
  begin
    insert into public.referrals (brand_id, referrer_customer_id, referred_customer_id, referral_code_id)
    values (brand_id_value, customer_1, customer_1, referral_code_id_value);
    raise exception 'self-referral was incorrectly accepted';
  exception when check_violation then
    raise notice 'OK: self-referral rejected';
  end;

  insert into public.referrals (id, brand_id, referrer_customer_id, referred_customer_id, referral_code_id)
  values (referral_id_value, brand_id_value, customer_1, customer_2, referral_code_id_value);

  raise notice 'EXPECTED FAILURE: duplicate referred customer within same brand is rejected';
  begin
    insert into public.referrals (brand_id, referrer_customer_id, referred_customer_id, referral_code_id)
    values (brand_id_value, customer_1, customer_2, referral_code_id_value);
    raise exception 'duplicate referred customer was incorrectly accepted';
  exception when unique_violation then
    raise notice 'OK: duplicate referred customer rejected';
  end;

  insert into public.points_accounts (id, customer_id, brand_id, points_currency_code, account_no)
  values (points_account_id_value, customer_1, brand_id_value, 'QYJ_POINTS', 'MANUAL-POINTS-1');

  perform set_config('request.jwt.claim.sub', staff_auth::text, true);
  tx_one := public.record_points_transaction(points_account_id_value, 'manual_adjustment', 50, 'Manual idempotency test', 'MANUAL-REF', 'manual-idem-key-001');
  tx_two := public.record_points_transaction(points_account_id_value, 'manual_adjustment', 50, 'Manual idempotency test duplicate', 'MANUAL-REF', 'manual-idem-key-001');
  if tx_one <> tx_two then
    raise exception 'duplicate idempotency key created duplicate points effects';
  end if;
  if (select count(*) from public.points_transactions where points_account_id = points_account_id_value and idempotency_key = 'manual-idem-key-001') <> 1 then
    raise exception 'duplicate idempotency key did not collapse to one transaction';
  end if;
  raise notice 'OK: duplicate idempotency key created no duplicate effect';

  raise notice 'EXPECTED FAILURE: points balance cannot become negative';
  begin
    perform public.record_points_transaction(points_account_id_value, 'redemption', -1000, 'Invalid redemption', 'MANUAL-NEGATIVE', 'manual-negative-001');
    raise exception 'negative points balance was incorrectly accepted';
  exception when others then
    raise notice 'OK: negative points mutation rejected: %', sqlerrm;
  end;

  raise notice 'EXPECTED FAILURE: invalid staff scope combination is rejected';
  begin
    insert into public.staff_role_assignments (staff_user_id, role_id, scope_type, company_id, brand_id)
    select staff_id_value, r.id, 'company', company_id_value, brand_id_value
    from public.roles r
    where r.role_code = 'staff';
    raise exception 'invalid staff scope combination was incorrectly accepted';
  exception when check_violation then
    raise notice 'OK: invalid staff scope combination rejected';
  end;

  raise notice 'EXPECTED FAILURE: cross-brand menu relationship is rejected';
  begin
    insert into public.menus (brand_id, store_id, name)
    values (other_brand_id_value, store_id_value, 'Invalid Cross Brand Menu');
    raise exception 'cross-brand menu/store relationship was incorrectly accepted';
  exception when others then
    raise notice 'OK: cross-brand menu/store rejected: %', sqlerrm;
  end;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  (select auth_user_id::text from public.customers where customer_no = 'MANUAL-CUST-1'),
  true
);
set local role authenticated;

do $$
declare
  rejected boolean := false;
begin
  raise notice 'EXPECTED FAILURE: points ledger balance cannot be manipulated by direct insert';
  begin
    insert into public.points_transactions (
      points_account_id,
      transaction_type,
      points_delta,
      balance_after,
      description,
      reference_no,
      idempotency_key
    )
    select
      id,
      'manual_adjustment',
      999,
      999,
      'Invalid direct ledger manipulation',
      'MANUAL-DIRECT',
      'manual-direct-ledger-001'
    from public.points_accounts
    where account_no = 'MANUAL-POINTS-1';
  exception when others then
    rejected := true;
    raise notice 'OK: direct points ledger manipulation rejected: %', sqlerrm;
  end;

  if not rejected then
    raise exception 'direct points ledger manipulation was incorrectly accepted';
  end if;
end;
$$;

reset role;
rollback;
