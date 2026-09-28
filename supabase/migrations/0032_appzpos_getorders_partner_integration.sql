-- APPZPOS GetOrders pull-ingestion foundation.
-- Provider facts are authoritative; confirmed paid orders flow through the existing
-- gross-based process_partner_pos_event commission rule. Later statuses remain recorded
-- here without inventing a new reversal or refund calculation.
-- Owner decisions: provider orders are intentionally idempotent per provider + provider store
-- + order reference, and one provider store ID may map to each internal store in this launch.
-- Current cup quantity is the sum of item quantities because the APPZPOS catalogue is drink-only;
-- add an admin-managed counts_as_cup rule before any non-drink merchandise is introduced.

begin;

create table public.pos_provider_store_mappings (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_store_id text not null,
  store_id uuid not null references public.stores(id) on delete restrict,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_store_id),
  unique (provider, store_id),
  constraint pos_provider_store_mappings_provider_check check (provider = lower(provider) and btrim(provider) <> ''),
  constraint pos_provider_store_mappings_external_store_check check (btrim(external_store_id) <> '')
);

create table public.pos_provider_orders (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_store_id text not null,
  store_id uuid not null references public.stores(id) on delete restrict,
  order_reference text not null,
  referral_code text,
  partner_id uuid references public.partners(id) on delete restrict,
  referral_match_status text not null,
  order_status text not null,
  order_created_at timestamptz not null,
  order_created_raw text not null,
  subtotal_minor bigint not null,
  discount_minor bigint not null,
  item_discount_minor bigint not null,
  coupon_discount_minor bigint not null,
  total_payable_minor bigint not null,
  cup_quantity integer not null,
  payload_hash text not null,
  currency_code char(3) not null,
  payment_info jsonb not null default '[]'::jsonb,
  item_list jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  paid_observed_at timestamptz,
  cancelled_observed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_store_id, order_reference),
  constraint pos_provider_orders_status_check check (order_status in ('PENDING', 'PAID', 'COMPLETED', 'CANCELLED')),
  constraint pos_provider_orders_match_check check (referral_match_status in ('none', 'matched', 'unknown', 'inactive')),
  constraint pos_provider_orders_match_partner_check check ((referral_match_status = 'matched') = (partner_id is not null)),
  constraint pos_provider_orders_money_check check (
    subtotal_minor >= 0 and discount_minor >= 0 and item_discount_minor >= 0 and coupon_discount_minor >= 0 and total_payable_minor >= 0 and cup_quantity >= 0
  ),
  constraint pos_provider_orders_payload_hash_check check (payload_hash ~ '^[0-9a-f]{64}$'),
  constraint pos_provider_orders_payment_info_check check (jsonb_typeof(payment_info) = 'array'),
  constraint pos_provider_orders_item_list_check check (jsonb_typeof(item_list) = 'array')
);

create index pos_provider_orders_partner_created_idx on public.pos_provider_orders (partner_id, order_created_at desc)
  where partner_id is not null;
create index pos_provider_orders_unmatched_idx on public.pos_provider_orders (referral_match_status, last_seen_at desc)
  where referral_match_status in ('unknown', 'inactive');
create index pos_provider_orders_store_status_idx on public.pos_provider_orders (store_id, order_status, order_created_at desc);

create table public.pos_poll_state (
  store_mapping_id uuid primary key references public.pos_provider_store_mappings(id) on delete cascade,
  last_successful_to timestamptz,
  lease_id uuid,
  lease_expires_at timestamptz,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  constraint pos_poll_state_lease_pair_check check ((lease_id is null) = (lease_expires_at is null))
);

create table public.pos_poll_requests (
  id uuid primary key default gen_random_uuid(),
  store_mapping_id uuid not null references public.pos_provider_store_mappings(id) on delete cascade,
  requested_from timestamptz not null,
  requested_to timestamptz not null,
  status text not null default 'reserved',
  reserved_at timestamptz not null default now(),
  completed_at timestamptz,
  response_status integer,
  error_message text,
  constraint pos_poll_requests_range_check check (requested_to > requested_from and requested_to <= requested_from + interval '5 days'),
  constraint pos_poll_requests_status_check check (status in ('reserved', 'succeeded', 'failed'))
);

create index pos_poll_requests_rate_idx on public.pos_poll_requests (reserved_at desc)
  where status in ('reserved', 'succeeded');

create table public.pos_access_tokens (
  provider text not null,
  credential_key text not null,
  token_ciphertext bytea not null,
  token_iv bytea not null,
  token_auth_tag bytea not null,
  expires_at timestamptz not null,
  refresh_lease_id uuid,
  refresh_lease_expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (provider, credential_key),
  constraint pos_access_tokens_lease_pair_check check ((refresh_lease_id is null) = (refresh_lease_expires_at is null))
);

create or replace function public.reserve_pos_poll_request(
  p_store_mapping_id uuid,
  p_requested_from timestamptz,
  p_requested_to timestamptz,
  p_lease_seconds integer default 300
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_state public.pos_poll_state;
  v_count integer;
begin
  if p_lease_seconds < 30 or p_lease_seconds > 600 then
    raise exception 'Invalid POS poll lease duration';
  end if;
  if p_requested_to <= p_requested_from or p_requested_to > p_requested_from + interval '5 days' then
    raise exception 'APPZPOS polling range must be greater than zero and no more than five days';
  end if;
  if not exists (
    select 1 from public.pos_provider_store_mappings
    where id = p_store_mapping_id and provider = 'appzpos' and enabled
  ) then
    raise exception 'Active APPZPOS store mapping not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('appzpos:getorders:rate-limit', 0));
  insert into public.pos_poll_state (store_mapping_id) values (p_store_mapping_id)
  on conflict (store_mapping_id) do nothing;
  select * into v_state from public.pos_poll_state where store_mapping_id = p_store_mapping_id for update;
  if v_state.lease_expires_at is not null and v_state.lease_expires_at > clock_timestamp() then
    raise exception 'APPZPOS poll already in progress for this store';
  end if;

  select count(*) into v_count
  from public.pos_poll_requests
  where reserved_at > clock_timestamp() - interval '60 minutes'
    and status in ('reserved', 'succeeded');
  if v_count >= 12 then
    raise exception 'APPZPOS polling rate limit reservation unavailable';
  end if;

  insert into public.pos_poll_requests (store_mapping_id, requested_from, requested_to)
  values (p_store_mapping_id, p_requested_from, p_requested_to)
  returning id into v_request_id;
  update public.pos_poll_state
  set lease_id = v_request_id,
      lease_expires_at = clock_timestamp() + make_interval(secs => p_lease_seconds),
      last_attempt_at = clock_timestamp(),
      last_error = null,
      updated_at = clock_timestamp()
  where store_mapping_id = p_store_mapping_id;
  return v_request_id;
end
$$;

create or replace function public.complete_pos_poll_request(
  p_request_id uuid,
  p_succeeded boolean,
  p_response_status integer default null,
  p_error_message text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.pos_poll_requests;
begin
  select * into v_request from public.pos_poll_requests where id = p_request_id for update;
  if not found then raise exception 'POS poll request not found'; end if;
  if v_request.status <> 'reserved' then return; end if;

  update public.pos_poll_requests
  set status = case when p_succeeded then 'succeeded' else 'failed' end,
      completed_at = clock_timestamp(),
      response_status = p_response_status,
      error_message = case when p_error_message is null then null else left(p_error_message, 1000) end
  where id = p_request_id;

  update public.pos_poll_state
  set last_successful_to = case when p_succeeded then v_request.requested_to else last_successful_to end,
      last_success_at = case when p_succeeded then clock_timestamp() else last_success_at end,
      last_error = case when p_succeeded then null else left(coalesce(p_error_message, 'APPZPOS polling failed'), 1000) end,
      lease_id = null,
      lease_expires_at = null,
      updated_at = clock_timestamp()
  where store_mapping_id = v_request.store_mapping_id and lease_id = p_request_id;
end
$$;

create or replace function public.upsert_appzpos_order(
  p_provider_store_id text,
  p_order_reference text,
  p_referral_code text,
  p_order_status text,
  p_order_created_at timestamptz,
  p_order_created_raw text,
  p_subtotal_minor bigint,
  p_discount_minor bigint,
  p_item_discount_minor bigint,
  p_coupon_discount_minor bigint,
  p_total_payable_minor bigint,
  p_cup_quantity integer,
  p_payment_info jsonb,
  p_item_list jsonb,
  p_payload_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mapping public.pos_provider_store_mappings;
  v_store public.stores;
  v_referral text := nullif(btrim(p_referral_code), '');
  v_partner_id uuid;
  v_match_status text := 'none';
  v_order_id uuid;
  v_partner_code text;
begin
  select * into strict v_mapping
  from public.pos_provider_store_mappings
  where provider = 'appzpos' and external_store_id = p_provider_store_id and enabled;
  select * into strict v_store from public.stores where id = v_mapping.store_id and status = 'active' and deleted_at is null;

  if v_referral is not null then
    select p.id into v_partner_id
    from public.partner_referral_sessions s
    join public.partners p on p.id = s.partner_id
    where s.referral_reference = v_referral and p.status = 'active' and p.archived_at is null;
    if v_partner_id is null then
      select id into v_partner_id from public.partners
      where upper(partner_code) = upper(v_referral) and status = 'active' and archived_at is null;
    end if;
    if v_partner_id is not null then
      v_match_status := 'matched';
    elsif exists (
      select 1 from public.partners p
      left join public.partner_referral_sessions s on s.partner_id = p.id
      where upper(p.partner_code) = upper(v_referral) or s.referral_reference = v_referral
    ) then
      v_match_status := 'inactive';
    else
      v_match_status := 'unknown';
    end if;
  end if;

  insert into public.pos_provider_orders (
    provider, provider_store_id, store_id, order_reference, referral_code, partner_id,
    referral_match_status, order_status, order_created_at, order_created_raw, subtotal_minor, discount_minor,
    item_discount_minor, coupon_discount_minor, total_payable_minor, cup_quantity, payload_hash, currency_code, payment_info, item_list,
    paid_observed_at, cancelled_observed_at
  ) values (
    'appzpos', p_provider_store_id, v_mapping.store_id, p_order_reference, v_referral, v_partner_id,
    v_match_status, p_order_status, p_order_created_at, p_order_created_raw, p_subtotal_minor, p_discount_minor,
    p_item_discount_minor, p_coupon_discount_minor, p_total_payable_minor, p_cup_quantity, p_payload_hash, v_store.currency_code, p_payment_info, p_item_list,
    case when p_order_status in ('PAID', 'COMPLETED') then clock_timestamp() end,
    case when p_order_status = 'CANCELLED' then clock_timestamp() end
  )
  on conflict (provider, provider_store_id, order_reference) do update set
    referral_code = excluded.referral_code,
    partner_id = excluded.partner_id,
    referral_match_status = excluded.referral_match_status,
    order_status = excluded.order_status,
    order_created_at = excluded.order_created_at,
    order_created_raw = excluded.order_created_raw,
    subtotal_minor = excluded.subtotal_minor,
    discount_minor = excluded.discount_minor,
    item_discount_minor = excluded.item_discount_minor,
    coupon_discount_minor = excluded.coupon_discount_minor,
    total_payable_minor = excluded.total_payable_minor,
    cup_quantity = excluded.cup_quantity,
    payload_hash = excluded.payload_hash,
    currency_code = excluded.currency_code,
    payment_info = excluded.payment_info,
    item_list = excluded.item_list,
    last_seen_at = clock_timestamp(),
    paid_observed_at = coalesce(public.pos_provider_orders.paid_observed_at, excluded.paid_observed_at),
    cancelled_observed_at = coalesce(public.pos_provider_orders.cancelled_observed_at, excluded.cancelled_observed_at),
    updated_at = clock_timestamp()
  returning id into v_order_id;

  if p_order_status in ('PAID', 'COMPLETED') and v_partner_id is not null then
    select partner_code into v_partner_code from public.partners where id = v_partner_id;
    perform public.process_partner_pos_event(jsonb_build_object(
      'provider', 'appzpos',
      'eventId', 'appzpos:' || p_provider_store_id || ':' || p_order_reference || ':paid',
      'eventType', 'payment_succeeded',
      'payloadHash', p_payload_hash,
      'posOrderId', p_order_reference,
      'posTransactionId', p_provider_store_id || ':' || p_order_reference,
      'referralReference', v_referral,
      'partnerCode', v_partner_code,
      'occurredAt', p_order_created_at,
      'grossAmount', round(p_subtotal_minor::numeric / 100, 2),
      'discountAmount', round((p_discount_minor + p_item_discount_minor + p_coupon_discount_minor)::numeric / 100, 2),
      'paidAmount', round(p_total_payable_minor::numeric / 100, 2),
      'currency', v_store.currency_code,
      'cupQuantity', p_cup_quantity,
      'paymentMethod', null,
      'rawPayload', jsonb_build_object('source', 'appzpos_getorders', 'payloadHash', p_payload_hash)
    ));
  end if;

  return jsonb_build_object('id', v_order_id, 'matchStatus', v_match_status, 'partnerId', v_partner_id);
end
$$;

alter table public.pos_provider_store_mappings enable row level security;
alter table public.pos_provider_orders enable row level security;
alter table public.pos_poll_state enable row level security;
alter table public.pos_poll_requests enable row level security;
alter table public.pos_access_tokens enable row level security;

create policy partner_read_own_provider_orders on public.pos_provider_orders
for select to authenticated
using (exists (
  select 1 from public.partner_users pu
  join public.partners p on p.id = pu.partner_id and p.status = 'active' and p.archived_at is null
  where pu.partner_id = pos_provider_orders.partner_id and pu.auth_user_id = auth.uid() and pu.status = 'active'
));

revoke all on public.pos_provider_store_mappings, public.pos_provider_orders, public.pos_poll_state, public.pos_poll_requests, public.pos_access_tokens from public, anon, authenticated;
grant all on public.pos_provider_store_mappings, public.pos_provider_orders, public.pos_poll_state, public.pos_poll_requests, public.pos_access_tokens to service_role;
grant select on public.pos_provider_orders to authenticated;
revoke all on function public.reserve_pos_poll_request(uuid, timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.complete_pos_poll_request(uuid, boolean, integer, text) from public, anon, authenticated;
revoke all on function public.upsert_appzpos_order(text, text, text, text, timestamptz, text, bigint, bigint, bigint, bigint, bigint, integer, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.reserve_pos_poll_request(uuid, timestamptz, timestamptz, integer) to service_role;
grant execute on function public.complete_pos_poll_request(uuid, boolean, integer, text) to service_role;
grant execute on function public.upsert_appzpos_order(text, text, text, text, timestamptz, text, bigint, bigint, bigint, bigint, bigint, integer, jsonb, jsonb, text) to service_role;

commit;

