begin;

-- Run-once additive migration. It intentionally fails on an existing object.

create table public.student_month_campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) >= 2),
  lifecycle_status text not null default 'draft' check (lifecycle_status in ('draft','scheduled','open','paused','closed','results_under_review','finalized','cancelled')),
  opens_at timestamptz,
  closes_at timestamptz,
  policy_version text not null check (length(btrim(policy_version)) > 0),
  approved_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(approved_rules) = 'object'),
  created_by uuid references public.staff_users(id),
  updated_by uuid references public.staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint student_month_campaign_window check (opens_at is null or closes_at is null or closes_at > opens_at),
  constraint student_month_campaign_opening_gate check (
    lifecycle_status not in ('scheduled','open','paused','closed','results_under_review','finalized')
    or (
      opens_at is not null and closes_at is not null
      and approved_rules ->> 'owner_decisions_status' = 'approved'
    )
  )
);

create table public.student_month_institutions (
  id uuid primary key default gen_random_uuid(),
  official_name text not null unique check (length(btrim(official_name)) >= 2),
  short_name text,
  institution_type text not null check (institution_type in (
    'primary_school','secondary_school','junior_college','polytechnic','university',
    'institute_of_technical_education','accredited_private_college',
    'accredited_international_school','formal_sports_school','formal_sports_academy'
  )),
  eligibility_note text,
  status text not null default 'draft' check (status in ('draft','active','inactive','withdrawn','archived')),
  created_by uuid references public.staff_users(id),
  updated_by uuid references public.staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.student_month_institution_aliases (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.student_month_institutions(id),
  alias text not null check (length(btrim(alias)) >= 2),
  normalized_alias text generated always as (lower(regexp_replace(btrim(alias), '\\s+', ' ', 'g'))) stored,
  created_by uuid references public.staff_users(id),
  updated_by uuid references public.staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (normalized_alias)
);

create table public.student_month_campaign_institutions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.student_month_campaigns(id),
  institution_id uuid not null references public.student_month_institutions(id),
  status text not null default 'active' check (status in ('active','inactive','withdrawn')),
  display_order integer not null default 0 check (display_order >= 0),
  created_by uuid references public.staff_users(id),
  updated_by uuid references public.staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (campaign_id, institution_id)
);

create table public.student_month_campaign_stores (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.student_month_campaigns(id),
  store_id uuid not null references public.stores(id),
  status text not null default 'active' check (status in ('active','inactive','withdrawn')),
  created_by uuid references public.staff_users(id),
  updated_by uuid references public.staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (campaign_id, store_id)
);

create table public.student_month_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.student_month_campaigns(id),
  participant_token_hash text not null check (participant_token_hash ~ '^[0-9a-f]{64}$'),
  client_enrollment_hash text not null check (client_enrollment_hash ~ '^[0-9a-f]{64}$'),
  token_version integer not null default 1 check (token_version > 0),
  status text not null default 'active' check (status in ('active','withdrawn','suspended','disqualified')),
  auth_user_id uuid not null references auth.users(id),
  ascend_identity_id uuid,
  enrolled_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (campaign_id, participant_token_hash),
  unique (campaign_id, client_enrollment_hash),
  unique (campaign_id, auth_user_id),
  unique (id, campaign_id),
  constraint student_month_participant_withdrawal_state check (
    (status = 'withdrawn' and withdrawn_at is not null) or (status <> 'withdrawn' and withdrawn_at is null)
  )
);

create table public.student_month_participant_institution_selections (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  participant_id uuid not null,
  institution_id uuid not null,
  selected_at timestamptz not null default now(),
  ended_at timestamptz,
  change_reason text,
  created_by uuid references public.staff_users(id),
  created_at timestamptz not null default now(),
  foreign key (participant_id, campaign_id) references public.student_month_participants(id, campaign_id),
  foreign key (campaign_id, institution_id) references public.student_month_campaign_institutions(campaign_id, institution_id),
  constraint student_month_selection_period check (ended_at is null or ended_at >= selected_at)
);

create unique index student_month_one_current_selection_idx
  on public.student_month_participant_institution_selections (participant_id)
  where ended_at is null;

create table public.student_month_purchase_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  participant_id uuid not null,
  institution_id uuid not null,
  store_id uuid not null,
  source_type text not null check (source_type in ('merchant_manual','pos_webhook','admin_correction')),
  source_provider text not null check (length(btrim(source_provider)) > 0),
  source_order_reference text,
  merchant_reference text,
  purchase_timestamp timestamptz not null,
  singapore_activity_date date not null,
  order_channel text not null check (order_channel in ('in_store','delivery','grabfood','foodpanda','self_pickup')),
  in_person_verified boolean not null default false,
  eligible_quantity numeric(12,3) not null default 0 check (eligible_quantity > 0),
  eligible_amount numeric(14,2) check (eligible_amount is null or eligible_amount >= 0),
  score_value numeric(14,3) check (score_value is null or score_value >= 0),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled','reversed','under_review')),
  reversal_status text not null default 'none' check (reversal_status in ('none','requested','approved','rejected','completed')),
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  policy_version text not null check (length(btrim(policy_version)) > 0),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_by uuid references public.staff_users(id),
  updated_by uuid references public.staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (participant_id, campaign_id) references public.student_month_participants(id, campaign_id),
  foreign key (campaign_id, institution_id) references public.student_month_campaign_institutions(campaign_id, institution_id),
  foreign key (campaign_id, store_id) references public.student_month_campaign_stores(campaign_id, store_id),
  unique (campaign_id, idempotency_key),
  unique (id, campaign_id),
  constraint student_month_purchase_score_state check (
    (status = 'accepted' and score_value is not null) or status <> 'accepted'
  ),
  constraint student_month_purchase_reversal_state check (
    (status in ('cancelled','reversed')) = (reversal_status = 'completed')
  ),
  constraint student_month_purchase_channel_eligible check (
    status <> 'accepted' or order_channel = 'in_store' or in_person_verified
  )
);

create table public.student_month_share_verifications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  participant_id uuid not null,
  institution_id uuid not null,
  purchase_event_id uuid not null,
  store_id uuid not null,
  platform text not null check (platform in ('instagram','tiktok','xiaohongshu','facebook')),
  singapore_activity_date date not null,
  post_url text check (post_url is null or length(post_url) <= 2048),
  verification_note text not null check (length(btrim(verification_note)) >= 3),
  visibility_method text not null check (visibility_method in ('public_url','live_staff_verification')),
  content_confirmed boolean not null,
  verified_at timestamptz not null,
  verified_by uuid not null references public.staff_users(id),
  status text not null default 'approved' check (status in ('approved','rejected','cancelled','disqualified')),
  abuse_flag boolean not null default false,
  policy_version text not null check (length(btrim(policy_version)) > 0),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (participant_id, campaign_id) references public.student_month_participants(id, campaign_id),
  foreign key (campaign_id, institution_id) references public.student_month_campaign_institutions(campaign_id, institution_id),
  foreign key (campaign_id, store_id) references public.student_month_campaign_stores(campaign_id, store_id),
  foreign key (purchase_event_id, campaign_id) references public.student_month_purchase_events(id, campaign_id),
  unique (campaign_id, participant_id, platform, singapore_activity_date),
  unique (id, campaign_id)
);

create table public.student_month_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  participant_id uuid not null,
  institution_id uuid not null,
  purchase_event_id uuid not null,
  share_verification_id uuid not null,
  store_id uuid not null,
  singapore_activity_date date not null,
  reward_type text not null default 'free_standard_topping' check (reward_type = 'free_standard_topping'),
  reward_quantity integer not null default 1 check (reward_quantity = 1),
  topping_name text not null check (length(btrim(topping_name)) >= 2),
  status text not null default 'granted' check (status in ('granted','cancelled','disqualified')),
  granted_by uuid not null references public.staff_users(id),
  granted_at timestamptz not null,
  policy_version text not null check (length(btrim(policy_version)) > 0),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (participant_id, campaign_id) references public.student_month_participants(id, campaign_id),
  foreign key (campaign_id, institution_id) references public.student_month_campaign_institutions(campaign_id, institution_id),
  foreign key (campaign_id, store_id) references public.student_month_campaign_stores(campaign_id, store_id),
  foreign key (purchase_event_id, campaign_id) references public.student_month_purchase_events(id, campaign_id),
  foreign key (share_verification_id, campaign_id) references public.student_month_share_verifications(id, campaign_id),
  unique (share_verification_id),
  unique (id, campaign_id)
);

create table public.student_month_purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_event_id uuid not null references public.student_month_purchase_events(id),
  external_product_reference text,
  product_name_snapshot text,
  quantity numeric(12,3) not null check (quantity > 0),
  eligible_quantity numeric(12,3) not null default 0 check (eligible_quantity >= 0 and eligible_quantity <= quantity),
  amount numeric(14,2) check (amount is null or amount >= 0),
  eligibility_status text not null default 'pending' check (eligibility_status in ('pending','eligible','ineligible')),
  policy_version text not null,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.student_month_purchase_source_references (
  id uuid primary key default gen_random_uuid(),
  purchase_event_id uuid not null references public.student_month_purchase_events(id),
  source_provider text not null,
  reference_type text not null,
  reference_value_hash text not null check (reference_value_hash ~ '^[0-9a-f]{64}$'),
  received_at timestamptz not null default now(),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  unique (source_provider, reference_type, reference_value_hash)
);

create table public.student_month_reversal_events (
  id uuid primary key default gen_random_uuid(),
  purchase_event_id uuid not null references public.student_month_purchase_events(id),
  reversal_type text not null check (reversal_type in ('cancellation','refund','duplicate','fraud','staff_error','administrative_correction')),
  reason text not null check (length(btrim(reason)) >= 3),
  status text not null default 'requested' check (status in ('requested','approved','rejected','completed')),
  requested_by uuid not null references public.staff_users(id),
  approved_by uuid references public.staff_users(id),
  policy_version text not null,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint student_month_reversal_separation check (approved_by is null or approved_by <> requested_by),
  constraint student_month_reversal_resolution check (
    (status = 'requested' and approved_by is null and resolved_at is null)
    or (status in ('approved','rejected','completed') and approved_by is not null and resolved_at is not null)
  )
);

create unique index student_month_one_open_reversal_idx
  on public.student_month_reversal_events (purchase_event_id)
  where status in ('requested','approved');

create table public.student_month_fraud_review_flags (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.student_month_campaigns(id),
  purchase_event_id uuid,
  participant_id uuid,
  flag_type text not null,
  status text not null default 'open' check (status in ('open','reviewing','cleared','confirmed','appealed','closed')),
  severity text not null default 'review' check (severity in ('review','elevated','critical')),
  reason jsonb not null default '{}'::jsonb,
  policy_version text not null,
  assigned_to uuid references public.staff_users(id),
  resolved_by uuid references public.staff_users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  foreign key (purchase_event_id, campaign_id) references public.student_month_purchase_events(id, campaign_id),
  foreign key (participant_id, campaign_id) references public.student_month_participants(id, campaign_id),
  constraint student_month_flag_subject check (purchase_event_id is not null or participant_id is not null)
);

create table public.student_month_audit_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.student_month_campaigns(id),
  actor_staff_id uuid references public.staff_users(id),
  actor_type text not null check (actor_type in ('participant','staff','manager','administrator','system','pos_provider')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason_code text,
  before_state jsonb,
  after_state jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  policy_version text,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.student_month_leaderboard_projections (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.student_month_campaigns(id),
  institution_id uuid not null references public.student_month_institutions(id),
  accepted_purchase_count bigint not null default 0 check (accepted_purchase_count >= 0),
  eligible_quantity numeric(14,3) not null default 0 check (eligible_quantity >= 0),
  eligible_amount numeric(16,2) not null default 0 check (eligible_amount >= 0),
  score_value numeric(16,3),
  computed_rank integer check (computed_rank is null or computed_rank > 0),
  tie_order integer check (tie_order is null or tie_order > 0),
  rebuilt_at timestamptz not null default now(),
  policy_version text not null,
  unique (campaign_id, institution_id)
);

create table public.student_month_finalization_cases (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.student_month_campaigns(id),
  status text not null default 'requested' check (status in ('requested','approved','rejected','completed')),
  requested_by uuid not null references public.staff_users(id),
  approved_by uuid references public.staff_users(id),
  reason text not null check (length(btrim(reason)) >= 3),
  policy_version text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint student_month_finalization_separation check (approved_by is null or approved_by <> requested_by),
  constraint student_month_finalization_resolution check (
    (status = 'requested' and approved_by is null and resolved_at is null)
    or (status in ('approved','rejected','completed') and approved_by is not null and resolved_at is not null)
  )
);

create unique index student_month_one_open_finalization_idx
  on public.student_month_finalization_cases (campaign_id)
  where status in ('requested','approved');

create table public.student_month_final_result_snapshots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references public.student_month_campaigns(id),
  finalization_case_id uuid not null unique references public.student_month_finalization_cases(id),
  results jsonb not null check (jsonb_typeof(results) = 'array'),
  policy_version text not null,
  approved_by uuid not null references public.staff_users(id),
  created_at timestamptz not null default now()
);

create index student_month_campaign_institution_status_idx on public.student_month_campaign_institutions (campaign_id, status, display_order);
create index student_month_campaign_store_status_idx on public.student_month_campaign_stores (campaign_id, status, store_id);
create index student_month_participant_campaign_status_idx on public.student_month_participants (campaign_id, status, created_at desc);
create index student_month_purchase_campaign_status_idx on public.student_month_purchase_events (campaign_id, status, purchase_timestamp desc);
create index student_month_purchase_participant_idx on public.student_month_purchase_events (participant_id, created_at desc);
create index student_month_purchase_store_idx on public.student_month_purchase_events (store_id, created_at desc);
create index student_month_share_queue_idx on public.student_month_share_verifications (campaign_id, status, verified_at desc);
create index student_month_share_daily_idx on public.student_month_share_verifications (participant_id, singapore_activity_date, platform);
create index student_month_reward_daily_idx on public.student_month_reward_redemptions (participant_id, singapore_activity_date, status);
create index student_month_reversal_purchase_idx on public.student_month_reversal_events (purchase_event_id, created_at desc);
create index student_month_flags_status_idx on public.student_month_fraud_review_flags (campaign_id, status, created_at desc);
create index student_month_audit_entity_idx on public.student_month_audit_events (entity_type, entity_id, created_at desc);

create or replace function public.student_month_reject_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end;
$$;

create trigger student_month_audit_append_only
before update or delete on public.student_month_audit_events
for each row execute function public.student_month_reject_mutation();

create trigger student_month_source_reference_append_only
before update or delete on public.student_month_purchase_source_references
for each row execute function public.student_month_reject_mutation();

create trigger student_month_final_snapshot_append_only
before update or delete on public.student_month_final_result_snapshots
for each row execute function public.student_month_reject_mutation();

create or replace function public.student_month_validate_campaign_store()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.student_month_campaigns c
    join public.stores s on s.id = new.store_id
    where c.id = new.campaign_id and c.brand_id = s.brand_id
      and c.deleted_at is null and s.deleted_at is null
      and (new.status <> 'active' or s.status = 'active')
  ) then raise exception 'Store does not belong to the campaign brand or is inactive' using errcode='23514'; end if;
  return new;
end $$;

create trigger student_month_campaign_store_validate
before insert or update on public.student_month_campaign_stores
for each row execute function public.student_month_validate_campaign_store();

create or replace function public.student_month_validate_campaign_institution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' and not exists (
    select 1 from public.student_month_institutions i
    where i.id = new.institution_id and i.status = 'active' and i.deleted_at is null
  ) then raise exception 'Active campaign institution must be active' using errcode='23514'; end if;
  return new;
end $$;

create trigger student_month_campaign_institution_validate
before insert or update on public.student_month_campaign_institutions
for each row execute function public.student_month_validate_campaign_institution();

create or replace function public.student_month_protect_finalized_campaign()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.lifecycle_status = 'finalized' and new.lifecycle_status <> 'finalized' then
    raise exception 'Finalized campaign lifecycle is immutable' using errcode='55000';
  end if;
  return new;
end $$;

create trigger student_month_finalized_campaign_protect
before update on public.student_month_campaigns
for each row execute function public.student_month_protect_finalized_campaign();

create or replace function public.student_month_campaign_is_operational(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_month_campaigns c
    where c.id = p_campaign_id
      and c.lifecycle_status = 'open'
      and c.deleted_at is null
      and c.opens_at is not null and c.opens_at <= now()
      and c.closes_at is not null and c.closes_at > now()
      and c.approved_rules ->> 'owner_decisions_status' = 'approved'
  );
$$;

create or replace function public.student_month_staff_is_authorized(
  p_actor_auth_user_id uuid,
  p_campaign_id uuid,
  p_action text,
  p_store_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with context as (
    select c.brand_id, b.company_id, c.approved_rules,
      case p_action
        when 'view' then 'admin_view_roles'
        when 'record_purchase' then 'merchant_roles'
        when 'verify_share' then 'merchant_roles'
        when 'request_reversal' then 'reversal_request_roles'
        when 'approve_reversal' then 'reversal_approval_roles'
        when 'export' then 'export_roles'
        when 'request_finalization' then 'finalization_request_roles'
        when 'approve_finalization' then 'finalization_approval_roles'
        else null
      end as rule_key
    from public.student_month_campaigns c
    join public.brands b on b.id = c.brand_id
    where c.id = p_campaign_id and c.deleted_at is null
  )
  select exists (
    select 1
    from context x
    join public.staff_users su on su.auth_user_id = p_actor_auth_user_id and su.status = 'active' and su.deleted_at is null
    join public.staff_role_assignments sra on sra.staff_user_id = su.id and sra.status = 'active' and sra.deleted_at is null
    join public.roles r on r.id = sra.role_id and r.status = 'active' and r.deleted_at is null
    where x.rule_key is not null
      and jsonb_typeof(x.approved_rules -> x.rule_key) = 'array'
      and (x.approved_rules -> x.rule_key) ? r.role_code
      and (
        r.role_code = 'super_admin'
        or (sra.scope_type = 'company' and sra.company_id = x.company_id)
        or (sra.scope_type = 'brand' and sra.brand_id = x.brand_id)
        or (p_store_id is not null and sra.scope_type = 'store' and sra.store_id = p_store_id)
      )
      and (
        p_store_id is null
        or exists (
          select 1 from public.student_month_campaign_stores cs
          join public.stores s on s.id = cs.store_id
          where cs.campaign_id = p_campaign_id and cs.store_id = p_store_id
            and cs.status = 'active' and cs.deleted_at is null
            and s.brand_id = x.brand_id and s.status = 'active' and s.deleted_at is null
        )
      )
  );
$$;

create or replace function public.get_student_month_staff_stores(
  p_actor_auth_user_id uuid,
  p_campaign_id uuid,
  p_action text
)
returns table (store_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select cs.store_id
  from public.student_month_campaign_stores cs
  where cs.campaign_id = p_campaign_id and cs.status = 'active' and cs.deleted_at is null
    and public.student_month_staff_is_authorized(p_actor_auth_user_id, p_campaign_id, p_action, cs.store_id)
  order by cs.store_id;
$$;

create or replace function public.enroll_student_month_participant(
  p_campaign_slug text,
  p_institution_id uuid,
  p_auth_user_id uuid,
  p_participant_token_hash text,
  p_client_enrollment_hash text
)
returns table (participant_id uuid, institution_name text, policy_version text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.student_month_campaigns%rowtype;
  v_existing public.student_month_participants%rowtype;
  v_participant_id uuid;
  v_institution_name text;
begin
  if p_auth_user_id is null or not exists(select 1 from auth.users u where u.id=p_auth_user_id)
     or p_participant_token_hash !~ '^[0-9a-f]{64}$' or p_client_enrollment_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid enrollment credential' using errcode = '22023';
  end if;

  select * into v_campaign from public.student_month_campaigns
  where slug = p_campaign_slug and deleted_at is null for update;
  if v_campaign.id is null or not public.student_month_campaign_is_operational(v_campaign.id) then
    raise exception 'Campaign is not open' using errcode = '55000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_campaign.id::text || ':' || p_client_enrollment_hash, 0));

  select * into v_existing from public.student_month_participants
    where campaign_id=v_campaign.id and auth_user_id=p_auth_user_id and deleted_at is null for update;
  if v_existing.id is not null then
    if v_existing.status='active' and exists(
      select 1 from public.student_month_participant_institution_selections s
      where s.participant_id=v_existing.id and s.institution_id=p_institution_id and s.ended_at is null
    ) then
      update public.student_month_participants set participant_token_hash=p_participant_token_hash,
        client_enrollment_hash=p_client_enrollment_hash,token_version=token_version+1,updated_at=now()
        where id=v_existing.id;
      select i.official_name into v_institution_name from public.student_month_institutions i where i.id=p_institution_id;
      insert into public.student_month_audit_events(campaign_id,actor_type,action,entity_type,entity_id,policy_version)
        values(v_campaign.id,'participant','participant.qr_rotated','student_month_participant',v_existing.id,v_campaign.policy_version);
      return query select v_existing.id,v_institution_name,v_campaign.policy_version,false;
      return;
    end if;
    raise exception 'ASCEND account is already enrolled' using errcode='23505';
  end if;

  select * into v_existing from public.student_month_participants
  where campaign_id = v_campaign.id and client_enrollment_hash = p_client_enrollment_hash and deleted_at is null;
  if v_existing.id is not null then
    if v_existing.status = 'active' and v_existing.participant_token_hash = p_participant_token_hash
       and exists (
         select 1 from public.student_month_participant_institution_selections s
         where s.participant_id = v_existing.id and s.institution_id = p_institution_id and s.ended_at is null
       ) then
      select i.official_name into v_institution_name from public.student_month_institutions i where i.id = p_institution_id;
      return query select v_existing.id, v_institution_name, v_campaign.policy_version, false;
      return;
    end if;
    raise exception 'Enrollment already exists for this browser' using errcode = '23505';
  end if;

  select i.official_name into v_institution_name
  from public.student_month_campaign_institutions ci
  join public.student_month_institutions i on i.id = ci.institution_id
  where ci.campaign_id = v_campaign.id and ci.institution_id = p_institution_id
    and ci.status = 'active' and ci.deleted_at is null
    and i.status = 'active' and i.deleted_at is null;
  if v_institution_name is null then
    raise exception 'Institution is not approved' using errcode = '23503';
  end if;

  insert into public.student_month_participants (campaign_id, auth_user_id, participant_token_hash, client_enrollment_hash)
  values (v_campaign.id, p_auth_user_id, p_participant_token_hash, p_client_enrollment_hash)
  returning id into v_participant_id;

  insert into public.student_month_participant_institution_selections (campaign_id, participant_id, institution_id)
  values (v_campaign.id, v_participant_id, p_institution_id);

  insert into public.student_month_audit_events (
    campaign_id, actor_type, action, entity_type, entity_id, policy_version, after_state
  ) values (
    v_campaign.id, 'participant', 'participant.enrolled', 'student_month_participant', v_participant_id,
    v_campaign.policy_version, jsonb_build_object('institution_id', p_institution_id)
  );

  return query select v_participant_id, v_institution_name, v_campaign.policy_version, true;
end;
$$;

create or replace function public.rebuild_student_month_leaderboard(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy_version text;
begin
  perform pg_advisory_xact_lock(hashtextextended('student-month-leaderboard:' || p_campaign_id::text, 0));
  select policy_version into v_policy_version
  from public.student_month_campaigns
  where id = p_campaign_id and deleted_at is null;
  if v_policy_version is null then raise exception 'Campaign not found'; end if;
  if exists (select 1 from public.student_month_final_result_snapshots where campaign_id = p_campaign_id) then
    raise exception 'Finalized leaderboard is immutable' using errcode = '55000';
  end if;

  delete from public.student_month_leaderboard_projections where campaign_id = p_campaign_id;
  insert into public.student_month_leaderboard_projections (
    campaign_id, institution_id, accepted_purchase_count, eligible_quantity,
    eligible_amount, score_value, computed_rank, tie_order, policy_version
  )
  with purchases as (
    select institution_id,count(*)::bigint accepted_purchase_count,coalesce(sum(eligible_quantity),0) eligible_quantity,coalesce(sum(eligible_amount),0) eligible_amount
    from public.student_month_purchase_events where campaign_id=p_campaign_id and status='accepted' and reversal_status='none' and deleted_at is null group by institution_id
  ), rewards as (
    select institution_id,count(*)::numeric score_value from public.student_month_reward_redemptions
    where campaign_id=p_campaign_id and status='granted' and deleted_at is null group by institution_id
  ), participants as (
    select institution_id,count(distinct participant_id) participant_count from public.student_month_participant_institution_selections
    where campaign_id=p_campaign_id and ended_at is null group by institution_id
  ), totals as (
    select ci.institution_id,i.official_name,coalesce(p.accepted_purchase_count,0) accepted_purchase_count,
      coalesce(p.eligible_quantity,0) eligible_quantity,coalesce(p.eligible_amount,0) eligible_amount,
      coalesce(r.score_value,0) score_value,coalesce(pt.participant_count,0) participant_count
    from public.student_month_campaign_institutions ci
    join public.student_month_institutions i on i.id=ci.institution_id and i.status='active' and i.deleted_at is null
    left join purchases p on p.institution_id=ci.institution_id
    left join rewards r on r.institution_id=ci.institution_id
    left join participants pt on pt.institution_id=ci.institution_id
    where ci.campaign_id=p_campaign_id and ci.status='active' and ci.deleted_at is null
  )
  select p_campaign_id, institution_id, accepted_purchase_count, eligible_quantity, eligible_amount, score_value,
    row_number() over (order by score_value desc, lower(official_name), institution_id),
    row_number() over (order by score_value desc, lower(official_name), institution_id),
    v_policy_version
  from totals where participant_count > 0
  order by score_value desc, lower(official_name), institution_id;
end;
$$;

create or replace function public.record_student_month_purchase(
  p_actor_auth_user_id uuid,
  p_campaign_id uuid,
  p_participant_token_hash text,
  p_store_id uuid,
  p_order_reference text,
  p_purchase_timestamp timestamptz,
  p_order_channel text,
  p_in_person_verified boolean,
  p_eligible_quantity numeric,
  p_eligible_amount numeric,
  p_idempotency_key text
)
returns table (purchase_id uuid, purchase_status text, duplicate boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.student_month_campaigns%rowtype;
  v_staff_id uuid;
  v_participant_id uuid;
  v_institution_id uuid;
  v_status text;
  v_purchase_id uuid;
begin
  if p_participant_token_hash !~ '^[0-9a-f]{64}$' or p_idempotency_key !~ '^[0-9a-f]{64}$'
     or length(btrim(p_order_reference)) = 0 or p_eligible_quantity <= 0
     or p_order_channel not in ('in_store','delivery','grabfood','foodpanda','self_pickup') then
    raise exception 'Invalid purchase input' using errcode = '22023';
  end if;
  if not public.student_month_campaign_is_operational(p_campaign_id) then
    raise exception 'Campaign is not open' using errcode = '55000';
  end if;
  if not public.student_month_staff_is_authorized(p_actor_auth_user_id, p_campaign_id, 'record_purchase', p_store_id) then
    raise exception 'Merchant authority denied' using errcode = '42501';
  end if;
  select * into v_campaign from public.student_month_campaigns where id = p_campaign_id for share;
  select su.id into v_staff_id from public.staff_users su
    where su.auth_user_id = p_actor_auth_user_id and su.status = 'active' and su.deleted_at is null;

  select p.id, s.institution_id into v_participant_id, v_institution_id
  from public.student_month_participants p
  join public.student_month_participant_institution_selections s
    on s.participant_id = p.id and s.campaign_id = p.campaign_id and s.ended_at is null
  join public.student_month_campaign_institutions ci
    on ci.campaign_id = p.campaign_id and ci.institution_id = s.institution_id
    and ci.status = 'active' and ci.deleted_at is null
  join public.student_month_institutions i
    on i.id = s.institution_id and i.status = 'active' and i.deleted_at is null
  where p.campaign_id = p_campaign_id and p.participant_token_hash = p_participant_token_hash
    and p.status = 'active' and p.deleted_at is null;
  if v_participant_id is null then raise exception 'Participant QR is invalid or inactive' using errcode = '22023'; end if;

  v_status := case
    when coalesce((v_campaign.approved_rules->>'manual_entry_enabled')::boolean,false)
      and (p_order_channel='in_store' or p_in_person_verified) then 'accepted'
    else 'pending'
  end;

  perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text || ':' || p_idempotency_key, 0));
  select id, status into v_purchase_id, v_status from public.student_month_purchase_events
    where campaign_id = p_campaign_id and idempotency_key = p_idempotency_key;
  if v_purchase_id is not null then
    return query select v_purchase_id, v_status, true;
    return;
  end if;

  insert into public.student_month_purchase_events (
    campaign_id, participant_id, institution_id, store_id, source_type, source_provider,
    source_order_reference, merchant_reference, purchase_timestamp, singapore_activity_date,
    order_channel, in_person_verified, eligible_quantity,
    eligible_amount, score_value, status, idempotency_key, policy_version, provenance,
    created_by, updated_by
  ) values (
    p_campaign_id, v_participant_id, v_institution_id, p_store_id, 'merchant_manual', 'qyj_merchant',
    p_order_reference, p_order_reference, p_purchase_timestamp, (p_purchase_timestamp at time zone 'Asia/Singapore')::date,
    p_order_channel, p_in_person_verified, p_eligible_quantity,
    p_eligible_amount, 0, v_status, p_idempotency_key, v_campaign.policy_version,
    jsonb_build_object('entry_method','merchant_dashboard'), v_staff_id, v_staff_id
  ) returning id into v_purchase_id;

  insert into public.student_month_purchase_source_references (
    purchase_event_id, source_provider, reference_type, reference_value_hash, provenance
  ) values (v_purchase_id, 'qyj_merchant', 'order_reference', p_idempotency_key, jsonb_build_object('store_id', p_store_id));

  insert into public.student_month_audit_events (
    campaign_id, actor_staff_id, actor_type, action, entity_type, entity_id, policy_version, after_state
  ) values (
    p_campaign_id, v_staff_id, 'staff', 'purchase.recorded', 'student_month_purchase_event', v_purchase_id,
    v_campaign.policy_version, jsonb_build_object('status',v_status,'eligible_quantity',p_eligible_quantity,'store_id',p_store_id)
  );
  if v_status = 'accepted' then perform public.rebuild_student_month_leaderboard(p_campaign_id); end if;
  return query select v_purchase_id, v_status, false;
end;
$$;

create or replace function public.verify_student_month_share(
  p_actor_auth_user_id uuid,
  p_campaign_id uuid,
  p_participant_token_hash text,
  p_purchase_id uuid,
  p_platform text,
  p_post_url text,
  p_verification_note text,
  p_visibility_method text,
  p_content_confirmed boolean,
  p_verified_at timestamptz,
  p_topping_name text
)
returns table(verification_id uuid,reward_id uuid,rewarded_toppings integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase public.student_month_purchase_events%rowtype;
  v_participant public.student_month_participants%rowtype;
  v_staff_id uuid;
  v_verification_id uuid;
  v_reward_id uuid;
  v_day date := (p_verified_at at time zone 'Asia/Singapore')::date;
  v_purchase_drinks integer;
  v_existing_rewards integer;
  v_policy text;
begin
  if p_platform not in ('instagram','tiktok','xiaohongshu','facebook')
    or p_visibility_method not in ('public_url','live_staff_verification')
    or not p_content_confirmed or length(btrim(p_verification_note)) < 3
    or length(btrim(p_topping_name)) < 2 then
    raise exception 'Invalid share verification input' using errcode='22023';
  end if;
  select * into v_purchase from public.student_month_purchase_events
    where id=p_purchase_id and campaign_id=p_campaign_id and status='accepted'
      and reversal_status='none' and deleted_at is null for update;
  if v_purchase.id is null then raise exception 'Eligible purchase not found' using errcode='22023'; end if;
  if v_purchase.singapore_activity_date <> v_day then raise exception 'Share and purchase must occur on the same Singapore calendar day' using errcode='22023'; end if;
  if not public.student_month_staff_is_authorized(p_actor_auth_user_id,p_campaign_id,'verify_share',v_purchase.store_id) then
    raise exception 'Share verification authority denied' using errcode='42501';
  end if;
  select * into v_participant from public.student_month_participants
    where id=v_purchase.participant_id and participant_token_hash=p_participant_token_hash
      and status='active' and deleted_at is null;
  if v_participant.id is null then raise exception 'Participant QR is invalid or inactive' using errcode='22023'; end if;
  select su.id into v_staff_id from public.staff_users su where su.auth_user_id=p_actor_auth_user_id and su.status='active' and su.deleted_at is null;
  select policy_version into v_policy from public.student_month_campaigns where id=p_campaign_id;

  perform pg_advisory_xact_lock(hashtextextended('student-month-reward:'||v_participant.id::text||':'||v_day::text,0));
  select floor(coalesce(sum(pe.eligible_quantity),0))::integer into v_purchase_drinks
    from public.student_month_purchase_events pe where pe.campaign_id=p_campaign_id and pe.participant_id=v_participant.id
      and pe.singapore_activity_date=v_day and pe.status='accepted' and pe.reversal_status='none' and pe.deleted_at is null;
  select count(*)::integer into v_existing_rewards from public.student_month_reward_redemptions rr
    where rr.campaign_id=p_campaign_id and rr.participant_id=v_participant.id and rr.singapore_activity_date=v_day
      and rr.status='granted' and rr.deleted_at is null;
  if v_existing_rewards >= v_purchase_drinks then raise exception 'No unmatched eligible drink remains for this day' using errcode='22023'; end if;

  insert into public.student_month_share_verifications(
    campaign_id,participant_id,institution_id,purchase_event_id,store_id,platform,singapore_activity_date,
    post_url,verification_note,visibility_method,content_confirmed,verified_at,verified_by,policy_version
  ) values (
    p_campaign_id,v_participant.id,v_purchase.institution_id,v_purchase.id,v_purchase.store_id,p_platform,v_day,
    nullif(btrim(p_post_url),''),btrim(p_verification_note),p_visibility_method,true,p_verified_at,v_staff_id,v_policy
  ) returning id into v_verification_id;
  insert into public.student_month_reward_redemptions(
    campaign_id,participant_id,institution_id,purchase_event_id,share_verification_id,store_id,
    singapore_activity_date,topping_name,granted_by,granted_at,policy_version
  ) values (
    p_campaign_id,v_participant.id,v_purchase.institution_id,v_purchase.id,v_verification_id,v_purchase.store_id,
    v_day,btrim(p_topping_name),v_staff_id,p_verified_at,v_policy
  ) returning id into v_reward_id;
  insert into public.student_month_audit_events(campaign_id,actor_staff_id,actor_type,action,entity_type,entity_id,policy_version,after_state)
    values(p_campaign_id,v_staff_id,'staff','share.verified_and_reward.granted','student_month_share_verification',v_verification_id,v_policy,
      jsonb_build_object('platform',p_platform,'purchase_id',p_purchase_id,'reward_id',v_reward_id,'activity_date',v_day));
  perform public.rebuild_student_month_leaderboard(p_campaign_id);
  return query select v_verification_id,v_reward_id,v_existing_rewards+1;
exception when unique_violation then
  raise exception 'This platform was already verified for this participant today' using errcode='23505';
end;
$$;

create or replace function public.request_student_month_reversal(
  p_actor_auth_user_id uuid,
  p_purchase_id uuid,
  p_reversal_type text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_purchase public.student_month_purchase_events%rowtype; v_staff_id uuid; v_id uuid; v_rules jsonb;
begin
  select * into v_purchase from public.student_month_purchase_events where id = p_purchase_id and deleted_at is null for update;
  if v_purchase.id is null or v_purchase.status not in ('accepted','pending','under_review') or v_purchase.reversal_status <> 'none' then
    raise exception 'Purchase cannot be reversed' using errcode = '55000';
  end if;
  if exists(select 1 from public.student_month_final_result_snapshots where campaign_id=v_purchase.campaign_id) then
    raise exception 'Finalized campaign records cannot be reversed' using errcode='55000';
  end if;
  if not public.student_month_staff_is_authorized(p_actor_auth_user_id, v_purchase.campaign_id, 'request_reversal', v_purchase.store_id) then
    raise exception 'Reversal request authority denied' using errcode = '42501';
  end if;
  select approved_rules into v_rules from public.student_month_campaigns where id = v_purchase.campaign_id;
  if jsonb_typeof(v_rules -> 'reversal_types') <> 'array' or not ((v_rules -> 'reversal_types') ? p_reversal_type) then
    raise exception 'Reversal type is not approved' using errcode = '42501';
  end if;
  if p_reversal_type not in ('cancellation','refund','duplicate','fraud','staff_error','administrative_correction') or length(btrim(p_reason)) < 3 then
    raise exception 'Invalid reversal request' using errcode = '22023';
  end if;
  select id into v_staff_id from public.staff_users where auth_user_id = p_actor_auth_user_id and status = 'active' and deleted_at is null;
  insert into public.student_month_reversal_events (purchase_event_id,reversal_type,reason,requested_by,policy_version)
    values (p_purchase_id,p_reversal_type,btrim(p_reason),v_staff_id,v_purchase.policy_version) returning id into v_id;
  update public.student_month_purchase_events set reversal_status = 'requested', updated_by = v_staff_id, updated_at = now() where id = p_purchase_id;
  insert into public.student_month_audit_events (campaign_id,actor_staff_id,actor_type,action,entity_type,entity_id,reason_code,policy_version,after_state)
    values (v_purchase.campaign_id,v_staff_id,'manager','reversal.requested','student_month_reversal_event',v_id,p_reversal_type,v_purchase.policy_version,jsonb_build_object('purchase_id',p_purchase_id));
  return v_id;
end;
$$;

create or replace function public.approve_student_month_reversal(
  p_actor_auth_user_id uuid,
  p_reversal_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_reversal public.student_month_reversal_events%rowtype; v_purchase public.student_month_purchase_events%rowtype; v_staff_id uuid; v_next text;
begin
  select * into v_reversal from public.student_month_reversal_events where id = p_reversal_id for update;
  if v_reversal.id is null or v_reversal.status <> 'requested' then raise exception 'Reversal is not awaiting approval' using errcode = '55000'; end if;
  select * into v_purchase from public.student_month_purchase_events where id = v_reversal.purchase_event_id for update;
  if exists(select 1 from public.student_month_final_result_snapshots where campaign_id=v_purchase.campaign_id) then raise exception 'Finalized campaign records cannot be reversed' using errcode='55000'; end if;
  if not public.student_month_staff_is_authorized(p_actor_auth_user_id, v_purchase.campaign_id, 'approve_reversal', v_purchase.store_id) then
    raise exception 'Reversal approval authority denied' using errcode = '42501';
  end if;
  select id into v_staff_id from public.staff_users where auth_user_id = p_actor_auth_user_id and status = 'active' and deleted_at is null;
  if v_staff_id = v_reversal.requested_by then raise exception 'A second administrator must approve the reversal' using errcode = '42501'; end if;
  v_next := case when v_reversal.reversal_type = 'cancellation' then 'cancelled' else 'reversed' end;
  update public.student_month_reversal_events set status='completed',approved_by=v_staff_id,resolved_at=now() where id=p_reversal_id;
  update public.student_month_purchase_events set status=v_next,reversal_status='completed',updated_by=v_staff_id,updated_at=now() where id=v_purchase.id;
  update public.student_month_share_verifications set status='cancelled',updated_at=now()
    where purchase_event_id=v_purchase.id and status='approved' and deleted_at is null;
  update public.student_month_reward_redemptions set status='cancelled',updated_at=now()
    where purchase_event_id=v_purchase.id and status='granted' and deleted_at is null;
  insert into public.student_month_audit_events (campaign_id,actor_staff_id,actor_type,action,entity_type,entity_id,reason_code,policy_version,before_state,after_state)
    values (v_purchase.campaign_id,v_staff_id,'manager','reversal.completed','student_month_purchase_event',v_purchase.id,v_reversal.reversal_type,v_purchase.policy_version,jsonb_build_object('status',v_purchase.status),jsonb_build_object('status',v_next,'reversal_id',p_reversal_id));
  perform public.rebuild_student_month_leaderboard(v_purchase.campaign_id);
  return v_next;
end;
$$;

create or replace function public.request_student_month_finalization(p_actor_auth_user_id uuid,p_campaign_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_staff_id uuid; v_id uuid; v_policy text;
begin
  if not public.student_month_staff_is_authorized(p_actor_auth_user_id,p_campaign_id,'request_finalization',null) then raise exception 'Finalization request authority denied' using errcode='42501'; end if;
  select policy_version into v_policy from public.student_month_campaigns where id=p_campaign_id and lifecycle_status='results_under_review' and deleted_at is null for update;
  if v_policy is null or length(btrim(p_reason)) < 3 then raise exception 'Campaign is not ready for finalization' using errcode='55000'; end if;
  select id into v_staff_id from public.staff_users where auth_user_id=p_actor_auth_user_id and status='active' and deleted_at is null;
  insert into public.student_month_finalization_cases(campaign_id,requested_by,reason,policy_version) values(p_campaign_id,v_staff_id,btrim(p_reason),v_policy) returning id into v_id;
  insert into public.student_month_audit_events(campaign_id,actor_staff_id,actor_type,action,entity_type,entity_id,policy_version) values(p_campaign_id,v_staff_id,'administrator','finalization.requested','student_month_finalization_case',v_id,v_policy);
  return v_id;
end $$;

create or replace function public.approve_student_month_finalization(p_actor_auth_user_id uuid,p_finalization_case_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_case public.student_month_finalization_cases%rowtype; v_staff_id uuid; v_snapshot_id uuid; v_results jsonb;
begin
  select * into v_case from public.student_month_finalization_cases where id=p_finalization_case_id for update;
  if v_case.id is null or v_case.status <> 'requested' then raise exception 'Finalization is not awaiting approval' using errcode='55000'; end if;
  if not public.student_month_staff_is_authorized(p_actor_auth_user_id,v_case.campaign_id,'approve_finalization',null) then raise exception 'Finalization approval authority denied' using errcode='42501'; end if;
  select id into v_staff_id from public.staff_users where auth_user_id=p_actor_auth_user_id and status='active' and deleted_at is null;
  if v_staff_id=v_case.requested_by then raise exception 'A second administrator must approve finalization' using errcode='42501'; end if;
  if exists (
    select 1 from public.student_month_reversal_events r
    join public.student_month_purchase_events p on p.id=r.purchase_event_id
    where p.campaign_id=v_case.campaign_id and r.status in ('requested','approved')
  ) then raise exception 'Open reversal cases must be resolved before finalization' using errcode='55000'; end if;
  perform public.rebuild_student_month_leaderboard(v_case.campaign_id);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.tie_order),'[]'::jsonb) into v_results from (
    select institution_id,accepted_purchase_count,eligible_quantity,eligible_amount,score_value,computed_rank,tie_order
    from public.student_month_leaderboard_projections where campaign_id=v_case.campaign_id
  ) x;
  update public.student_month_finalization_cases set status='completed',approved_by=v_staff_id,resolved_at=now() where id=v_case.id;
  insert into public.student_month_final_result_snapshots(campaign_id,finalization_case_id,results,policy_version,approved_by)
    values(v_case.campaign_id,v_case.id,v_results,v_case.policy_version,v_staff_id) returning id into v_snapshot_id;
  update public.student_month_campaigns set lifecycle_status='finalized',updated_by=v_staff_id,updated_at=now() where id=v_case.campaign_id;
  insert into public.student_month_audit_events(campaign_id,actor_staff_id,actor_type,action,entity_type,entity_id,policy_version) values(v_case.campaign_id,v_staff_id,'administrator','finalization.completed','student_month_final_result_snapshot',v_snapshot_id,v_case.policy_version);
  return v_snapshot_id;
end $$;

create or replace view public.student_month_public_leaderboard
with (security_invoker = true)
as
select c.slug as campaign_slug,i.official_name as institution_name,i.short_name as institution_short_name,
  lp.accepted_purchase_count,lp.eligible_quantity,lp.score_value,lp.computed_rank,lp.tie_order,lp.rebuilt_at
from public.student_month_leaderboard_projections lp
join public.student_month_campaigns c on c.id=lp.campaign_id
join public.student_month_institutions i on i.id=lp.institution_id
where c.lifecycle_status in ('open','closed','results_under_review','finalized') and c.deleted_at is null
  and i.status='active' and i.deleted_at is null;

create or replace function public.get_student_month_public_leaderboard(p_campaign_slug text)
returns table(campaign_slug text,institution_name text,institution_short_name text,accepted_purchase_count bigint,eligible_quantity numeric,score_value numeric,computed_rank integer,tie_order integer,rebuilt_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.slug,i.official_name,i.short_name,lp.accepted_purchase_count,lp.eligible_quantity,lp.score_value,lp.computed_rank,lp.tie_order,lp.rebuilt_at
  from public.student_month_leaderboard_projections lp
  join public.student_month_campaigns c on c.id=lp.campaign_id
  join public.student_month_institutions i on i.id=lp.institution_id
  where c.slug=p_campaign_slug and c.lifecycle_status in ('open','closed','results_under_review','finalized')
    and c.deleted_at is null and i.status='active' and i.deleted_at is null
  order by lp.tie_order asc nulls last
  limit 10;
$$;

create or replace function public.export_student_month_purchases(p_actor_auth_user_id uuid,p_campaign_id uuid)
returns table(event_id uuid,order_reference text,source_type text,source_provider text,purchase_timestamp timestamptz,institution text,store text,eligible_quantity numeric,eligible_amount numeric,score_value numeric,status text,reversal_status text,policy_version text,recorded_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select pe.id,pe.merchant_reference,pe.source_type,pe.source_provider,pe.purchase_timestamp,i.official_name,s.name,
    pe.eligible_quantity,pe.eligible_amount,pe.score_value,pe.status,pe.reversal_status,pe.policy_version,pe.created_at
  from public.student_month_purchase_events pe
  join public.student_month_institutions i on i.id=pe.institution_id
  join public.stores s on s.id=pe.store_id
  where pe.campaign_id=p_campaign_id and pe.deleted_at is null
    and public.student_month_staff_is_authorized(p_actor_auth_user_id,p_campaign_id,'export',pe.store_id)
  order by pe.created_at desc;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'student_month_campaigns','student_month_institutions','student_month_institution_aliases',
    'student_month_campaign_institutions','student_month_campaign_stores','student_month_participants',
    'student_month_participant_institution_selections','student_month_purchase_events',
    'student_month_purchase_items','student_month_purchase_source_references','student_month_share_verifications',
    'student_month_reward_redemptions','student_month_reversal_events',
    'student_month_fraud_review_flags','student_month_audit_events','student_month_leaderboard_projections',
    'student_month_finalization_cases','student_month_final_result_snapshots'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role',t);
    execute format('grant select on table public.%I to service_role',t);
  end loop;
end $$;

revoke all on table public.student_month_public_leaderboard from public,anon,authenticated,service_role;
grant select on table public.student_month_public_leaderboard to service_role;

revoke all on function public.student_month_reject_mutation() from public,anon,authenticated,service_role;
revoke all on function public.student_month_validate_campaign_store() from public,anon,authenticated,service_role;
revoke all on function public.student_month_validate_campaign_institution() from public,anon,authenticated,service_role;
revoke all on function public.student_month_protect_finalized_campaign() from public,anon,authenticated,service_role;
revoke all on function public.student_month_campaign_is_operational(uuid) from public,anon,authenticated;
revoke all on function public.student_month_staff_is_authorized(uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.get_student_month_staff_stores(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.enroll_student_month_participant(text,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.record_student_month_purchase(uuid,uuid,text,uuid,text,timestamptz,text,boolean,numeric,numeric,text) from public,anon,authenticated;
revoke all on function public.verify_student_month_share(uuid,uuid,text,uuid,text,text,text,text,boolean,timestamptz,text) from public,anon,authenticated;
revoke all on function public.request_student_month_reversal(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.approve_student_month_reversal(uuid,uuid) from public,anon,authenticated;
revoke all on function public.rebuild_student_month_leaderboard(uuid) from public,anon,authenticated;
revoke all on function public.request_student_month_finalization(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.approve_student_month_finalization(uuid,uuid) from public,anon,authenticated;
revoke all on function public.export_student_month_purchases(uuid,uuid) from public,anon,authenticated;
revoke all on function public.get_student_month_public_leaderboard(text) from public;

grant execute on function public.student_month_campaign_is_operational(uuid) to service_role;
grant execute on function public.student_month_staff_is_authorized(uuid,uuid,text,uuid) to service_role;
grant execute on function public.get_student_month_staff_stores(uuid,uuid,text) to service_role;
grant execute on function public.enroll_student_month_participant(text,uuid,uuid,text,text) to service_role;
grant execute on function public.record_student_month_purchase(uuid,uuid,text,uuid,text,timestamptz,text,boolean,numeric,numeric,text) to service_role;
grant execute on function public.verify_student_month_share(uuid,uuid,text,uuid,text,text,text,text,boolean,timestamptz,text) to service_role;
grant execute on function public.request_student_month_reversal(uuid,uuid,text,text) to service_role;
grant execute on function public.approve_student_month_reversal(uuid,uuid) to service_role;
grant execute on function public.rebuild_student_month_leaderboard(uuid) to service_role;
grant execute on function public.request_student_month_finalization(uuid,uuid,text) to service_role;
grant execute on function public.approve_student_month_finalization(uuid,uuid) to service_role;
grant execute on function public.export_student_month_purchases(uuid,uuid) to service_role;
grant execute on function public.get_student_month_public_leaderboard(text) to anon,authenticated,service_role;

commit;
