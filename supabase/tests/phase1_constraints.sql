begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'member1@example.com', 'test', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'member2@example.com', 'test', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.companies (id, legal_name, country_code)
values ('00000000-0000-0000-0000-000000000201', 'TEST COMPANY', 'SG');

insert into public.brands (id, company_id, brand_code, name_en)
values ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'TEST', 'Test Brand');

insert into public.membership_plans (id, brand_id, plan_code, name, price, duration_days)
values ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', 'TEST60', 'Test Plan', 39.90, 60);

insert into public.customers (id, auth_user_id, customer_no, primary_mobile_raw, primary_email_raw)
values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000101', 'CUST1', '91234567', 'member1@example.com'),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000102', 'CUST2', '+6591234568', 'member2@example.com');

insert into public.customer_memberships (customer_id, brand_id, membership_plan_id, membership_no, status, starts_at, expires_at)
values ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000401', 'M1', 'active', now(), now() + interval '60 days');

do $$
begin
  begin
    insert into public.customer_memberships (customer_id, brand_id, membership_plan_id, membership_no, status, starts_at, expires_at)
    values ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000401', 'M2', 'active', now(), now() + interval '60 days');
    raise exception 'Expected duplicate active membership constraint to fail';
  exception when unique_violation then
    null;
  end;
end;
$$;

insert into public.referral_codes (id, customer_id, brand_id, code, referral_url, qr_payload)
values ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000301', 'REF1', 'https://example.test/ref/REF1', 'https://example.test/ref/REF1');

do $$
begin
  begin
    insert into public.referrals (brand_id, referrer_customer_id, referred_customer_id, referral_code_id)
    values ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000601');
    raise exception 'Expected self-referral constraint to fail';
  exception when check_violation then
    null;
  end;
end;
$$;

insert into public.points_accounts (id, customer_id, brand_id, points_currency_code, account_no)
values ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000301', 'QYJ_POINTS', 'PA1');

do $$
begin
  begin
    insert into public.points_transactions (points_account_id, transaction_type, points_delta, balance_after, description, idempotency_key)
    values ('00000000-0000-0000-0000-000000000701', 'redemption', -1, -1, 'Invalid negative balance', 'negative-test');
    raise exception 'Expected negative balance constraint to fail';
  exception when check_violation then
    null;
  end;
end;
$$;

rollback;
