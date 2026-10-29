-- Purchasing records only. Does not move stock or change the existing POS/financial ledger.
begin;
create table public.inventory_suppliers (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  platform text not null check (platform in ('pinduoduo','douyin','taobao','wechat')),
  company_name text not null check (btrim(company_name) <> ''),
  supplier_name text not null check (btrim(supplier_name) <> ''),
  contact text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, brand_id)
);
create table public.inventory_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  supplier_id uuid not null,
  platform_order_reference text not null check (btrim(platform_order_reference) <> ''),
  supplier_snapshot jsonb not null,
  currency text not null check (currency in ('CNY','SGD')),
  ordered_on date not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, brand_id),
  unique (supplier_id, platform_order_reference),
  foreign key (supplier_id, brand_id) references public.inventory_suppliers(id, brand_id)
);
create table public.inventory_purchase_lines (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  order_id uuid not null,
  material_id uuid not null,
  package_label text not null check (btrim(package_label) <> ''),
  package_quantity numeric(20,6) not null check (package_quantity > 0 and package_quantity < 'Infinity'::numeric),
  base_units_per_package numeric(20,6) not null check (base_units_per_package > 0 and base_units_per_package < 'Infinity'::numeric),
  goods_amount_minor bigint not null check (goods_amount_minor >= 0),
  created_at timestamptz not null default now(),
  unique (id, brand_id),
  foreign key (order_id, brand_id) references public.inventory_purchase_orders(id, brand_id),
  foreign key (material_id, brand_id) references public.inventory_materials(id, brand_id)
);
create index inventory_purchase_lines_order_idx on public.inventory_purchase_lines(order_id);
create table public.inventory_purchase_payments (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  order_id uuid not null,
  paid_on date not null,
  order_currency_amount_minor bigint not null check (order_currency_amount_minor > 0),
  actual_sgd_minor bigint not null check (actual_sgd_minor >= 0),
  fee_sgd_minor bigint not null default 0 check (fee_sgd_minor >= 0),
  reference text not null check (btrim(reference) <> ''),
  created_at timestamptz not null default now(),
  foreign key (order_id, brand_id) references public.inventory_purchase_orders(id, brand_id),
  unique (order_id, reference)
);
create table public.inventory_shipments (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  reference text not null check (btrim(reference) <> ''),
  notes text,
  created_at timestamptz not null default now(),
  unique (id, brand_id), unique (brand_id, reference)
);
-- Link multiple suppliers' purchase lines into one transport batch. Snapshot each allocation basis.
create table public.inventory_shipment_lines (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  shipment_id uuid not null,
  purchase_line_id uuid not null,
  shipped_base_quantity numeric(20,6) not null check (shipped_base_quantity > 0 and shipped_base_quantity < 'Infinity'::numeric),
  allocation_basis text not null check (allocation_basis in ('weight','volume','value','manual')),
  allocation_weight numeric(20,6) not null check (allocation_weight > 0 and allocation_weight < 'Infinity'::numeric),
  created_at timestamptz not null default now(),
  foreign key (shipment_id, brand_id) references public.inventory_shipments(id, brand_id),
  foreign key (purchase_line_id, brand_id) references public.inventory_purchase_lines(id, brand_id),
  unique (shipment_id, purchase_line_id)
);
create table public.inventory_shipment_charges (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  shipment_id uuid not null,
  kind text not null check (kind in ('china_delivery','international_freight','insurance','clearance','local_delivery','other')),
  currency text not null check (currency in ('CNY','SGD')),
  original_amount_minor bigint not null check (original_amount_minor >= 0),
  sgd_amount_minor bigint not null check (sgd_amount_minor >= 0),
  cost_status text not null check (cost_status in ('estimated','actual')),
  reference text not null check (btrim(reference) <> ''),
  created_at timestamptz not null default now(),
  foreign key (shipment_id, brand_id) references public.inventory_shipments(id, brand_id),
  unique (shipment_id, kind, reference)
);
create index inventory_shipment_lines_batch_idx on public.inventory_shipment_lines(shipment_id);
create index inventory_shipment_charges_batch_idx on public.inventory_shipment_charges(shipment_id);

create function public.inventory_purchase_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_supplier public.inventory_suppliers%rowtype;
begin
  select * into v_supplier from public.inventory_suppliers where id = new.supplier_id
    and brand_id = new.brand_id and active for share;
  if not found then raise exception 'Active supplier not found in purchase brand'; end if;
  new.supplier_snapshot := jsonb_build_object('platform', v_supplier.platform,
    'company_name', v_supplier.company_name, 'supplier_name', v_supplier.supplier_name);
  return new;
end;
$$;
create trigger inventory_purchase_snapshot before insert on public.inventory_purchase_orders
  for each row execute function public.inventory_purchase_snapshot();

do $$
declare t text;
begin
  foreach t in array array['inventory_suppliers','inventory_purchase_orders','inventory_purchase_lines',
    'inventory_purchase_payments','inventory_shipments','inventory_shipment_lines','inventory_shipment_charges'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', t);
    execute format('grant select, insert on public.%I to authenticated', t);
    execute format('grant select on public.%I to service_role', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.inventory_has_permission(''inventory.manage'', brand_id))', t || '_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.inventory_has_permission(''inventory.manage'', brand_id))', t || '_insert', t);
    execute format('create trigger %I after insert or update on public.%I for each row execute function public.inventory_audit_master_change()', t || '_audit', t);
    if t <> 'inventory_suppliers' then
      execute format('create trigger %I before update or delete on public.%I for each row execute function public.inventory_prevent_movement_changes()', t || '_immutable', t);
    end if;
  end loop;
end;
$$;
grant update on public.inventory_suppliers to authenticated;
create policy inventory_supplier_update on public.inventory_suppliers for update to authenticated
  using (public.inventory_has_permission('inventory.manage', brand_id))
  with check (public.inventory_has_permission('inventory.manage', brand_id));
create trigger inventory_supplier_identity before update on public.inventory_suppliers
  for each row execute function public.inventory_guard_master_identity();
revoke all on function public.inventory_purchase_snapshot() from public, anon, authenticated, service_role;
-- Initial entry supports one material per purchase record; references may include a line suffix.
-- Header and line are created atomically, and exact input is retained for safe retries.
alter table public.inventory_purchase_orders add column entry_payload jsonb;
create function public.create_inventory_purchase(p_id uuid, p_supplier uuid, p_reference text,
  p_currency text, p_ordered_on date, p_material uuid, p_package_label text,
  p_package_quantity numeric, p_conversion numeric, p_goods_minor bigint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.inventory_suppliers%rowtype; old public.inventory_purchase_orders%rowtype; payload jsonb;
begin
  select * into s from public.inventory_suppliers where id = p_supplier and active for share;
  if not found or auth.uid() is null or not public.inventory_has_permission('inventory.manage', s.brand_id) then
    raise exception 'Insufficient inventory permission';
  end if;
  if p_id is null or p_ordered_on is null or p_package_quantity is null or p_conversion is null
    or not (p_package_quantity > 0 and p_package_quantity < 'Infinity'::numeric)
    or not (p_conversion > 0 and p_conversion < 'Infinity'::numeric)
    or p_package_quantity <> round(p_package_quantity,6) or p_conversion <> round(p_conversion,6) then
    raise exception 'Invalid purchase quantity';
  end if;
  if not exists (select 1 from public.inventory_materials where id = p_material and brand_id = s.brand_id and active
    and (base_unit <> 'each' or trunc(p_package_quantity * p_conversion) = p_package_quantity * p_conversion)) then
    raise exception 'Invalid purchase material or counted quantity';
  end if;
  payload := jsonb_build_array(p_supplier,p_reference,p_currency,p_ordered_on,p_material,p_package_label,p_package_quantity,p_conversion,p_goods_minor);
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into old from public.inventory_purchase_orders where id = p_id;
  if found then
    if old.brand_id <> s.brand_id or old.entry_payload is distinct from payload then raise exception 'Inventory idempotency key reused with different input'; end if;
    return old.id;
  end if;
  insert into public.inventory_purchase_orders(id,brand_id,supplier_id,platform_order_reference,currency,ordered_on,entry_payload)
    values(p_id,s.brand_id,p_supplier,p_reference,p_currency,p_ordered_on,payload);
  insert into public.inventory_purchase_lines(brand_id,order_id,material_id,package_label,package_quantity,base_units_per_package,goods_amount_minor)
    values(s.brand_id,p_id,p_material,p_package_label,p_package_quantity,p_conversion,p_goods_minor);
  return p_id;
end;
$$;
revoke all on function public.create_inventory_purchase(uuid,uuid,text,text,date,uuid,text,numeric,numeric,bigint) from public,anon,authenticated,service_role;
grant execute on function public.create_inventory_purchase(uuid,uuid,text,text,date,uuid,text,numeric,numeric,bigint) to authenticated;
commit;
