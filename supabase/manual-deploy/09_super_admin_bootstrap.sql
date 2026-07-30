-- Qing Yun Jian first Super Admin bootstrap.
-- Run only after creating the admin Auth user in Supabase Authentication.
--
-- Do not place a password in this file.
-- Before running, replace REPLACE_WITH_ADMIN_BOOTSTRAP_EMAIL with the value from
-- local .env.local ADMIN_BOOTSTRAP_EMAIL.

begin;

do $$
declare
  admin_email_value text := 'REPLACE_WITH_ADMIN_BOOTSTRAP_EMAIL';
  admin_auth_user_id uuid;
  company_id_value uuid;
  staff_user_id_value uuid;
  super_admin_role_id uuid;
  assignment_id_value uuid;
begin
  if admin_email_value = 'REPLACE_WITH_ADMIN_BOOTSTRAP_EMAIL' then
    raise exception 'Replace admin_email_value with ADMIN_BOOTSTRAP_EMAIL before running this bootstrap script';
  end if;

  select id
    into admin_auth_user_id
  from auth.users
  where lower(email) = lower(admin_email_value)
  order by created_at desc
  limit 1;

  if admin_auth_user_id is null then
    raise exception 'No Supabase Auth user found for ADMIN_BOOTSTRAP_EMAIL: %', admin_email_value;
  end if;

  select id
    into company_id_value
  from public.companies
  where legal_name = 'TCM AND HEALTHCARE COLLEGE PTE LTD'
    and status = 'active';

  if company_id_value is null then
    raise exception 'Active company not found';
  end if;

  select id
    into super_admin_role_id
  from public.roles
  where role_code = 'super_admin'
    and status = 'active';

  if super_admin_role_id is null then
    raise exception 'Active super_admin role not found';
  end if;

  insert into public.staff_users (
    auth_user_id,
    staff_no,
    full_name,
    email_raw,
    created_by,
    updated_by
  )
  values (
    admin_auth_user_id,
    'QYJSA001',
    'Qing Yun Jian Super Admin',
    admin_email_value,
    admin_auth_user_id,
    admin_auth_user_id
  )
  on conflict (auth_user_id) do update
    set email_raw = excluded.email_raw,
        updated_by = admin_auth_user_id,
        updated_at = now()
  returning id into staff_user_id_value;

  select id
    into assignment_id_value
  from public.staff_role_assignments
  where staff_user_id = staff_user_id_value
    and role_id = super_admin_role_id
    and scope_type = 'company'
    and company_id = company_id_value
    and brand_id is null
    and store_id is null
    and status = 'active';

  if assignment_id_value is null then
    insert into public.staff_role_assignments (
      staff_user_id,
      role_id,
      scope_type,
      company_id,
      created_by,
      updated_by
    )
    values (
      staff_user_id_value,
      super_admin_role_id,
      'company',
      company_id_value,
      admin_auth_user_id,
      admin_auth_user_id
    );
  end if;

  raise notice 'Super Admin bootstrap complete for %', admin_email_value;
end;
$$;

commit;
