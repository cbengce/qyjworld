begin;

do $$
declare
  v_store_id uuid;
  v_mapping_id uuid;
  v_partner_id uuid;
  v_result jsonb;
  v_order_id uuid;
  v_count integer;
  v_financial_count integer;
  v_ledger_count integer;
  v_request_id uuid;
begin
  select id into strict v_store_id from public.stores
  where store_code = 'QYJ-MPM-001' and status = 'active' and deleted_at is null;

  insert into public.pos_provider_store_mappings (provider, external_store_id, store_id)
  values ('appzpos', 'APPZPOS-TEST-STORE-A', v_store_id)
  returning id into v_mapping_id;

  insert into public.partners (partner_code, partner_name, customer_discount_rate, partner_reward_rate)
  values ('APZTEST', 'APPZPOS Test Partner', 0.05, 0.05)
  returning id into v_partner_id;
  insert into public.partner_referral_sessions (partner_id, partner_code, referral_reference, landing_url)
  values (v_partner_id, 'APZTEST', 'QYJREF-APZTEST-TEST', 'https://example.invalid/partner-test');

  select count(*) into v_financial_count from public.pos_transactions;
  select count(*) into v_ledger_count from public.partner_commission_ledger;

  v_result := public.upsert_appzpos_order(
    'APPZPOS-TEST-STORE-A', 'ORDER-1', 'QYJREF-APZTEST-TEST', 'PAID',
    '2026-09-18T02:00:00Z', '2026-09-18T10:00:00Z', 4500, 0, 30, 0, 4470, 1,
    '[{"paymentType":"CARD","paymentAmount":4500,"remarks":""}]'::jsonb,
    '[{"id":"ITEM-1","itemName":"Tea","quantity":1,"discountAmount":30,"unitPrice":4500,"remarks":"","modifiers":[]}]'::jsonb,
    repeat('a', 64)
  );
  if v_result->>'matchStatus' <> 'matched' or (v_result->>'partnerId')::uuid <> v_partner_id then
    raise exception 'FAIL: referral session was not matched dynamically';
  end if;
  v_order_id := (v_result->>'id')::uuid;

  v_result := public.upsert_appzpos_order(
    'APPZPOS-TEST-STORE-A', 'ORDER-1', 'QYJREF-APZTEST-TEST', 'COMPLETED',
    '2026-09-18T02:00:00Z', '2026-09-18T10:00:00Z', 4500, 0, 30, 0, 4470, 1, '[]'::jsonb, '[]'::jsonb, repeat('b', 64)
  );
  if (v_result->>'id')::uuid <> v_order_id then raise exception 'FAIL: repeated order was not idempotent'; end if;
  select count(*) into v_count from public.pos_provider_orders
  where provider = 'appzpos' and provider_store_id = 'APPZPOS-TEST-STORE-A' and order_reference = 'ORDER-1';
  if v_count <> 1 then raise exception 'FAIL: duplicate provider order created'; end if;
  if not exists (select 1 from public.pos_provider_orders where id = v_order_id and order_status = 'COMPLETED' and paid_observed_at is not null) then
    raise exception 'FAIL: PAID to COMPLETED update was not retained';
  end if;

  v_result := public.upsert_appzpos_order(
    'APPZPOS-TEST-STORE-A', 'ORDER-2', 'UNKNOWN-CODE', 'PAID',
    '2026-09-18T02:01:00Z', '2026-09-18T10:01:00Z', 1000, 0, 0, 0, 1000, 1, '[]'::jsonb, '[]'::jsonb, repeat('c', 64)
  );
  if v_result->>'matchStatus' <> 'unknown' or v_result->>'partnerId' is not null then
    raise exception 'FAIL: unknown referral was silently assigned';
  end if;

  v_result := public.upsert_appzpos_order(
    'APPZPOS-TEST-STORE-A', 'ORDER-3', null, 'PENDING',
    '2026-09-18T02:02:00Z', '2026-09-18T10:02:00Z', 1200, 0, 0, 0, 1200, 1, '[]'::jsonb, '[]'::jsonb, repeat('d', 64)
  );
  if v_result->>'matchStatus' <> 'none' or v_result->>'partnerId' is not null then
    raise exception 'FAIL: non-referral order was attributed';
  end if;

  v_result := public.upsert_appzpos_order(
    'APPZPOS-TEST-STORE-A', 'ORDER-1', 'QYJREF-APZTEST-TEST', 'CANCELLED',
    '2026-09-18T02:00:00Z', '2026-09-18T10:00:00Z', 4500, 0, 30, 0, 4470, 1, '[]'::jsonb, '[]'::jsonb, repeat('e', 64)
  );
  if not exists (select 1 from public.pos_provider_orders where id = v_order_id and order_status = 'CANCELLED' and cancelled_observed_at is not null) then
    raise exception 'FAIL: cancellation did not update the existing provider order';
  end if;

  if (select count(*) from public.pos_transactions) <> v_financial_count + 1
     or (select count(*) from public.partner_commission_ledger) <> v_ledger_count + 1 then
    raise exception 'FAIL: paid order did not create exactly one existing-rule financial effect';
  end if;
  if not exists (
    select 1
    from public.partner_commission_ledger l
    join public.pos_transactions t on t.id = l.transaction_id
    where t.provider = 'appzpos'
      and t.pos_transaction_id = 'APPZPOS-TEST-STORE-A:ORDER-1'
      and l.eligible_amount = 45.00
      and l.reward_rate = 0.05
      and l.reward_amount = 2.25
  ) then
    raise exception 'FAIL: commission must equal APPZPOS subTotal multiplied by the configured partner rate';
  end if;
  if not exists (select 1 from public.pos_provider_orders where id = v_order_id and order_created_raw = '2026-09-18T10:00:00Z' and item_discount_minor = 30 and cup_quantity = 1) then
    raise exception 'FAIL: normalized facts or raw timestamp were not retained';
  end if;

  for v_count in 1..12 loop
    v_request_id := public.reserve_pos_poll_request(
      v_mapping_id,
      '2026-09-18T00:00:00Z'::timestamptz + make_interval(mins => v_count),
      '2026-09-18T00:01:00Z'::timestamptz + make_interval(mins => v_count)
    );
    perform public.complete_pos_poll_request(v_request_id, true, 200, null);
  end loop;
  begin
    perform public.reserve_pos_poll_request(v_mapping_id, '2026-09-18T01:00:00Z', '2026-09-18T01:01:00Z');
    raise exception 'FAIL: thirteenth polling reservation was accepted';
  exception when others then
    if sqlerrm = 'FAIL: thirteenth polling reservation was accepted' then raise; end if;
    if sqlerrm <> 'APPZPOS polling rate limit reservation unavailable' then
      raise exception 'FAIL: unexpected rate-limit error: %', sqlerrm;
    end if;
  end;

  raise notice 'PASS: APPZPOS order idempotency, attribution, cancellation and conservative polling cap';
end
$$;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '32000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'appzpos-partner-a@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '32000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'appzpos-partner-b@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.partners (id, partner_code, partner_name, customer_discount_rate, partner_reward_rate)
values ('32000000-0000-0000-0000-000000000022', 'APZTESTB', 'APPZPOS Test Partner B', 0.05, 0.05);

insert into public.partner_users (partner_id, auth_user_id)
select id, '32000000-0000-0000-0000-000000000011'::uuid from public.partners where partner_code = 'APZTEST';
insert into public.partner_users (partner_id, auth_user_id)
values ('32000000-0000-0000-0000-000000000022', '32000000-0000-0000-0000-000000000012');

set local role service_role;
select public.upsert_appzpos_order(
  'APPZPOS-TEST-STORE-A', 'ORDER-B', 'APZTESTB', 'PAID',
  '2026-09-18T03:00:00Z', '2026-09-18T11:00:00Z', 2000, 0, 0, 0, 2000, 1,
  '[]'::jsonb, '[{"id":"ITEM-B","itemName":"Tea B","quantity":1,"discountAmount":0,"unitPrice":2000,"remarks":"","modifiers":[]}]'::jsonb,
  repeat('f', 64)
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '32000000-0000-0000-0000-000000000011', true);
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.pos_provider_orders;
  if v_count <> 1 then raise exception 'FAIL: partner A must see exactly its own APPZPOS provider order'; end if;
  if exists (select 1 from public.pos_provider_orders where order_reference = 'ORDER-B') then
    raise exception 'FAIL: partner A can read partner B APPZPOS provider order';
  end if;
end
$$;

select set_config('request.jwt.claim.sub', '32000000-0000-0000-0000-000000000012', true);
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.pos_provider_orders;
  if v_count <> 1 then raise exception 'FAIL: partner B must see exactly its own APPZPOS provider order'; end if;
  if exists (select 1 from public.pos_provider_orders where order_reference = 'ORDER-1') then
    raise exception 'FAIL: partner B can read partner A APPZPOS provider order';
  end if;
  raise notice 'PASS: APPZPOS provider-order partner RLS isolation';
end
$$;
reset role;

set local role anon;
do $$
begin
  begin
    perform count(*) from public.pos_provider_orders;
    raise exception 'FAIL: anonymous role read APPZPOS provider orders';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.upsert_appzpos_order('x', 'x', null, 'PENDING', now(), 'raw', 0, 0, 0, 0, 0, 0, '[]', '[]', repeat('a',64));
    raise exception 'FAIL: anonymous role executed APPZPOS ingestion RPC';
  exception when insufficient_privilege then null;
  end;
end
$$;
reset role;

rollback;

