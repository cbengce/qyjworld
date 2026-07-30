do $$
declare
  company_id_value uuid := '11111111-1111-1111-1111-111111111111';
  brand_id_value uuid := '22222222-2222-2222-2222-222222222222';
  permission_code_value text;
  permission_codes text[] := array[
    'member.read','member.update','membership.read','membership.activate','membership.suspend',
    'membership.renew','membership.extend','points.read','points.adjust','points.reverse',
    'referral.read','referral.reward.confirm','menu.read','menu.manage','reports.export',
    'staff.manage','settings.manage','audit.read'
  ];
begin
  insert into public.companies (id, legal_name, registration_no, country_code)
  values (company_id_value, 'TCM AND HEALTHCARE COLLEGE PTE LTD', null, 'SG')
  on conflict (id) do update
  set legal_name = excluded.legal_name,
      country_code = excluded.country_code;

  insert into public.brands (id, company_id, brand_code, name_en, name_zh, tagline, core_line)
  values (brand_id_value, company_id_value, 'QYJ', 'Qing Yun Jian', '青云间', 'Born to Ascend', 'Sparkling Tea Reimagined')
  on conflict (id) do update
  set name_en = excluded.name_en,
      name_zh = excluded.name_zh,
      tagline = excluded.tagline,
      core_line = excluded.core_line;

  insert into public.stores (brand_id, store_code, name, address_line_1, address_line_2, city, country_code, postal_code, timezone, currency_code)
  values (brand_id_value, 'QYJ-MPM-001', 'MacPherson Mall', '401 MacPherson Road', 'MacPherson Mall', 'Singapore', 'SG', '368125', 'Asia/Singapore', 'SGD')
  on conflict (brand_id, store_code) do update
  set name = excluded.name,
      address_line_1 = excluded.address_line_1,
      address_line_2 = excluded.address_line_2,
      postal_code = excluded.postal_code;

  insert into public.membership_plans (brand_id, plan_code, name, price, currency_code, duration_days)
  values (brand_id_value, 'QYJ-60D-SOFT-LAUNCH', 'Qing Yun Jian 60-Day Membership', 39.90, 'SGD', 60)
  on conflict (brand_id, plan_code) do update
  set name = excluded.name,
      price = excluded.price,
      currency_code = excluded.currency_code,
      duration_days = excluded.duration_days;

  foreach permission_code_value in array permission_codes loop
    insert into public.permissions (permission_code, description)
    values (permission_code_value, replace(permission_code_value, '.', ' '))
    on conflict (permission_code) do nothing;
  end loop;

  insert into public.roles (role_code, name, description)
  values
    ('super_admin', 'Super Admin', 'Full company-level access'),
    ('manager', 'Manager', 'Brand or store management access'),
    ('staff', 'Staff', 'Store operations access')
  on conflict (role_code) do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id from public.roles r cross join public.permissions p
  where r.role_code = 'super_admin'
  on conflict (role_id, permission_id) do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id
  from public.roles r
  join public.permissions p on p.permission_code = any(array[
    'member.read','member.update','membership.read','membership.activate','membership.suspend',
    'membership.renew','membership.extend','points.read','points.adjust','points.reverse',
    'referral.read','referral.reward.confirm','menu.read','menu.manage','reports.export','audit.read'
  ])
  where r.role_code = 'manager'
  on conflict (role_id, permission_id) do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id
  from public.roles r
  join public.permissions p on p.permission_code = any(array[
    'member.read','membership.read','points.read','points.adjust','referral.read','menu.read'
  ])
  where r.role_code = 'staff'
  on conflict (role_id, permission_id) do nothing;

  insert into public.site_settings (brand_id, key, value_json, description)
  values
    (brand_id_value, 'membership.default_fee', '{"amount":39.90,"currency":"SGD"}', 'Soft-launch membership fee'),
    (brand_id_value, 'membership.default_duration_days', '60', 'Soft-launch membership duration from manual activation'),
    (brand_id_value, 'payment.phase1_mode', '{"mode":"manual_confirmation","live_payment":false}', 'Phase 1 payment is manually confirmed by staff'),
    (brand_id_value, 'legal.consent_versions', '{"membership_terms":"membership-terms-v1","privacy_policy":"privacy-policy-v1","marketing":"marketing-v1"}', 'Consent document versions used during registration')
  on conflict (brand_id, key) do update
  set value_json = excluded.value_json,
      description = excluded.description,
      updated_at = now();
end;
$$;
