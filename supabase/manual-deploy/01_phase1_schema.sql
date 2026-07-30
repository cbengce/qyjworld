-- ============================================================================
-- BEGIN ORIGINAL MIGRATION: supabase/migrations/0001_extensions_and_types.sql
-- ============================================================================

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


-- END ORIGINAL MIGRATION: supabase/migrations/0001_extensions_and_types.sql

-- ============================================================================
-- BEGIN ORIGINAL MIGRATION: supabase/migrations/0002_core_tables.sql
-- ============================================================================

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  registration_no text,
  country_code char(2) not null,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (registration_no)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  brand_code text not null,
  name_en text not null,
  name_zh text,
  tagline text,
  core_line text,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (company_id, brand_code)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  store_code text not null,
  name text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null default 'Singapore',
  country_code char(2) not null default 'SG',
  postal_code text,
  timezone text not null default 'Asia/Singapore',
  currency_code char(3) not null default 'SGD',
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (brand_id, store_code)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  customer_no text not null unique,
  primary_mobile_raw text,
  primary_mobile_normalized text generated always as (public.normalize_mobile(primary_mobile_raw)) stored,
  primary_email_raw text,
  primary_email_normalized text generated always as (public.normalize_email(primary_email_raw)) stored,
  status customer_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  check (primary_mobile_raw is not null or primary_email_raw is not null),
  unique (primary_mobile_normalized),
  unique (primary_email_normalized)
);

create table public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'zh')),
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

create table public.customer_consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  consent_type consent_type not null,
  consent_document_version text not null,
  accepted_at timestamptz not null,
  revoked_at timestamptz,
  source text not null,
  metadata jsonb not null default '{}',
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  plan_code text not null,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  currency_code char(3) not null default 'SGD',
  duration_days integer not null check (duration_days > 0),
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (brand_id, plan_code)
);

create table public.customer_memberships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  brand_id uuid not null references public.brands(id),
  membership_plan_id uuid not null references public.membership_plans(id),
  membership_no text not null,
  status membership_status not null default 'pending',
  activated_at timestamptz,
  starts_at timestamptz,
  expires_at timestamptz,
  activated_by_staff_user_id uuid,
  activation_reference text,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (brand_id, membership_no),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table public.membership_events (
  id uuid primary key default gen_random_uuid(),
  customer_membership_id uuid not null references public.customer_memberships(id),
  event_type membership_event_type not null,
  event_at timestamptz not null default now(),
  staff_user_id uuid,
  reason text,
  reference_no text,
  idempotency_key text,
  metadata jsonb not null default '{}',
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (customer_membership_id, idempotency_key)
);

create table public.points_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  brand_id uuid not null references public.brands(id),
  points_currency_code text not null default 'QYJ_POINTS',
  account_no text not null unique,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (customer_id, brand_id, points_currency_code)
);

create table public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  points_account_id uuid not null references public.points_accounts(id),
  transaction_type points_transaction_type not null,
  points_delta integer not null check (points_delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  description text not null,
  reference_no text,
  staff_user_id uuid,
  reversed_points_transaction_id uuid references public.points_transactions(id),
  idempotency_key text not null,
  metadata jsonb not null default '{}',
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (points_account_id, idempotency_key)
);

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  brand_id uuid not null references public.brands(id),
  code text not null,
  referral_url text not null,
  qr_payload text not null,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (brand_id, code),
  unique (customer_id, brand_id)
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  referrer_customer_id uuid not null references public.customers(id),
  referred_customer_id uuid not null references public.customers(id),
  referral_code_id uuid not null references public.referral_codes(id),
  registration_at timestamptz not null default now(),
  membership_activated_at timestamptz,
  referral_status referral_status not null default 'registered',
  reward_status referral_reward_status not null default 'pending',
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (brand_id, referred_customer_id),
  check (referrer_customer_id <> referred_customer_id)
);

create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id),
  reward_type text not null,
  points_transaction_id uuid references public.points_transactions(id),
  reward_status referral_reward_status not null default 'pending',
  approved_by_staff_user_id uuid,
  approved_at timestamptz,
  idempotency_key text,
  metadata jsonb not null default '{}',
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.staff_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  staff_no text not null unique,
  full_name text not null,
  email_raw text not null,
  email_normalized text generated always as (public.normalize_email(email_raw)) stored,
  mobile_raw text,
  mobile_normalized text generated always as (public.normalize_mobile(mobile_raw)) stored,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (email_normalized)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  role_code text not null unique,
  name text not null,
  description text,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  permission_code text not null unique,
  description text,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (role_id, permission_id)
);

create table public.staff_role_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.staff_users(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  scope_type role_scope_type not null,
  company_id uuid references public.companies(id),
  brand_id uuid references public.brands(id),
  store_id uuid references public.stores(id),
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  check (
    (scope_type = 'company' and company_id is not null and brand_id is null and store_id is null)
    or (scope_type = 'brand' and company_id is null and brand_id is not null and store_id is null)
    or (scope_type = 'store' and company_id is null and brand_id is null and store_id is not null)
  )
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_staff_user_id uuid references public.staff_users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  idempotency_key text,
  metadata jsonb not null default '{}',
  ip_address inet,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  parent_category_id uuid references public.product_categories(id),
  name_en text not null,
  name_zh text,
  display_order integer not null default 0,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (brand_id, name_en)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  category_id uuid references public.product_categories(id),
  sku text not null,
  name_en text not null,
  name_zh text,
  description_en text,
  description_zh text,
  status record_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (brand_id, sku),
  unique (id, brand_id)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text_en text,
  alt_text_zh text,
  is_primary boolean not null default false,
  display_order integer not null default 0,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  store_id uuid not null references public.stores(id),
  name text not null,
  valid_from timestamptz,
  valid_to timestamptz,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (store_id, name, valid_from)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  product_id uuid not null,
  product_brand_id uuid not null,
  regular_price numeric(10,2) check (regular_price is null or regular_price >= 0),
  member_price numeric(10,2) check (member_price is null or member_price >= 0),
  display_order integer not null default 0,
  is_featured boolean not null default false,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  foreign key (product_id, product_brand_id) references public.products(id, brand_id),
  unique (menu_id, product_id),
  check (member_price is null or regular_price is null or member_price <= regular_price)
);

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id),
  key text not null,
  value_json jsonb not null,
  description text,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (brand_id, key)
);

alter table public.membership_plans add constraint membership_plans_id_brand_unique unique (id, brand_id);
alter table public.customer_memberships add constraint customer_memberships_plan_brand_fk
  foreign key (membership_plan_id, brand_id) references public.membership_plans(id, brand_id);
alter table public.customer_memberships add constraint customer_memberships_staff_fk foreign key (activated_by_staff_user_id) references public.staff_users(id);
alter table public.membership_events add constraint membership_events_staff_fk foreign key (staff_user_id) references public.staff_users(id);
alter table public.points_transactions add constraint points_transactions_staff_fk foreign key (staff_user_id) references public.staff_users(id);
alter table public.referral_rewards add constraint referral_rewards_staff_fk foreign key (approved_by_staff_user_id) references public.staff_users(id);


-- END ORIGINAL MIGRATION: supabase/migrations/0002_core_tables.sql

-- ============================================================================
-- BEGIN ORIGINAL MIGRATION: supabase/migrations/0003_indexes_and_triggers.sql
-- ============================================================================

create unique index customer_memberships_one_active_per_brand_idx
  on public.customer_memberships (customer_id, brand_id)
  where status = 'active';

create unique index referral_rewards_one_confirmed_type_idx
  on public.referral_rewards (referral_id, reward_type)
  where reward_status = 'confirmed';
create unique index points_transactions_one_reversal_idx
  on public.points_transactions (reversed_points_transaction_id)
  where reversed_points_transaction_id is not null;
create unique index referral_rewards_idempotency_idx
  on public.referral_rewards (referral_id, idempotency_key)
  where idempotency_key is not null;

create index customers_auth_user_idx on public.customers (auth_user_id);
create index customers_mobile_normalized_idx on public.customers (primary_mobile_normalized);
create index customers_email_normalized_idx on public.customers (primary_email_normalized);
create index memberships_customer_brand_status_idx on public.customer_memberships (customer_id, brand_id, status);
create index memberships_expires_idx on public.customer_memberships (expires_at);
create index membership_events_membership_created_idx on public.membership_events (customer_membership_id, created_at desc);
create index points_accounts_customer_brand_idx on public.points_accounts (customer_id, brand_id, points_currency_code);
create index points_transactions_account_created_idx on public.points_transactions (points_account_id, created_at desc);
create index referrals_brand_referrer_idx on public.referrals (brand_id, referrer_customer_id);
create index referrals_brand_referred_idx on public.referrals (brand_id, referred_customer_id);
create index staff_assignments_staff_scope_idx on public.staff_role_assignments (staff_user_id, scope_type, company_id, brand_id, store_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index products_brand_category_idx on public.products (brand_id, category_id, status);
create index menus_brand_store_idx on public.menus (brand_id, store_id, status);
create index menu_items_menu_featured_idx on public.menu_items (menu_id, is_featured, display_order);

create trigger companies_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger brands_updated_at before update on public.brands for each row execute function public.set_updated_at();
create trigger stores_updated_at before update on public.stores for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger customer_profiles_updated_at before update on public.customer_profiles for each row execute function public.set_updated_at();
create trigger customer_consents_updated_at before update on public.customer_consents for each row execute function public.set_updated_at();
create trigger membership_plans_updated_at before update on public.membership_plans for each row execute function public.set_updated_at();
create trigger customer_memberships_updated_at before update on public.customer_memberships for each row execute function public.set_updated_at();
create trigger points_accounts_updated_at before update on public.points_accounts for each row execute function public.set_updated_at();
create trigger referral_codes_updated_at before update on public.referral_codes for each row execute function public.set_updated_at();
create trigger referrals_updated_at before update on public.referrals for each row execute function public.set_updated_at();
create trigger staff_users_updated_at before update on public.staff_users for each row execute function public.set_updated_at();
create trigger roles_updated_at before update on public.roles for each row execute function public.set_updated_at();
create trigger permissions_updated_at before update on public.permissions for each row execute function public.set_updated_at();
create trigger role_permissions_updated_at before update on public.role_permissions for each row execute function public.set_updated_at();
create trigger staff_role_assignments_updated_at before update on public.staff_role_assignments for each row execute function public.set_updated_at();
create trigger product_categories_updated_at before update on public.product_categories for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_images_updated_at before update on public.product_images for each row execute function public.set_updated_at();
create trigger menus_updated_at before update on public.menus for each row execute function public.set_updated_at();
create trigger menu_items_updated_at before update on public.menu_items for each row execute function public.set_updated_at();
create trigger site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

create or replace function public.validate_referral_brand()
returns trigger
language plpgsql
as $$
declare
  code_brand uuid;
  code_owner uuid;
begin
  select brand_id, customer_id into code_brand, code_owner
  from public.referral_codes
  where id = new.referral_code_id;

  if code_brand is distinct from new.brand_id then
    raise exception 'Referral code brand does not match referral brand';
  end if;

  if code_owner is distinct from new.referrer_customer_id then
    raise exception 'Referral code does not belong to referrer';
  end if;

  return new;
end;
$$;

create trigger referrals_validate_brand before insert or update on public.referrals
for each row execute function public.validate_referral_brand();

create or replace function public.validate_staff_role_scope_hierarchy()
returns trigger
language plpgsql
as $$
declare
  store_brand uuid;
  brand_company uuid;
begin
  if new.scope_type = 'brand' then
    select company_id into brand_company from public.brands where id = new.brand_id;
    if brand_company is null then
      raise exception 'Invalid brand scope';
    end if;
  elsif new.scope_type = 'store' then
    select s.brand_id into store_brand from public.stores s where s.id = new.store_id;
    if store_brand is null then
      raise exception 'Invalid store scope';
    end if;
  elsif new.scope_type = 'company' then
    perform 1 from public.companies where id = new.company_id;
    if not found then
      raise exception 'Invalid company scope';
    end if;
  end if;

  return new;
end;
$$;

create trigger staff_role_scope_validate before insert or update on public.staff_role_assignments
for each row execute function public.validate_staff_role_scope_hierarchy();

create or replace function public.validate_menu_brand_integrity()
returns trigger
language plpgsql
as $$
declare
  menu_brand uuid;
  store_brand uuid;
begin
  select m.brand_id, s.brand_id into menu_brand, store_brand
  from public.menus m
  join public.stores s on s.id = m.store_id
  where m.id = new.menu_id;

  if menu_brand is distinct from store_brand then
    raise exception 'Menu brand does not match store brand';
  end if;

  if new.product_brand_id is distinct from menu_brand then
    raise exception 'Menu item product brand does not match menu brand';
  end if;

  return new;
end;
$$;

create trigger menu_items_validate_brand before insert or update on public.menu_items
for each row execute function public.validate_menu_brand_integrity();

create or replace function public.validate_menu_store_brand()
returns trigger
language plpgsql
as $$
declare
  store_brand uuid;
begin
  select brand_id into store_brand from public.stores where id = new.store_id;
  if store_brand is distinct from new.brand_id then
    raise exception 'Menu brand does not match store brand';
  end if;
  return new;
end;
$$;

create trigger menus_validate_store_brand before insert or update on public.menus
for each row execute function public.validate_menu_store_brand();

create or replace function public.validate_product_category_brand()
returns trigger
language plpgsql
as $$
declare
  category_brand uuid;
begin
  if new.category_id is null then
    return new;
  end if;
  select brand_id into category_brand from public.product_categories where id = new.category_id;
  if category_brand is distinct from new.brand_id then
    raise exception 'Product category brand does not match product brand';
  end if;
  return new;
end;
$$;

create trigger products_validate_category_brand before insert or update on public.products
for each row execute function public.validate_product_category_brand();


-- END ORIGINAL MIGRATION: supabase/migrations/0003_indexes_and_triggers.sql

-- ============================================================================
-- BEGIN ORIGINAL MIGRATION: supabase/migrations/0004_security_and_business_functions.sql
-- ============================================================================

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


-- END ORIGINAL MIGRATION: supabase/migrations/0004_security_and_business_functions.sql

-- ============================================================================
-- BEGIN ORIGINAL MIGRATION: supabase/migrations/0005_rls_policies.sql
-- ============================================================================

alter table public.companies enable row level security;
alter table public.brands enable row level security;
alter table public.stores enable row level security;
alter table public.customers enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.customer_consents enable row level security;
alter table public.membership_plans enable row level security;
alter table public.customer_memberships enable row level security;
alter table public.membership_events enable row level security;
alter table public.points_accounts enable row level security;
alter table public.points_transactions enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.staff_users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_role_assignments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.menus enable row level security;
alter table public.menu_items enable row level security;
alter table public.site_settings enable row level security;

create policy companies_public_read on public.companies for select using (status = 'active');
create policy brands_public_read on public.brands for select using (status = 'active');
create policy stores_public_read on public.stores for select using (status = 'active');

create policy customers_self_or_staff_read on public.customers
  for select using (
    id = public.current_customer_id()
    or exists (
      select 1 from public.customer_memberships cm
      where cm.customer_id = customers.id
        and public.staff_has_permission('member.read', cm.brand_id, null, null)
    )
    or exists (
      select 1 from public.points_accounts pa
      where pa.customer_id = customers.id
        and public.staff_has_permission('member.read', pa.brand_id, null, null)
    )
  );

create policy customer_profiles_self_or_staff_read on public.customer_profiles
  for select using (
    customer_id = public.current_customer_id()
    or exists (
      select 1 from public.customer_memberships cm
      where cm.customer_id = customer_profiles.customer_id
        and public.staff_has_permission('member.read', cm.brand_id, null, null)
    )
  );

create policy customer_consents_self_or_staff_read on public.customer_consents
  for select using (
    customer_id = public.current_customer_id()
    or exists (
      select 1 from public.customer_memberships cm
      where cm.customer_id = customer_consents.customer_id
        and public.staff_has_permission('member.read', cm.brand_id, null, null)
    )
  );

create policy membership_plans_public_read on public.membership_plans
  for select using (status = 'active');

create policy customer_memberships_self_or_staff_read on public.customer_memberships
  for select using (
    customer_id = public.current_customer_id()
    or public.staff_has_permission('membership.read', brand_id, null, null)
  );

create policy membership_events_self_or_staff_read on public.membership_events
  for select using (
    exists (
      select 1 from public.customer_memberships cm
      where cm.id = customer_membership_id
        and (cm.customer_id = public.current_customer_id() or public.staff_has_permission('membership.read', cm.brand_id, null, null))
    )
  );

create policy points_accounts_self_or_staff_read on public.points_accounts
  for select using (
    customer_id = public.current_customer_id()
    or public.staff_has_permission('points.read', brand_id, null, null)
  );

create policy points_transactions_self_or_staff_read on public.points_transactions
  for select using (
    exists (
      select 1 from public.points_accounts pa
      where pa.id = points_account_id
        and (pa.customer_id = public.current_customer_id() or public.staff_has_permission('points.read', pa.brand_id, null, null))
    )
  );

create policy referral_codes_self_or_staff_read on public.referral_codes
  for select using (
    customer_id = public.current_customer_id()
    or public.staff_has_permission('referral.read', brand_id, null, null)
  );

create policy referrals_self_or_staff_read on public.referrals
  for select using (
    referrer_customer_id = public.current_customer_id()
    or referred_customer_id = public.current_customer_id()
    or public.staff_has_permission('referral.read', brand_id, null, null)
  );

create policy referral_rewards_self_or_staff_read on public.referral_rewards
  for select using (
    exists (
      select 1 from public.referrals r
      where r.id = referral_id
        and (
          r.referrer_customer_id = public.current_customer_id()
          or r.referred_customer_id = public.current_customer_id()
          or public.staff_has_permission('referral.read', r.brand_id, null, null)
        )
    )
  );

create policy staff_users_self_or_manager_read on public.staff_users
  for select using (id = public.current_staff_user_id() or public.staff_has_permission('staff.manage', null, null, null));

create policy roles_staff_read on public.roles
  for select using (public.current_staff_user_id() is not null);

create policy permissions_staff_read on public.permissions
  for select using (public.current_staff_user_id() is not null);

create policy role_permissions_staff_read on public.role_permissions
  for select using (public.current_staff_user_id() is not null);

create policy staff_role_assignments_self_or_manager_read on public.staff_role_assignments
  for select using (staff_user_id = public.current_staff_user_id() or public.staff_has_permission('staff.manage', null, null, null));

create policy audit_logs_staff_read on public.audit_logs
  for select using (public.staff_has_permission('audit.read', null, null, null));

create policy product_categories_public_read on public.product_categories
  for select using (status = 'active');

create policy products_public_read on public.products
  for select using (status = 'active');

create policy product_images_public_read on public.product_images
  for select using (status = 'active');

create policy menus_public_read on public.menus
  for select using (status = 'active' and (valid_from is null or valid_from <= now()) and (valid_to is null or valid_to >= now()));

create policy menu_items_public_read on public.menu_items
  for select using (status = 'active');

create policy site_settings_public_read on public.site_settings
  for select using (status = 'active');

create policy product_categories_staff_manage on public.product_categories
  for all using (public.staff_has_permission('menu.manage', brand_id, null, null))
  with check (public.staff_has_permission('menu.manage', brand_id, null, null));

create policy products_staff_manage on public.products
  for all using (public.staff_has_permission('menu.manage', brand_id, null, null))
  with check (public.staff_has_permission('menu.manage', brand_id, null, null));

create policy menus_staff_manage on public.menus
  for all using (public.staff_has_permission('menu.manage', brand_id, store_id, null))
  with check (public.staff_has_permission('menu.manage', brand_id, store_id, null));

create policy menu_items_staff_manage on public.menu_items
  for all using (
    exists (select 1 from public.menus m where m.id = menu_id and public.staff_has_permission('menu.manage', m.brand_id, m.store_id, null))
  )
  with check (
    exists (select 1 from public.menus m where m.id = menu_id and public.staff_has_permission('menu.manage', m.brand_id, m.store_id, null))
  );

create policy product_images_staff_manage on public.product_images
  for all using (
    exists (select 1 from public.products p where p.id = product_id and public.staff_has_permission('menu.manage', p.brand_id, null, null))
  )
  with check (
    exists (select 1 from public.products p where p.id = product_id and public.staff_has_permission('menu.manage', p.brand_id, null, null))
  );

create policy site_settings_staff_manage on public.site_settings
  for all using (public.staff_has_permission('settings.manage', brand_id, null, null))
  with check (public.staff_has_permission('settings.manage', brand_id, null, null));


-- END ORIGINAL MIGRATION: supabase/migrations/0005_rls_policies.sql

