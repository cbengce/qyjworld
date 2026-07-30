create extension if not exists pgcrypto;
create extension if not exists citext;

create type record_status as enum ('draft', 'active', 'inactive', 'archived');
create type customer_status as enum ('active', 'suspended', 'deleted');
create type membership_status as enum ('pending', 'active', 'expired', 'suspended', 'cancelled');
create type membership_event_type as enum ('registered', 'activated', 'renewed', 'extended', 'suspended', 'expired', 'cancelled', 'reactivated');
create type points_transaction_type as enum ('purchase_reward', 'referral_reward', 'manual_adjustment', 'redemption', 'membership_renewal', 'promotional_reward', 'reversal');
create type referral_status as enum ('registered', 'membership_activated', 'cancelled');
create type referral_reward_status as enum ('pending', 'confirmed', 'rejected', 'reversed');
create type consent_type as enum ('membership_terms', 'privacy_policy', 'marketing');
create type role_scope_type as enum ('company', 'brand', 'store');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_email(raw_email text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(raw_email)), '');
$$;

create or replace function public.normalize_mobile(raw_mobile text)
returns text
language plpgsql
immutable
as $$
declare
  cleaned text;
begin
  if raw_mobile is null or length(trim(raw_mobile)) = 0 then
    return null;
  end if;

  cleaned := regexp_replace(trim(raw_mobile), '[^0-9+]', '', 'g');

  if cleaned ~ '^[689][0-9]{7}$' then
    return '+65' || cleaned;
  end if;

  if cleaned ~ '^65[689][0-9]{7}$' then
    return '+' || cleaned;
  end if;

  if cleaned ~ '^\+[1-9][0-9]{7,14}$' then
    return cleaned;
  end if;

  raise exception 'Invalid mobile number format';
end;
$$;
