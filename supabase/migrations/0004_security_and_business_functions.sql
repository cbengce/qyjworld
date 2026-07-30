create or replace function public.current_customer_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.customers where auth_user_id = auth.uid() and status <> 'deleted' limit 1;
$$;

create or replace function public.current_staff_user_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.staff_users where auth_user_id = auth.uid() and status = 'active' limit 1;
$$;

create or replace function public.staff_has_permission(
  permission_code_value text,
  brand_id_value uuid default null,
  store_id_value uuid default null,
  company_id_value uuid default null
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with current_staff as (
    select public.current_staff_user_id() as staff_id
  ),
  desired_scope as (
    select
      coalesce(company_id_value, b.company_id, sb.company_id) as company_id,
      coalesce(brand_id_value, s.brand_id) as brand_id,
      store_id_value as store_id
    from (select 1) one
    left join public.brands b on b.id = brand_id_value
    left join public.stores s on s.id = store_id_value
    left join public.brands sb on sb.id = s.brand_id
  )
  select exists (
    select 1
    from public.staff_role_assignments sra
    join public.roles r on r.id = sra.role_id and r.status = 'active'
    join public.role_permissions rp on rp.role_id = r.id and rp.status = 'active'
    join public.permissions p on p.id = rp.permission_id and p.status = 'active'
    cross join current_staff cs
    cross join desired_scope ds
    where sra.staff_user_id = cs.staff_id
      and sra.status = 'active'
      and p.permission_code = permission_code_value
      and (
        r.role_code = 'super_admin'
        or (sra.scope_type = 'company' and sra.company_id = ds.company_id)
        or (sra.scope_type = 'brand' and sra.brand_id = ds.brand_id)
        or (sra.scope_type = 'store' and sra.store_id = ds.store_id)
      )
  );
$$;

create or replace function public.write_audit(
  action_value text,
  entity_type_value text,
  entity_id_value uuid,
  idempotency_key_value text,
  metadata_value jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    actor_staff_user_id, action, entity_type, entity_id, idempotency_key, metadata, created_by
  )
  values (
    public.current_staff_user_id(), action_value, entity_type_value, entity_id_value,
    idempotency_key_value, coalesce(metadata_value, '{}'), auth.uid()
  );
end;
$$;

create or replace function public.make_customer_no()
returns text language sql volatile set search_path = public, extensions as $$
  select 'QYJC' || to_char(now(), 'YYMM') || upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 10));
$$;

create or replace function public.make_membership_no()
returns text language sql volatile set search_path = public, extensions as $$
  select 'QYJM' || to_char(now(), 'YYMM') || upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 10));
$$;

create or replace function public.make_points_account_no()
returns text language sql volatile set search_path = public, extensions as $$
  select 'QYJP' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 12));
$$;

create or replace function public.make_referral_code()
returns text language sql volatile set search_path = public, extensions as $$
  select 'QYJ-' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 8));
$$;

create or replace function public.register_member_profile(
  new_auth_user_id uuid,
  brand_code_value text,
  full_name_value text,
  mobile_value text,
  email_value text,
  date_of_birth_value date,
  referral_code_value text,
  terms_version_value text,
  privacy_version_value text,
  marketing_consent_value boolean,
  source_value text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  brand_record public.brands%rowtype;
  plan_record public.membership_plans%rowtype;
  new_customer_id uuid;
  new_referral_code_id uuid;
  ref_code public.referral_codes%rowtype;
begin
  select * into brand_record from public.brands where brand_code = brand_code_value and status = 'active';
  if brand_record.id is null then
    raise exception 'Active brand not found';
  end if;

  select * into plan_record
  from public.membership_plans
  where brand_id = brand_record.id and status = 'active'
  order by created_at asc
  limit 1;
  if plan_record.id is null then
    raise exception 'Active membership plan not found';
  end if;

  insert into public.customers (
    auth_user_id, customer_no, primary_mobile_raw, primary_email_raw, created_by
  )
  values (
    new_auth_user_id, public.make_customer_no(), mobile_value, email_value, new_auth_user_id
  )
  returning id into new_customer_id;

  insert into public.customer_profiles (customer_id, full_name, date_of_birth, created_by)
  values (new_customer_id, full_name_value, date_of_birth_value, new_auth_user_id);

  insert into public.customer_consents (customer_id, consent_type, consent_document_version, accepted_at, source, created_by)
  values
    (new_customer_id, 'membership_terms', terms_version_value, now(), source_value, new_auth_user_id),
    (new_customer_id, 'privacy_policy', privacy_version_value, now(), source_value, new_auth_user_id);

  if marketing_consent_value then
    insert into public.customer_consents (customer_id, consent_type, consent_document_version, accepted_at, source, created_by)
    values (new_customer_id, 'marketing', 'marketing-v1', now(), source_value, new_auth_user_id);
  end if;

  insert into public.customer_memberships (
    customer_id, brand_id, membership_plan_id, membership_no, status, created_by
  )
  values (
    new_customer_id, brand_record.id, plan_record.id, public.make_membership_no(), 'pending', new_auth_user_id
  );

  insert into public.points_accounts (
    customer_id, brand_id, points_currency_code, account_no, created_by
  )
  values (
    new_customer_id, brand_record.id, 'QYJ_POINTS', public.make_points_account_no(), new_auth_user_id
  );

  insert into public.referral_codes (
    customer_id, brand_id, code, referral_url, qr_payload, created_by
  )
  values (
    new_customer_id,
    brand_record.id,
    public.make_referral_code(),
    'https://www.qyjworld.com/en/register?ref=' || new_customer_id::text,
    'QYJ_MEMBER:' || new_customer_id::text,
    new_auth_user_id
  )
  returning id into new_referral_code_id;

  update public.referral_codes
  set referral_url = 'https://www.qyjworld.com/en/register?ref=' || code,
      qr_payload = 'https://www.qyjworld.com/en/register?ref=' || code
  where id = new_referral_code_id;

  if referral_code_value is not null and length(trim(referral_code_value)) > 0 then
    select * into ref_code
    from public.referral_codes
    where brand_id = brand_record.id and code = trim(referral_code_value) and status = 'active';

    if ref_code.id is not null and ref_code.customer_id <> new_customer_id then
      insert into public.referrals (
        brand_id, referrer_customer_id, referred_customer_id, referral_code_id, created_by
      )
      values (
        brand_record.id, ref_code.customer_id, new_customer_id, ref_code.id, new_auth_user_id
      );
    end if;
  end if;

  return new_customer_id;
end;
$$;

create or replace function public.activate_membership(
  target_customer_id uuid,
  target_brand_id uuid,
  idempotency_key_value text,
  reference_no_value text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_record public.customer_memberships%rowtype;
  staff_id uuid := public.current_staff_user_id();
  plan_duration integer;
begin
  if idempotency_key_value is null or length(idempotency_key_value) < 8 then
    raise exception 'Valid idempotency key required';
  end if;

  if not public.staff_has_permission('membership.activate', target_brand_id, null, null) then
    raise exception 'Insufficient permission';
  end if;

  select cm.* into membership_record
  from public.customer_memberships cm
  where cm.customer_id = target_customer_id
    and cm.brand_id = target_brand_id
    and cm.status = 'pending'
  order by cm.created_at asc
  limit 1
  for update;

  if membership_record.id is null then
    select cm.* into membership_record
    from public.customer_memberships cm
    join public.membership_events me on me.customer_membership_id = cm.id
    where cm.customer_id = target_customer_id
      and cm.brand_id = target_brand_id
      and me.idempotency_key = idempotency_key_value
    limit 1;
    if membership_record.id is not null then
      return membership_record.id;
    end if;
    raise exception 'Pending membership not found';
  end if;

  select duration_days into plan_duration from public.membership_plans where id = membership_record.membership_plan_id;

  update public.customer_memberships
  set status = 'active',
      activated_at = now(),
      starts_at = now(),
      expires_at = now() + make_interval(days => plan_duration),
      activated_by_staff_user_id = staff_id,
      activation_reference = reference_no_value,
      updated_by = auth.uid()
  where id = membership_record.id;

  insert into public.membership_events (
    customer_membership_id, event_type, staff_user_id, reason, reference_no, idempotency_key, created_by
  )
  values (
    membership_record.id, 'activated', staff_id, 'Manual payment confirmation', reference_no_value,
    idempotency_key_value, auth.uid()
  );

  update public.referrals
  set referral_status = 'membership_activated',
      membership_activated_at = now(),
      updated_by = auth.uid()
  where brand_id = target_brand_id and referred_customer_id = target_customer_id;

  perform public.write_audit(
    'membership.activate',
    'customer_memberships',
    membership_record.id,
    idempotency_key_value,
    jsonb_build_object('customer_id', target_customer_id, 'brand_id', target_brand_id, 'reference_no', reference_no_value, 'duration_days', plan_duration)
  );

  return membership_record.id;
end;
$$;

create or replace function public.renew_membership(
  target_customer_id uuid,
  target_brand_id uuid,
  idempotency_key_value text,
  reference_no_value text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_record public.customer_memberships%rowtype;
  plan_duration integer;
  new_start timestamptz;
  new_expiry timestamptz;
  staff_id uuid := public.current_staff_user_id();
begin
  if idempotency_key_value is null or length(idempotency_key_value) < 8 then
    raise exception 'Valid idempotency key required';
  end if;
  if not public.staff_has_permission('membership.renew', target_brand_id, null, null) then
    raise exception 'Insufficient permission';
  end if;

  select cm.* into membership_record
  from public.customer_memberships cm
  where cm.customer_id = target_customer_id
    and cm.brand_id = target_brand_id
    and cm.status in ('active', 'expired', 'suspended')
  order by cm.expires_at desc nulls last, cm.created_at desc
  limit 1
  for update;

  if membership_record.id is null then
    raise exception 'Renewable membership not found';
  end if;

  if exists (
    select 1 from public.membership_events
    where customer_membership_id = membership_record.id and idempotency_key = idempotency_key_value
  ) then
    return membership_record.id;
  end if;

  select duration_days into plan_duration from public.membership_plans where id = membership_record.membership_plan_id;
  new_start := case
    when membership_record.status = 'active' and membership_record.expires_at > now() then membership_record.starts_at
    else now()
  end;
  new_expiry := case
    when membership_record.status = 'active' and membership_record.expires_at > now() then membership_record.expires_at + make_interval(days => plan_duration)
    else now() + make_interval(days => plan_duration)
  end;

  update public.customer_memberships
  set status = 'active',
      starts_at = new_start,
      expires_at = new_expiry,
      updated_by = auth.uid()
  where id = membership_record.id;

  insert into public.membership_events (
    customer_membership_id, event_type, staff_user_id, reason, reference_no, idempotency_key, metadata, created_by
  )
  values (
    membership_record.id, 'renewed', staff_id, 'Manual renewal confirmation', reference_no_value,
    idempotency_key_value, jsonb_build_object('new_expires_at', new_expiry), auth.uid()
  );

  perform public.write_audit('membership.renew', 'customer_memberships', membership_record.id, idempotency_key_value, jsonb_build_object('new_expires_at', new_expiry));
  return membership_record.id;
end;
$$;

create or replace function public.suspend_membership(
  target_membership_id uuid,
  idempotency_key_value text,
  reason_value text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_record public.customer_memberships%rowtype;
  staff_id uuid := public.current_staff_user_id();
begin
  select * into membership_record from public.customer_memberships where id = target_membership_id for update;
  if membership_record.id is null then raise exception 'Membership not found'; end if;
  if not public.staff_has_permission('membership.suspend', membership_record.brand_id, null, null) then raise exception 'Insufficient permission'; end if;
  if exists (select 1 from public.membership_events where customer_membership_id = target_membership_id and idempotency_key = idempotency_key_value) then return target_membership_id; end if;

  update public.customer_memberships set status = 'suspended', updated_by = auth.uid() where id = target_membership_id;
  insert into public.membership_events (customer_membership_id, event_type, staff_user_id, reason, idempotency_key, created_by)
  values (target_membership_id, 'suspended', staff_id, reason_value, idempotency_key_value, auth.uid());
  perform public.write_audit('membership.suspend', 'customer_memberships', target_membership_id, idempotency_key_value, jsonb_build_object('reason', reason_value, 'expiry_paused', false));
  return target_membership_id;
end;
$$;

create or replace function public.extend_membership(
  target_membership_id uuid,
  extension_days integer,
  idempotency_key_value text,
  reason_value text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_record public.customer_memberships%rowtype;
  staff_id uuid := public.current_staff_user_id();
begin
  if extension_days <= 0 then raise exception 'Extension days must be positive'; end if;
  select * into membership_record from public.customer_memberships where id = target_membership_id for update;
  if membership_record.id is null then raise exception 'Membership not found'; end if;
  if not public.staff_has_permission('membership.extend', membership_record.brand_id, null, null) then raise exception 'Insufficient permission'; end if;
  if exists (select 1 from public.membership_events where customer_membership_id = target_membership_id and idempotency_key = idempotency_key_value) then return target_membership_id; end if;

  update public.customer_memberships
  set expires_at = coalesce(expires_at, now()) + make_interval(days => extension_days),
      updated_by = auth.uid()
  where id = target_membership_id;
  insert into public.membership_events (customer_membership_id, event_type, staff_user_id, reason, idempotency_key, metadata, created_by)
  values (target_membership_id, 'extended', staff_id, reason_value, idempotency_key_value, jsonb_build_object('extension_days', extension_days), auth.uid());
  perform public.write_audit('membership.extend', 'customer_memberships', target_membership_id, idempotency_key_value, jsonb_build_object('extension_days', extension_days, 'reason', reason_value));
  return target_membership_id;
end;
$$;

create or replace function public.record_points_transaction(
  target_points_account_id uuid,
  transaction_type_value points_transaction_type,
  points_delta_value integer,
  description_value text,
  reference_no_value text,
  idempotency_key_value text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  account_record public.points_accounts%rowtype;
  latest_balance integer;
  new_balance integer;
  new_tx_id uuid;
  existing_tx_id uuid;
  staff_id uuid := public.current_staff_user_id();
begin
  if idempotency_key_value is null or length(idempotency_key_value) < 8 then raise exception 'Valid idempotency key required'; end if;
  if points_delta_value = 0 then raise exception 'Points delta cannot be zero'; end if;

  select * into account_record from public.points_accounts where id = target_points_account_id for update;
  if account_record.id is null then raise exception 'Points account not found'; end if;
  if not public.staff_has_permission('points.adjust', account_record.brand_id, null, null) then raise exception 'Insufficient permission'; end if;

  select id into existing_tx_id
  from public.points_transactions
  where points_account_id = target_points_account_id and idempotency_key = idempotency_key_value;
  if existing_tx_id is not null then return existing_tx_id; end if;

  select coalesce(balance_after, 0) into latest_balance
  from public.points_transactions
  where points_account_id = target_points_account_id
  order by created_at desc, id desc
  limit 1;
  latest_balance := coalesce(latest_balance, 0);
  new_balance := latest_balance + points_delta_value;
  if new_balance < 0 then raise exception 'Points balance cannot become negative'; end if;

  insert into public.points_transactions (
    points_account_id, transaction_type, points_delta, balance_after, description, reference_no,
    staff_user_id, idempotency_key, created_by
  )
  values (
    target_points_account_id, transaction_type_value, points_delta_value, new_balance, description_value,
    reference_no_value, staff_id, idempotency_key_value, auth.uid()
  )
  returning id into new_tx_id;

  perform public.write_audit('points.record', 'points_transactions', new_tx_id, idempotency_key_value, jsonb_build_object('points_account_id', target_points_account_id, 'points_delta', points_delta_value, 'balance_after', new_balance));
  return new_tx_id;
end;
$$;

create or replace function public.reverse_points_transaction(
  original_points_transaction_id uuid,
  description_value text,
  idempotency_key_value text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  original_tx public.points_transactions%rowtype;
  account_record public.points_accounts%rowtype;
  latest_balance integer;
  new_balance integer;
  new_tx_id uuid;
  existing_tx_id uuid;
  staff_id uuid := public.current_staff_user_id();
begin
  select * into original_tx from public.points_transactions where id = original_points_transaction_id for update;
  if original_tx.id is null then raise exception 'Original transaction not found'; end if;

  select * into account_record from public.points_accounts where id = original_tx.points_account_id for update;
  if not public.staff_has_permission('points.reverse', account_record.brand_id, null, null) then raise exception 'Insufficient permission'; end if;

  select id into existing_tx_id
  from public.points_transactions
  where points_account_id = original_tx.points_account_id and idempotency_key = idempotency_key_value;
  if existing_tx_id is not null then return existing_tx_id; end if;

  if exists (select 1 from public.points_transactions where reversed_points_transaction_id = original_tx.id) then
    raise exception 'Points transaction has already been reversed';
  end if;

  select coalesce(balance_after, 0) into latest_balance
  from public.points_transactions
  where points_account_id = original_tx.points_account_id
  order by created_at desc, id desc
  limit 1;
  latest_balance := coalesce(latest_balance, 0);
  new_balance := latest_balance - original_tx.points_delta;
  if new_balance < 0 then raise exception 'Points balance cannot become negative'; end if;

  insert into public.points_transactions (
    points_account_id, transaction_type, points_delta, balance_after, description, reference_no,
    staff_user_id, reversed_points_transaction_id, idempotency_key, created_by
  )
  values (
    original_tx.points_account_id, 'reversal', -original_tx.points_delta, new_balance, description_value,
    original_tx.id::text, staff_id, original_tx.id, idempotency_key_value, auth.uid()
  )
  returning id into new_tx_id;

  perform public.write_audit('points.reverse', 'points_transactions', new_tx_id, idempotency_key_value, jsonb_build_object('original_points_transaction_id', original_tx.id, 'balance_after', new_balance));
  return new_tx_id;
end;
$$;

create or replace function public.confirm_referral_reward(
  target_referral_id uuid,
  reward_type_value text,
  points_value integer,
  idempotency_key_value text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  referral_record public.referrals%rowtype;
  points_account_id_value uuid;
  points_tx_id uuid;
  reward_id uuid;
  staff_id uuid := public.current_staff_user_id();
begin
  select * into referral_record from public.referrals where id = target_referral_id for update;
  if referral_record.id is null then raise exception 'Referral not found'; end if;
  if referral_record.referral_status <> 'membership_activated' then raise exception 'Referred membership is not activated'; end if;
  if not public.staff_has_permission('referral.reward.confirm', referral_record.brand_id, null, null) then raise exception 'Insufficient permission'; end if;

  select id into reward_id from public.referral_rewards
  where referral_id = target_referral_id and idempotency_key = idempotency_key_value;
  if reward_id is not null then return reward_id; end if;

  select id into points_account_id_value
  from public.points_accounts
  where customer_id = referral_record.referrer_customer_id and brand_id = referral_record.brand_id and points_currency_code = 'QYJ_POINTS';

  points_tx_id := public.record_points_transaction(
    points_account_id_value,
    'referral_reward',
    points_value,
    'Confirmed referral reward',
    target_referral_id::text,
    idempotency_key_value || ':points'
  );

  insert into public.referral_rewards (
    referral_id, reward_type, points_transaction_id, reward_status, approved_by_staff_user_id, approved_at, idempotency_key, created_by
  )
  values (
    target_referral_id, reward_type_value, points_tx_id, 'confirmed', staff_id, now(), idempotency_key_value, auth.uid()
  )
  returning id into reward_id;

  update public.referrals
  set reward_status = 'confirmed', updated_by = auth.uid()
  where id = target_referral_id;

  perform public.write_audit('referral.reward.confirm', 'referral_rewards', reward_id, idempotency_key_value, jsonb_build_object('referral_id', target_referral_id, 'points_transaction_id', points_tx_id));
  return reward_id;
end;
$$;

create or replace function public.assign_staff_role(
  target_staff_user_id uuid,
  target_role_code text,
  scope_type_value role_scope_type,
  company_id_value uuid,
  brand_id_value uuid,
  store_id_value uuid,
  idempotency_key_value text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  role_id_value uuid;
  assignment_id uuid;
begin
  if not public.staff_has_permission('staff.manage', null, null, company_id_value) then
    raise exception 'Insufficient permission';
  end if;

  select id into role_id_value from public.roles where role_code = target_role_code and status = 'active';
  if role_id_value is null then raise exception 'Role not found'; end if;

  select id into assignment_id
  from public.staff_role_assignments
  where staff_user_id = target_staff_user_id
    and role_id = role_id_value
    and scope_type = scope_type_value
    and company_id is not distinct from company_id_value
    and brand_id is not distinct from brand_id_value
    and store_id is not distinct from store_id_value
    and status = 'active';
  if assignment_id is not null then return assignment_id; end if;

  insert into public.staff_role_assignments (
    staff_user_id, role_id, scope_type, company_id, brand_id, store_id, created_by
  )
  values (
    target_staff_user_id, role_id_value, scope_type_value, company_id_value, brand_id_value, store_id_value, auth.uid()
  )
  returning id into assignment_id;

  perform public.write_audit('staff.role.assign', 'staff_role_assignments', assignment_id, idempotency_key_value, jsonb_build_object('staff_user_id', target_staff_user_id, 'role_code', target_role_code));
  return assignment_id;
end;
$$;
