begin;

-- Commercial terms must always be explicit per partner. Existing values are unchanged.
alter table public.partners alter column customer_discount_rate drop default;
alter table public.partners alter column partner_reward_rate drop default;

alter table public.partners drop constraint if exists partners_customer_discount_rate_check;
alter table public.partners drop constraint if exists partners_partner_reward_rate_check;
alter table public.partners
  add constraint partners_customer_discount_rate_check
  check (customer_discount_rate between 0 and 0.30);
alter table public.partners
  add constraint partners_partner_reward_rate_check
  check (partner_reward_rate between 0 and 0.30);

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
  v_existing_tx public.pos_transactions;
  v_event_type text := coalesce(p_event->>'eventType', 'unknown');
  v_provider text := nullif(btrim(p_event->>'provider'), '');
  v_external_event text := nullif(btrim(p_event->>'eventId'), '');
  v_payload_hash text := nullif(btrim(p_event->>'payloadHash'), '');
  v_pos_tx text := nullif(btrim(p_event->>'posTransactionId'), '');
  v_ref text := nullif(btrim(p_event->>'referralReference'), '');
  v_partner_code text := nullif(upper(btrim(p_event->>'partnerCode')), '');
  v_gross numeric(14,2) := coalesce((p_event->>'grossAmount')::numeric, 0);
  v_discount numeric(14,2) := coalesce((p_event->>'discountAmount')::numeric, 0);
  v_paid numeric(14,2) := coalesce((p_event->>'paidAmount')::numeric, 0);
  v_refund numeric(14,2) := greatest(coalesce((p_event->>'refundedAmount')::numeric, 0), 0);
  v_rate numeric(7,6);
  v_original_commission numeric(14,2) := 0;
  v_reversed_commission numeric(14,2) := 0;
  v_remaining_commission numeric(14,2) := 0;
  v_target_reversal numeric(14,2) := 0;
  v_reversal numeric(14,2) := 0;
  v_refund_delta numeric(14,2) := 0;
  v_is_full_refund boolean := false;
  v_status text;
begin
  if v_provider is null or v_payload_hash is null then
    raise exception 'Provider and payload hash are required';
  end if;

  insert into public.webhook_events (provider, external_event_id, event_type, payload_hash, payload_json)
  values (v_provider, v_external_event, v_event_type, v_payload_hash, coalesce(p_event->'rawPayload', '{}'::jsonb))
  on conflict do nothing
  returning * into v_webhook;

  if v_webhook.id is null then
    return jsonb_build_object('status','duplicate');
  end if;

  select p.* into v_partner
  from public.partners p
  left join public.partner_referral_sessions s on s.partner_id = p.id and s.referral_reference = v_ref
  where p.status = 'active' and (s.id is not null or upper(p.partner_code) = v_partner_code)
  order by (s.id is not null) desc
  limit 1;

  if v_partner.id is null or v_pos_tx is null then
    update public.webhook_events
    set processing_status = 'ignored', processed_at = now(), processing_error = 'No active attributed partner or transaction ID'
    where id = v_webhook.id;
    return jsonb_build_object('status','ignored');
  end if;

  if v_gross < 0 or v_discount < 0 or v_paid < 0 then
    raise exception 'POS transaction amounts cannot be negative';
  end if;

  if v_event_type = 'payment_succeeded'
     and (not (p_event ? 'grossAmount') or not (p_event ? 'discountAmount') or not (p_event ? 'paidAmount')) then
    raise exception 'Verified paid transaction amounts are required';
  end if;

  if v_event_type in ('refund','partial_refund','order_voided') then
    select t.* into v_existing_tx
    from public.pos_transactions t
    where t.provider = v_provider and t.pos_transaction_id = v_pos_tx
    for update;

    if v_existing_tx.id is null then
      raise exception 'Cannot refund or void a transaction that has not been recorded';
    end if;

    if v_existing_tx.partner_id is distinct from v_partner.id then
      raise exception 'Refund partner attribution does not match the original transaction';
    end if;

    v_gross := v_existing_tx.gross_amount;
    v_discount := v_existing_tx.discount_amount;
    v_paid := v_existing_tx.paid_amount;

    if v_event_type in ('refund','partial_refund') then
      if v_existing_tx.paid_amount <= 0 then
        raise exception 'Cannot refund a transaction without a positive paid amount';
      end if;
      if v_refund > v_existing_tx.paid_amount then
        raise exception 'Cumulative refund % exceeds paid amount %', v_refund, v_existing_tx.paid_amount;
      end if;
      if v_refund < v_existing_tx.refunded_amount then
        raise exception 'Cumulative refund % cannot be lower than recorded refund %', v_refund, v_existing_tx.refunded_amount;
      end if;

      v_refund_delta := v_refund - v_existing_tx.refunded_amount;
      v_is_full_refund := v_refund = v_existing_tx.paid_amount;
      v_status := case when v_is_full_refund then 'refunded' else 'partially_refunded' end;
    else
      v_refund := v_existing_tx.refunded_amount;
      v_status := 'voided';
    end if;
  else
    v_status := case
      when v_event_type = 'payment_succeeded' then 'paid'
      when v_event_type = 'payment_failed' then 'failed'
      when v_event_type = 'order_cancelled' then 'cancelled'
      else 'pending'
    end;
  end if;

  insert into public.pos_transactions (
    provider, partner_id, partner_code, referral_reference, pos_order_id, pos_transaction_id,
    gross_amount, discount_amount, paid_amount, currency, cup_quantity, payment_status,
    transaction_status, payment_method, paid_at, refunded_amount, raw_event_id
  ) values (
    v_provider, v_partner.id, v_partner.partner_code, v_ref, nullif(p_event->>'posOrderId',''), v_pos_tx,
    v_gross, v_discount, v_paid,
    upper(coalesce(nullif(p_event->>'currency',''),'SGD')), greatest(coalesce((p_event->>'cupQuantity')::integer,0),0),
    v_status, v_status, nullif(p_event->>'paymentMethod',''), nullif(p_event->>'occurredAt','')::timestamptz,
    v_refund, v_webhook.id
  )
  on conflict (provider, pos_transaction_id) do update set
    payment_status = excluded.payment_status,
    transaction_status = excluded.transaction_status,
    refunded_amount = greatest(public.pos_transactions.refunded_amount, excluded.refunded_amount),
    updated_at = now(),
    raw_event_id = excluded.raw_event_id
  returning * into v_tx;

  if v_event_type = 'payment_succeeded' then
    v_rate := v_partner.partner_reward_rate;
    insert into public.partner_commission_ledger (
      partner_id, transaction_id, source_event_id, entry_type, eligible_amount,
      reward_rate, reward_amount, status, description
    ) values (
      v_partner.id, v_tx.id, v_webhook.id, 'commission', v_gross,
      v_rate, round(v_gross * v_rate, 2), 'earned', 'Confirmed POS payment'
    )
    on conflict do nothing;
  elsif v_event_type in ('refund','partial_refund','order_voided') then
    select l.reward_rate into v_rate
    from public.partner_commission_ledger l
    where l.transaction_id = v_tx.id and l.entry_type = 'commission';

    select
      coalesce(sum(l.reward_amount) filter (where l.entry_type = 'commission'), 0),
      coalesce(sum(-l.reward_amount) filter (where l.entry_type = 'commission_reversal'), 0)
    into v_original_commission, v_reversed_commission
    from public.partner_commission_ledger l
    where l.transaction_id = v_tx.id;

    if v_original_commission > 0 and v_rate is null then
      raise exception 'Original commission rate is missing for transaction %', v_tx.id;
    end if;

    v_remaining_commission := greatest(v_original_commission - v_reversed_commission, 0);

    if v_event_type = 'order_voided' or v_is_full_refund then
      v_reversal := v_remaining_commission;
    elsif v_refund_delta > 0 then
      v_target_reversal := least(
        v_original_commission,
        round(v_original_commission * v_refund / v_existing_tx.paid_amount, 2)
      );
      v_reversal := least(
        v_remaining_commission,
        greatest(v_target_reversal - v_reversed_commission, 0)
      );
    end if;

    if v_reversal > 0 then
      insert into public.partner_commission_ledger (
        partner_id, transaction_id, source_event_id, entry_type, eligible_amount,
        reward_rate, reward_amount, status, description
      ) values (
        v_partner.id, v_tx.id, v_webhook.id, 'commission_reversal',
        case when v_event_type = 'order_voided' then -v_tx.gross_amount else -v_refund_delta end,
        v_rate, -v_reversal, 'reversed',
        case when v_event_type = 'order_voided' then 'POS void commission reversal'
             when v_is_full_refund then 'POS full refund remaining commission reversal'
             else 'POS partial refund proportional commission reversal' end
      )
      on conflict do nothing;
    end if;
  end if;

  update public.webhook_events
  set processing_status = 'processed', processed_at = now()
  where id = v_webhook.id;

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

  if p_customer_discount_rate is null or p_customer_discount_rate < 0 or p_customer_discount_rate > 0.30 then
    raise exception 'Customer discount rate must be between 0 and 0.30';
  end if;
  if p_partner_reward_rate is null or p_partner_reward_rate < 0 or p_partner_reward_rate > 0.30 then
    raise exception 'Partner commission rate must be between 0 and 0.30';
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

revoke all on function public.process_partner_pos_event(jsonb) from public, anon, authenticated;
grant execute on function public.process_partner_pos_event(jsonb) to service_role;

revoke all on function public.update_partner_commercial_rates(uuid, numeric, numeric) from public, anon;
grant execute on function public.update_partner_commercial_rates(uuid, numeric, numeric) to authenticated, service_role;

commit;
