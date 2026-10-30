-- Additive inventory foundation. No seeds, POS hooks, menu changes or automatic deductions.
begin;

create table public.inventory_materials (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  sku text not null default ('MAT-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  name text not null check (btrim(name) <> ''),
  category text not null check (category in ('ingredient', 'packaging', 'gift', 'consumable')),
  base_unit text not null check (base_unit in ('each', 'g', 'ml')),
  attributes jsonb not null default '{}' check (jsonb_typeof(attributes) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, sku),
  unique (id, brand_id),
  check (btrim(sku) <> '')
);

-- One box/bottle/bag can have a material-specific conversion; no assumed ml-to-g conversion.
create table public.inventory_material_units (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  material_id uuid not null,
  unit_label text not null check (btrim(unit_label) <> ''),
  base_quantity numeric(20,6) not null check (base_quantity > 0 and base_quantity < 'Infinity'::numeric),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (material_id, brand_id) references public.inventory_materials(id, brand_id) on delete restrict,
  unique (material_id, unit_label)
);

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  store_id uuid references public.stores(id) on delete restrict,
  location_code text not null check (btrim(location_code) <> ''),
  name text not null check (btrim(name) <> ''),
  kind text not null check (kind in ('store', 'warehouse')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, location_code),
  unique (id, brand_id),
  check ((kind = 'store' and store_id is not null) or (kind = 'warehouse' and store_id is null))
);

-- Quantities only. This is not a valuation table and does not invent opening costs.
create table public.inventory_balances (
  brand_id uuid not null,
  location_id uuid not null,
  material_id uuid not null,
  quantity numeric(20,6) not null default 0 check (quantity >= 0 and quantity < 'Infinity'::numeric),
  updated_at timestamptz not null default now(),
  primary key (location_id, material_id),
  foreign key (location_id, brand_id) references public.inventory_locations(id, brand_id) on delete restrict,
  foreign key (material_id, brand_id) references public.inventory_materials(id, brand_id) on delete restrict
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  location_id uuid not null,
  material_id uuid not null,
  movement_kind text not null check (movement_kind in ('opening', 'receipt', 'issue', 'consumption', 'wastage', 'adjustment')),
  quantity_delta numeric(20,6) not null check (
    quantity_delta <> 0 and quantity_delta > '-Infinity'::numeric and quantity_delta < 'Infinity'::numeric
  ),
  base_unit text not null check (base_unit in ('each', 'g', 'ml')),
  reason text not null check (btrim(reason) <> ''),
  idempotency_key text not null check (length(btrim(idempotency_key)) between 8 and 200),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null check (isfinite(occurred_at)),
  created_at timestamptz not null default now(),
  foreign key (location_id, brand_id) references public.inventory_locations(id, brand_id) on delete restrict,
  foreign key (material_id, brand_id) references public.inventory_materials(id, brand_id) on delete restrict,
  unique (brand_id, idempotency_key),
  check (
    (movement_kind in ('opening', 'receipt') and quantity_delta > 0)
    or (movement_kind in ('issue', 'consumption', 'wastage') and quantity_delta < 0)
    or movement_kind = 'adjustment'
  )
);
create index inventory_movements_location_time_idx on public.inventory_movements (location_id, occurred_at desc, id);
create index inventory_movements_material_time_idx on public.inventory_movements (material_id, occurred_at desc, id);

create table public.inventory_reorder_settings (
  brand_id uuid not null,
  location_id uuid not null,
  material_id uuid not null,
  minimum_quantity numeric(20,6) not null check (minimum_quantity >= 0 and minimum_quantity < 'Infinity'::numeric),
  lead_time_days integer not null default 0 check (lead_time_days >= 0),
  updated_at timestamptz not null default now(),
  primary key (location_id, material_id),
  foreign key (location_id, brand_id) references public.inventory_locations(id, brand_id) on delete restrict,
  foreign key (material_id, brand_id) references public.inventory_materials(id, brand_id) on delete restrict
);
create index inventory_locations_store_idx on public.inventory_locations (store_id, brand_id);
create index inventory_balances_material_idx on public.inventory_balances (material_id, location_id);

create function public.inventory_audit_master_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.write_audit('inventory.' || lower(tg_op), tg_table_name,
    coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'location_id')::uuid,
    null, jsonb_build_object('after', to_jsonb(new),
      'before', case when tg_op = 'UPDATE' then to_jsonb(old) else null end));
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['inventory_materials', 'inventory_material_units', 'inventory_locations', 'inventory_reorder_settings'] loop
    execute format('create trigger %I after insert or update on public.%I for each row execute function public.inventory_audit_master_change()', t || '_audit', t);
  end loop;
end;
$$;

-- Use the existing staff/role model, while excluding every soft-deleted assignment.
-- A store-scoped role cannot read another store or an unassigned central warehouse.
create function public.inventory_has_permission(p_permission text, p_brand_id uuid, p_store_id uuid default null)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.staff_users su
    join public.staff_role_assignments a on a.staff_user_id = su.id
    join public.roles r on r.id = a.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    join public.brands b on b.id = p_brand_id
    join public.companies c on c.id = b.company_id
    where su.auth_user_id = auth.uid()
      and su.status = 'active' and su.deleted_at is null
      and a.status = 'active' and a.deleted_at is null
      and r.status = 'active' and r.deleted_at is null
      and rp.status = 'active' and rp.deleted_at is null
      and p.status = 'active' and p.deleted_at is null
      and b.status = 'active' and b.deleted_at is null
      and c.status = 'active' and c.deleted_at is null
      and p.permission_code = p_permission
      and (p_store_id is null or exists (
        select 1 from public.stores s where s.id = p_store_id and s.brand_id = b.id
          and s.status = 'active' and s.deleted_at is null
      ))
      and (
        (a.scope_type = 'company' and a.company_id = b.company_id)
        or (a.scope_type = 'brand' and a.brand_id = b.id)
        or (a.scope_type = 'store' and a.store_id = p_store_id)
      )
  );
$$;

create function public.inventory_can_access_location(p_permission text, p_location_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select public.inventory_has_permission(p_permission, l.brand_id, l.store_id)
    from public.inventory_locations l where l.id = p_location_id), false);
$$;

-- Keep physical identity stable. Rename/archive instead of changing historical units or ownership.
create function public.inventory_guard_master_identity()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.brand_id <> old.brand_id then
      raise exception 'Inventory identity cannot be changed';
    end if;
    if tg_table_name = 'inventory_materials' then
      if new.base_unit <> old.base_unit then
        raise exception 'Create a new material to change its base unit';
      end if;
    end if;
    if tg_table_name = 'inventory_locations' then
      if new.store_id is distinct from old.store_id or new.kind <> old.kind then
        raise exception 'Create a new location to change its store or kind';
      end if;
    end if;
    new.updated_at := now();
  end if;
  if tg_table_name = 'inventory_locations' then
    if new.store_id is not null then
      if not exists (select 1 from public.stores s where s.id = new.store_id and s.brand_id = new.brand_id) then
        raise exception 'Inventory location store belongs to a different brand';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger inventory_material_identity before update on public.inventory_materials
  for each row execute function public.inventory_guard_master_identity();
create trigger inventory_location_identity before insert or update on public.inventory_locations
  for each row execute function public.inventory_guard_master_identity();
create trigger inventory_units_updated_at before update on public.inventory_material_units
  for each row execute function public.set_updated_at();
create trigger inventory_reorder_updated_at before update on public.inventory_reorder_settings
  for each row execute function public.set_updated_at();

create function public.inventory_prevent_movement_changes()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'Inventory movements are immutable; post a documented adjustment';
end;
$$;
create trigger inventory_movement_immutable before update or delete on public.inventory_movements
  for each row execute function public.inventory_prevent_movement_changes();

-- Single transaction: permission check, safe retry, locked balance, immutable movement and audit.
-- Decimal input is validated before numeric(20,6) storage to prevent silent rounding.
create function public.post_inventory_movement(
  p_location_id uuid, p_material_id uuid, p_kind text, p_quantity_delta numeric,
  p_reason text, p_idempotency_key text, p_occurred_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_location public.inventory_locations%rowtype;
  v_material public.inventory_materials%rowtype;
  v_existing public.inventory_movements%rowtype;
  v_balance numeric;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Inventory requires an authenticated staff user'; end if;
  if p_quantity_delta is null or not (p_quantity_delta > '-Infinity'::numeric and p_quantity_delta < 'Infinity'::numeric)
     or p_quantity_delta = 0 or p_quantity_delta <> round(p_quantity_delta, 6) then
    raise exception 'Inventory quantity must be finite, nonzero and have at most six decimal places';
  end if;
  if p_kind is null or p_kind not in ('opening', 'receipt', 'issue', 'consumption', 'wastage', 'adjustment')
    or (p_kind in ('opening', 'receipt') and p_quantity_delta < 0)
    or (p_kind in ('issue', 'consumption', 'wastage') and p_quantity_delta > 0) then
    raise exception 'Invalid inventory movement kind or direction';
  end if;
  if p_reason is null or btrim(p_reason) = '' or p_idempotency_key is null
    or length(btrim(p_idempotency_key)) not between 8 and 200 then
    raise exception 'Inventory reason and idempotency key are required';
  end if;
  if p_occurred_at is not null and not isfinite(p_occurred_at) then raise exception 'Invalid inventory timestamp'; end if;

  select * into v_location from public.inventory_locations where id = p_location_id for share;
  if not found then raise exception 'Inventory location not found'; end if;
  if not public.inventory_has_permission('inventory.post', v_location.brand_id, v_location.store_id) then
    raise exception 'Insufficient inventory permission';
  end if;
  select * into v_material from public.inventory_materials
    where id = p_material_id and brand_id = v_location.brand_id for share;
  if not found then raise exception 'Inventory material not found in location brand'; end if;
  if v_material.base_unit = 'each' and p_quantity_delta <> trunc(p_quantity_delta) then
    raise exception 'Counted materials require whole units';
  end if;

  -- Serialize retries even when they concern different materials/locations under the same key.
  perform pg_advisory_xact_lock(hashtextextended(v_location.brand_id::text || ':' || p_idempotency_key, 0));
  select * into v_existing from public.inventory_movements
    where brand_id = v_location.brand_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.location_id <> p_location_id or v_existing.material_id <> p_material_id
      or v_existing.movement_kind <> p_kind or v_existing.quantity_delta <> p_quantity_delta
      or v_existing.reason <> p_reason or v_existing.actor_user_id <> auth.uid()
      or (p_occurred_at is not null and v_existing.occurred_at <> p_occurred_at) then
      raise exception 'Inventory idempotency key reused with different input';
    end if;
    return v_existing.id;
  end if;
  if not v_location.active or not v_material.active then raise exception 'Inventory material or location is inactive'; end if;

  insert into public.inventory_balances (brand_id, location_id, material_id)
    values (v_location.brand_id, p_location_id, p_material_id) on conflict (location_id, material_id) do nothing;
  select quantity into v_balance from public.inventory_balances
    where location_id = p_location_id and material_id = p_material_id for update;
  if v_balance + p_quantity_delta < 0 then raise exception 'Insufficient inventory stock'; end if;
  if p_kind = 'opening' and exists (select 1 from public.inventory_movements
    where location_id = p_location_id and material_id = p_material_id) then
    raise exception 'Opening inventory must be the first movement';
  end if;

  insert into public.inventory_movements (
    brand_id, location_id, material_id, movement_kind, quantity_delta, base_unit,
    reason, idempotency_key, actor_user_id, occurred_at
  ) values (
    v_location.brand_id, p_location_id, p_material_id, p_kind, p_quantity_delta, v_material.base_unit,
    p_reason, p_idempotency_key, auth.uid(), coalesce(p_occurred_at, now())
  ) returning id into v_id;
  update public.inventory_balances set quantity = v_balance + p_quantity_delta, updated_at = now()
    where location_id = p_location_id and material_id = p_material_id;
  perform public.write_audit('inventory.post', 'inventory_movements', v_id, p_idempotency_key,
    jsonb_build_object('location_id', p_location_id, 'material_id', p_material_id,
      'quantity_delta', p_quantity_delta, 'movement_kind', p_kind, 'reason', p_reason));
  return v_id;
end;
$$;

-- No existing role is broadened except the existing, active company/brand/store-scoped super_admin.
insert into public.permissions (permission_code, description) values
  ('inventory.read', 'Read inventory materials and authorised location stock'),
  ('inventory.manage', 'Manage inventory materials, locations, units and reorder settings'),
  ('inventory.post', 'Post auditable inventory movements')
on conflict (permission_code) do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.role_code = 'super_admin' and r.status = 'active' and r.deleted_at is null
  and p.permission_code in ('inventory.read', 'inventory.manage', 'inventory.post')
on conflict (role_id, permission_id) do nothing;

do $$
declare t text;
begin
  foreach t in array array['inventory_materials', 'inventory_material_units', 'inventory_locations',
    'inventory_balances', 'inventory_movements', 'inventory_reorder_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', t);
    execute format('grant select on table public.%I to authenticated, service_role', t);
  end loop;
end;
$$;

-- Material names/units are shared within a brand, including its authorised store staff.
create policy inventory_material_read on public.inventory_materials for select to authenticated using (
  public.inventory_has_permission('inventory.read', brand_id)
  or exists (select 1 from public.inventory_locations l where l.brand_id = inventory_materials.brand_id
    and public.inventory_can_access_location('inventory.read', l.id))
);
create policy inventory_material_manage on public.inventory_materials for all to authenticated
  using (public.inventory_has_permission('inventory.manage', brand_id))
  with check (public.inventory_has_permission('inventory.manage', brand_id));
create policy inventory_unit_read on public.inventory_material_units for select to authenticated using (
  exists (select 1 from public.inventory_materials m where m.id = inventory_material_units.material_id)
);
create policy inventory_unit_manage on public.inventory_material_units for all to authenticated
  using (public.inventory_has_permission('inventory.manage', brand_id))
  with check (public.inventory_has_permission('inventory.manage', brand_id));
create policy inventory_location_read on public.inventory_locations for select to authenticated
  using (public.inventory_has_permission('inventory.read', brand_id, store_id));
-- Location identities are managed centrally, not by store-scoped staff.
create policy inventory_location_manage on public.inventory_locations for all to authenticated
  using (public.inventory_has_permission('inventory.manage', brand_id))
  with check (public.inventory_has_permission('inventory.manage', brand_id));
create policy inventory_balance_read on public.inventory_balances for select to authenticated
  using (public.inventory_can_access_location('inventory.read', location_id));
create policy inventory_movement_read on public.inventory_movements for select to authenticated
  using (public.inventory_can_access_location('inventory.read', location_id));
create policy inventory_reorder_read on public.inventory_reorder_settings for select to authenticated
  using (public.inventory_can_access_location('inventory.read', location_id));
create policy inventory_reorder_manage on public.inventory_reorder_settings for all to authenticated
  using (public.inventory_can_access_location('inventory.manage', location_id))
  with check (public.inventory_can_access_location('inventory.manage', location_id));

grant insert, update on public.inventory_materials, public.inventory_material_units, public.inventory_locations,
  public.inventory_reorder_settings to authenticated;
-- No direct balance/ledger writes, no hard-delete privileges, no anonymous access.
revoke all on function public.inventory_has_permission(text, uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.inventory_can_access_location(text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.inventory_guard_master_identity() from public, anon, authenticated, service_role;
revoke all on function public.inventory_audit_master_change() from public, anon, authenticated, service_role;
revoke all on function public.inventory_prevent_movement_changes() from public, anon, authenticated, service_role;
revoke all on function public.post_inventory_movement(uuid, uuid, text, numeric, text, text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.inventory_has_permission(text, uuid, uuid), public.inventory_can_access_location(text, uuid)
  to authenticated;
grant execute on function public.post_inventory_movement(uuid, uuid, text, numeric, text, text, timestamptz)
  to authenticated;

commit;
