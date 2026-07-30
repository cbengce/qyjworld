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
