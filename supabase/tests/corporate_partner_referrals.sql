begin;

do $$
declare
  v_partner uuid := '22000000-0000-0000-0000-000000000001';
  v_result jsonb;
  v_count integer;
  v_reward numeric;
  v_rate numeric;
  v_gross numeric;
  v_discount numeric;
  v_paid numeric;
  v_financial_count_before integer;
  v_commission_count_before integer;
begin
  insert into public.partners (id, partner_code, partner_name, customer_discount_rate, partner_reward_rate)
  values (v_partner, 'TEST001', 'Corporate Partner Test', 0.05, 0.05);
  insert into public.partner_referral_sessions (partner_id, partner_code, referral_reference, landing_url)
  values (v_partner, 'TEST001', 'QYJREF-TEST001-20260811-TEST', 'https://example.invalid/api/partner/route?partner=TEST001');

  v_result := public.process_partner_pos_event(jsonb_build_object(
    'provider','mock','eventId','evt-paid-1','eventType','payment_succeeded','payloadHash','hash-paid-1',
    'referralReference','QYJREF-TEST001-20260811-TEST','partnerCode','TEST001',
    'posOrderId','order-1','posTransactionId','tx-1','grossAmount',10,
    'discountAmount',0.50,'paidAmount',9.50,'currency','SGD','cupQuantity',1,
    'occurredAt','2026-08-11T10:00:00+08:00','rawPayload','{}'::jsonb
  ));
  if v_result->>'status' <> 'processed' then raise exception 'FAIL: paid event not processed'; end if;

  select t.gross_amount, t.discount_amount, t.paid_amount, l.reward_rate, l.reward_amount
  into v_gross, v_discount, v_paid, v_rate, v_reward
  from public.pos_transactions t
  join public.partner_commission_ledger l on l.transaction_id = t.id
  where t.provider = 'mock' and t.pos_transaction_id = 'tx-1';
  if (v_gross, v_discount, v_paid, v_rate, v_reward) is distinct from
     (10::numeric, 0.50::numeric, 9.50::numeric, 0.05::numeric, 0.50::numeric) then
    raise exception 'FAIL: paid transaction or gross-based commission is incorrect';
  end if;

  v_result := public.process_partner_pos_event(jsonb_build_object(
    'provider','mock','eventId','evt-paid-1','eventType','payment_succeeded','payloadHash','hash-paid-1',
    'posTransactionId','tx-1','rawPayload','{}'::jsonb
  ));
  if v_result->>'status' <> 'duplicate' then raise exception 'FAIL: duplicate webhook accepted'; end if;

  v_result := public.process_partner_pos_event(jsonb_build_object(
    'provider','mock','eventId','evt-paid-2','eventType','payment_succeeded','payloadHash','hash-paid-2',
    'partnerCode','TEST001','posTransactionId','tx-1','grossAmount',10,
    'discountAmount',0.50,'paidAmount',9.50,'currency','SGD','cupQuantity',1,
    'occurredAt','2026-08-11T10:00:01+08:00','rawPayload','{}'::jsonb
  ));
  if v_result->>'status' <> 'duplicate' then raise exception 'FAIL: duplicate POS transaction accepted'; end if;
  select count(*) into v_count from public.pos_transactions where provider = 'mock' and pos_transaction_id = 'tx-1';
  if v_count <> 1 then raise exception 'FAIL: duplicate transaction row created'; end if;
  select count(*) into v_count from public.partner_commission_ledger l join public.pos_transactions t on t.id = l.transaction_id where t.provider = 'mock' and t.pos_transaction_id = 'tx-1';
  if v_count <> 1 then raise exception 'FAIL: duplicate commission created'; end if;

  v_result := public.process_partner_pos_event(jsonb_build_object(
    'provider','mock','eventId','evt-failed-1','eventType','payment_failed','payloadHash','hash-failed-1',
    'partnerCode','TEST001','posTransactionId','tx-failed','rawPayload','{}'::jsonb
  ));
  if v_result->>'status' <> 'ignored' then raise exception 'FAIL: non-paid event was not ignored'; end if;
  if exists (select 1 from public.pos_transactions where pos_transaction_id = 'tx-failed') then raise exception 'FAIL: non-paid transaction was recorded'; end if;

  select count(*) into v_financial_count_before from public.pos_transactions;
  select count(*) into v_commission_count_before from public.partner_commission_ledger;

  v_result := public.process_partner_pos_event(jsonb_build_object(
    'provider','mock','eventId','evt-cancelled-1','eventType','order_cancelled','payloadHash','hash-cancelled-1',
    'partnerCode','TEST001','posTransactionId','tx-cancelled','rawPayload','{}'::jsonb
  ));
  if v_result->>'status' <> 'ignored' then raise exception 'FAIL: order_cancelled was not ignored'; end if;

  v_result := public.process_partner_pos_event(jsonb_build_object(
    'provider','mock','eventId','evt-voided-1','eventType','order_voided','payloadHash','hash-voided-1',
    'partnerCode','TEST001','posTransactionId','tx-voided','rawPayload','{}'::jsonb
  ));
  if v_result->>'status' <> 'ignored' then raise exception 'FAIL: order_voided was not ignored'; end if;

  v_result := public.process_partner_pos_event(jsonb_build_object(
    'provider','mock','eventId','evt-partial-refund-1','eventType','partial_refund','payloadHash','hash-partial-refund-1',
    'partnerCode','TEST001','posTransactionId','tx-1','refundedAmount',3.17,'rawPayload',jsonb_build_object('refundedAmount',3.17)
  ));
  if v_result->>'status' <> 'ignored' then raise exception 'FAIL: partial_refund was not ignored'; end if;

  if (select count(*) from public.pos_transactions) <> v_financial_count_before
     or (select count(*) from public.partner_commission_ledger) <> v_commission_count_before then
    raise exception 'FAIL: partial_refund financial effect detected';
  end if;
  if exists (select 1 from public.pos_transactions where pos_transaction_id in ('tx-cancelled', 'tx-voided')) then
    raise exception 'FAIL: cancelled or voided transaction was recorded';
  end if;
  if exists (select 1 from public.partner_commission_ledger where entry_type = 'commission_reversal') then
    raise exception 'FAIL: commission reversal entry created';
  end if;
  select gross_amount, discount_amount, paid_amount into v_gross, v_discount, v_paid
  from public.pos_transactions where provider = 'mock' and pos_transaction_id = 'tx-1';
  if (v_gross, v_discount, v_paid) is distinct from (10::numeric, 0.50::numeric, 9.50::numeric) then
    raise exception 'FAIL: refundedAmount changed stored POS facts';
  end if;

  begin
    perform public.process_partner_pos_event(jsonb_build_object(
      'provider','mock','eventId','evt-missing-fields-1','eventType','payment_succeeded','payloadHash','hash-missing-fields-1',
      'partnerCode','TEST001','rawPayload','{}'::jsonb
    ));
    raise exception 'FAIL: paid event without required canonical fields was accepted';
  exception when others then
    if sqlerrm = 'FAIL: paid event without required canonical fields was accepted' then raise; end if;
    if sqlerrm <> 'Confirmed paid event requires posTransactionId, occurredAt, grossAmount, currency and cupQuantity' then
      raise exception 'FAIL: unexpected required-field validation error: %', sqlerrm;
    end if;
  end;

  begin
    insert into public.partners (partner_code, partner_name, customer_discount_rate, partner_reward_rate)
    values ('BADRATE1', 'Bad Individual Rate', 0.3001, 0);
    raise exception 'FAIL: individual rate above 30%% accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.partners (partner_code, partner_name, customer_discount_rate, partner_reward_rate)
    values ('BADRATE2', 'Bad Combined Rate', 0.20, 0.1001);
    raise exception 'FAIL: combined rate above 30%% accepted';
  exception when check_violation then null;
  end;
  raise notice 'PASS: paid attribution, idempotency, commission and commercial constraints';
end;
$$;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '22000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'partner-admin@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'partner-a@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'partner-b@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.staff_users (id, auth_user_id, staff_no, full_name, email_raw)
values ('22000000-0000-0000-0000-000000000013', '22000000-0000-0000-0000-000000000010', 'PARTNERTESTADMIN', 'Partner Test Admin', 'partner-admin@example.invalid');
insert into public.companies (id, legal_name, registration_no, country_code)
values ('22000000-0000-0000-0000-000000000014', 'Partner Test Company', 'PARTNER-TEST-ONLY', 'SG');
insert into public.roles (id, role_code, name, description)
values ('22000000-0000-0000-0000-000000000015', 'super_admin', 'Partner Test Super Admin', 'Transaction-local Partner integration test role');
insert into public.permissions (id, permission_code, description)
values ('22000000-0000-0000-0000-000000000016', 'settings.manage', 'Transaction-local Partner integration test permission');
insert into public.role_permissions (id, role_id, permission_id)
values ('22000000-0000-0000-0000-000000000017', '22000000-0000-0000-0000-000000000015', '22000000-0000-0000-0000-000000000016');
insert into public.staff_role_assignments (staff_user_id, role_id, scope_type, company_id)
values ('22000000-0000-0000-0000-000000000013', '22000000-0000-0000-0000-000000000015', 'company', '22000000-0000-0000-0000-000000000014');

select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000010', true);

do $$
declare
  v_partner_id uuid;
  v_old_transaction uuid;
  v_old_rate numeric;
  v_old_reward numeric;
  v_archive_result jsonb;
  v_partner_code text;
  v_partner_count integer;
  v_mapping_count integer;
  v_referral_count integer;
  v_transaction_count integer;
  v_ledger_count integer;
  v_archive_audit_count integer;
  v_gross_total numeric;
  v_commission_total numeric;
  v_customer_rate numeric;
  v_partner_rate numeric;
begin
  insert into public.partners (partner_code, partner_name, customer_discount_rate, partner_reward_rate)
  values ('RATEHIST', 'Historical Rate Test', 0.05, 0.05)
  returning id into v_partner_id;

  perform public.process_partner_pos_event(jsonb_build_object(
    'provider','mock','eventId','evt-rate-old','eventType','payment_succeeded','payloadHash','hash-rate-old',
    'partnerCode','RATEHIST','posTransactionId','tx-rate-old','grossAmount',10,
    'discountAmount',0.50,'paidAmount',9.50,'currency','SGD','cupQuantity',1,
    'occurredAt','2026-08-11T11:00:00+08:00','rawPayload','{}'::jsonb
  ));
  select id into v_old_transaction from public.pos_transactions where provider = 'mock' and pos_transaction_id = 'tx-rate-old';

  perform public.update_partner_commercial_rates(v_partner_id, 0.10, 0.03);
  if not exists (select 1 from public.audit_logs where action = 'partner.commercial_rates.update' and entity_id = v_partner_id) then
    raise exception 'FAIL: rate update was not audited';
  end if;
  select reward_rate, reward_amount into v_old_rate, v_old_reward
  from public.partner_commission_ledger where transaction_id = v_old_transaction;
  if (v_old_rate, v_old_reward) is distinct from (0.05::numeric, 0.50::numeric) then
    raise exception 'FAIL: historical commission snapshot was recalculated';
  end if;

  perform public.process_partner_pos_event(jsonb_build_object(
    'provider','mock','eventId','evt-rate-new','eventType','payment_succeeded','payloadHash','hash-rate-new',
    'partnerCode','RATEHIST','posTransactionId','tx-rate-new','grossAmount',10,
    'discountAmount',1.00,'paidAmount',9.00,'currency','SGD','cupQuantity',1,
    'occurredAt','2026-08-11T11:01:00+08:00','rawPayload','{}'::jsonb
  ));
  if not exists (
    select 1 from public.partner_commission_ledger l join public.pos_transactions t on t.id = l.transaction_id
    where t.pos_transaction_id = 'tx-rate-new' and l.reward_rate = 0.03 and l.reward_amount = 0.30
  ) then raise exception 'FAIL: new transaction did not use current rate'; end if;

  insert into public.partner_users (partner_id, auth_user_id)
  values (v_partner_id, '22000000-0000-0000-0000-000000000011');
  insert into public.partner_referral_sessions (partner_id, partner_code, referral_reference, landing_url)
  values (v_partner_id, 'RATEHIST', 'QYJREF-RATEHIST-ARCHIVE', 'https://example.invalid/api/partner/route?partner=RATEHIST');

  select count(*), count(*) filter (where partner_code = 'RATEHIST')
  into v_partner_count, v_archive_audit_count
  from public.partners where id = v_partner_id;
  select count(*) into v_mapping_count from public.partner_users where partner_id = v_partner_id;
  select count(*) into v_referral_count from public.partner_referral_sessions where partner_id = v_partner_id;
  select count(*) into v_transaction_count from public.pos_transactions where partner_id = v_partner_id;
  select count(*) into v_ledger_count from public.partner_commission_ledger where partner_id = v_partner_id;
  select coalesce(sum(gross_amount), 0) into v_gross_total from public.pos_transactions where partner_id = v_partner_id;
  select coalesce(sum(reward_amount), 0) into v_commission_total from public.partner_commission_ledger where partner_id = v_partner_id;
  select customer_discount_rate, partner_reward_rate into v_customer_rate, v_partner_rate from public.partners where id = v_partner_id;

  v_archive_result := public.archive_partner(v_partner_id);
  if v_archive_result->>'status' <> 'archived' then raise exception 'FAIL: partner was not archived'; end if;
  select partner_code into v_partner_code from public.partners
  where id = v_partner_id and status = 'inactive' and archived_at is not null
    and archived_by = '22000000-0000-0000-0000-000000000010';
  if v_partner_code is distinct from 'RATEHIST' then raise exception 'FAIL: archive lifecycle state or Partner Code changed incorrectly'; end if;
  if not exists (select 1 from public.audit_logs where action = 'partner.archive' and entity_id = v_partner_id) then
    raise exception 'FAIL: partner archive was not audited';
  end if;

  select count(*) into v_archive_audit_count from public.audit_logs where action = 'partner.archive' and entity_id = v_partner_id;
  v_archive_result := public.archive_partner(v_partner_id);
  if v_archive_result->>'status' <> 'already_archived' then raise exception 'FAIL: repeated archive was not idempotent'; end if;
  if (select count(*) from public.audit_logs where action = 'partner.archive' and entity_id = v_partner_id) <> v_archive_audit_count then
    raise exception 'FAIL: repeated archive created duplicate audit history';
  end if;

  if (select count(*) from public.partners where id = v_partner_id) <> v_partner_count
     or (select count(*) from public.partner_users where partner_id = v_partner_id) <> v_mapping_count
     or (select count(*) from public.partner_referral_sessions where partner_id = v_partner_id) <> v_referral_count
     or (select count(*) from public.pos_transactions where partner_id = v_partner_id) <> v_transaction_count
     or (select count(*) from public.partner_commission_ledger where partner_id = v_partner_id) <> v_ledger_count then
    raise exception 'FAIL: archive removed or duplicated historical Partner records';
  end if;

  v_archive_result := public.restore_partner(v_partner_id);
  if v_archive_result->>'status' <> 'restored_inactive' then raise exception 'FAIL: partner was not restored'; end if;
  if not exists (select 1 from public.partners where id = v_partner_id and partner_code = 'RATEHIST' and status = 'inactive' and archived_at is null and archived_by is null) then
    raise exception 'FAIL: restore did not return partner to inactive';
  end if;
  if not exists (select 1 from public.audit_logs where action = 'partner.restore' and entity_id = v_partner_id) then
    raise exception 'FAIL: partner restore was not audited';
  end if;
  if (select coalesce(sum(gross_amount), 0) from public.pos_transactions where partner_id = v_partner_id) is distinct from v_gross_total
     or (select coalesce(sum(reward_amount), 0) from public.partner_commission_ledger where partner_id = v_partner_id) is distinct from v_commission_total then
    raise exception 'FAIL: archive lifecycle changed historical Partner financials';
  end if;
  if not exists (
    select 1 from public.partners
    where id = v_partner_id
      and customer_discount_rate = v_customer_rate
      and partner_reward_rate = v_partner_rate
  ) then raise exception 'FAIL: archive lifecycle changed Partner commercial rates'; end if;
  raise notice 'PASS: audited rate change and immutable historical commission';
end;
$$;

select set_config('request.jwt.claim.sub', '', true);

insert into public.partners (id, partner_code, partner_name, customer_discount_rate, partner_reward_rate)
values
  ('22000000-0000-0000-0000-000000000021', 'ABC001', 'ABC Company', 0.05, 0.05),
  ('22000000-0000-0000-0000-000000000022', 'ABC002', 'ABC Company Two', 0.05, 0.05);
insert into public.partner_users (partner_id, auth_user_id)
values
  ('22000000-0000-0000-0000-000000000021', '22000000-0000-0000-0000-000000000011'),
  ('22000000-0000-0000-0000-000000000022', '22000000-0000-0000-0000-000000000012');
insert into public.pos_transactions (id, provider, partner_id, partner_code, referral_reference, pos_transaction_id, gross_amount, discount_amount, paid_amount, cup_quantity, payment_status, transaction_status, paid_at)
values
  ('22000000-0000-0000-0000-000000000031', 'mock', '22000000-0000-0000-0000-000000000021', 'ABC001', 'REF-A', 'rls-tx-a', 10, 0.5, 9.5, 1, 'paid', 'paid', now()),
  ('22000000-0000-0000-0000-000000000032', 'mock', '22000000-0000-0000-0000-000000000022', 'ABC002', 'REF-B', 'rls-tx-b', 20, 1, 19, 2, 'paid', 'paid', now());
insert into public.partner_commission_ledger (partner_id, transaction_id, entry_type, eligible_amount, reward_rate, reward_amount)
values
  ('22000000-0000-0000-0000-000000000021', '22000000-0000-0000-0000-000000000031', 'commission', 10, 0.05, 0.50),
  ('22000000-0000-0000-0000-000000000022', '22000000-0000-0000-0000-000000000032', 'commission', 20, 0.05, 1.00);

set local role authenticated;
select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000011', true);
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.partners;
  if v_count <> 1 then raise exception 'FAIL: ABC001 must see exactly one partner'; end if;
  if exists (select 1 from public.partners where partner_code = 'ABC002') then raise exception 'FAIL: ABC001 can read ABC002'; end if;
  select count(*) into v_count from public.pos_transactions;
  if v_count <> 1 then raise exception 'FAIL: ABC001 transaction scope is incorrect'; end if;
  select count(*) into v_count from public.partner_commission_ledger;
  if v_count <> 1 then raise exception 'FAIL: ABC001 commission scope is incorrect'; end if;
  begin
    update public.pos_transactions set gross_amount = 999 where partner_code = 'ABC001';
    raise exception 'FAIL: partner modified transaction facts';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.archive_partner('22000000-0000-0000-0000-000000000021');
    raise exception 'FAIL: partner user archived its own partner';
  exception when others then
    if sqlerrm = 'FAIL: partner user archived its own partner' then raise; end if;
    if sqlerrm <> 'Insufficient permission' then raise exception 'FAIL: unexpected archive authorization error: %', sqlerrm; end if;
  end;
  begin
    perform public.restore_partner('22000000-0000-0000-0000-000000000021');
    raise exception 'FAIL: partner user restored its own partner';
  exception when others then
    if sqlerrm = 'FAIL: partner user restored its own partner' then raise; end if;
    if sqlerrm <> 'Insufficient permission' then raise exception 'FAIL: unexpected restore authorization error: %', sqlerrm; end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000012', true);
do $$
begin
  if exists (select 1 from public.partners where partner_code = 'ABC001') then raise exception 'FAIL: ABC002 can read ABC001'; end if;
  raise notice 'PASS: active partner mapping and cross-partner RLS isolation';
end;
$$;
reset role;

set local role anon;
do $$
begin
  begin
    perform count(*) from public.pos_transactions;
    raise exception 'FAIL: anonymous role read partner transactions';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

rollback;
