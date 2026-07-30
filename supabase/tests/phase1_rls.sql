begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'rls1@example.com', 'test', now(), '{}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'rls2@example.com', 'test', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.companies (id, legal_name, country_code)
values ('10000000-0000-0000-0000-000000000201', 'RLS COMPANY', 'SG');

insert into public.brands (id, company_id, brand_code, name_en)
values ('10000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000201', 'RLS', 'RLS Brand');

insert into public.membership_plans (id, brand_id, plan_code, name, price, duration_days)
values ('10000000-0000-0000-0000-000000000401', '10000000-0000-0000-0000-000000000301', 'RLS60', 'RLS Plan', 39.90, 60);

insert into public.customers (id, auth_user_id, customer_no, primary_mobile_raw, primary_email_raw)
values
  ('10000000-0000-0000-0000-000000000501', '10000000-0000-0000-0000-000000000101', 'RLSCUST1', '91234567', 'rls1@example.com'),
  ('10000000-0000-0000-0000-000000000502', '10000000-0000-0000-0000-000000000102', 'RLSCUST2', '91234568', 'rls2@example.com');

insert into public.customer_memberships (customer_id, brand_id, membership_plan_id, membership_no, status)
values
  ('10000000-0000-0000-0000-000000000501', '10000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000401', 'RLSM1', 'pending'),
  ('10000000-0000-0000-0000-000000000502', '10000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000401', 'RLSM2', 'pending');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000101', true);

do $$
begin
  if not exists (select 1 from public.customers where id = '10000000-0000-0000-0000-000000000501') then
    raise exception 'RLS should allow customer to read own customer row';
  end if;

  if exists (select 1 from public.customers where id = '10000000-0000-0000-0000-000000000502') then
    raise exception 'RLS should block customer from reading another customer row';
  end if;

  if exists (select 1 from public.customer_memberships where customer_id = '10000000-0000-0000-0000-000000000502') then
    raise exception 'RLS should block customer from reading another customer membership';
  end if;
end;
$$;

rollback;
