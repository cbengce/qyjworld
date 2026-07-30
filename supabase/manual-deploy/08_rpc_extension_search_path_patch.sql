-- Qing Yun Jian Phase 2 RPC runtime patch.
-- Purpose: make code-generation helpers work in hosted Supabase projects where
-- pgcrypto functions are installed in the extensions schema.
--
-- This does not change business rules, RLS policies, grants, seed data, prices,
-- membership duration, or table structure.

begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.make_customer_no()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select 'QYJC' || to_char(now(), 'YYMM') || upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 10));
$$;

create or replace function public.make_membership_no()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select 'QYJM' || to_char(now(), 'YYMM') || upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 10));
$$;

create or replace function public.make_points_account_no()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select 'QYJP' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 12));
$$;

create or replace function public.make_referral_code()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select 'QYJ-' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 8));
$$;

-- Keep these internal helpers non-callable from browser roles.
revoke execute on function public.make_customer_no() from public, anon, authenticated;
revoke execute on function public.make_membership_no() from public, anon, authenticated;
revoke execute on function public.make_points_account_no() from public, anon, authenticated;
revoke execute on function public.make_referral_code() from public, anon, authenticated;

-- Verification: each helper should now execute successfully for the function owner.
select
  public.make_customer_no() as sample_customer_no,
  public.make_membership_no() as sample_membership_no,
  public.make_points_account_no() as sample_points_account_no,
  public.make_referral_code() as sample_referral_code;

commit;
