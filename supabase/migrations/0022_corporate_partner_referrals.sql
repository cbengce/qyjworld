begin;

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  partner_code text not null,
  partner_name text not null,
  partner_type text not null default 'corporate',
  customer_discount_rate numeric(7,6) not null default 0.05,
  partner_reward_rate numeric(7,6) not null default 0.05,
  status text not null default 'active' check (status in ('active','inactive')),
  contact_name text,
  contact_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_code_format check (partner_code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'),
  constraint partners_customer_discount_rate_check check (customer_discount_rate >= 0 and customer_discount_rate <= 0.30),
  constraint partners_partner_reward_rate_check check (partner_reward_rate >= 0 and partner_reward_rate <= 0.30),
  constraint partners_combined_commercial_rate_check check (customer_discount_rate + partner_reward_rate <= 0.30)
);
create unique index partners_code_unique on public.partners (upper(partner_code));
create index partners_status_name_idx on public.partners (status, partner_name);

create table public.partner_users (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  unique (partner_id, auth_user_id)
);
create index partner_users_auth_idx on public.partner_users (auth_user_id, status);

create table public.partner_referral_sessions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete restrict,
  partner_code text not null,
  referral_reference text not null unique,
  landing_url text not null,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now(),
  redirected_at timestamptz
);
create index partner_referral_sessions_partner_created_idx on public.partner_referral_sessions (partner_id, created_at desc);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text,
  event_type text not null,
  payload_hash text not null,
  payload_json jsonb not null,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','failed')),
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
create unique index webhook_events_provider_external_unique on public.webhook_events (provider, external_event_id) where external_event_id is not null;
create unique index webhook_events_provider_hash_unique on public.webhook_events (provider, payload_hash);
create index webhook_events_status_received_idx on public.webhook_events (processing_status, received_at desc);

create table public.pos_transactions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  partner_id uuid references public.partners(id) on delete restrict,
  partner_code text,
  referral_reference text,
  pos_order_id text,
  pos_transaction_id text not null,
  gross_amount numeric(14,2) not null default 0 check (gross_amount >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  currency char(3) not null default 'SGD',
  cup_quantity integer not null default 0 check (cup_quantity >= 0),
  payment_status text not null default 'paid' check (payment_status = 'paid'),
  transaction_status text not null default 'paid' check (transaction_status = 'paid'),
  payment_method text,
  paid_at timestamptz not null,
  raw_event_id uuid references public.webhook_events(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, pos_transaction_id)
);
create index pos_transactions_partner_paid_idx on public.pos_transactions (partner_id, paid_at desc);
create index pos_transactions_order_idx on public.pos_transactions (provider, pos_order_id);
create index pos_transactions_referral_idx on public.pos_transactions (referral_reference);

create table public.partner_commission_ledger (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  transaction_id uuid not null references public.pos_transactions(id) on delete restrict,
  source_event_id uuid references public.webhook_events(id) on delete restrict,
  entry_type text not null default 'commission' check (entry_type = 'commission'),
  eligible_amount numeric(14,2) not null check (eligible_amount >= 0),
  reward_rate numeric(7,6) not null check (reward_rate >= 0 and reward_rate <= 0.30),
  reward_amount numeric(14,2) not null check (reward_amount >= 0),
  status text not null default 'earned' check (status = 'earned'),
  description text,
  created_at timestamptz not null default now()
);
create unique index partner_commission_one_per_transaction on public.partner_commission_ledger (transaction_id) where entry_type = 'commission';
create unique index partner_commission_source_event_unique on public.partner_commission_ledger (source_event_id) where source_event_id is not null;
create index partner_commission_partner_created_idx on public.partner_commission_ledger (partner_id, created_at desc);

create or replace function public.process_partner_pos_event(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_webhook public.webhook_events;
  v_partner public.partners;
  v_tx public.pos_transactions;
  v_event_type text := coalesce(p_event->>'eventType', 'unknown');
  v_provider text := nullif(btrim(p_event->>'provider'), '');
  v_external_event text := nullif(btrim(p_event->>'eventId'), '');
  v_payload_hash text := nullif(btrim(p_event->>'payloadHash'), '');
  v_pos_tx text := nullif(btrim(p_event->>'posTransactionId'), '');
  v_ref text := nullif(btrim(p_event->>'referralReference'), '');
  v_partner_code text := nullif(upper(btrim(p_event->>'partnerCode')), '');
  v_occurred_at_text text := nullif(btrim(p_event->>'occurredAt'), '');
  v_gross_text text := nullif(btrim(p_event->>'grossAmount'), '');
  v_currency text := nullif(upper(btrim(p_event->>'currency')), '');
  v_cup_quantity_text text := nullif(btrim(p_event->>'cupQuantity'), '');
  v_occurred_at timestamptz;
  v_gross numeric(14,2);
  v_cup_quantity integer;
  v_rate numeric(7,6);
begin
  if v_provider is null or v_payload_hash is null then raise exception 'Provider and payload hash are required'; end if;

  insert into public.webhook_events (provider, external_event_id, event_type, payload_hash, payload_json)
  values (v_provider, v_external_event, v_event_type, v_payload_hash, coalesce(p_event->'rawPayload', '{}'::jsonb))
  on conflict do nothing
  returning * into v_webhook;
  if v_webhook.id is null then return jsonb_build_object('status','duplicate'); end if;

  if v_event_type <> 'payment_succeeded' then
    update public.webhook_events
    set processing_status = 'ignored', processed_at = now(), processing_error = 'Only confirmed paid events are in scope for the Partner MVP'
    where id = v_webhook.id;
    return jsonb_build_object('status','ignored');
  end if;

  if v_pos_tx is null
     or v_occurred_at_text is null
     or v_gross_text is null
     or v_currency is null
     or v_cup_quantity_text is null then
    raise exception 'Confirmed paid event requires posTransactionId, occurredAt, grossAmount, currency and cupQuantity';
  end if;

  begin
    v_occurred_at := v_occurred_at_text::timestamptz;
    v_gross := v_gross_text::numeric;
    v_cup_quantity := v_cup_quantity_text::integer;
  exception
    when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
      raise exception 'Confirmed paid event contains an invalid occurredAt, grossAmount or cupQuantity';
  end;

  if v_gross < 0 then
    raise exception 'Confirmed paid event grossAmount must not be negative';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Confirmed paid event currency must be a three-letter code';
  end if;
  if v_cup_quantity < 0 then
    raise exception 'Confirmed paid event cupQuantity must not be negative';
  end if;

  select p.* into v_partner
  from public.partners p
  left join public.partner_referral_sessions s on s.partner_id = p.id and s.referral_reference = v_ref
  where p.status = 'active' and (s.id is not null or upper(p.partner_code) = v_partner_code)
  order by (s.id is not null) desc
  limit 1;

  if v_partner.id is null then
    update public.webhook_events set processing_status = 'ignored', processed_at = now(), processing_error = 'No active attributed partner' where id = v_webhook.id;
    return jsonb_build_object('status','ignored');
  end if;

  insert into public.pos_transactions (
    provider, partner_id, partner_code, referral_reference, pos_order_id, pos_transaction_id,
    gross_amount, discount_amount, paid_amount, currency, cup_quantity, payment_status,
    transaction_status, payment_method, paid_at, raw_event_id
  ) values (
    v_provider, v_partner.id, v_partner.partner_code, v_ref, nullif(p_event->>'posOrderId',''), v_pos_tx,
    v_gross, greatest(coalesce((p_event->>'discountAmount')::numeric,0),0), greatest(coalesce((p_event->>'paidAmount')::numeric,0),0),
    v_currency, v_cup_quantity,
    'paid', 'paid',
    nullif(p_event->>'paymentMethod',''), v_occurred_at, v_webhook.id
  )
  on conflict (provider, pos_transaction_id) do nothing
  returning * into v_tx;

  if v_tx.id is null then
    update public.webhook_events
    set processing_status = 'ignored', processed_at = now(), processing_error = 'Duplicate POS transaction'
    where id = v_webhook.id;
    return jsonb_build_object('status','duplicate');
  end if;

  v_rate := v_partner.partner_reward_rate;
  insert into public.partner_commission_ledger (partner_id, transaction_id, source_event_id, entry_type, eligible_amount, reward_rate, reward_amount, status, description)
  values (v_partner.id, v_tx.id, v_webhook.id, 'commission', v_gross, v_rate, round(v_gross * v_rate, 2), 'earned', 'Confirmed POS payment')
  on conflict do nothing;

  update public.webhook_events set processing_status = 'processed', processed_at = now() where id = v_webhook.id;
  return jsonb_build_object('status','processed','transactionId',v_tx.id,'partnerId',v_partner.id);
end;
$$;

create or replace function public.update_partner_commercial_rates(
  p_partner_id uuid,
  p_customer_discount_rate numeric,
  p_partner_reward_rate numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner public.partners;
  v_staff_id uuid := public.current_staff_user_id();
begin
  if auth.uid() is null or v_staff_id is null
     or not public.staff_has_permission('settings.manage', null, null, null) then
    raise exception 'Insufficient permission';
  end if;

  if p_customer_discount_rate is null
     or p_customer_discount_rate < 0
     or p_customer_discount_rate > 0.30 then
    raise exception 'Customer discount rate must be between 0 and 0.30';
  end if;
  if p_partner_reward_rate is null
     or p_partner_reward_rate < 0
     or p_partner_reward_rate > 0.30 then
    raise exception 'Partner commission rate must be between 0 and 0.30';
  end if;
  if p_customer_discount_rate + p_partner_reward_rate > 0.30 then
    raise exception 'Customer benefit and partner commission must not exceed 30%% combined';
  end if;

  select p.* into v_partner
  from public.partners p
  where p.id = p_partner_id
  for update;

  if v_partner.id is null then
    raise exception 'Partner not found';
  end if;

  if v_partner.customer_discount_rate is distinct from p_customer_discount_rate
     or v_partner.partner_reward_rate is distinct from p_partner_reward_rate then
    update public.partners
    set customer_discount_rate = p_customer_discount_rate,
        partner_reward_rate = p_partner_reward_rate,
        updated_at = now()
    where id = p_partner_id;

    insert into public.audit_logs (
      actor_staff_user_id, action, entity_type, entity_id, idempotency_key, metadata, created_by
    ) values (
      v_staff_id,
      'partner.commercial_rates.update',
      'partners',
      p_partner_id,
      'partner-rates:' || p_partner_id::text || ':' || extract(epoch from clock_timestamp())::text,
      jsonb_build_object(
        'partner_code', v_partner.partner_code,
        'old_customer_discount_rate', v_partner.customer_discount_rate,
        'new_customer_discount_rate', p_customer_discount_rate,
        'old_partner_reward_rate', v_partner.partner_reward_rate,
        'new_partner_reward_rate', p_partner_reward_rate
      ),
      auth.uid()
    );
  end if;

  return jsonb_build_object(
    'partnerId', p_partner_id,
    'customerDiscountRate', p_customer_discount_rate,
    'partnerRewardRate', p_partner_reward_rate
  );
end;
$$;

alter table public.partners enable row level security;
alter table public.partner_users enable row level security;
alter table public.partner_referral_sessions enable row level security;
alter table public.pos_transactions enable row level security;
alter table public.partner_commission_ledger enable row level security;
alter table public.webhook_events enable row level security;

create policy partner_read_own_profile on public.partners for select to authenticated using (partners.status = 'active' and exists (select 1 from public.partner_users pu where pu.partner_id = partners.id and pu.auth_user_id = auth.uid() and pu.status = 'active'));
create policy partner_read_own_mapping on public.partner_users for select to authenticated using (partner_users.auth_user_id = auth.uid() and partner_users.status = 'active');
create policy partner_read_own_sessions on public.partner_referral_sessions for select to authenticated using (exists (select 1 from public.partner_users pu join public.partners p on p.id = pu.partner_id and p.status = 'active' where pu.partner_id = partner_referral_sessions.partner_id and pu.auth_user_id = auth.uid() and pu.status = 'active'));
create policy partner_read_own_transactions on public.pos_transactions for select to authenticated using (exists (select 1 from public.partner_users pu join public.partners p on p.id = pu.partner_id and p.status = 'active' where pu.partner_id = pos_transactions.partner_id and pu.auth_user_id = auth.uid() and pu.status = 'active'));
create policy partner_read_own_commissions on public.partner_commission_ledger for select to authenticated using (exists (select 1 from public.partner_users pu join public.partners p on p.id = pu.partner_id and p.status = 'active' where pu.partner_id = partner_commission_ledger.partner_id and pu.auth_user_id = auth.uid() and pu.status = 'active'));
revoke all on public.partners, public.partner_users, public.partner_referral_sessions, public.pos_transactions, public.partner_commission_ledger, public.webhook_events from public, anon, authenticated;
grant select on public.partners, public.partner_users, public.partner_referral_sessions, public.pos_transactions, public.partner_commission_ledger to authenticated;
grant all on public.partners, public.partner_users, public.partner_referral_sessions, public.pos_transactions, public.partner_commission_ledger, public.webhook_events to service_role;
revoke all on function public.process_partner_pos_event(jsonb) from public, anon, authenticated;
grant execute on function public.process_partner_pos_event(jsonb) to service_role;
revoke all on function public.update_partner_commercial_rates(uuid, numeric, numeric) from public, anon;
grant execute on function public.update_partner_commercial_rates(uuid, numeric, numeric) to authenticated, service_role;

commit;
