begin;

-- Restore the approved paid-only Partner POS event boundary from migration 0022.
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

revoke all on function public.process_partner_pos_event(jsonb) from public, anon, authenticated;
grant execute on function public.process_partner_pos_event(jsonb) to service_role;

commit;
