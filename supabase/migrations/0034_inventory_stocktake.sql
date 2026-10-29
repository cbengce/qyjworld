-- Atomic counted-stock correction; existing sales, menu and POS paths remain untouched.
begin;

create table public.inventory_stocktakes (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  location_id uuid not null,
  material_id uuid not null,
  expected_quantity numeric(20,6) not null check (expected_quantity >= 0 and expected_quantity < 'Infinity'::numeric),
  counted_quantity numeric(20,6) not null check (counted_quantity >= 0 and counted_quantity < 'Infinity'::numeric),
  reason text not null check (btrim(reason) <> ''),
  idempotency_key text not null,
  actor_user_id uuid not null references auth.users(id),
  movement_id uuid references public.inventory_movements(id),
  created_at timestamptz not null default now(),
  unique (brand_id, idempotency_key),
  foreign key (location_id, brand_id) references public.inventory_locations(id, brand_id),
  foreign key (material_id, brand_id) references public.inventory_materials(id, brand_id)
);
alter table public.inventory_stocktakes enable row level security;
revoke all on public.inventory_stocktakes from public, anon, authenticated, service_role;
grant select on public.inventory_stocktakes to authenticated, service_role;
create policy inventory_stocktake_read on public.inventory_stocktakes for select to authenticated
  using (public.inventory_can_access_location('inventory.read', location_id));
create trigger inventory_stocktake_immutable before update or delete on public.inventory_stocktakes
  for each row execute function public.inventory_prevent_movement_changes();

create function public.post_inventory_stocktake(
  p_location_id uuid, p_material_id uuid, p_counted_quantity numeric,
  p_expected_quantity numeric, p_reason text, p_idempotency_key text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_location public.inventory_locations%rowtype;
  v_material public.inventory_materials%rowtype;
  v_existing public.inventory_stocktakes%rowtype;
  v_id uuid;
  v_stocktake_id uuid;
  v_quantity numeric;
begin
  if auth.uid() is null then raise exception 'Inventory requires an authenticated staff user'; end if;
  if p_counted_quantity is null or p_expected_quantity is null
    or not (p_counted_quantity >= 0 and p_counted_quantity < 'Infinity'::numeric)
    or not (p_expected_quantity >= 0 and p_expected_quantity < 'Infinity'::numeric)
    or p_counted_quantity <> round(p_counted_quantity, 6)
    or p_expected_quantity <> round(p_expected_quantity, 6) then
    raise exception 'Invalid counted or expected inventory quantity';
  end if;
  if p_reason is null or btrim(p_reason) = '' or p_idempotency_key is null
    or length(btrim(p_idempotency_key)) not between 8 and 200 then
    raise exception 'Inventory reason and idempotency key are required';
  end if;
  select * into v_location from public.inventory_locations where id = p_location_id for share;
  if not found then raise exception 'Inventory location not found'; end if;
  if not public.inventory_has_permission('inventory.post', v_location.brand_id, v_location.store_id) then
    raise exception 'Insufficient inventory permission';
  end if;
  select * into v_material from public.inventory_materials
    where id = p_material_id and brand_id = v_location.brand_id for share;
  if not found then raise exception 'Inventory material not found in location brand'; end if;
  if v_material.base_unit = 'each' and (p_counted_quantity <> trunc(p_counted_quantity)
    or p_expected_quantity <> trunc(p_expected_quantity)) then
    raise exception 'Counted materials require whole units';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_location.brand_id::text || ':' || p_idempotency_key, 0));
  select * into v_existing from public.inventory_stocktakes
    where brand_id = v_location.brand_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.location_id <> p_location_id or v_existing.material_id <> p_material_id
      or v_existing.counted_quantity <> p_counted_quantity
      or v_existing.expected_quantity <> p_expected_quantity
      or v_existing.reason <> p_reason or v_existing.actor_user_id <> auth.uid() then
      raise exception 'Inventory idempotency key reused with different input';
    end if;
    return v_existing.movement_id;
  end if;
  if not v_location.active or not v_material.active then raise exception 'Inventory material or location is inactive'; end if;
  insert into public.inventory_balances (brand_id, location_id, material_id)
    values (v_location.brand_id, p_location_id, p_material_id)
    on conflict (location_id, material_id) do nothing;
  select quantity into v_quantity from public.inventory_balances
    where location_id = p_location_id and material_id = p_material_id for update;
  if v_quantity <> p_expected_quantity then
    raise exception 'Inventory changed since this form was loaded; refresh and count again';
  end if;
  if p_counted_quantity <> v_quantity then
    v_id := public.post_inventory_movement(p_location_id, p_material_id, 'adjustment',
      p_counted_quantity - v_quantity, p_reason, p_idempotency_key);
  end if;
  insert into public.inventory_stocktakes (brand_id, location_id, material_id,
    expected_quantity, counted_quantity, reason, idempotency_key, actor_user_id, movement_id)
  values (v_location.brand_id, p_location_id, p_material_id,
    p_expected_quantity, p_counted_quantity, p_reason, p_idempotency_key, auth.uid(), v_id) returning id into v_stocktake_id;
  perform public.write_audit('inventory.stocktake', 'inventory_stocktakes', v_stocktake_id, p_idempotency_key,
    jsonb_build_object('location_id', p_location_id, 'material_id', p_material_id,
      'expected_quantity', p_expected_quantity, 'counted_quantity', p_counted_quantity, 'reason', p_reason));
  return v_id;
end;
$$;

revoke all on function public.post_inventory_stocktake(uuid, uuid, numeric, numeric, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.post_inventory_stocktake(uuid, uuid, numeric, numeric, text, text) to authenticated;
commit;
