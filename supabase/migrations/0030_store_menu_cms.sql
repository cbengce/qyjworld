-- Canonical Store/Menu CMS migration. Promoted from never-deployed pending 0026.
begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'menu_item_availability_status') then
    create type public.menu_item_availability_status as enum ('available', 'unavailable', 'coming_soon');
  end if;
end
$$;

alter table public.stores
  add column if not exists public_slug text,
  add column if not exists phone text,
  add column if not exists public_email text,
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6),
  add column if not exists map_url text,
  add column if not exists ordering_url text,
  add column if not exists is_primary boolean not null default false;

update public.stores
set public_slug = lower(trim(both '-' from regexp_replace(store_code, '[^A-Za-z0-9]+', '-', 'g')))
where public_slug is null;

do $$
begin
  if exists (
    select 1 from public.stores
    where deleted_at is null
    group by brand_id, public_slug
    having count(*) > 1
  ) then
    raise exception 'Cannot create stable store slugs: duplicate generated public_slug values exist within a brand';
  end if;
end
$$;

do $$
declare
  v_canonical_company_id constant uuid := '11111111-1111-1111-1111-111111111111';
  v_canonical_brand_id constant uuid := '22222222-2222-2222-2222-222222222222';
  v_company_id uuid;
  v_brand_id uuid;
  v_store_id uuid;
  v_company_count integer;
  v_brand_count integer;
  v_target_count integer;
begin
  select count(*) into v_company_count
  from public.companies c
  where c.legal_name = 'TCM AND HEALTHCARE COLLEGE PTE LTD';

  if v_company_count > 1 then
    raise exception 'Store/Menu CMS preflight stopped: multiple canonical QYJ company identities require manual review';
  end if;

  if exists (
    select 1 from public.companies c
    where c.id = v_canonical_company_id
      and (c.legal_name <> 'TCM AND HEALTHCARE COLLEGE PTE LTD' or c.country_code <> 'SG')
  ) then
    raise exception 'Store/Menu CMS preflight stopped: canonical QYJ company UUID is occupied by a different entity';
  end if;

  if v_company_count = 0 then
    insert into public.companies (id, legal_name, country_code)
    values (v_canonical_company_id, 'TCM AND HEALTHCARE COLLEGE PTE LTD', 'SG')
    returning id into v_company_id;
  else
    select c.id into v_company_id
    from public.companies c
    where c.legal_name = 'TCM AND HEALTHCARE COLLEGE PTE LTD';

    if exists (
      select 1 from public.companies c
      where c.id = v_company_id and (c.status <> 'active' or c.deleted_at is not null)
    ) then
      raise exception 'Store/Menu CMS preflight stopped: canonical QYJ company exists but is inactive or deleted; owner decision required';
    end if;

    if exists (select 1 from public.companies c where c.id = v_company_id and c.country_code <> 'SG') then
      raise exception 'Store/Menu CMS preflight stopped: canonical QYJ company has an unexpected country code';
    end if;
  end if;

  select count(*) into v_brand_count
  from public.brands b
  where b.brand_code = 'QYJ';

  if v_brand_count > 1 then
    raise exception 'Store/Menu CMS preflight stopped: multiple QYJ brand identities require manual review';
  end if;

  if exists (
    select 1 from public.brands b
    where b.id = v_canonical_brand_id
      and (b.brand_code <> 'QYJ' or b.company_id <> v_company_id)
  ) then
    raise exception 'Store/Menu CMS preflight stopped: canonical QYJ brand UUID is occupied by a different entity';
  end if;

  if v_brand_count = 0 then
    insert into public.brands (
      id, company_id, brand_code, name_en, name_zh, tagline, core_line
    ) values (
      v_canonical_brand_id, v_company_id, 'QYJ', 'QING YUN JIAN', '青云间',
      'Born to Ascend', 'Sparkling Tea Reimagined'
    ) returning id into v_brand_id;
  else
    select b.id into v_brand_id
    from public.brands b
    where b.brand_code = 'QYJ';

    if exists (
      select 1 from public.brands b
      where b.id = v_brand_id and (b.status <> 'active' or b.deleted_at is not null)
    ) then
      raise exception 'Store/Menu CMS preflight stopped: QYJ brand exists but is inactive or deleted; owner decision required';
    end if;

    if exists (select 1 from public.brands b where b.id = v_brand_id and b.company_id <> v_company_id) then
      raise exception 'Store/Menu CMS preflight stopped: QYJ brand belongs to a different company';
    end if;

    if exists (
      select 1 from public.brands b
      where b.id = v_brand_id
        and b.name_en not in ('QING YUN JIAN', 'Qing Yun Jian')
    ) then
      raise exception 'Store/Menu CMS preflight stopped: QYJ brand has an unexpected English name';
    end if;

    if exists (
      select 1 from public.brands b
      where b.id = v_brand_id
        and (b.name_zh is not null and b.name_zh <> '青云间'
          or b.tagline is not null and b.tagline <> 'Born to Ascend'
          or b.core_line is not null and b.core_line <> 'Sparkling Tea Reimagined')
    ) then
      raise exception 'Store/Menu CMS preflight stopped: QYJ brand metadata conflicts with the canonical identity';
    end if;

    update public.brands
    set name_en = 'QING YUN JIAN'
    where id = v_brand_id and name_en = 'Qing Yun Jian';
  end if;

  select count(*) into v_target_count
  from public.stores s
  where s.brand_id = v_brand_id and s.store_code = 'QYJ-MPM-001';

  if v_target_count > 1 then
    raise exception 'Store/Menu CMS preflight stopped: duplicate QYJ-MPM-001 stores require manual review';
  end if;

  if v_target_count = 1 then
    select s.id into v_store_id
    from public.stores s
    where s.brand_id = v_brand_id and s.store_code = 'QYJ-MPM-001';

    if exists (select 1 from public.stores s where s.id = v_store_id and s.deleted_at is not null) then
      raise exception 'Store/Menu CMS preflight stopped: QYJ-MPM-001 exists only as a deleted store; owner decision required';
    end if;

    if exists (select 1 from public.stores s where s.id = v_store_id and s.status <> 'active') then
      raise exception 'Store/Menu CMS preflight stopped: QYJ-MPM-001 exists but is not active; owner decision required';
    end if;
  end if;

  if exists (
    select 1 from public.stores s
    where s.brand_id = v_brand_id and (v_store_id is null or s.id <> v_store_id)
      and s.public_slug = 'macpherson-mall' and s.deleted_at is null
  ) then
    raise exception 'Store/Menu CMS preflight stopped: macpherson-mall is already assigned to another QYJ store';
  end if;

  if exists (
    select 1 from public.stores s
    where s.brand_id = v_brand_id and (v_store_id is null or s.id <> v_store_id)
      and s.is_primary and s.deleted_at is null
  ) then
    raise exception 'Store/Menu CMS preflight stopped: another QYJ outlet is already primary; owner decision required';
  end if;

  if v_store_id is null and exists (
    select 1 from public.stores s
    where s.brand_id = v_brand_id and s.deleted_at is null
      and lower(trim(s.name)) = lower('MacPherson Mall')
  ) then
    raise exception 'Store/Menu CMS preflight stopped: another QYJ store already uses the MacPherson Mall identity';
  end if;

  if v_store_id is not null and exists (
    select 1 from public.stores s
    where s.id = v_store_id and s.ordering_url is not null
      and s.ordering_url <> 'https://order.qyjworld.com'
  ) then
    raise exception 'Store/Menu CMS preflight stopped: QYJ-MPM-001 has an unexpected existing ordering URL';
  end if;

  if v_target_count = 0 then
    insert into public.stores (
      brand_id, store_code, name, address_line_1, address_line_2,
      city, country_code, timezone, currency_code,
      public_slug, ordering_url, is_primary
    ) values (
      v_brand_id, 'QYJ-MPM-001', 'MacPherson Mall', '401 MacPherson Road', '#01-23 MacPherson Mall',
      'Singapore', 'SG', 'Asia/Singapore', 'SGD',
      'macpherson-mall', 'https://order.qyjworld.com', true
    ) returning id into v_store_id;
  end if;
end
$$;

alter table public.stores
  alter column public_slug set not null,
  add constraint stores_public_slug_format_check
    check (public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  add constraint stores_public_email_check
    check (public_email is null or public_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  add constraint stores_latitude_check
    check (latitude is null or latitude between -90 and 90),
  add constraint stores_longitude_check
    check (longitude is null or longitude between -180 and 180),
  add constraint stores_location_pair_check
    check ((latitude is null) = (longitude is null)),
  add constraint stores_map_url_https_check
    check (map_url is null or map_url ~ '^https://');

create unique index stores_brand_public_slug_idx
  on public.stores (brand_id, public_slug)
  where deleted_at is null;

create unique index stores_one_primary_per_brand_idx
  on public.stores (brand_id)
  where is_primary and deleted_at is null;

create table public.ordering_domain_allowlist (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  hostname text not null,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  constraint ordering_domain_hostname_check check (hostname = lower(hostname) and hostname ~ '^[a-z0-9.-]+$'),
  unique (brand_id, hostname)
);

create table public.store_operating_hours (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  interval_no smallint not null default 1 check (interval_no > 0),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  constraint store_hours_values_check check (
    (is_closed and opens_at is null and closes_at is null)
    or (not is_closed and opens_at is not null and closes_at is not null and opens_at <> closes_at)
  ),
  unique (store_id, day_of_week, interval_no)
);

comment on table public.store_operating_hours is
  'Supports multiple intervals and closing times after midnight. Phase 1A.1 Admin edits one interval per day and does not expose split or overnight editing yet.';

create table public.store_hours_exceptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  exception_date date not null,
  interval_no smallint not null default 1 check (interval_no > 0),
  label text,
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  constraint store_hours_exception_values_check check (
    (is_closed and opens_at is null and closes_at is null)
    or (not is_closed and opens_at is not null and closes_at is not null and opens_at <> closes_at)
  ),
  unique (store_id, exception_date, interval_no)
);

alter table public.products
  add column if not exists is_signature boolean not null default false,
  add column if not exists archived_at timestamptz;

update public.products
set archived_at = coalesce(archived_at, updated_at, now())
where status = 'archived' and archived_at is null;

update public.products
set archived_at = null
where status <> 'archived' and archived_at is not null;

alter table public.products
  add constraint products_archive_state_check check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  );

-- One-time migration of the owner-approved Signature Collection. Runtime behaviour never uses names.
update public.products p
set is_signature = true
from public.brands b
where p.brand_id = b.id and b.brand_code = 'QYJ'
  and p.name_en in ('Luna Tide', 'Night Nectar', 'Evenfall')
  and exists (
    select 1 from public.stores s
    where s.brand_id = b.id and s.store_code = 'QYJ-MPM-001' and s.deleted_at is null
  )
  and not p.is_signature;

alter table public.menu_items
  add column if not exists availability_status public.menu_item_availability_status not null default 'available',
  add column if not exists online_ordering_enabled boolean not null default false;

do $$
begin
  if exists (
    select 1 from public.menus
    where status = 'active' and deleted_at is null
    group by store_id
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce one active public menu: an outlet has multiple active menus';
  end if;
end
$$;

create unique index menus_one_active_per_store_idx
  on public.menus (store_id)
  where status = 'active' and deleted_at is null;

create index store_operating_hours_public_idx
  on public.store_operating_hours (store_id, day_of_week, interval_no)
  where status = 'active' and deleted_at is null;

create index store_hours_exceptions_public_idx
  on public.store_hours_exceptions (store_id, exception_date, interval_no)
  where status = 'active' and deleted_at is null;

create index products_brand_archive_idx
  on public.products (brand_id, status, archived_at, name_en);

do $$
begin
  if exists (
    select 1 from public.product_images
    where is_primary and status = 'active' and deleted_at is null
    group by product_id having count(*) > 1
  ) then
    raise exception 'Cannot enforce one primary image: a product has multiple active primary images';
  end if;
end
$$;

create unique index product_images_one_primary_idx
  on public.product_images (product_id)
  where is_primary and status = 'active' and deleted_at is null;

create index menu_items_availability_idx
  on public.menu_items (menu_id, availability_status, display_order)
  where status = 'active' and deleted_at is null;

do $$
begin
  if exists (
    select 1 from public.permissions p
    where p.permission_code in ('store.identity.manage', 'store.operations.manage', 'menu.manage')
      and (
        p.description is distinct from case p.permission_code
          when 'store.identity.manage' then 'Manage store identity, address, primary status and ordering destination'
          when 'store.operations.manage' then 'Manage store contact information and operating hours'
          when 'menu.manage' then 'menu manage'
        end
        or p.status <> 'active'
        or p.deleted_at is not null
      )
  ) then
    raise exception 'Store/Menu CMS preflight stopped: an existing Store permission conflicts with canonical configuration';
  end if;

  if exists (
    select 1
    from public.roles r
    where r.role_code in ('super_admin', 'manager')
      and (
        r.name is distinct from case r.role_code
          when 'super_admin' then 'Super Admin'
          when 'manager' then 'Manager'
        end
        or r.description is distinct from case r.role_code
          when 'super_admin' then 'Full company-level access'
          when 'manager' then 'Brand or store management access'
        end
        or r.status <> 'active'
        or r.deleted_at is not null
      )
  ) then
    raise exception 'Store/Menu CMS preflight stopped: an existing Store/Menu role conflicts with canonical configuration';
  end if;

  if exists (
    select 1
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where ((r.role_code = 'super_admin' and p.permission_code in ('store.identity.manage', 'store.operations.manage', 'menu.manage'))
       or (r.role_code = 'manager' and p.permission_code in ('store.operations.manage', 'menu.manage')))
      and (rp.status <> 'active' or rp.deleted_at is not null)
  ) then
    raise exception 'Store/Menu CMS preflight stopped: an existing Store role permission conflicts with canonical configuration';
  end if;
end
$$;

insert into public.permissions (permission_code, description)
values
  ('store.identity.manage', 'Manage store identity, address, primary status and ordering destination'),
  ('store.operations.manage', 'Manage store contact information and operating hours'),
  ('menu.manage', 'menu manage')
on conflict (permission_code) do nothing;

insert into public.roles (role_code, name, description)
values
  ('super_admin', 'Super Admin', 'Full company-level access'),
  ('manager', 'Manager', 'Brand or store management access')
on conflict (role_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('store.identity.manage', 'store.operations.manage', 'menu.manage')
where r.role_code = 'super_admin'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('store.operations.manage', 'menu.manage')
where r.role_code = 'manager'
on conflict (role_id, permission_id) do nothing;

insert into public.ordering_domain_allowlist (brand_id, hostname)
select b.id, 'order.qyjworld.com'
from public.brands b
join public.stores s on s.brand_id = b.id
where b.brand_code = 'QYJ' and s.store_code = 'QYJ-MPM-001' and s.deleted_at is null
on conflict (brand_id, hostname) do nothing;

update public.stores s
set public_slug = 'macpherson-mall',
    address_line_2 = '#01-23 MacPherson Mall',
    ordering_url = coalesce(ordering_url, 'https://order.qyjworld.com'),
    is_primary = true
from public.brands b
where s.brand_id = b.id
  and b.brand_code = 'QYJ'
  and s.store_code = 'QYJ-MPM-001'
  and s.deleted_at is null;

create or replace function public.validate_store_ordering_url()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hostname text;
begin
  if new.ordering_url is null then return new; end if;
  if new.ordering_url !~ '^https://[^/?#:]+(?:[/?#].*)?$' then
    raise exception 'Ordering URL must be a valid HTTPS URL';
  end if;
  v_hostname := lower(substring(new.ordering_url from '^https://([^/?#:]+)'));
  if not exists (
    select 1 from public.ordering_domain_allowlist d
    where d.brand_id = new.brand_id and d.hostname = v_hostname
      and d.status = 'active' and d.deleted_at is null
  ) then
    raise exception 'Ordering URL domain is not approved for this brand';
  end if;
  return new;
end;
$$;

create trigger stores_validate_ordering_url
before insert or update of ordering_url, brand_id on public.stores
for each row execute function public.validate_store_ordering_url();

create or replace function public.audit_store_menu_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity_id uuid;
begin
  v_entity_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.audit_logs (
    actor_staff_user_id, action, entity_type, entity_id, metadata, created_by
  ) values (
    public.current_staff_user_id(),
    lower(tg_table_name || '.' || tg_op),
    tg_table_name,
    v_entity_id,
    jsonb_build_object(
      'old', case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
      'new', case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
    ),
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

create trigger stores_admin_audit after insert or update or delete on public.stores for each row execute function public.audit_store_menu_change();
create trigger store_operating_hours_admin_audit after insert or update or delete on public.store_operating_hours for each row execute function public.audit_store_menu_change();
create trigger store_hours_exceptions_admin_audit after insert or update or delete on public.store_hours_exceptions for each row execute function public.audit_store_menu_change();
create trigger ordering_domain_allowlist_admin_audit after insert or update or delete on public.ordering_domain_allowlist for each row execute function public.audit_store_menu_change();
create trigger product_categories_admin_audit after insert or update or delete on public.product_categories for each row execute function public.audit_store_menu_change();
create trigger products_admin_audit after insert or update or delete on public.products for each row execute function public.audit_store_menu_change();
create trigger product_images_admin_audit after insert or update or delete on public.product_images for each row execute function public.audit_store_menu_change();
create trigger menus_admin_audit after insert or update or delete on public.menus for each row execute function public.audit_store_menu_change();
create trigger menu_items_admin_audit after insert or update or delete on public.menu_items for each row execute function public.audit_store_menu_change();

create trigger ordering_domain_allowlist_updated_at before update on public.ordering_domain_allowlist for each row execute function public.set_updated_at();
create trigger store_operating_hours_updated_at before update on public.store_operating_hours for each row execute function public.set_updated_at();
create trigger store_hours_exceptions_updated_at before update on public.store_hours_exceptions for each row execute function public.set_updated_at();

alter table public.ordering_domain_allowlist enable row level security;
alter table public.store_operating_hours enable row level security;
alter table public.store_hours_exceptions enable row level security;

create policy stores_staff_scoped_read on public.stores
for select to authenticated using (
  public.staff_has_permission('store.identity.manage', brand_id, id, null)
  or public.staff_has_permission('store.operations.manage', brand_id, id, null)
  or public.staff_has_permission('menu.manage', brand_id, id, null)
);

create policy ordering_domains_staff_read on public.ordering_domain_allowlist
for select to authenticated using (public.staff_has_permission('store.identity.manage', brand_id, null, null));

create policy store_hours_public_read on public.store_operating_hours
for select to anon, authenticated using (
  status = 'active' and deleted_at is null and exists (
    select 1 from public.stores s where s.id = store_id and s.status = 'active' and s.deleted_at is null
  )
);

create policy store_hours_exceptions_public_read on public.store_hours_exceptions
for select to anon, authenticated using (
  status = 'active' and deleted_at is null and exists (
    select 1 from public.stores s where s.id = store_id and s.status = 'active' and s.deleted_at is null
  )
);

create policy store_hours_staff_manage on public.store_operating_hours
for all to authenticated using (public.staff_has_permission('store.operations.manage', null, store_id, null))
with check (public.staff_has_permission('store.operations.manage', null, store_id, null));

create policy store_hours_exceptions_staff_manage on public.store_hours_exceptions
for all to authenticated using (public.staff_has_permission('store.operations.manage', null, store_id, null))
with check (public.staff_has_permission('store.operations.manage', null, store_id, null));

create or replace function public.update_store_identity(
  p_store_id uuid,
  p_name text,
  p_public_slug text,
  p_address_line_1 text,
  p_address_line_2 text,
  p_city text,
  p_country_code text,
  p_postal_code text,
  p_is_primary boolean,
  p_ordering_url text
)
returns public.stores
language plpgsql
security definer
set search_path = ''
as $$
declare v_store public.stores;
begin
  select * into v_store from public.stores where id = p_store_id and deleted_at is null for update;
  if not found then raise exception 'Store not found'; end if;
  if not public.staff_has_permission('store.identity.manage', v_store.brand_id, v_store.id, null) then raise exception 'Insufficient permission'; end if;
  if p_is_primary then update public.stores set is_primary = false, updated_by = auth.uid() where brand_id = v_store.brand_id and id <> v_store.id and is_primary; end if;
  update public.stores set
    name = trim(p_name), public_slug = lower(trim(p_public_slug)), address_line_1 = trim(p_address_line_1),
    address_line_2 = nullif(trim(p_address_line_2), ''), city = trim(p_city), country_code = upper(trim(p_country_code))::char(2),
    postal_code = nullif(trim(p_postal_code), ''), is_primary = p_is_primary,
    ordering_url = nullif(trim(p_ordering_url), ''), updated_by = auth.uid()
  where id = p_store_id returning * into v_store;
  return v_store;
end;
$$;

create or replace function public.update_store_operations(
  p_store_id uuid, p_phone text, p_public_email text, p_latitude numeric, p_longitude numeric, p_map_url text
)
returns public.stores
language plpgsql
security definer
set search_path = ''
as $$
declare v_store public.stores;
begin
  select * into v_store from public.stores where id = p_store_id and deleted_at is null for update;
  if not found then raise exception 'Store not found'; end if;
  if not public.staff_has_permission('store.operations.manage', v_store.brand_id, v_store.id, null) then raise exception 'Insufficient permission'; end if;
  update public.stores set phone = nullif(trim(p_phone), ''), public_email = nullif(trim(p_public_email), ''),
    latitude = p_latitude, longitude = p_longitude, map_url = nullif(trim(p_map_url), ''), updated_by = auth.uid()
  where id = p_store_id returning * into v_store;
  return v_store;
end;
$$;

create or replace function public.replace_store_weekly_hours(p_store_id uuid, p_hours jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_brand_id uuid; v_item jsonb; v_day smallint; v_closed boolean; v_open time; v_close time;
begin
  select brand_id into v_brand_id from public.stores where id = p_store_id and deleted_at is null;
  if v_brand_id is null then raise exception 'Store not found'; end if;
  if not public.staff_has_permission('store.operations.manage', v_brand_id, p_store_id, null) then raise exception 'Insufficient permission'; end if;
  if jsonb_typeof(p_hours) <> 'array' or jsonb_array_length(p_hours) > 7 then raise exception 'Weekly hours must contain at most seven days'; end if;
  delete from public.store_operating_hours where store_id = p_store_id;
  for v_item in select value from jsonb_array_elements(p_hours) loop
    v_day := (v_item->>'dayOfWeek')::smallint;
    v_closed := coalesce((v_item->>'isClosed')::boolean, false);
    v_open := nullif(v_item->>'opensAt', '')::time;
    v_close := nullif(v_item->>'closesAt', '')::time;
    if not v_closed and (v_open is null or v_close is null) then raise exception 'Open days require opening and closing times'; end if;
    if not v_closed and v_close <= v_open then raise exception 'Phase 1A.1 Admin does not yet support overnight hours'; end if;
    insert into public.store_operating_hours (store_id, day_of_week, interval_no, opens_at, closes_at, is_closed, created_by, updated_by)
    values (p_store_id, v_day, 1, case when v_closed then null else v_open end, case when v_closed then null else v_close end, v_closed, auth.uid(), auth.uid());
  end loop;
end;
$$;

create or replace function public.set_product_lifecycle(p_product_id uuid, p_status public.record_status)
returns public.products
language plpgsql
security definer
set search_path = ''
as $$
declare v_product public.products;
begin
  select * into v_product from public.products where id = p_product_id and deleted_at is null for update;
  if not found then raise exception 'Product not found'; end if;
  if not public.staff_has_permission('menu.manage', v_product.brand_id, null, null) then raise exception 'Insufficient permission'; end if;
  if p_status = 'draft' then raise exception 'Lifecycle action supports active, inactive, archived or restore only'; end if;
  update public.products set status = p_status,
    archived_at = case when p_status = 'archived' then now() else null end,
    updated_by = auth.uid()
  where id = p_product_id returning * into v_product;
  return v_product;
end;
$$;

create or replace function public.restore_product(p_product_id uuid)
returns public.products
language plpgsql
security definer
set search_path = ''
as $$
declare v_product public.products;
begin
  select * into v_product from public.products where id = p_product_id and deleted_at is null for update;
  if not found then raise exception 'Product not found'; end if;
  if not public.staff_has_permission('menu.manage', v_product.brand_id, null, null) then raise exception 'Insufficient permission'; end if;
  if v_product.status <> 'archived' then raise exception 'Only archived products can be restored'; end if;
  update public.products set status = 'inactive', archived_at = null, updated_by = auth.uid()
  where id = p_product_id returning * into v_product;
  return v_product;
end;
$$;

create or replace function public.activate_store_menu(p_menu_id uuid)
returns public.menus
language plpgsql
security definer
set search_path = ''
as $$
declare v_menu public.menus;
begin
  select * into v_menu from public.menus where id = p_menu_id and deleted_at is null for update;
  if not found then raise exception 'Menu not found'; end if;
  if not public.staff_has_permission('menu.manage', v_menu.brand_id, v_menu.store_id, null) then raise exception 'Insufficient permission'; end if;
  update public.menus set status = 'inactive', updated_by = auth.uid() where store_id = v_menu.store_id and id <> v_menu.id and status = 'active' and deleted_at is null;
  update public.menus set status = 'active', updated_by = auth.uid() where id = p_menu_id returning * into v_menu;
  return v_menu;
end;
$$;

create or replace function public.set_primary_product_image(p_product_id uuid, p_image_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_brand_id uuid;
begin
  select brand_id into v_brand_id from public.products where id = p_product_id and deleted_at is null;
  if v_brand_id is null then raise exception 'Product not found'; end if;
  if not public.staff_has_permission('menu.manage', v_brand_id, null, null) then raise exception 'Insufficient permission'; end if;
  if not exists (select 1 from public.product_images where id = p_image_id and product_id = p_product_id and status = 'active' and deleted_at is null) then raise exception 'Active product image not found'; end if;
  update public.product_images set is_primary = false, updated_by = auth.uid() where product_id = p_product_id and is_primary;
  update public.product_images set is_primary = true, updated_by = auth.uid() where id = p_image_id;
end;
$$;

revoke all on function public.update_store_identity(uuid,text,text,text,text,text,text,text,boolean,text) from public, anon;
revoke all on function public.update_store_operations(uuid,text,text,numeric,numeric,text) from public, anon;
revoke all on function public.replace_store_weekly_hours(uuid,jsonb) from public, anon;
revoke all on function public.set_product_lifecycle(uuid,public.record_status) from public, anon;
revoke all on function public.restore_product(uuid) from public, anon;
revoke all on function public.activate_store_menu(uuid) from public, anon;
revoke all on function public.set_primary_product_image(uuid,uuid) from public, anon;
grant execute on function public.update_store_identity(uuid,text,text,text,text,text,text,text,boolean,text) to authenticated;
grant execute on function public.update_store_operations(uuid,text,text,numeric,numeric,text) to authenticated;
grant execute on function public.replace_store_weekly_hours(uuid,jsonb) to authenticated;
grant execute on function public.set_product_lifecycle(uuid,public.record_status) to authenticated;
grant execute on function public.restore_product(uuid) to authenticated;
grant execute on function public.activate_store_menu(uuid) to authenticated;
grant execute on function public.set_primary_product_image(uuid,uuid) to authenticated;

do $$
begin
  if exists (
    select 1 from storage.buckets b
    where b.id = 'product-images'
      and (
        b.name <> 'product-images'
        or b.public is distinct from true
        or b.file_size_limit is distinct from 5242880
        or b.allowed_mime_types is null
        or not b.allowed_mime_types @> array['image/jpeg','image/png','image/webp']::text[]
        or not b.allowed_mime_types <@ array['image/jpeg','image/png','image/webp']::text[]
      )
  ) then
    raise exception 'Store/Menu CMS preflight stopped: existing product-images bucket configuration is incompatible';
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy product_images_storage_public_read on storage.objects for select to public using (bucket_id = 'product-images');
create policy product_images_storage_staff_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'product-images' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.staff_has_permission('menu.manage', ((storage.foldername(name))[1])::uuid, null, null)
);
create policy product_images_storage_staff_update on storage.objects for update to authenticated using (
  bucket_id = 'product-images' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.staff_has_permission('menu.manage', ((storage.foldername(name))[1])::uuid, null, null)
) with check (
  bucket_id = 'product-images' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.staff_has_permission('menu.manage', ((storage.foldername(name))[1])::uuid, null, null)
);
create policy product_images_storage_staff_delete on storage.objects for delete to authenticated using (
  bucket_id = 'product-images' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.staff_has_permission('menu.manage', ((storage.foldername(name))[1])::uuid, null, null)
);

grant select on public.ordering_domain_allowlist to authenticated;
grant select on public.store_operating_hours, public.store_hours_exceptions to anon, authenticated;
grant insert, update, delete on public.store_operating_hours, public.store_hours_exceptions to authenticated;
grant insert, update, delete on public.product_categories to authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.product_images to authenticated;
grant insert, update, delete on public.menus to authenticated;
grant insert, update, delete on public.menu_items to authenticated;

commit;
