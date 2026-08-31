begin;

do $$
begin
  if exists (
    select 1
    from public.partners
    where customer_discount_rate + partner_reward_rate > 0.30
  ) then
    raise exception 'Existing partner commercial rates exceed the combined 0.30 maximum';
  end if;
end;
$$;

alter table public.partners
  drop constraint if exists partners_combined_commercial_rate_check;

alter table public.partners
  add constraint partners_combined_commercial_rate_check
  check (customer_discount_rate + partner_reward_rate <= 0.30);

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
  if p_customer_discount_rate + p_partner_reward_rate > 0.30 then
    raise exception 'Combined customer discount and partner commission cannot exceed 0.30';
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

revoke all on function public.update_partner_commercial_rates(uuid, numeric, numeric) from public, anon;
grant execute on function public.update_partner_commercial_rates(uuid, numeric, numeric) to authenticated, service_role;

commit;
